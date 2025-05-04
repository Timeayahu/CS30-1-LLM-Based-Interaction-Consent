import os
from langchain_openai.chat_models import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain_text_splitters import HTMLHeaderTextSplitter
import json
import re
from collections import Counter


response_format = """\
{'Collect': 'Data we will collect',
 'Use': 'How we will use your data',
 'Share': 'Who will share your data'}
"""


def search_by_headers(text, n):
    html_splitter = HTMLHeaderTextSplitter(headers_to_split_on=[(f"h{n}", f"Header {n}")])
    sections = html_splitter.split_text(text)
    main_sections = [doc for doc in sections if doc.metadata!={} and len(doc.page_content)>=100]

    return main_sections


def extract_section(readable_text):

    model = ChatOpenAI(model="gpt-4o", temperature=0.1, model_kwargs={"response_format": {"type": "json_object"}})
    response = model.invoke([HumanMessage(content="Which title is most probably about the section of 'Information to be collected'?\n"
                                          "Which title is most probably about the section of 'How information will be used'?\n"
                                          "Which title is most probably about the section of 'Who will share your data'?\n"
                                          "- You should keep the original text in the markdown document, do not summary or modify"
                                          f"- Your response should be in json format like{response_format}. The keys have to be 'Collect', 'Use', 'Share'\n"
                                          "- Provide pure text answer, the answer should only contains litter a-z A-Z and space ' '\n"
                                          "- Do not modify the upper or lower case of the original content"
                                          f"- All the answers must appear from the given list.\n\n Let's begin: {readable_text}")])

    target_header = json.loads(response.content)

    return target_header


def find_exclusive_title_matches(markdown_text, title_text):
    
    escaped = re.escape(title_text)
    # Order matters: start from most specific
    patterns = [
        ('numbered_bold', rf'^\s*\*\*\d+\\\.\s*{escaped}\*\*\s*$'),    # **1\. Definitions**
        ('bold', rf'^\s*\*\*{escaped}\*\*\s*$'),                      # **Definitions**
        ('italic', rf'^\s*\*{escaped}\*\s*$'),                        # *Definitions*
        ('list_heading', rf'^\s*[-*+]\s+#{{1,6}}\s+{escaped}\s*$'),   # * ## Title
        ('heading_1', rf'^\s*#\s*\*{{0,2}}{escaped}\*{{0,2}}\s*$'),
        ('heading_2', rf'^\s*##\s*\*{{0,2}}{escaped}\*{{0,2}}\s*$'),
        ('heading_3', rf'^\s*###\s*\*{{0,2}}{escaped}\*{{0,2}}\s*$'),
        ('list', rf'^\s*[-*+]\s+{escaped}\s*$'),                      # - Definitions
    ]

    matched_lines = set()
    results = []

    for line_num, line in enumerate(markdown_text.splitlines(), 1):
        stripped = line.strip()
        if stripped in matched_lines:
            continue
        for label, pattern in patterns:
            if re.match(pattern, stripped):
                results.append({'type': label, 'line': stripped, 'line_number': line_num})
                matched_lines.add(stripped)
                break  # Stop after first match to ensure exclusivity
    return results

patterns_dict = {
    'numbered_bold': r'^\*\*\d+\\\.\s+.+?\*\*\s*$',  # e.g., **1\. Definitions**
    'bold':         r'^\*\*.+?\*\*\s*$',             # e.g., **Privacy Policy**
    'italic':       r'^\*[^*].*?\*\s*$',             # e.g., *Overview*
    'list_heading': r'^\s*[-*+]\s+#{1,6}\s+.+\s*$',     # e.g., * ## Section Heading
    'heading_1': r'^\s*#\s+\*{0,2}.+?\*{0,2}\s*$',
    'heading_2': r'^\s*##\s+\*{0,2}.+?\*{0,2}\s*$',
    'heading_3': r'^\s*###\s+\*{0,2}.+?\*{0,2}\s*$',
    'list':         r'^[-*+]\s+.+\s*$',              # e.g., - Bullet Title
}


def split_markdown_by_single_pattern(markdown_text, pattern):
    """
    Splits the markdown into sections using only one specified regex pattern.
    """
    matches = list(re.finditer(pattern, markdown_text, flags=re.MULTILINE))
    
    if not matches:
        return [{"title": None, "content": markdown_text.strip()}]

    sections = dict()
    for i, match in enumerate(matches):
        title = match.group().strip()
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(markdown_text)
        
        section_text = markdown_text[start:end].strip()
        content = section_text[len(title):].strip()
        
        sections[title] = content

    return sections
