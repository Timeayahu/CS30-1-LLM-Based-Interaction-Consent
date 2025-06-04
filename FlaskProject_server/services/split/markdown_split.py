from langchain_openai.chat_models import ChatOpenAI
from langchain_core.messages import HumanMessage
import json
import re


response_format = """\
{'Collect': 'Data we will collect',
 'Use': 'How we will use your data',
 'Share': 'Who will share your data'}
"""

# remove the number and dot from the title
def clean_title(title):
    return re.sub(r"^\d+\.\s*", "", title.strip())

# allow for optional line breaks and whitespace between words
def multiline_fuzzy_pattern(title):
    # Escape the title first
    escaped = re.escape(title.strip())

    # Allow for optional line breaks and whitespace between words
    fuzzy = re.sub(r'\\ ', r'\\s*', escaped)  # turns '\ ' into '\s*'
    return fuzzy

# extract the titles from the text
def extract_titles(readable_text):
    model = ChatOpenAI(model="gpt-4o", temperature=0.1, model_kwargs={"response_format": {"type": "json_object"}})
    response = model.invoke([HumanMessage(content="Which title is most probably about the section of 'Information to be collected'?\n"
                                          "Which title is most probably about the section of 'How information will be used'?\n"
                                          "Which title is most probably about the section of 'Who will share your data'?\n"
                                          "- titles usually have one line space with other content"
                                          "- You should keep the original text in the markdown document, do not summary or modify"
                                          f"- Your response should be in json format like{response_format}. The keys have to be 'Collect', 'Use', 'Share'\n"
                                          "- Provide pure text answer, the answer should only contains litter a-z A-Z '?' and space ' '\n"
                                          "- Do not modify the upper or lower case of the original content"
                                          f"- All the answers must appear from the given list.\n\n Let's begin: {readable_text}")])

    target_header = json.loads(response.content)

    return target_header


def extract_sections(markdown_text, headers=None):
    # Normalize line breaks
    text = markdown_text.replace('\r\n', '\n')

    if headers== None:
        headers = extract_titles(text)
    else:
        headers = {k: clean_title(v) for k, v in headers.items()}

    # Create patterns to extract sections
    # Escape header patterns first
    collect_escaped = headers['Collect'].replace('?', r'\?')
    use_escaped = headers['Use'].replace('?', r'\?')
    share_escaped = headers['Share'].replace('?', r'\?')

    collect_flag = 0
    use_flag = 0
    share_flag = 0

    # if the title is longer than 60 characters, allow for optional line breaks and whitespace between words
    if len(collect_escaped)>60:
        collect_escaped = multiline_fuzzy_pattern(collect_escaped)
        collect_flag = re.MULTILINE

    if len(use_escaped)>60:
        use_escaped = multiline_fuzzy_pattern(use_escaped)
        use_flag = re.MULTILINE

    if len(share_escaped)>60:
        share_escaped = multiline_fuzzy_pattern(share_escaped)
        share_flag = re.MULTILINE

    # Now use them in raw f-strings
    collected_pattern = re.search(rf"({collect_escaped}\n\n|{collect_escaped}\*\*)", text, flags=collect_flag)
    use_pattern = re.search(rf"({use_escaped}\n\n|{use_escaped}\*\*)", text, flags=use_flag)
    share_pattern = re.search(rf"({share_escaped}\n\n|{share_escaped}\*\*)", text, flags=share_flag)


    # Get start indices
    collected_start = collected_pattern.start() if collected_pattern else -1
    use_start = use_pattern.start() if use_pattern else -1
    share_start = share_pattern.start() if share_pattern else -1

    # Sort and slice based on order of appearance
    indices = sorted([(collected_start, 'Collect'), (use_start, 'Use'), (share_start, 'Share')])
    sections = {}
    # slice the text into sections
    for i, (start, label) in enumerate(indices):
        end = indices[i + 1][0] if i + 1 < len(indices) else min(indices[i][0]+12000,len(text))
        sections[label] = text[start:end].strip()

    # if the title is the same, then merge the sections
    if collect_escaped == use_escaped:
        if sections['Collect'] == "" and sections['Use']!="":
            sections['Collect'] = sections['Use']
        elif sections['Use'] == "" and sections['Collect']!= "":
            sections['Use'] = sections['Collect']

    return sections

