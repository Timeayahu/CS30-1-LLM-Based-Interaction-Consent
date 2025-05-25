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

chat_bp = Blueprint('chat', __name__)
logger = logging.getLogger(__name__)


@chat_bp.route('/api/chat', methods=['POST'])
def chat():
   
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

