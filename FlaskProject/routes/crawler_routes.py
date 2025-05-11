from flask import Blueprint, request, jsonify
from services.crawler import CrawlerService
import os
from urllib.parse import urlparse

crawler_bp = Blueprint('crawler', __name__)
crawler_service = CrawlerService()

# set the privacy policy save directory
PRIVACY_DATA_DIR = os.path.join("data", "privacy_policies")

def ensure_dir_exists(directory):
    """ensure the directory exists, if not, create it"""
    if not os.path.exists(directory):
        os.makedirs(directory)

@crawler_bp.route('/api/crawl', methods=['POST'])
def crawl_privacy_policy():
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
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({
                'success': False,
                'error': '请求中缺少URL参数'
            }), 400
        
        url = data['url']
        
        # extract the domain as the file name
        domain = urlparse(url).netloc
        company_name = domain.split('.')[0]  # use the first part of the domain as the company name
        
        # ensure the directory exists
        ensure_dir_exists(PRIVACY_DATA_DIR)
        
        # set the save path
        file_path = os.path.join(PRIVACY_DATA_DIR, f"{company_name}.txt")
        
        # call the crawler service to crawl the content
        result = crawler_service.fetch_privacy_policy({
            'url': url,
            'wait_time': data.get('wait_time', 5)  
        })
        
        # check the crawl result
        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
        
        # get the markdown content
        content = result.get('markdown', '')
        
        # save to the file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # return the crawl result
        return jsonify({
            'success': True,
            'url': url,
            'file_path': file_path,
            'content_length': len(content)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 