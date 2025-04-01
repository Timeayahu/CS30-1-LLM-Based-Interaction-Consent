from .service import ExtractSection

split_service = ExtractSection()

def extract_webpage_content(page):
    sections = split_service.split(page)
    return sections