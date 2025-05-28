from .llm_classification_service import ClassificationService

# service for the classification of the privacy policy
class ClassificationPrivacyService:
    def __init__(self):
        self.classification_service = ClassificationService()

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

            # create a dictionary for the privacy policy classification
            privacy_dict = dict()
            privacy_dict['company_name'] = company_name
            privacy_dict['content'] = markdown_content
            privacy_dict['format'] = 'Markdown'

            # call the classification service for the privacy policy            
            classification_content = self.classification_service.classification_privacy_policy(privacy_dict)

            # if the error is in the response, try to classify the privacy policy in HTML format
            if "error" in classification_content:
                privacy_dict['content'] = html_content
                privacy_dict['format'] = 'HTML'
                classification_content = self.classification_service.classification_privacy_policy(privacy_dict)
                print("Classification Privacy in HTML format")
                
                # if the error is in the response, return the error
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
