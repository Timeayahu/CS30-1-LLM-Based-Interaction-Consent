import os
from langchain_openai.chat_models import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain_text_splitters import HTMLHeaderTextSplitter
from collections import Counter
from .webpage_split_markdown import split_by_markdown
from .markdown_split import extract_sections
import html2text
import json


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


def extract_section(html_text):
    readable_text = html2text.html2text(html_text)

    h1_sections = search_by_headers(html_text, 1)
    h2_sections = search_by_headers(html_text, 2)
    h3_sections = search_by_headers(html_text, 3)

    header_names_h1 = [doc.metadata.get("Header 1") for doc in h1_sections]
    header_names_h2 = [doc.metadata.get("Header 2") for doc in h2_sections]
    header_names_h3 = [doc.metadata.get("Header 3") for doc in h3_sections]

    if len(header_names_h1) <= 2 and len(header_names_h2) <= 2 and len(header_names_h3) <= 2:
        return extract_sections(readable_text)

    n_completions = 1  # Number of responses to generate
    responses = []
    model = ChatOpenAI(model="gpt-4o", temperature=0)
    for _ in range(n_completions):
        response = model.invoke([HumanMessage(content=f"The following question is only for research purpose. Which level of header is most probably how the website devides major aspects of privacy \n\n"
                                        "Hint: The target header should be relatively short and represent high level of definition\n\nYour response should either be h1, h2, or h3, only contain h1/2/3 in the response. The answer should not be an empty list\n\n"
                                        f"Let's begin: h1 = {str(header_names_h1)}"
                                        f"h2 = {str(header_names_h2)}"
                                        f"h3 = {str(header_names_h3)}")])
        responses.append(response.content.strip())



    most_common_response = Counter(responses).most_common(1)[0][0]
    print(most_common_response)
    
    if 'h1' in most_common_response:
        target_header_names = header_names_h1
        header_type = 1
    elif 'h2' in most_common_response:
        target_header_names = header_names_h2
        header_type = 2
    elif 'h3' in most_common_response:
        target_header_names = header_names_h3
        header_type = 3

   

    if len(target_header_names) <= 2:
        return extract_sections(readable_text)

    print(target_header_names)

    model = ChatOpenAI(model="gpt-4o", temperature=0.1, model_kwargs={"response_format": {"type": "json_object"}})
    response = model.invoke([HumanMessage(content=f"Which title is most probably about the section of 'Information to be collected'?\n"
                                          f"Which title is most probably about the section of 'How information will be used'?\n"
                                          f"Which title is most probably about the section of 'Who will share your data'?\n"
                                          f"Your response should be in json format like{response_format}. The keys have to be 'Collect', 'Use', 'Share'"
                                          f"All the answers must appear from the given list. Let's begin: {str(target_header_names)}")])

    target_header = json.loads(response.content)
    print(target_header)
    content = split_by_markdown(readable_text, header_type, target_header)

    if content['Collect'] == None or content['Use'] == None or content['Share'] == None:
        content = extract_sections(readable_text, headers=target_header)

    return content
