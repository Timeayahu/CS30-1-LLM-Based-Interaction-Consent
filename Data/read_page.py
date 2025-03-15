from langchain.document_loaders import PlaywrightURLLoader
import pandas as pd


def load_webpage(name, link):
    try:
        urls = [link]
        loader = PlaywrightURLLoader(urls=urls)
        docs = loader.load()

        with open(f'D:\\实习\\privacy\\{name}.txt', 'w', encoding='utf-8') as file:
            file.write(docs[0].page_content)
        print(name)
    except Exception:
        print(f'Errors occur when fetching webpage {name}')


data = pd.read_csv(r'D:\实习\c30-1 dataset.csv')
data.apply(lambda row: load_webpage(row['Company'], row['Link']), axis=1)

load_webpage('tesla', 'https://www.tesla.com/legal/privacy')