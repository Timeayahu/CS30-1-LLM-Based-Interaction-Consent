from .webpage_split import extract_section


class ExtractSection:
    def __init__(self):
        self.sections = {'Collect': None, 'Use': None, 'Share': None}

    def split(self, page):
        self.sections = extract_section(page)
        return self.sections
'''
from .markdown_split import *
import html2text

class ExtractSection:
    def __init__(self):
        self.split_sections = {'Collect': None, 'Use': None, 'Share': None}

    def split(self, page):
        readable_text = html2text.html2text(page)
        result = extract_section(readable_text)

        info_collection = find_exclusive_title_matches(readable_text, result['Collect'].strip('`'))
        info_use = find_exclusive_title_matches(readable_text, result['Use'].strip('`'))
        info_share = find_exclusive_title_matches(readable_text, result['Share'].strip('`'))
        types = [info_collection[-1]['type'] if info_collection!=[] else None, 
                info_use[-1]['type'] if info_use!=[] else None, 
                info_share[-1]['type'] if info_share!=[] else None]
        counter = Counter(types)
        most_common_type, count = counter.most_common(1)[0]
        sections = split_markdown_by_single_pattern(readable_text, patterns_dict[most_common_type])
        result = dict()
        content = {'Collect': info_collection[-1]['line'] if info_collection!=[] else None,
                    'Use': info_use[-1]['line'] if info_use!=[] else None, 
                    'Share': info_share[-1]['line'] if info_collection!=[] else None}
        for key in content.keys():
            if content[key] in sections:
                result[key] = sections[content[key]]
            else:
                result[key] = readable_text
            
        self.split_sections = result

        return self.split_sections
'''
