from flask import Blueprint, request, jsonify
from services.llm_privacy_summary.call_chat import handle_chat_request

# 创建聊天Blueprint
chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/api/chat', methods=['POST'])
def chat():
    """
    处理用户聊天请求
    
    请求格式:
    {
        "user_input": "用户输入的文本",
        "session_id": "会话ID（可选）",
        "context": "额外的上下文信息（可选）"
    }
    
    返回格式:
    {
        "success": true,
        "response": {
            // AI生成的JSON响应
        },
        "session_id": "会话ID"
    }
    """
    data = request.get_json()
    result, status_code = handle_chat_request(data)
    return jsonify(result), status_code 