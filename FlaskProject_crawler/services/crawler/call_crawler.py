from .service import CrawlerService
from urllib.parse import urlparse


def crawl_privacy_policy(data):
    """
    receive the url from the frontend, crawl the content and save it to the data/privacy_policies directory
    
    request format:
    {
        "url": "https://example.com/privacy"
    }
    
    return format:
    {
        "success": true,
        "url": "https://example.com/privacy",
        "file_path": "data/privacy_policies/example.txt",
        "content_length": 12345
    }
    """
    try:
        # get the request data
        if not data or 'url' not in data:
            return {
                'success': False,
                'error': '请求中缺少URL参数'
            }, 400
        
        url = data['url']
        
        # call the crawler service to crawl the content
        crawler_service = CrawlerService()
        result = crawler_service.fetch_privacy_policy({
            'url': url,
            'wait_time': data.get('wait_time', 2)  # 可选参数
        })
        
        # check the crawl result
        if 'error' in result:
            return {
                'success': False,
                'error': result['error']
            }, 500
        
        # get the html content
        content_html = result.get('html', '')

        # return the crawl result
        return {
            'success': True,
            'url': url,
            'html': content_html,
            'content_length': len(content_html)
        }, 200
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }, 500 
