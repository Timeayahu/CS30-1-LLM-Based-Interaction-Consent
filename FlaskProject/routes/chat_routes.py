from flask import Blueprint, request, jsonify
from services.chatbox.call_chat import handle_chat_request, handle_general_chat_request
from models.mongodb_local import get_policy_by_id, get_summary
from bson import ObjectId

# 创建聊天Blueprint
chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/api/chat', methods=['POST'])
def chat():
    """
    处理用户聊天请求
    
    请求格式:
    {
        "policy_id": "...",           // 隐私政策的MongoDB ID
        "category_name": "...",       // 类别名称（如"收集哪些数据"）
        "bubble_summary": "...",      // 气泡摘要或选中文本
        "user_question": "..."        // 用户实际问题
    }
    
    返回格式:
    {
        "success": true,
        "response": {
            // AI生成的JSON响应
        },
       
    }
    
    三段式Prompt结构:
    系统会使用三部分结构的提示:
    1. 系统消息: 包含隐私政策的全局摘要
    2. 上下文消息: 包含类别和气泡信息，如请求则附带原文
    3. 用户消息: 包含用户的实际问题
    
    原文获取:
    仅当用户在问题中明确包含"查看原文"、"显示原文"等关键词时，
    系统才会获取并返回原文内容。系统能识别多种语言的原文请求关键词。
    
    多语言支持:
    系统会自动使用与用户问题相同的语言回复。
    无需额外配置，GPT会自动处理多语言响应。
    """
    data = request.get_json()
    result = handle_chat_request(data)
    return jsonify(result)

@chat_bp.route('/api/general-chat', methods=['POST'])
def general_chat():
    """
    处理通用聊天请求（不需要类别和气泡摘要）
    
    请求格式:
    {
        "policy_id": "...",           // 隐私政策的MongoDB ID
        "user_question": "..."        // 用户问题
    }
    
    返回格式:
    {
        "success": true,
        "response": {
            // AI生成的JSON响应
        },
        "policy_id": "隐私政策ID（如果提供）"
    }
    
    双段式Prompt结构:
    系统使用两部分结构的提示:
    1. 系统消息: 包含隐私政策的全局摘要和指导
    2. 用户消息: 包含用户的问题
    """
    data = request.get_json()
    result = handle_general_chat_request(data)
    return jsonify(result)

@chat_bp.route('/api/policy/<policy_id>', methods=['GET'])
def get_policy(policy_id):
    """
    通过ID获取隐私政策信息
    
    返回格式:
    {
        "success": true,
        "summary_content": {
            // 摘要内容
        },
        "policy_id": "隐私政策ID",
        "policy_url": "隐私政策URL",
        "markdown_content": "隐私政策Markdown内容"
    }
    """
    try:
        policy = get_policy_by_id(ObjectId(policy_id))
        if not policy:
            return jsonify({
                'success': False,
                'error': '未找到隐私政策'
            }), 404
        
        summary = get_summary(ObjectId(policy_id))
        
        return jsonify({
            'success': True,
            'summary_content': summary.get('summary_content', {}) if summary else {},
            'policy_id': policy_id,
            'policy_url': policy.get('url', ''),
            'markdown_content': policy.get('markdown_content', '')
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

