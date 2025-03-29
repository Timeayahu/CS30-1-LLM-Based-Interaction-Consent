from flask import Blueprint, request, jsonify
from services.privacy_service import PrivacyService

privacy_bp = Blueprint('privacy', __name__)
privacy_service = PrivacyService()

@privacy_bp.route('/api/summarize', methods=['POST'])
def summarize_privacy():
    data = request.get_json()
    privacy_text = data.get('text', '')
    
    result = privacy_service.generate_summary(privacy_text)
    return jsonify(result), 400 if not result['success'] else 200 