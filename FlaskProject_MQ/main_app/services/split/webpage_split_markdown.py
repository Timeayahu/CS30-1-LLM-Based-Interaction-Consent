from langchain_text_splitters import MarkdownHeaderTextSplitter


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


def split_by_markdown(readable_text, n, header):
    target_headers = search_by_headers(readable_text, n)
    content = dict()
    for key in header.keys():
        target_header = header[key]
        target_sections = [doc for doc in target_headers
            if doc.metadata.get(f"Header {n}") != None and target_header in doc.metadata.get(f"Header {n}")]

        if len(target_sections)==0:
            target_headers = search_by_others(readable_text, n)
            target_sections = [doc for doc in target_headers
                if doc.metadata.get(f"Header {n}") != None and target_header in doc.metadata.get(f"Header {n}")]
            if len(target_sections)==0:
                content[key] = None
            else:
                content[key] = target_sections[0].page_content
        else:
            content[key] = target_sections[0].page_content

    return content
