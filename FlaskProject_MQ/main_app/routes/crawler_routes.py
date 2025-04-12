from flask import Blueprint, request, jsonify
from services.crawler import CrawlerService
import os
from urllib.parse import urlparse

# 创建爬虫Blueprint
crawler_bp = Blueprint('crawler', __name__)
crawler_service = CrawlerService()

# 设置隐私政策保存目录
PRIVACY_DATA_DIR = os.path.join("data", "privacy_policies")

def ensure_dir_exists(directory):
    """确保目录存在，如不存在则创建"""
    if not os.path.exists(directory):
        os.makedirs(directory)

@crawler_bp.route('/api/crawl', methods=['POST'])
def crawl_privacy_policy():
    """
    接收前端发送的URL，爬取内容并保存到data/privacy_policies目录
    
    请求格式:
    {
        "url": "https://example.com/privacy"
    }
    
    返回格式:
    {
        "success": true,
        "url": "https://example.com/privacy",
        "file_path": "data/privacy_policies/example.txt",
        "content_length": 12345
    }
    """
    try:
        # 获取请求数据
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({
                'success': False,
                'error': '请求中缺少URL参数'
            }), 400
        
        url = data['url']
        
        # 从URL中提取域名作为文件名
        domain = urlparse(url).netloc
        company_name = domain.split('.')[0]  # 使用域名第一部分作为公司名
        
        # 确保目录存在
        ensure_dir_exists(PRIVACY_DATA_DIR)
        
        # 设置保存路径
        file_path = os.path.join(PRIVACY_DATA_DIR, f"{company_name}.txt")
        
        # 调用爬虫服务爬取内容
        result = crawler_service.fetch_privacy_policy({
            'url': url,
            'wait_time': data.get('wait_time', 5)  # 可选参数
        })
        
        # 检查爬取结果
        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
        
        # 获取Markdown格式的内容
        content = result.get('markdown', '')
        
        # 保存到文件
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 返回爬取结果
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