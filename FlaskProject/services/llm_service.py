from openai import OpenAI
import os
from dotenv import load_dotenv

class LLMService:
    def __init__(self):
        load_dotenv()
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.system_prompt = """You are a professional privacy policy analyst. 
        Please provide a concise summary of the following privacy policy text, 
        highlighting key terms and important information. Focus on:
        1. Data collection and usage
        2. User rights and obligations
        3. Security measures
        4. Third-party sharing
        5. Policy updates and changes"""
    
    def generate_summary(self, text):
        """
        Generate text summary using OpenAI API
        :param text: Input text
        :return: Generated summary
        """
        response = self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": text}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        return response.choices[0].message.content 