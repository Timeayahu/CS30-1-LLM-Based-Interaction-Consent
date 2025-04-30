from .service import CrawlerService
from urllib.parse import urlparse

crawler_service = CrawlerService()

def crawl_privacy_policy(data):
    """
    接收前端发送的URL，爬取隐私政策内容
    
    请求格式:
    {
        "url": "https://example.com/privacy"
    }
    
    返回格式:
    {
        "success": true,
        "url": "https://example.com/privacy",
        "markdown": "隐私政策内容（Markdown格式）",
        "html": "隐私政策内容（HTML格式）",
        "content_length": 12345
    }
    """
    try:
        # 获取请求数据
        if not data or 'url' not in data:
            return {
                'success': False,
                'error': '请求中缺少URL参数'
            }, 400
        
        url = data['url']
        
        # 从URL中提取域名作为公司名
        domain = urlparse(url).netloc
        company_name = domain.split('.')[0]  # 使用域名第一部分作为公司名
        
        # 调用爬虫服务爬取内容
        result = crawler_service.fetch_privacy_policy({
            'url': url,
            'wait_time': data.get('wait_time', 5)  # 可选参数
        })
        
        # 检查爬取结果
        if 'error' in result:
            return {
                'success': False,
                'error': result['error']
            }, 500
        
        # 获取Markdown和HTML格式的内容
        content_markdown = result.get('markdown', '')
        content_html = result.get('html', '')

        # 返回爬取结果
        return {
            'success': True,
            'url': url,
            'markdown': content_markdown,
            'html': content_html,
            'content_length': len(content_markdown)
        }, 200
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }, 500 
