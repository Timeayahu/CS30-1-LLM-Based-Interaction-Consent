from spider import WebCrawler, simple_fetch

class CrawlerService:
    def __init__(self, config=None):
        self.config = config or {}
        self.crawler = WebCrawler(self.config.get('base_url', 'https://example.com'))
    
    def get_data(self, target_path):
        """service interface method, get data"""
        html = self.crawler.crawl(target_path)
        data = self.crawler.parse(html)
        return data
    
    def fetch_page_content(self, url):
        """use simple request to get page content"""
        return simple_fetch(url)
    
    def fetch_privacy_policy(self, params):
        
        url = params.get('url')
        wait_time = params.get('wait_time', 5)
        save_path = params.get('save_path')
        
        return self.crawler.selenium_crawl(
            url=url,
            wait_time=wait_time,
            save_path=save_path
        )
    
    def get_privacy_policy_text(self, url):
        
        result = self.crawler.selenium_crawl(url=url)
        return result.get('markdown', '')
    
