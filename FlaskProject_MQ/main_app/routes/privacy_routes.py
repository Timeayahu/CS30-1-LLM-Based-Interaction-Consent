from flask import Blueprint, request, jsonify

from services import CrawlerService
from services.crawler.call_crawler import crawl_privacy_policy
from services.privacy_service import PrivacyService
from services.privacy_file_service import PrivacyFileService
from services.llm_privacy_classification.classification_service import ClassificationPrivacyService
from services.llm_privacy_summary.summary_service import SummaryPrivacyService

privacy_bp = Blueprint('privacy', __name__)
privacy_service = PrivacyService()
privacy_file_service = PrivacyFileService()
classification_privacy_service = ClassificationPrivacyService()
summary_privacy_service = SummaryPrivacyService()
crawler_service = CrawlerService()

@privacy_bp.route('/api/summarize', methods=['POST'])
def summarize_privacy():
    data = request.get_json()
    response, status_code = crawl_privacy_policy(data)
    url = response.get('url', None)
    html_content = response.get('html', None)
    markdown_content = response.get('markdown', None)

    result = summary_privacy_service.generate_summary_content(url, html_content, markdown_content)
    return jsonify(result), 400 if not result['success'] else 200

@privacy_bp.route('/api/highlight', methods=['POST'])
def highlight_privacy():
    data = request.get_json()
    response, status_code = crawl_privacy_policy(data)
    url = response.get('url', None)
    html_content = response.get('html', None)
    markdown_content = response.get('markdown', None)

    result = classification_privacy_service.generate_classification_content(url, html_content, markdown_content)
    return jsonify(result), 400 if not result['success'] else 200