from flask import Blueprint, request, jsonify
from services.crawler import call_crawler
import os
from urllib.parse import urlparse

# 创建爬虫Blueprint
crawler_bp = Blueprint('crawler', __name__)


@crawler_bp.route('/api/crawl', methods=['POST'])
def crawl_privacy_policy_api():
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
    data = request.get_json()
    result, status = call_crawler.crawl_privacy_policy(data)
    return jsonify(result), status
    
