import os
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage
from langchain.text_splitter import HTMLHeaderTextSplitter
import sys
from collections import Counter
from webpage_split_markdown import split_by_markdown
import html2text


os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_API_KEY"] = "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"
os.environ["OPENAI_API_KEY"] = "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"
os.environ["SERPAPI_API_KEY"] = "70a08d7f2b16602366468c3df268fc9f7f16f52c4020d138931f0c387363799e"


model = init_chat_model("gpt-4o-mini", model_provider="openai")



def search_by_headers(text, n):
    html_splitter = HTMLHeaderTextSplitter(headers_to_split_on=[(f"h{n}", f"Header {n}")])
    sections = html_splitter.split_text(text)
    main_sections = [doc for doc in sections if doc.metadata!={} and len(doc.page_content)>=100]

    return main_sections


def extract_section(html_text):
    h1_sections = search_by_headers(html_text, 1)
    h2_sections = search_by_headers(html_text, 2)
    h3_sections = search_by_headers(html_text, 3)

    header_names_h1 = [doc.metadata.get("Header 1") for doc in h1_sections]
    header_names_h2 = [doc.metadata.get("Header 2") for doc in h2_sections]
    header_names_h3 = [doc.metadata.get("Header 3") for doc in h3_sections]

    n_completions = 5  # Number of responses to generate
    responses = []
    model = init_chat_model("gpt-4o", temperature=0, model_provider="openai")
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
        target_headers = h1_sections
        target_header_names = header_names_h1
        header_type = 1
    elif 'h2' in most_common_response:
        target_headers = h2_sections
        target_header_names = header_names_h2
        header_type = 2
    elif 'h3' in most_common_response:
        target_headers = h3_sections
        target_header_names = header_names_h3
        header_type = 3
    else:
        sys.exit("Uncommon webpage!")

    response = model.invoke([HumanMessage(content=f"Which header is most probably about the section of 'Information to be collected'?\n\n"
                                      f"Your response should only contain the header string. Let's begin: {str(target_header_names)}")])
    target_header = response.content
    print(target_header)

    readable_text = html2text.html2text(html_text)

    content = split_by_markdown(readable_text, header_type, target_header)

    return content

if __name__ == "__main__":
    
    #file_name = r'D:\5703\Microsoft privacy policy html.txt'
    file_name = r'D:\5703\Apple privacy policy html.txt'
    #file_name = r'D:\5703\privacy_policy_google_body.txt'
    #file_name = r'D:\5703\privacy_policy_tesla_body.txt'
    #file_name = r'D:\5703\privacy_policy_uber_body.txt'

    with open(file_name, 'r', encoding="utf-8") as file:
        html_text = file.read()

    content = extract_section(html_text)

    with open(r'D:\5703\privacy_policy_apple_section.txt', 'w', encoding='utf-8') as file:
        file.write(content)