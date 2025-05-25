from .chat_service import ChatService

chat_service = ChatService()

def handle_chat_request(data):
    
    # check if the session_id is provided
    if 'session_id' in data and data['session_id']:
        # check if the session exists in the process_chat function, here not repeat validation
        original_session_id = data['session_id']
    else:
        # no session_id provided, create new session
        original_session_id = None
    
    # process the request and get the result
    result = chat_service.process_chat(data)
    
    # handle possible error response (if status code is returned)
    if isinstance(result, tuple) and len(result) == 2:
        return result
    
    # check the response format
    if not isinstance(result, dict) or 'success' not in result:
        return {"success": False, "error": "Invalid response format from chat service"}, 500
    
    # handle successful response
    if result.get('success') and original_session_id:
        if 'session_id' in result and result['session_id'] != original_session_id:
            chat_service.logger.info(f"Session ID mismatch: original={original_session_id}, processed={result['session_id']}")
        result['session_id'] = original_session_id
    
    return result

def handle_general_chat_request(data):
  
    if 'session_id' in data and data['session_id']:
        original_session_id = data['session_id']
    else:
        original_session_id = None
    
    result = chat_service.process_general_chat(data)
    
    if isinstance(result, tuple) and len(result) == 2:
        return result
    
    if not isinstance(result, dict) or 'success' not in result:
        return {"success": False, "error": "Invalid response format from chat service"}, 500
    
    if result.get('success') and original_session_id:
        # ensure the original session_id is returned (if the response is successful and the original ID is valid)
        if 'session_id' in result and result['session_id'] != original_session_id:
           
            chat_service.logger.info(f"Session ID mismatch: original={original_session_id}, processed={result['session_id']}")
        # always use the original session_id
        result['session_id'] = original_session_id
    
    return result

