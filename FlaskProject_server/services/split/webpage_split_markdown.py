from langchain_text_splitters import MarkdownHeaderTextSplitter

# search the markdown text by the headers, which include #, ## and ###
def search_by_headers(text, n):
    """
    Search the markdown text by the headers, which include #, ## and ###
    There is a projection from h1, h2 and h3 to #, ## and ###, so we can directly split the markdown text by the headers.
    """
    headers_to_split_on = [("#"*n, f"Header {n}")]
    splitter = MarkdownHeaderTextSplitter(headers_to_split_on)
    sections = splitter.split_text(text)
    main_sections = [doc for doc in sections if doc.metadata!={} and len(doc.page_content)>=1000]

    return main_sections

# search the text by other headers, which include * and #
def search_by_others(text, n):
    """
    Search the text by other headers, which is a special situation (like there is a * in front of the header #/##/###)
    """
    headers_to_split_on = [("* "+"#"*n, f"Header {n}")]
    splitter = MarkdownHeaderTextSplitter(headers_to_split_on)
    sections = splitter.split_text(text)
    main_sections = [doc for doc in sections if doc.metadata!={} and len(doc.page_content)>=1000]

    return main_sections

# split the text by the headers
def split_by_markdown(readable_text, n, header):
    """
    Split the markdown text by the headers
    """
    # search the text by the headers
    target_headers = search_by_headers(readable_text, n)
    content = dict()
    # split the text by the headers
    for key in header.keys():
        target_header = header[key]
        target_sections = [doc for doc in target_headers
            if doc.metadata.get(f"Header {n}") != None and target_header in doc.metadata.get(f"Header {n}")]
        # if the text is not found, then search the text by other headers
        if len(target_sections)==0:
            target_headers = search_by_others(readable_text, n)
            target_sections = [doc for doc in target_headers
                if doc.metadata.get(f"Header {n}") != None and target_header in doc.metadata.get(f"Header {n}")]
            # if the text is not found, then return None
            if len(target_sections)==0:
                content[key] = None
            # if the text is found, then return the text
            else:
                content[key] = target_sections[0].page_content
        # if the text is found, then return the text
        else:
            content[key] = target_sections[0].page_content

    return content
