from .chat_service import ChatService


def handle_chat_request(data):
    # check if the session_id is provided
    if 'session_id' in data and data['session_id']:
        # check if the session exists in the process_chat function, here not repeat validation
        original_session_id = data['session_id']
    else:
        # no session_id provided, create new session
        original_session_id = None
    
    # process the request and get the result
    chat_service = ChatService()
    result = chat_service.process_chat(data)
    
    # handle possible error response (if status code is returned)
    if isinstance(result, tuple) and len(result) == 2:
        chat_service.close_connection()
        return result
    
    # check the response format
    if not isinstance(result, dict) or 'success' not in result:
        chat_service.close_connection()
        return {"success": False, "error": "Invalid response format from chat service"}, 500
    
    # handle successful response
    if result.get('success') and original_session_id:
        # check if the session_id is the same as the original one
        if 'session_id' in result and result['session_id'] != original_session_id:
            # record the session ID mismatch (this may indicate that the internal processing used a new session)
            chat_service.logger.info(f"Session ID mismatch: original={original_session_id}, processed={result['session_id']}")
        # always use the original session ID
        result['session_id'] = original_session_id
    
    chat_service.close_connection()
    return result

def handle_general_chat_request(data):
    # check if the session_id is provided
    if 'session_id' in data and data['session_id']:
        # check if the session exists in the process_general_chat function, here not repeat validation
        original_session_id = data['session_id']
    else:
        # no session_id provided, create new session
        original_session_id = None

    chat_service = ChatService()
    
    # process the request and get the result
    result = chat_service.process_general_chat(data)
    
    # handle possible error response (if status code is returned)
    if isinstance(result, tuple) and len(result) == 2:
        chat_service.close_connection()
        return result
    
    # check the response format
    if not isinstance(result, dict) or 'success' not in result:
        chat_service.close_connection()
        return {"success": False, "error": "Invalid response format from chat service"}, 500
    
    # handle successful response
    if result.get('success') and original_session_id:
        # check if the session_id is the same as the original one
        if 'session_id' in result and result['session_id'] != original_session_id:
            # record the session ID mismatch (this may indicate that the internal processing used a new session)
            chat_service.logger.info(f"Session ID mismatch: original={original_session_id}, processed={result['session_id']}")
        # always use the original session ID
        result['session_id'] = original_session_id
    
    chat_service.close_connection()
    return result

