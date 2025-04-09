# main.py
from services.crawler.call_crawler import crawl_privacy_policy

if __name__ == "__main__":
    crawl_privacy_policy({'url': "https://www.apple.com/legal/privacy/en-ww/"})

