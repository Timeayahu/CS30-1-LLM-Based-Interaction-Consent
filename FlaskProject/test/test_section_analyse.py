import unittest
from unittest.mock import patch, AsyncMock
from services.section_analysis.how_to_use import info_use
from services.section_analysis.what_to_collect import info_collection
from services.section_analysis.who_to_share import info_share


class TestInfoUse(unittest.IsolatedAsyncioTestCase):

    @patch("services.section_analysis.how_to_use.ChatOpenAI")
    async def test_info_use_success(self, mock_chat_class):
        mock_instance = AsyncMock()
        mock_instance.ainvoke.side_effect = [
            AsyncMock(content='{"purpose_1": "To provide service"}'),
            AsyncMock(content='{"To provide service": {"lawful basis": "consent", "explanation": "Providing service", "original sentence": "We use it to provide service"}}')
        ]
        mock_chat_class.return_value = mock_instance

        text = "We use your data to provide service."
        result = await info_use(text)

        self.assertIn("data_usage", result)
        self.assertIsInstance(result["data_usage"], list)
        self.assertEqual(result["data_usage"][0]["keyword"], "To provide service")

    @patch("services.section_analysis.how_to_use.ChatOpenAI", side_effect=Exception("LLM error"))
    async def test_info_use_failure(self, _):
        result = await info_use("Some text")
        self.assertIn("data_usage", result)
        self.assertIn("LLM error", result["data_usage"])


class TestInfoCollection(unittest.IsolatedAsyncioTestCase):

    @patch("services.section_analysis.what_to_collect.ChatOpenAI")
    async def test_info_collection_success(self, mock_chat_class):
        mock_instance = AsyncMock()
        mock_instance.ainvoke.side_effect = [
            AsyncMock(content='{"Account Info": ["name", "email address"]}'),
            AsyncMock(content='{"Account Info": {"type": ["name", "contact details"], "summary": "Contains name/email", "original sentence": "Your name and email"}}')
        ]
        mock_chat_class.return_value = mock_instance

        result = await info_collection("We collect your name and email address.")
        self.assertIn("collected_info", result)
        self.assertIsInstance(result["collected_info"], list)
        self.assertEqual(result["collected_info"][0]["keyword"], "Account Info")

    @patch("services.section_analysis.what_to_collect.ChatOpenAI", side_effect=Exception("Mock Error"))
    async def test_info_collection_failure(self, _):
        result = await info_collection("Some input")
        self.assertIn("collected_info", result)
        self.assertIn("Mock Error", result["collected_info"])


class TestInfoShare(unittest.IsolatedAsyncioTestCase):

    @patch("services.section_analysis.who_to_share.ChatOpenAI")
    async def test_info_share_success(self, mock_chat_class):
        mock_instance = AsyncMock()
        mock_instance.ainvoke.side_effect = [
            AsyncMock(content='{"third_party_1": "Service providers"}'),
            AsyncMock(content='{"Service providers": {"type": "processors and subprocessors", "summary": "Handle data", "original sentence": "We use service providers"}}')
        ]
        mock_chat_class.return_value = mock_instance

        result = await info_share("We may share your data with service providers.")
        self.assertIn("data_sharing", result)
        self.assertIsInstance(result["data_sharing"], list)
        self.assertEqual(result["data_sharing"][0]["keyword"], "Service providers")

    @patch("services.section_analysis.who_to_share.ChatOpenAI", side_effect=Exception("Test Error"))
    async def test_info_share_failure(self, _):
        result = await info_share("Some policy")
        self.assertIn("data_sharing", result)
        self.assertIn("Test Error", result["data_sharing"])


if __name__ == '__main__':
    unittest.main()