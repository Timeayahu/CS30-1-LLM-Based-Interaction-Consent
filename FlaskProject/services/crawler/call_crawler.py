from .service import CrawlerService
from urllib.parse import urlparse

crawler_service = CrawlerService()

def crawl_privacy_policy(data):
   
    try:
        # get request data
        if not data or 'url' not in data:
            return {
                'success': False,
                'error': 'URL parameter is missing in the request'
            }, 400
        
        url = data['url']
        
        # extract domain as company name
        domain = urlparse(url).netloc
        company_name = domain.split('.')[0]  # use the first part of the domain as company name    
        result = crawler_service.fetch_privacy_policy({
            'url': url,
            'wait_time': data.get('wait_time', 5)  
        })
        
        if 'error' in result:
            return {
                'success': False,
                'error': result['error']
            }, 500
        
        # get markdown and html content
        content_markdown = result.get('markdown', '')
        content_html = result.get('html', '')

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
