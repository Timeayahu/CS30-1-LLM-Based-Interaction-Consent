from .webpage_split import extract_section


class ExtractSection:
    def __init__(self):
        self.sections = {'Collect': None, 'Use': None, 'Share': None}

    def split(self, page):
        self.sections = extract_section(page)
        return self.sections
