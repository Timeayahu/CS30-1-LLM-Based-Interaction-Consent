import queue
import unittest
from unittest.mock import patch, MagicMock, mock_open
import datetime
import hashlib
import json
import asyncio

import pytest
from bson import ObjectId

# Import the module to be tested
# Adjust the import path according to your project structure
from services.scheduling import Scheduling


class TestScheduling(unittest.TestCase):

    def setUp(self):
        """Set up test fixtures before each test method."""
        self.scheduling = Scheduling()
        self.test_url = "https://example.com/privacy"
        self.test_html = "<html><body><h1>Privacy Policy</h1><p>We collect data.</p></body></html>"
        self.test_markdown = "# Privacy Policy\n\nWe collect data."
        self.test_company = "example"

    @patch('html2text.HTML2Text')
    def test_get_content(self, mock_html2text):
        """Test the get_content method."""
        # Mock the HTML2Text converter
        mock_converter = MagicMock()
        mock_converter.handle.return_value = self.test_markdown
        mock_html2text.return_value = mock_converter

        # Call the method
        self.scheduling.get_content({'text': self.test_html})

        # Assertions
        self.assertEqual(self.scheduling.html_content, self.test_html)
        self.assertEqual(self.scheduling.markdown_content, self.test_markdown)
        mock_converter.handle.assert_called_once_with(self.test_html)

    @patch('services.crawler.call_crawler.crawl_privacy_policy')
    @patch('urllib.parse.urlparse')
    def test_crawler(self, mock_urlparse, mock_crawl):
        """Test the crawler method."""
        # Mock the urlparse function
        mock_parsed_url = MagicMock()
        mock_parsed_url.netloc = 'example.com'
        mock_urlparse.return_value = mock_parsed_url

        # Mock the crawl_privacy_policy function
        mock_crawl.return_value = ({'html': self.test_html, 'markdown': self.test_markdown}, 200)

        # Call the method
        self.scheduling.crawler({'url': self.test_url})

        # Assertions
        self.assertEqual(self.scheduling.html_content, self.test_html)
        self.assertEqual(self.scheduling.markdown_content, self.test_markdown)
        self.assertEqual(self.scheduling.status, 200)
        self.assertEqual(self.scheduling.company_name, 'example')
        mock_crawl.assert_called_once_with({'url': self.test_url})

    @patch('services.crawler.call_crawler.crawl_privacy_policy')
    def test_check_content_changed_true(self, mock_crawl):
        """Test check_content_changed when content has changed."""
        stored_hash = hashlib.md5("old content".encode('utf-8')).hexdigest()
        mock_crawl.return_value = ({'html': self.test_html}, 200)

        result = self.scheduling.check_content_changed(self.test_url, stored_hash)

        self.assertTrue(result)
        mock_crawl.assert_called_once_with({'url': self.test_url})

    @patch('services.crawler.call_crawler.crawl_privacy_policy')
    def test_check_content_changed_false(self, mock_crawl):
        """Test check_content_changed when content has not changed."""
        stored_hash = hashlib.md5(self.test_html.encode('utf-8')).hexdigest()
        mock_crawl.return_value = ({'html': self.test_html}, 200)

        result = self.scheduling.check_content_changed(self.test_url, stored_hash)

        self.assertFalse(result)
        mock_crawl.assert_called_once_with({'url': self.test_url})

    @patch('services.crawler.call_crawler.crawl_privacy_policy')
    def test_check_content_changed_crawl_failed(self, mock_crawl):
        """Test check_content_changed when crawl fails."""
        stored_hash = hashlib.md5(self.test_html.encode('utf-8')).hexdigest()
        mock_crawl.return_value = ({}, 404)

        result = self.scheduling.check_content_changed(self.test_url, stored_hash)

        self.assertTrue(result)  # Should assume content changed if crawl fails
        mock_crawl.assert_called_once_with({'url': self.test_url})

    @patch('services.split.call_split.extract_webpage_content')
    def test_split(self, mock_extract):
        """Test the split method."""
        test_sections = {'Collect': 'Collection data', 'Use': 'Usage data', 'Share': 'Sharing data'}
        mock_extract.return_value = test_sections

        self.scheduling.html_content = self.test_html
        self.scheduling.split()

        self.assertEqual(self.scheduling.sections, test_sections)
        mock_extract.assert_called_once_with(self.test_html)

    @patch('services.classification.call_classification.classify_privacy_global')
    def test_analyse_global_success(self, mock_classify):
        """Test analyse_global with successful classification."""
        mock_classify.return_value = {'classification_content': 'Global analysis results'}

        self.scheduling.company_name = self.test_company
        self.scheduling.html_content = self.test_html
        self.scheduling.markdown_content = self.test_markdown

        self.scheduling.analyse_global()
        result = self.scheduling.result_queue.get()

        self.assertEqual(result, 'Global analysis results')
        mock_classify.assert_called_once_with(self.test_company, self.test_html, self.test_markdown)

    @patch('services.classification.call_classification.classify_privacy_global')
    def test_analyse_global_error(self, mock_classify):
        """Test analyse_global with classification error."""
        mock_classify.return_value = {'error': 'Classification failed'}

        self.scheduling.company_name = self.test_company
        self.scheduling.html_content = self.test_html
        self.scheduling.markdown_content = self.test_markdown

        self.scheduling.analyse_global()
        result = self.scheduling.result_queue.get()

        self.assertEqual(result, 'Classification failed')
        mock_classify.assert_called_once_with(self.test_company, self.test_html, self.test_markdown)

    @patch('services.section_analysis.what_to_collect.info_collection')
    @patch('services.section_analysis.how_to_use.info_use')
    @patch('services.section_analysis.who_to_share.info_share')
    async def test_analyse_sections(self, mock_share, mock_use, mock_collect):
        """Test analyse_sections method."""
        # Mock coroutine returns
        mock_collect.return_value = {
            'collected_info': [
                {'keyword': 'identification number', 'importance': 5,
                 'context': 'We may collect your passport number and driver\'s license number.',
                 'summary': 'passport number,driver\'s license number'},
                {'keyword': 'biometric data', 'importance': 5,
                 'context': 'We may collect your fingerprints and facial recognition data.',
                 'summary': 'fingerprints,facial recognition data'},
                {'keyword': 'location data', 'importance': 4,
                 'context': 'We may collect your GPS coordinates and addresses.',
                 'summary': 'GPS coordinates,addresses'},
                {'keyword': 'contact details', 'importance': 3,
                 'context': 'We may collect your email address and phone number.',
                 'summary': 'email address,phone number'},
                {'keyword': 'name', 'importance': 2, 'context': 'We may collect your first name and surname.',
                 'summary': 'first name,surname'}
            ]
        }
        mock_use.return_value = {
            'data_usage': [
                {'keyword': 'personalization', 'importance': 4,
                 'context': 'We use your data to personalize your experience and recommendations.',
                 'summary': 'personalize experience,recommendations'},
                {'keyword': 'advertising', 'importance': 4,
                 'context': 'We use your data for targeted advertising and marketing campaigns.',
                 'summary': 'targeted advertising,marketing campaigns'},
                {'keyword': 'analytics', 'importance': 3,
                 'context': 'We use your data for analytics and business intelligence.',
                 'summary': 'analytics,business intelligence'},
                {'keyword': 'improvement', 'importance': 3,
                 'context': 'We use your data to improve our products and services.',
                 'summary': 'improve products,improve services'},
                {'keyword': 'research', 'importance': 2, 'context': 'We use your data for research and development.',
                 'summary': 'research,development'}
            ]
        }
        mock_share.return_value = {
            'data_sharing': [
                {'keyword': 'third_parties', 'importance': 5,
                 'context': 'We share your data with third-party service providers and partners.',
                 'summary': 'third-party service providers,partners'},
                {'keyword': 'affiliates', 'importance': 4,
                 'context': 'We share your data with our affiliates and subsidiaries.',
                 'summary': 'affiliates,subsidiaries'},
                {'keyword': 'legal', 'importance': 4,
                 'context': 'We may share your data when required by law or to respond to legal process.',
                 'summary': 'legal requirements,respond to legal process'},
                {'keyword': 'business_transfer', 'importance': 3,
                 'context': 'We may share your data in connection with a merger, acquisition, or sale of assets.',
                 'summary': 'merger,acquisition,sale of assets'},
                {'keyword': 'consent', 'importance': 2,
                 'context': 'We share your data with third parties with your consent.', 'summary': 'with consent'}
            ]
        }

        self.scheduling.sections = {
            'Collect': 'Collection data',
            'Use': 'Usage data',
            'Share': 'Sharing data'
        }

        results = await self.scheduling.analyse_sections()

        self.assertEqual(len(results), 3)
        self.assertIn('collected_info', results[0])
        self.assertIn('data_usage', results[1])
        self.assertIn('data_sharing', results[2])
        self.assertEqual(len(results[0]['collected_info']), 5)
        self.assertEqual(len(results[1]['data_usage']), 5)
        self.assertEqual(len(results[2]['data_sharing']), 5)
        mock_collect.assert_called_once_with('Collection data')
        mock_use.assert_called_once_with('Usage data')
        mock_share.assert_called_once_with('Sharing data')

    @patch('services.scheduling.service.connect_to_mongodb')
    @patch('services.scheduling.service.close_mongodb_connection')
    @patch('services.scheduling.service.get_policy_by_url')
    @patch('services.scheduling.service.get_summary')
    @patch('services.scheduling.service.update_last_checked_time')
    @patch.object(Scheduling, 'crawler')
    @patch.object(Scheduling, 'check_content_changed')
    @patch.object(Scheduling, 'split')
    @patch.object(Scheduling, 'analyse_global')
    @patch.object(Scheduling, 'analyse_sections')
    @patch('threading.Thread')
    @patch('asyncio.run')
    @patch('services.scheduling.service.save_policy')
    @patch('services.scheduling.service.save_summary')
    def test_schedule_existing_recent_policy(
            self,  mock_save_summary, mock_save_policy, mock_asyncio_run, mock_thread,
            mock_analyse_sections, mock_analyse_global, mock_split,
            mock_check_content_changed, mock_crawler, mock_update_time,
            mock_get_summary, mock_get_policy, mock_close, mock_connect):
        """Test schedule method with recently updated policy."""
        # Mock database connection
        mock_client = MagicMock()
        mock_db = MagicMock()
        mock_privacy_data = MagicMock()
        mock_connect.return_value = (mock_client, mock_db, mock_privacy_data)

        # Mock existing policy
        policy_id = ObjectId()
        mock_get_policy.return_value = {
            "_id": policy_id,
            "updated_at": datetime.datetime.now() - datetime.timedelta(days=3),
            "html_content": self.test_html
        }

        # Mock summary
        mock_get_summary.return_value = {
            "summary_content": json.dumps({"key": "value"})
        }

        # Call the method
        result, status = self.scheduling.schedule({"url": self.test_url})

        # Assertions
        self.assertEqual(status, 200)
        self.assertEqual(result['summary'], json.dumps({"key": "value"}))
        self.assertEqual(result['policy_id'], str(policy_id))
        self.assertEqual(self.scheduling.policy_id, policy_id)

        # Verify mocks
        mock_connect.assert_called_once()
        mock_get_policy.assert_called_once_with(self.test_url, mock_privacy_data)
        mock_get_summary.assert_called_once_with(policy_id, mock_privacy_data)
        mock_close.assert_called_once_with(mock_client)

        # Verify that no unnecessary methods were called
        mock_crawler.assert_not_called()
        mock_split.assert_not_called()
        mock_analyse_global.assert_not_called()
        mock_analyse_sections.assert_not_called()

    @patch('services.scheduling.service.connect_to_mongodb')
    @patch('services.scheduling.service.close_mongodb_connection')
    @patch('services.scheduling.service.get_policy_by_url')
    @patch('services.scheduling.service.get_summary')
    @patch('services.scheduling.service.update_last_checked_time')
    @patch.object(Scheduling, 'crawler')
    @patch.object(Scheduling, 'check_content_changed')
    @patch.object(Scheduling, 'split')
    @patch.object(Scheduling, 'analyse_global')
    @patch.object(Scheduling, 'analyse_sections')
    @patch('threading.Thread')
    @patch('asyncio.run')
    @patch('services.scheduling.service.save_policy')
    @patch('services.scheduling.service.save_summary')
    def test_schedule_existing_outdated_unchanged_policy(
            self, mock_save_summary, mock_save_policy, mock_asyncio_run, mock_thread,
            mock_analyse_sections, mock_analyse_global, mock_split,
            mock_check_content_changed, mock_crawler, mock_update_time,
            mock_get_summary, mock_get_policy, mock_close, mock_connect):
        """Test schedule method with outdated but unchanged policy."""
        # Mock database connection
        mock_client = MagicMock()
        mock_db = MagicMock()
        mock_privacy_data = MagicMock()
        mock_connect.return_value = (mock_client, mock_db, mock_privacy_data)

        # Mock existing policy (outdated)
        policy_id = ObjectId()
        mock_get_policy.return_value = {
            "_id": policy_id,
            "updated_at": datetime.datetime.now() - datetime.timedelta(days=10),
            "html_content": self.test_html
        }

        # Mock content unchanged
        mock_check_content_changed.return_value = False

        # Mock summary
        mock_get_summary.return_value = {
            "summary_content": json.dumps({"key": "value"})
        }

        # Call the method
        result, status = self.scheduling.schedule({"url": self.test_url})

        # Assertions
        self.assertEqual(status, 200)
        self.assertEqual(result['summary'], json.dumps({"key": "value"}))
        self.assertEqual(result['policy_id'], str(policy_id))
        self.assertEqual(self.scheduling.policy_id, policy_id)

        # Verify mocks
        mock_connect.assert_called_once()
        mock_get_policy.assert_called_once_with(self.test_url, mock_privacy_data)
        mock_check_content_changed.assert_called_once()
        mock_update_time.assert_called_once_with(policy_id, mock_privacy_data)
        mock_get_summary.assert_called_once_with(policy_id, mock_privacy_data)
        mock_close.assert_called_once_with(mock_client)

        # Verify that no unnecessary methods were called
        mock_crawler.assert_not_called()
        mock_split.assert_not_called()
        mock_analyse_global.assert_not_called()
        mock_analyse_sections.assert_not_called()

    @patch('services.scheduling.service.connect_to_mongodb')
    @patch('services.scheduling.service.close_mongodb_connection')
    @patch('services.scheduling.service.get_policy_by_url')
    @patch.object(Scheduling, 'crawler')
    @patch.object(Scheduling, 'check_content_changed')
    @patch.object(Scheduling, 'split')
    @patch.object(Scheduling, 'analyse_global')
    @patch.object(Scheduling, 'analyse_sections')
    @patch('threading.Thread')
    @patch('asyncio.run')
    @patch('services.scheduling.service.save_policy')
    @patch('services.scheduling.service.save_summary')
    def test_schedule_existing_outdated_changed_policy(
            self, mock_save_summary, mock_save_policy, mock_asyncio_run, mock_thread,
            mock_analyse_sections, mock_analyse_global, mock_split,
            mock_check_content_changed, mock_crawler,
            mock_get_policy, mock_close, mock_connect):
        """Test schedule method with outdated and changed policy."""
        # Mock database connection
        mock_client = MagicMock()
        mock_db = MagicMock()
        mock_privacy_data = MagicMock()
        mock_connect.return_value = (mock_client, mock_db, mock_privacy_data)

        # Mock existing policy (outdated)
        policy_id = ObjectId()
        mock_get_policy.return_value = {
            "_id": policy_id,
            "updated_at": datetime.datetime.now() - datetime.timedelta(days=10),
            "html_content": self.test_html
        }

        # Mock content changed
        mock_check_content_changed.return_value = True

        # Mock threading and analysis
        mock_thread_instance = MagicMock()
        mock_thread.return_value = mock_thread_instance

        mock_analysis_results = [
            {"collect": "Collection data"},
            {"use": "Usage data"},
            {"share": "Sharing data"}
        ]
        mock_asyncio_run.return_value = mock_analysis_results

        # Mock global analysis result
        self.scheduling.result_queue = MagicMock()
        self.scheduling.result_queue.get.return_value = {"global": "Global analysis"}

        # Mock crawler results
        self.scheduling.html_content = self.test_html
        self.scheduling.markdown_content = self.test_markdown
        self.scheduling.status = 200

        # Mock save_policy
        new_policy_id = ObjectId()
        mock_save_policy.return_value = new_policy_id

        # Call the method
        result, status = self.scheduling.schedule({"url": self.test_url})

        # Assertions
        self.assertEqual(status, 200)
        self.assertIn('summary', result)
        self.assertIn('policy_id', result)
        self.assertEqual(result['policy_id'], str(new_policy_id))
        self.assertEqual(self.scheduling.policy_id, new_policy_id)

        # Verify mocks
        mock_connect.assert_called_once()
        mock_get_policy.assert_called_once_with(self.test_url, mock_privacy_data)
        mock_check_content_changed.assert_called_once()
        mock_crawler.assert_called_once()
        mock_split.assert_called_once()
        mock_thread.assert_called_once()
        mock_thread_instance.start.assert_called_once()
        mock_thread_instance.join.assert_called_once()
        mock_asyncio_run.assert_called_once()
        mock_analyse_sections.assert_called_once()
        mock_save_policy.assert_called_once()
        mock_close.assert_called_once_with(mock_client)

    @patch('services.scheduling.service.connect_to_mongodb')
    @patch('services.scheduling.service.close_mongodb_connection')
    @patch('services.scheduling.service.get_policy_by_url', side_effect=Exception("Test Exception"))
    def test_freshness_check_exception(self, mock_get_policy, mock_close, mock_connect):
        mock_client = MagicMock()
        mock_db = MagicMock()
        mock_privacy_data = MagicMock()
        mock_connect.return_value = (mock_client, mock_db, mock_privacy_data)

        result, status = self.scheduling.schedule({"url": "http://example.com"})

        self.assertEqual(status, 503)
        self.assertIn("error", result)
        self.assertEqual(result["error"], "Error during freshness check!")
        mock_close.assert_called_once()

    @patch('services.scheduling.service.connect_to_mongodb')
    @patch('services.scheduling.service.close_mongodb_connection')
    @patch('services.scheduling.service.get_policy_by_url')
    @patch.object(Scheduling, 'crawler')
    @patch.object(Scheduling, 'get_content')
    def test_schedule_crawler_failed_with_text(
            self, mock_get_content, mock_crawler,
            mock_get_policy, mock_close, mock_connect):
        """Test schedule method when crawler fails but text is provided."""
        # Mock database connection
        mock_client = MagicMock()
        mock_db = MagicMock()
        mock_privacy_data = MagicMock()
        mock_connect.return_value = (mock_client, mock_db, mock_privacy_data)

        # Mock no existing policy
        mock_get_policy.return_value = None

        # Mock crawler failure
        self.scheduling.status = 404
        self.scheduling.html_content = ""

        q = queue.Queue()
        q.put({})
        self.scheduling.result_queue = q

        def fake_get_content(data):
            self.scheduling.html_content = self.test_html
            self.scheduling.markdown_content = "md"
            self.scheduling.status = 200

        mock_get_content.side_effect = fake_get_content

        # Test data with text
        test_data = {
            "url": self.test_url,
            "text": self.test_html
        }

        # Call the method
        self.scheduling.schedule(test_data)

        # Verify mocks
        mock_crawler.assert_called_once_with(test_data)
        mock_get_content.assert_called_once_with(test_data)

    @patch('services.scheduling.service.connect_to_mongodb')
    @patch('services.scheduling.service.close_mongodb_connection')
    @patch('services.scheduling.service.get_policy_by_url')
    @patch.object(Scheduling, 'crawler')
    @patch.object(Scheduling, 'get_content')
    def test_schedule_crawler_failed_without_text(
            self, mock_get_content, mock_crawler,
            mock_get_policy, mock_close, mock_connect):
        """Test schedule method when crawler fails but text is provided."""
        # Mock database connection
        mock_client = MagicMock()
        mock_db = MagicMock()
        mock_privacy_data = MagicMock()
        mock_connect.return_value = (mock_client, mock_db, mock_privacy_data)

        # Mock no existing policy
        mock_get_policy.return_value = None

        # Mock crawler failure
        self.scheduling.status = 404
        self.scheduling.html_content = ""

        # Test data with text
        test_data = { 'url': self.test_url }

        # Call the method
        result, status = self.scheduling.schedule(test_data)

        # Assertions
        self.assertEqual(result, {'error': 'Unable to get the content'})
        self.assertEqual(status, 404)

        # Verify mocks
        mock_crawler.assert_called_once_with(test_data)
        mock_get_content.assert_not_called()
        mock_close.assert_called_once_with(mock_client)

    @patch('services.scheduling.service.connect_to_mongodb')
    @patch('services.scheduling.service.close_mongodb_connection')
    def test_schedule_no_url(self, mock_close, mock_connect):
        """Test schedule method with no URL provided."""
        # Mock database connection
        mock_client = MagicMock()
        mock_db = MagicMock()
        mock_privacy_data = MagicMock()
        mock_connect.return_value = (mock_client, mock_db, mock_privacy_data)

        # Call the method with empty data
        result, status = self.scheduling.schedule({})

        # Assertions
        self.assertEqual(result, {"error": "Not valid request!"})
        self.assertEqual(status, 400)

        # Verify mocks
        mock_connect.assert_called_once()
        mock_close.assert_called_once_with(mock_client)

    @patch('services.scheduling.service.connect_to_mongodb')
    def test_schedule_db_connection_failed(self, mock_connect):
        """Test schedule method when database connection fails."""
        # Mock failed database connection
        mock_connect.return_value = (None, None, None)

        # Call the method
        result, status = self.scheduling.schedule({"url": self.test_url})

        # Assertions
        self.assertEqual(result, {"error": "Database connection failed!"})
        self.assertEqual(status, 503)

        # Verify mocks
        mock_connect.assert_called_once()


if __name__ == '__main__':
    unittest.main()