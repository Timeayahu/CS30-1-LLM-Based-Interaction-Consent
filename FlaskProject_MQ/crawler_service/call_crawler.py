from service import CrawlerService
import os
from urllib.parse import urlparse


crawler_service = CrawlerService()

# set privacy policy save directory
PRIVACY_DATA_DIR = os.path.join("data", "privacy_policies")

def ensure_dir_exists(directory):
    """ensure directory exists, create if not exists"""
    if not os.path.exists(directory):
        os.makedirs(directory)

def crawl_privacy_policy(data):
    """
    receive URL from frontend, crawl content and save to data/privacy_policies directory
    
    request format:
    {
        "url": "https://example.com/privacy"
    }
    
    response format:
    {
        "success": true,
        "url": "https://example.com/privacy",
        "file_path": "data/privacy_policies/example.txt",
        "content_length": 12345
    }
    """
    try:
        # get request data
        if not data or 'url' not in data:
            return {
                'success': False,
                'error': 'URL parameter missing in request'
            }, 400
        
        url = data['url']
        
        # extract domain name as file name
        domain = urlparse(url).netloc
        company_name = domain.split('.')[0]  # use the first part of the domain as company name
        
        # ensure directory exists
        ensure_dir_exists(PRIVACY_DATA_DIR)
        
        # set save path
        file_path_markdown = os.path.join(PRIVACY_DATA_DIR, f"{company_name}_markdown.txt")
        file_path_html = os.path.join(PRIVACY_DATA_DIR, f"{company_name}_html.txt")
        
        # call crawler service to crawl content
        result = crawler_service.fetch_privacy_policy({
            'url': url,
            'wait_time': data.get('wait_time', 5)  # optional parameter
        })
        
        # check crawl result
        if 'error' in result:
            return {
                'success': False,
                'error': result['error']
            }, 500
        
        # get markdown content
        content_markdown = result.get('markdown', '')
        content_html = result.get('html', '')
        
        # save to file
        with open(file_path_markdown, 'w', encoding='utf-8') as f:
            f.write(content_markdown)

        with open(file_path_html, 'w', encoding='utf-8') as f:
            f.write(content_html)

        # return crawl result
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
