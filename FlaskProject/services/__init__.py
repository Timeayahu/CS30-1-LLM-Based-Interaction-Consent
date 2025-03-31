from .crawler.service import CrawlerService

# 确保爬虫服务已经在服务映射中
services_map = {
    # ... 其他服务 ...
    'crawler': CrawlerService,
} 