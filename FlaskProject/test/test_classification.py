import unittest
from unittest.mock import patch, MagicMock
from services.classification.service import ClassificationPrivacyService
from services.classification.call_classification import classify_privacy_global
from services.classification.llm_classification_service import ClassificationService


class TestLLMClassificationService(unittest.TestCase):

    def setUp(self):
        self.service = ClassificationService()
        self.input_dict = {
            "company_name": "TestCo",
            "content": "Sample policy content.",
            "format": "Markdown"
        }

    @patch("services.classification.llm_classification_service.OpenAI")
    @patch("services.classification.llm_classification_service.text_processor.clean_json_string")
    def test_classification_privacy_policy_success(self, mock_clean, mock_openai):
        # Mock LLM API return content
        mock_response = MagicMock()
        mock_response.choices[0].message.content = '{"data_retention": []}'
        mock_openai.return_value.chat.completions.create.return_value = mock_response

        # Cleaned version returns valid JSON
        mock_clean.return_value = '{"data_retention": []}'

        result = self.service.classification_privacy_policy(self.input_dict)
        self.assertIn("result", result)
        self.assertIn("data_retention", result["result"])
        self.assertEqual(result["result"]["data_retention"][0]["keyword"], "Not found")

    @patch("services.classification.llm_classification_service.OpenAI")
    @patch("services.classification.llm_classification_service.text_processor.clean_json_string")
    def test_classification_privacy_policy_invalid_json(self, mock_clean, mock_openai):
        mock_response = MagicMock()
        mock_response.choices[0].message.content = '{"invalid_json": [}'
        mock_openai.return_value.chat.completions.create.return_value = mock_response

        mock_clean.return_value = '{"invalid_json": [}'

        result = self.service.classification_privacy_policy(self.input_dict)
        self.assertIn("error", result)
        self.assertEqual(result["error"], "Invalid JSON response from API")

    @patch("services.classification.llm_classification_service.text_processor.clean_json_string")
    @patch("services.classification.llm_classification_service.OpenAI")
    def test_classification_privacy_policy_api_failure(self, mock_openai, mock_clean):
        mock_clean.return_value = '{"should_not": "matter"}'

        mock_openai.return_value.chat.completions.create.side_effect = Exception("API failed")

        service = ClassificationService()
        result = service.classification_privacy_policy(self.input_dict)

        self.assertEqual(result["error"], "API failed")

class TestClassificationPrivacyService(unittest.TestCase):

    def setUp(self):
        self.service = ClassificationPrivacyService()
        self.company = "TestCompany"
        self.markdown = "Some markdown content"
        self.html = "<html>Some html content</html>"

    @patch('services.classification.service.ClassificationService.classification_privacy_policy')
    def test_generate_classification_content_success_markdown(self, mock_classify):
        mock_classify.return_value = {"result": {"category": [{"keyword": "Access Scope", "summary": "s", "context": "c"}]}}

        result = self.service.generate_classification_content(self.company, self.html, self.markdown)
        self.assertTrue(result['success'])
        self.assertIn('classification_content', result)
        self.assertIn('category', result['classification_content'])

    @patch('services.classification.service.ClassificationService.classification_privacy_policy')
    def test_generate_classification_content_fallback_to_html(self, mock_classify):
        # Simulate markdown failing, then HTML success
        mock_classify.side_effect = [
            {"error": "Markdown failed"},
            {"result": {"category": [{"keyword": "Access Scope", "summary": "s", "context": "c"}]}}
        ]

        result = self.service.generate_classification_content(self.company, self.html, self.markdown)
        self.assertTrue(result['success'])
        self.assertIn('category', result['classification_content'])

    def test_generate_classification_content_no_html(self):
        result = self.service.generate_classification_content(self.company, "", self.markdown)
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'No HTML content.')

    def test_generate_classification_content_no_markdown(self):
        result = self.service.generate_classification_content(self.company, self.html, "")
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'No Markdown content.')

    @patch('services.classification.service.ClassificationService.classification_privacy_policy')
    def test_generate_classification_content_both_failed(self, mock_classify):
        mock_classify.side_effect = [{"error": "Markdown fail"}, {"error": "HTML fail"}]
        result = self.service.generate_classification_content(self.company, self.html, self.markdown)
        self.assertFalse(result['success'])
        self.assertIn('error', result)


class TestCallClassificationEntry(unittest.TestCase):

    @patch('services.classification.call_classification.classification_privacy.generate_classification_content')
    def test_classify_privacy_global(self, mock_generate):
        mock_generate.return_value = {"success": True, "classification_content": "data"}

        result = classify_privacy_global("TestCompany", "html", "markdown")
        self.assertEqual(result["classification_content"], "data")


if __name__ == '__main__':
    unittest.main()
