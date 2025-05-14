import unittest
from unittest.mock import patch, MagicMock
from services.split.call_split import extract_webpage_content
from services.split.markdown_split import (
    search_by_headers as search_headers_markdown,
    extract_section,
    find_exclusive_title_matches,
    split_markdown_by_single_pattern,
    patterns_dict
)
from services.split.service import ExtractSection
from services.split.webpage_split import extract_section
from services.split.webpage_split_markdown import (
    search_by_headers as search_headers_webpage,
    search_by_others,
    split_by_markdown
)


class TestCallSplit(unittest.TestCase):
    @patch('services.split.call_split.split_service')
    def test_extract_webpage_content(self, mock_split_service):
        mock_split_service.split.return_value = {'Collect': 'x', 'Use': 'y', 'Share': 'z'}
        result = extract_webpage_content("<html>test</html>")

        self.assertEqual(result, {'Collect': 'x', 'Use': 'y', 'Share': 'z'})
        mock_split_service.split.assert_called_once()


class TestMarkdownSplit(unittest.TestCase):
    @patch('services.split.markdown_split.HTMLHeaderTextSplitter')
    def test_search_by_headers(self, mock_splitter_class):
        mock_splitter = MagicMock()
        mock_splitter.split_text.return_value = [
            MagicMock(metadata={"Header 2": "Title1"}, page_content="x" * 120),
            MagicMock(metadata={}, page_content="short"),
            MagicMock(metadata={"Header 2": "Title2"}, page_content="y" * 80)
        ]
        mock_splitter_class.return_value = mock_splitter
        result = search_headers_markdown("dummy", 2)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].metadata, {"Header 2": "Title1"})

    @patch('services.split.markdown_split.ChatOpenAI')
    def test_extract_section_returns_parsed_json(self, mock_model_class):
        mock_model = MagicMock()
        mock_model.invoke.return_value.content = '{"Collect": "Collect", "Use": "Use", "Share": "Share"}'
        mock_model_class.return_value = mock_model

        readable_text = "# Collect\nWe collect your data"
        result = extract_section(readable_text)
        self.assertIsInstance(result, dict)
        self.assertEqual(set(result.keys()), {'Collect', 'Use', 'Share'})

    def test_find_exclusive_title_matches(self):
        text = "**1\\. Collect**\nSome content\n## Use\nMore content"
        matches = find_exclusive_title_matches(text, "Collect")

        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]['type'], 'numbered_bold')

    def test_find_exclusive_title_matches_detects_various_patterns(self):
        md = '''
        **1\\. Collect**
        **Use**
        *Share*
        - ### Share
        # Collect
        '''
        results = find_exclusive_title_matches(md, "Collect")
        self.assertTrue(any(r['type'] == 'numbered_bold' for r in results))
        self.assertTrue(any(r['type'] == 'heading_1' for r in results))

    def test_split_markdown_by_pattern_basic(self):
        md = "**Collect**\nData here\n**Use**\nUse data"
        pattern = patterns_dict['bold']
        result = split_markdown_by_single_pattern(md, pattern)
        self.assertIn("**Collect**", result)
        self.assertIn("Data here", result["**Collect**"])
        self.assertIn("**Use**", result)

    def test_split_markdown_returns_full_when_no_match(self):
        md = "No pattern here at all"
        result = split_markdown_by_single_pattern(md, r'^### ThisDoesNotMatch$')
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['content'], md.strip())


class TestService(unittest.TestCase):
    @patch('services.split.service.extract_section')
    def test_service_split(self, mock_extract):
        mock_extract.return_value = {
            'Collect': 'Header A',
            'Use': 'Header B',
            'Share': 'Header C'
        }
        instance = ExtractSection()
        result = instance.split("<html>Some page</html>")
        self.assertIsInstance(result, dict)
        self.assertIn('Collect', result)
        self.assertIn('Use', result)
        self.assertIn('Share', result)


class TestWebpageSplit(unittest.TestCase):
    @patch('services.split.webpage_split.ChatOpenAI')
    @patch('services.split.webpage_split.search_by_headers')
    def test_extract_section_with_mocked_llm(self, mock_search, mock_model_class):
        mock_search.side_effect = lambda html, n: [
            MagicMock(metadata={f"Header {n}": f"Header{n}"}, page_content="content " * 50)]

        mock_model = MagicMock()
        mock_model.invoke.side_effect = [
            MagicMock(content="h1"),
            MagicMock(content='{"Collect": "Header1", "Use": "Header1", "Share": "Header1"}')  # 第二次返回标题映射
        ]
        mock_model_class.return_value = mock_model

        result = extract_section("<html><h1>fake html</h1></html>")
        self.assertEqual(set(result.keys()), {'Collect', 'Use', 'Share'})


class TestWebpageSplitMarkdown(unittest.TestCase):

    @patch("services.split.webpage_split_markdown.search_by_headers")
    def test_split_by_markdown_successful_extraction(self, mock_search_headers):
        mock_search_headers.return_value = [
            MagicMock(metadata={"Header 1": "Collect"}, page_content="This is about collection"),
            MagicMock(metadata={"Header 1": "Use"}, page_content="This is about use"),
            MagicMock(metadata={"Header 1": "Share"}, page_content="This is about share")
        ]

        header = {"Collect": "Collect", "Use": "Use", "Share": "Share"}
        result = split_by_markdown("dummy text", 1, header)
        self.assertEqual(result["Collect"], "This is about collection")
        self.assertEqual(result["Use"], "This is about use")
        self.assertEqual(result["Share"], "This is about share")

    @patch("services.split.webpage_split_markdown.search_by_headers")
    @patch("services.split.webpage_split_markdown.search_by_others")
    def test_split_by_markdown_fallback_to_others(self, mock_search_others, mock_search_headers):
        # First fails to find anything
        mock_search_headers.return_value = []

        # Fallback search finds sections
        mock_search_others.return_value = [
            MagicMock(metadata={"Header 1": "Collect"}, page_content="Fallback collect"),
            MagicMock(metadata={"Header 1": "Use"}, page_content="Fallback use"),
            MagicMock(metadata={"Header 1": "Share"}, page_content="Fallback share")
        ]

        header = {"Collect": "Collect", "Use": "Use", "Share": "Share"}
        result = split_by_markdown("fallback text", 1, header)
        self.assertEqual(result["Collect"], "Fallback collect")
        self.assertEqual(result["Use"], "Fallback use")
        self.assertEqual(result["Share"], "Fallback share")

    @patch("services.split.webpage_split_markdown.search_by_headers")
    @patch("services.split.webpage_split_markdown.search_by_others")
    def test_split_by_markdown_all_failures(self, mock_search_others, mock_search_headers):
        # Both header and fallback return no matches
        mock_search_headers.return_value = []
        mock_search_others.return_value = []

        header = {"Collect": "Collect", "Use": "Use", "Share": "Share"}
        result = split_by_markdown("non-match text", 1, header)
        self.assertIsNone(result["Collect"])
        self.assertIsNone(result["Use"])
        self.assertIsNone(result["Share"])
    @patch("services.split.webpage_split_markdown.search_by_headers")
    def test_split_by_markdown_simple(self, mock_search):
        mock_search.return_value = [
            MagicMock(metadata={"Header 1": "Collect"}, page_content="This is about collection"),
            MagicMock(metadata={"Header 1": "Use"}, page_content="Usage info"),
            MagicMock(metadata={"Header 1": "Share"}, page_content="Sharing data")
        ]
        header = {"Collect": "Collect", "Use": "Use", "Share": "Share"}
        result = split_by_markdown("dummy", 1, header)
        self.assertIn("This is about collection", result["Collect"])

    def test_search_by_headers_returns_large_enough_sections(self):
        text = "# Section 1\n" + "word " * 300  # 1500+ chars
        sections = search_headers_webpage(text, 1)
        self.assertTrue(len(sections) >= 1)

    def test_search_by_others_returns_large_enough_sections(self):
        text = "* # Section 1\n" + "text " * 300
        sections = search_by_others(text, 1)
        self.assertTrue(len(sections) >= 1)


if __name__ == '__main__':
    unittest.main()