import os
import re
import json

class TextProcessor:
    def preprocess(self, text):
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        # Remove special characters
        text = ''.join(char for char in text if char.isprintable())
        return text
    
    def postprocess(self, text):
        
        # Format the summary with proper spacing
        text = ' '.join(text.split())
        # Add proper punctuation if missing
        if not text.endswith(('.', '!', '?')):
            text += '.'
        return text 
    
    # Used in llm_privacy_classification.classification_service.py
    def load_text_file(self, folder_path, filename):
        file_dict = {}
        if filename.endswith(".json"):
            file_path = os.path.join(folder_path, filename)
            with open(file_path, "r", encoding="utf-8") as file:
                try:
                    file_dict[filename] = json.load(file)
                except json.JSONDecodeError:
                    print(f"Error decoding JSON in {filename}")
        return file_dict

    # Used in llm_privacy_classification.llm_classification_service.py
    def clean_json_string(self, json_str):
        json_str = re.sub(r"```json\s*", "", json_str)
        json_str = re.sub(r"```", "", json_str)
        return json_str.strip()