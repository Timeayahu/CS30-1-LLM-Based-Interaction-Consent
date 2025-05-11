from flask import Blueprint, request, jsonify
from services.chatbox.call_chat import handle_chat_request, handle_general_chat_request
from models.mongodb_local import (
    get_policy_by_id, 
    get_summary, 
    get_session, 
    get_session_messages,
    close_session
)
import logging
from bson import ObjectId
# 创建聊天Blueprint
chat_bp = Blueprint('chat', __name__)
logger = logging.getLogger(__name__)


@chat_bp.route('/api/chat', methods=['POST'])
def chat():
    """
    处理用户聊天请求
    
    请求格式:
    {
        "policy_id": "...",           // 隐私政策的MongoDB ID
        "category_name": "...",       // 类别名称（如"收集哪些数据"）
        "bubble_summary": "...",      // 气泡摘要或选中文本
        "user_question": "...",       // 用户实际问题
        "session_id": "..."           // 会话ID（可选，首次对话不需要）
    }
    
    返回格式:
    {
        "success": true,
        "response": {
            // AI生成的JSON响应
        },
        "session_id": "会话ID",        // 新建或现有会话ID
        "policy_id": "隐私政策ID"      // 使用的隐私政策ID
    }
    
    三段式Prompt结构:
    系统会使用三部分结构的提示:
    1. 系统消息: 包含隐私政策的全局摘要
    2. 上下文消息: 包含类别和气泡信息，如请求则附带原文
    3. 用户消息: 包含用户的实际问题
    
    会话管理:
    - 首次对话不需提供session_id，系统将创建新会话并返回session_id
    - 后续对话必须提供相同session_id以保持对话上下文
    - 会话将保存完整的对话历史，用于构建上下文连贯的回复
    
    原文获取:
    仅当用户在问题中明确包含"查看原文"、"显示原文"等关键词时，
    系统才会获取并返回原文内容。系统能识别多种语言的原文请求关键词。
    
    多语言支持:
    系统会自动使用与用户问题相同的语言回复。
    无需额外配置，GPT会自动处理多语言响应。
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Invalid JSON data"}), 400
        
        if 'user_question' not in data or not data['user_question']:
            return jsonify({"success": False, "error": "Missing required field: user_question"}), 400
        result = handle_chat_request(data)
        
        if isinstance(result, tuple) and len(result) == 2:
            return jsonify(result[0]), result[1]
            
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@chat_bp.route('/api/general-chat', methods=['POST'])
def general_chat():
    """
    处理通用聊天请求（不需要类别和气泡摘要）
    
    请求格式:
    {
        "policy_id": "...",           // 隐私政策的MongoDB ID
        "user_question": "...",       // 用户问题
        "session_id": "..."           // 会话ID（可选，首次对话不需要）
    }
    
    返回格式:
    {
        "success": true,
        "response": {
            // AI生成的JSON响应
        },
        "session_id": "会话ID",        // 新建或现有会话ID
        "policy_id": "隐私政策ID"      // 使用的隐私政策ID
    }
    
    双段式Prompt结构:
    系统使用两部分结构的提示:
    1. 系统消息: 包含隐私政策的全局摘要和指导
    2. 用户消息: 包含用户的问题
    
    会话管理:
    - 首次对话不需提供session_id，系统将创建新会话并返回session_id
    - 后续对话必须提供相同session_id以保持对话上下文
    - 会话将保存完整的对话历史，用于构建上下文连贯的回复
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Invalid JSON data"}), 400
        
        if 'user_question' not in data or not data['user_question']:
            return jsonify({"success": False, "error": "Missing required field: user_question"}), 400
            
        result = handle_general_chat_request(data)
        
        if isinstance(result, tuple) and len(result) == 2:
            return jsonify(result[0]), result[1]
            
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in general-chat endpoint: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@chat_bp.route('/api/sessions/<session_id>', methods=['GET'])
def get_session_history(session_id):
    """获取会话历史记录"""
    try:
        messages = get_session_messages(session_id)
        if messages is None:
            return jsonify({"success": False, "error": "Session does not exist"}), 404
            
        return jsonify({
            "success": True,
            "session_id": session_id,
            "messages": messages
        })
    except Exception as e:
        logger.error(f"Error getting session history: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@chat_bp.route('/api/sessions/<session_id>/close', methods=['POST'])
def close_chat_session(session_id):
    """关闭会话"""
    try:
        success = close_session(session_id)
        if not success:
            return jsonify({"success": False, "error": "Session does not exist"}), 404
            
        return jsonify({"success": True, "message": "Session closed successfully"})
    except Exception as e:
        logger.error(f"Error closing session: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

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
        # solve the id format problem
        object_id = policy_id
        if isinstance(policy_id, str) and len(policy_id) == 24:
            try:
                object_id = ObjectId(policy_id)
            except Exception as e:
                logger.warning(f"Failed to convert policy_id to ObjectId: {str(e)}")
                # continue to try using the string id
                
        policy = get_policy_by_id(object_id)
        if not policy:
            return jsonify({
                "success": False,
                "error": "Privacy policy not found"
            }), 404
        
        summary = get_summary(object_id)
        
        return jsonify({
            "success": True,
            "summary_content": summary.get("summary_content", {}) if summary else {},
            "policy_id": policy_id,
            "policy_url": policy.get("url", ""),
            "markdown_content": policy.get("markdown_content", "")
        }), 200
    except Exception as e:
        logger.error(f"Error getting policy: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

