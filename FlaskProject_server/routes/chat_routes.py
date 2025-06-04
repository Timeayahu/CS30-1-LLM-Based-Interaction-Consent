from flask import Blueprint, request, jsonify
from services.chatbox.call_chat import handle_chat_request, handle_general_chat_request
from models.mongodb_ec2_chat import (
    connect_to_mongodb,
    close_mongodb_connection,
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


# create the route for chat (within bubbles)
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


# create the route for general chat (right top icon)
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


# create the route for getting the session history
@chat_bp.route('/api/sessions/<session_id>', methods=['GET'])
def get_session_history(session_id):
    try:
        client, db, chat_sessions = connect_to_mongodb()
        if client == None:
            return {"success": False, 'error': 'Database connection failed!'}, 503
        messages = get_session_messages(chat_sessions, session_id)
        if messages is None:
            close_mongodb_connection(client)
            return jsonify({"success": False, "error": "Session does not exist"}), 404
        
        close_mongodb_connection(client)
        return jsonify({
            "success": True,
            "session_id": session_id,
            "messages": messages
        })
    except Exception as e:
        logger.error(f"Error getting session history: {str(e)}")
        close_mongodb_connection(client)
        return jsonify({"success": False, "error": str(e)}), 500


# create the route for closing the chat session
@chat_bp.route('/api/sessions/<session_id>/close', methods=['POST'])
def close_chat_session(session_id):
    try:
        client, db, chat_sessions = connect_to_mongodb()
        if client == None:
            return {"success": False, 'error': 'Database connection failed!'}, 503
        success = close_session(chat_sessions, session_id)

        if not success:
            close_mongodb_connection(client)
            return jsonify({"success": False, "error": "Session does not exist"}), 404
        
        close_mongodb_connection(client)
        return jsonify({"success": True, "message": "Session closed successfully"})
    
    except Exception as e:
        logger.error(f"Error closing session: {str(e)}")
        close_mongodb_connection(client)
        return jsonify({"success": False, "error": str(e)}), 500


# create the route for getting the policy information
@chat_bp.route('/api/policy/<policy_id>', methods=['GET'])
def get_policy(policy_id):
    try:
        # solve the id format problem
        client, db, chat_sessions = connect_to_mongodb()
        if client == None:
            return {"success": False, 'error': 'Database connection failed!'}, 503
        object_id = policy_id
        if isinstance(policy_id, str) and len(policy_id) == 24:
            try:
                object_id = ObjectId(policy_id)
            except Exception as e:
                logger.warning(f"Failed to convert policy_id to ObjectId: {str(e)}")
                # continue to try using the string id
                
        policy = get_policy_by_id(object_id, chat_sessions)
        if not policy:
            close_mongodb_connection(client)
            return jsonify({
                "success": False,
                "error": "Privacy policy not found"
            }), 404
        
        summary = get_summary(object_id, chat_sessions)

        close_mongodb_connection(client)
        return jsonify({
            "success": True,
            "summary_content": summary.get("summary_content", {}) if summary else {},
            "policy_id": policy_id,
            "policy_url": policy.get("url", ""),
            "markdown_content": policy.get("markdown_content", "")
        }), 200
    except Exception as e:
        logger.error(f"Error getting policy: {str(e)}")
        close_mongodb_connection(client)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
