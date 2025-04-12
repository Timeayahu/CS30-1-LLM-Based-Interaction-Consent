from services.llm_service import LLMService
from utils.text_processor import TextProcessor
import os

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

    def generate_highlight_content(self, folder_path, filename):
        try:
            if not folder_path or not os.path.exists(folder_path):
                return {
                    'success': False,
                    'error': 'Invalid folder path'
                }

            # 加载文件夹中的所有文本文件
            privacy_text_dict = self.text_processor.load_text_file(folder_path, filename)
            if not privacy_text_dict:
                return {
                    'success': False,
                    'error': 'No privacy policy file found in the folder'
                }

            # 生成高亮内容
            highlight_content = self.llm_service.classify_privacy_policy(privacy_text_dict)
            
            return {
                'success': True,
                'highlight_content': highlight_content
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }