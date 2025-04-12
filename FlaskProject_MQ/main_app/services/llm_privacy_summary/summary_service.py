from services.llm_privacy_summary.llm_summary_service import SummaryService
from utils.text_processor import TextProcessor
import os
from urllib.parse import urlparse
from utils import text_processor

text_processor = text_processor.TextProcessor()

class SummaryPrivacyService:
    def __init__(self):
        self.llm_summary_service = SummaryService()
        self.text_processor = TextProcessor()

    def generate_summary_content(self, url, html_content, markdown_content):
        try:
            errors = []

            if html_content is None or len(html_content) == 0:
                errors.append('No HTML content.')

            if markdown_content is None or len(markdown_content) == 0:
                errors.append('No Markdown content.')

            if errors:
                return {
                    'success': False,
                    'error': ', '.join(errors)
                }

            # Get the company name
            domain = urlparse(url).netloc
            company_name = domain.split('.')[0]

            privacy_html_dict = {}
            privacy_html_dict[company_name] = html_content
            if not privacy_html_dict:
                return {
                    'success': False,
                    'error': 'No privacy policy file found in the folder'
                }

            # Store the company name and markdown of the company privacy policy in Markdown format
            privacy_markdown_dict = {}
            privacy_markdown_dict[company_name] = markdown_content
            if not privacy_markdown_dict:
                return {
                    'success': False,
                    'error': 'No privacy policy file found in the folder'
                }

            summary_folder_path = "data/summary_result"
            file_name = company_name + ".json"
            path = os.path.join(summary_folder_path, file_name)
            if os.path.exists(path):
                summary_content = text_processor.load_text_file(summary_folder_path, file_name)[file_name]
                return {
                    'success': True,
                    'summary_content': summary_content
                }
            if not os.path.exists(path):
                summary_content = self.llm_summary_service.summary_privacy_policy(privacy_markdown_dict, "Markdown")
                print("Summary Privacy in Markdown format")
                if "error" in summary_content[company_name]:
                    summary_content = self.llm_summary_service.summary_privacy_policy(privacy_html_dict, "HTML")
                    print("Summary Privacy in HTML format")
                return {
                    'success': True,
                    'summary_content': summary_content
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }