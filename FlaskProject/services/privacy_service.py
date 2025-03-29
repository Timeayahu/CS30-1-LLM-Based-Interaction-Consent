from services.llm_service import LLMService
from utils.text_processor import TextProcessor

class PrivacyService:
    def __init__(self):
        self.llm_service = LLMService()
        self.text_processor = TextProcessor()
    
    def generate_summary(self, text):
        
        try:
            if not text:
                return {
                    'success': False,
                    'error': 'Text content cannot be empty'
                }

            # Pre-process the text
            processed_text = self.text_processor.preprocess(text)
            
            # Generate summary using LLM
            summary = self.llm_service.generate_summary(processed_text)
            
            # Post-process the summary
            final_summary = self.text_processor.postprocess(summary)
            
            return {
                'success': True,
                'summary': final_summary
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            } 