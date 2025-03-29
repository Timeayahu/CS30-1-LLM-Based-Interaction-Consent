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