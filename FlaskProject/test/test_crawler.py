import unittest
from unittest.mock import patch, MagicMock
from services.crawler.call_crawler import crawl_privacy_policy
from services.crawler.service import CrawlerService
from services.crawler.spider import WebCrawler, simple_fetch


class TestCrawlerAPI(unittest.TestCase):
    @patch('services.crawler.call_crawler.crawler_service')
    def test_crawl_privacy_policy_success(self, mock_service):
        mock_service.fetch_privacy_policy.return_value = {
            'markdown': '# This is markdown',
            'html': '<html><body>This is HTML</body></html>'
        }

        data = {'url': 'https://example.com/privacy'}
        result, status_code = crawl_privacy_policy(data)

        self.assertEqual(status_code, 200)
        self.assertTrue(result['success'])
        self.assertIn('markdown', result)
        self.assertIn('html', result)
        self.assertGreater(result['content_length'], 0)

    def test_crawl_privacy_policy_missing_url(self):
        data = {}
        result, status_code = crawl_privacy_policy(data)

        self.assertEqual(status_code, 400)
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'lack of URL parameter in request')

    @patch('services.crawler.call_crawler.crawler_service')
    def test_crawl_privacy_policy_with_error(self, mock_service):
        mock_service.fetch_privacy_policy.return_value = {
            'error': 'Website loading fail'
        }

        data = {'url': 'https://example.com/privacy'}
        result, status_code = crawl_privacy_policy(data)

        self.assertEqual(status_code, 500)
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'Website loading fail')

    @patch('services.crawler.call_crawler.crawler_service')
    def test_crawl_privacy_policy_raises_exception(self, mock_service):
        mock_service.fetch_privacy_policy.side_effect = RuntimeError("Something went wrong")

        data = {'url': 'https://example.com/privacy'}
        result, status_code = crawl_privacy_policy(data)

        self.assertEqual(status_code, 500)
        self.assertFalse(result['success'])
        self.assertIn("Something went wrong", result['error'])


class TestCrawlerService(unittest.TestCase):
    def setUp(self):
        self.service = CrawlerService()

    @patch.object(WebCrawler, 'crawl')
    @patch.object(WebCrawler, 'parse')
    def test_get_data(self, mock_parse, mock_crawl):
        mock_crawl.return_value = "<html><title>Privacy</title></html>"
        mock_parse.return_value = {"title": "Privacy Policy"}

        service = CrawlerService()
        result = service.get_data("privacy")

        self.assertEqual(result, {"title": "Privacy Policy"})
        mock_crawl.assert_called_once_with("privacy")
        mock_parse.assert_called_once_with("<html><title>Privacy</title></html>")

    @patch('services.crawler.service.simple_fetch')
    def test_fetch_page_content(self, mock_fetch):
        mock_fetch.return_value = '<html>Mocked</html>'
        html = self.service.fetch_page_content("https://example.com")
        self.assertIn("Mocked", html)

    @patch.object(WebCrawler, 'selenium_crawl')
    def test_fetch_privacy_policy_mocked(self, mock_selenium):
        mock_selenium.return_value = {
            'html': '<html><body>Mocked content</body></html>',
            'markdown': '# Mocked content'
        }

        result = self.service.fetch_privacy_policy({
            'url': 'https://example.com/privacy',
            'wait_time': 2
        })

        self.assertIn('html', result)
        self.assertIn('markdown', result)
        self.assertEqual(result['markdown'], '# Mocked content')

        mock_selenium.assert_called_once_with(
            url='https://example.com/privacy',
            wait_time=2,
            save_path=None
        )

    @patch.object(WebCrawler, 'selenium_crawl')
    def test_get_privacy_policy_text_normal(self, mock_selenium):
        mock_selenium.return_value = {
            'markdown': '# Privacy Policy Content'
        }

        result = self.service.get_privacy_policy_text("https://example.com/policy")
        self.assertEqual(result, '# Privacy Policy Content')
        mock_selenium.assert_called_once_with(url='https://example.com/policy')

    @patch.object(WebCrawler, 'selenium_crawl')
    def test_get_privacy_policy_text_empty(self, mock_selenium):
        mock_selenium.return_value = {}

        result = self.service.get_privacy_policy_text("https://example.com/policy")
        self.assertEqual(result, '')

    @patch.object(WebCrawler, 'selenium_crawl')
    def test_get_privacy_policy_text_error(self, mock_selenium):
        mock_selenium.side_effect = Exception("crawl failed")

        with self.assertRaises(Exception) as context:
            self.service.get_privacy_policy_text("https://example.com/policy")

        self.assertIn("crawl failed", str(context.exception))


class TestWebCrawler(unittest.TestCase):
    def setUp(self):
        self.crawler = WebCrawler("https://example.com")

    @patch('requests.Session.get')
    def test_crawl(self, mock_get):
        mock_response = MagicMock()
        mock_response.text = "<html><title>Test</title></html>"
        mock_get.return_value = mock_response

        html = self.crawler.crawl("test")
        self.assertIn("Test", html)

    def test_parse(self):
        html = "<html><title>Hello World</title></html>"
        result = self.crawler.parse(html)
        self.assertEqual(result['title'], "Hello World")

    def test_parse_no_title(self):
        crawler = WebCrawler("https://example.com")
        html = "<html><body>No title here</body></html>"

        result = crawler.parse(html)
        self.assertEqual(result['title'], "No title found")

    @patch('requests.get')
    def test_simple_fetch(self, mock_get):
        mock_response = MagicMock()
        mock_response.text = "<html>Fetched</html>"
        mock_get.return_value = mock_response

        html = simple_fetch("https://example.com")

        self.assertEqual(html, "<html>Fetched</html>")
        mock_get.assert_called_once_with("https://example.com")


if __name__ == '__main__':
    unittest.main()
