from .spider import WebCrawler

class CrawlerService:
    def __init__(self, config=None):
        self.config = config or {}
        self.crawler = WebCrawler(self.config.get('base_url', 'https://example.com'))
    
    def fetch_privacy_policy(self, params):
        url = params.get('url')
        wait_time = params.get('wait_time', 5)
        
        return self.crawler.selenium_crawl(
            url=url,
            wait_time=wait_time
        )

    
