import os
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage
from collections import Counter
import html2text
from langchain_text_splitters import MarkdownHeaderTextSplitter
from handle_exception_page import exceptions_handling


os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_API_KEY"] = "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"
os.environ["OPENAI_API_KEY"] = "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"
os.environ["SERPAPI_API_KEY"] = "70a08d7f2b16602366468c3df268fc9f7f16f52c4020d138931f0c387363799e"


def search_by_headers(text, n):
    headers_to_split_on = [("#"*n, f"Header {n}")]
    splitter = MarkdownHeaderTextSplitter(headers_to_split_on)
    sections = splitter.split_text(text)
    main_sections = [doc for doc in sections if doc.metadata!={} and len(doc.page_content)>=1000]

    return main_sections

def search_by_others(text, n):
    headers_to_split_on = [("* "+"#"*n, f"Header {n}")]
    splitter = MarkdownHeaderTextSplitter(headers_to_split_on)
    sections = splitter.split_text(text)
    main_sections = [doc for doc in sections if doc.metadata!={} and len(doc.page_content)>=1000]

    return main_sections


def split_by_markdown(readable_text, n, target_header):

    target_headers = search_by_headers(readable_text, n)
    target_sections = [doc for doc in target_headers
        if doc.metadata.get(f"Header {n}") != None and target_header in doc.metadata.get(f"Header {n}")]

    if len(target_sections)==0:
        target_headers = search_by_others(readable_text, n)
        target_sections = [doc for doc in target_headers
            if doc.metadata.get(f"Header {n}") != None and target_header in doc.metadata.get(f"Header {n}")]
        content = target_sections[0].page_content
    else:
        content = target_sections[0].page_content

    return content


