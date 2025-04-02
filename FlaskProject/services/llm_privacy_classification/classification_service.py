from services.llm_privacy_classification.llm_classification_service import ClassificationService
from utils.text_processor import TextProcessor
import os
from urllib.parse import urlparse
from utils import text_processor

text_processor = text_processor.TextProcessor()

class ClassificationPrivacyService:
    def __init__(self):
        self.llm_classification_service = ClassificationService()
        self.text_processor = TextProcessor()

    def generate_classification_content(self, url, html_content, markdown_content):
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

            classification_folder_path = "data/classification_result"
            file_name = company_name + "_classification_result.json"
            path = os.path.join(classification_folder_path, file_name)
            if os.path.exists(path):
                # file_name = company_name + "_classification_result.json"
                classification_content = text_processor.load_text_file(classification_folder_path, file_name)[file_name]
                return {
                    'success': True,
                    'classification_content': classification_content
                }
            if not os.path.exists(path):
                # Generate the classification result
                classification_content = self.llm_classification_service.classification_privacy_policy(privacy_markdown_dict, "Markdown")
                print("Classification Privacy in Markdown format")
                if "error" in classification_content[company_name]:
                    classification_content = self.llm_classification_service.classification_privacy_policy(privacy_html_dict, "HTML")
                    print("Classification Privacy in HTML format")
                return {
                    'success': True,
                    'classification_content': classification_content
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }