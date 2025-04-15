from spider import WebCrawler, simple_fetch

class CrawlerService:
    def __init__(self, config=None):
        self.config = config or {}
        self.crawler = WebCrawler(self.config.get('base_url', 'https://example.com'))
    
    def get_data(self, target_path):
        """服务接口方法，获取数据"""
        html = self.crawler.crawl(target_path)
        data = self.crawler.parse(html)
        return data
    
    def fetch_page_content(self, url):
        """使用简单请求获取页面内容"""
        return simple_fetch(url)
    
    def fetch_privacy_policy(self, params):
        """获取隐私政策页面的内容
        
        Args:
            params: 包含以下可选键的字典:
                - url: 要爬取的URL
                - wait_time: 等待时间(秒)
                - save_path: 保存结果的路径
                
        Returns:
            dict: 包含HTML和Markdown格式内容的字典
        """
        url = params.get('url')
        wait_time = params.get('wait_time', 5)
        save_path = params.get('save_path')
        
        return self.crawler.selenium_crawl(
            url=url,
            wait_time=wait_time,
            save_path=save_path
        )
    
    def get_privacy_policy_text(self, url):
        """简化的API，只返回隐私政策的Markdown文本
        
        Args:
            url: 隐私政策页面的URL
            
        Returns:
            str: 转换后的Markdown文本
        """
        result = self.crawler.selenium_crawl(url=url)
        return result.get('markdown', '')
    
