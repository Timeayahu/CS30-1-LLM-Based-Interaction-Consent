from .chat_service import ChatService

chat_service = ChatService()

def handle_chat_request(data):
    """
    API入口点，处理聊天请求
    
    请求格式:
    {
        "policy_id": "...",            // 隐私政策的MongoDB ID
        "category_name": "...",        // 类别名称（如"收集哪些数据"）
        "bubble_summary": "...",       // 气泡摘要
        "user_question": "...",        // 用户问题
        "session_id": "..."            // 会话ID（可选，首次对话不需要）
    }
    
    响应格式:
    {
        "success": true,
        "response": {
            // AI生成的JSON响应
        },
        "session_id": "会话ID",         // 新建或现有会话ID
        "policy_id": "隐私政策ID"       // 使用的隐私政策ID
    }
    
    三段式Prompt结构:
    系统使用三部分结构的提示:
    1. 系统消息: 包含全局摘要和指导AI的指令
    2. 上下文消息: 包含类别和气泡摘要
    3. 用户消息: 包含用户的问题
    
    会话管理:
    - 首次对话不需提供session_id，系统将创建新会话并返回session_id
    - 后续对话必须提供相同session_id以保持对话上下文
    - 会话将保存完整的对话历史，用于构建上下文连贯的回复
    
    多语言支持:
    - AI会自动使用与用户问题相同的语言回复
    """
    # 验证会话ID（如果提供）
    if 'session_id' in data and data['session_id']:
        # 验证会话存在性可以在process_chat中进行，这里不再重复验证
        original_session_id = data['session_id']
    else:
        # 没有提供会话ID，将创建新会话
        original_session_id = None
    
    # 处理请求并获取结果
    result = chat_service.process_chat(data)
    
    # 处理可能的错误响应（如果返回了状态码）
    if isinstance(result, tuple) and len(result) == 2:
        return result
    
    # 验证响应格式
    if not isinstance(result, dict) or 'success' not in result:
        return {"success": False, "error": "Invalid response format from chat service"}, 500
    
    # 处理成功响应
    if result.get('success') and original_session_id:
        # 确保返回原始会话ID（如果处理成功且原始ID有效）
        if 'session_id' in result and result['session_id'] != original_session_id:
            # 记录会话ID不匹配情况（这可能表明内部处理使用了新会话）
            chat_service.logger.info(f"Session ID mismatch: original={original_session_id}, processed={result['session_id']}")
        # 始终使用原始会话ID
        result['session_id'] = original_session_id
    
    return result

def handle_general_chat_request(data):
    """
    API入口点，处理通用聊天请求（不需要类别和气泡摘要）
    
    请求格式:
    {
        "policy_id": "...",            // 隐私政策的MongoDB ID
        "user_question": "...",        // 用户问题
        "session_id": "..."            // 会话ID（可选，首次对话不需要）
    }
    
    响应格式:
    {
        "success": true,
        "response": {
            // AI生成的JSON响应
        },
        "session_id": "会话ID",         // 新建或现有会话ID
        "policy_id": "隐私政策ID"       // 使用的隐私政策ID
    }
    
    双段式Prompt结构:
    系统使用两部分结构的提示:
    1. 系统消息: 包含全局摘要和指导AI的指令
    2. 用户消息: 包含用户的问题
    
    会话管理:
    - 首次对话不需提供session_id，系统将创建新会话并返回session_id
    - 后续对话必须提供相同session_id以保持对话上下文
    - 会话将保存完整的对话历史，用于构建上下文连贯的回复
    
    多语言支持:
    - AI会自动使用与用户问题相同的语言回复
    """
    # 验证会话ID（如果提供）
    if 'session_id' in data and data['session_id']:
        # 验证会话存在性可以在process_general_chat中进行，这里不再重复验证
        original_session_id = data['session_id']
    else:
        # 没有提供会话ID，将创建新会话
        original_session_id = None
    
    # 处理请求并获取结果
    result = chat_service.process_general_chat(data)
    
    # 处理可能的错误响应（如果返回了状态码）
    if isinstance(result, tuple) and len(result) == 2:
        return result
    
    # 验证响应格式
    if not isinstance(result, dict) or 'success' not in result:
        return {"success": False, "error": "Invalid response format from chat service"}, 500
    
    # 处理成功响应
    if result.get('success') and original_session_id:
        # 确保返回原始会话ID（如果处理成功且原始ID有效）
        if 'session_id' in result and result['session_id'] != original_session_id:
            # 记录会话ID不匹配情况（这可能表明内部处理使用了新会话）
            chat_service.logger.info(f"Session ID mismatch: original={original_session_id}, processed={result['session_id']}")
        # 始终使用原始会话ID
        result['session_id'] = original_session_id
    
    return result

