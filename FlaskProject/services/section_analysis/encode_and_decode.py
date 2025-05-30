import re

# check if the word occurs more than n times in the paragraph
def word_occurs_more_than_3_times(paragraph, word, n):
    # Match only whole words using regex (e.g., "test" not "testing")
    pattern = rf'\b{re.escape(word)}\b'
    matches = re.findall(pattern, paragraph, flags=re.IGNORECASE)
    return len(matches) > n

# sensitive words and their encoded words
sensitive_words = {
    "Google": {"Google": "xiugou", "Chrome": "chouchou"},
    "Facebook": {"Facebook": "lianshu", " meta ": " maita "},
    "Microsoft": {"Microsoft": "ruanhuo", "outlook": "chuqukan", "onedrive": "yunpan"},
}

# check if a privacy policy is from a specific company that OpenAI avoids to analyze
def sensitive_word_in_paragraph(paragraph, n, sensitive_words):
    for key, value in sensitive_words.items():
        if word_occurs_more_than_3_times(paragraph, key, n):
            return key, value
    return None, None
        
# encode the paragraph by replacing the sensitive words with the encoded words
def encode_paragraph(paragraph, encode_dict):
    text = paragraph
    for key, value in encode_dict.items():
        text = re.sub(key, value, text, flags=re.IGNORECASE)
    return text

# decode the paragraph by replacing the encoded words with the sensitive words
def decode_paragraph(paragraph, decode_dict):
    text = paragraph
    for key, value in decode_dict.items():
        text = re.sub(value, key, text, flags=re.IGNORECASE)
    return text
