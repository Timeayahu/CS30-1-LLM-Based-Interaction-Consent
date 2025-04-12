from .llm_classification_service import ClassificationService
from utils.text_processor import TextProcessor
import os
from utils import text_processor

text_processor = text_processor.TextProcessor()

class ClassificationPrivacyService:
    def __init__(self):
        self.classification_service = ClassificationService()
        self.text_processor = TextProcessor()

    def generate_classification_content(self, company_name, html_content, markdown_content):
        try:
            # Check whether the html is None or doesn't have content
            if html_content is None or len(html_content) == 0:
                return {
                    'success': False,
                    'error': 'No HTML content.'
                }

            # Check whether the markdown is None or doesn't have content
            if markdown_content is None or len(markdown_content) == 0:
                return {
                    'success': False,
                    'error': 'No Markdown content.'
                }

            privacy_dict = dict()
            privacy_dict['company_name'] = company_name
            privacy_dict['content'] = html_content
            privacy_dict['format'] = 'HTML'
          

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
                classification_content = self.classification_service.classification_privacy_policy(privacy_dict)
                print("Classification Privacy in Markdown format")
                if "error" in classification_content:
                    privacy_dict['content'] = html_content
                    privacy_dict['format'] = 'HTML'
                    classification_content = self.classification_service.classification_privacy_policy(privacy_dict)
                    print("Classification Privacy in HTML format")
                    if 'error' in classification_content:
                        classification_content['success'] = False
                        return classification_content
                return {
                    'success': True,
                    'classification_content': classification_content.get('result', '')
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }