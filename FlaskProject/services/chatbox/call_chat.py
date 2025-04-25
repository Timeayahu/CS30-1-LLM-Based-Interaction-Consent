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
        "user_question": "..."         // 用户问题
    }
    
    响应格式:
    {
        "success": true,
        "response": {
            // AI生成的JSON响应
        },
        "policy_id": "隐私政策ID（如果提供）"
    }
    
    三段式Prompt结构:
    系统使用三部分结构的提示:
    1. 系统消息: 包含全局摘要和指导AI的指令
    2. 上下文消息: 包含类别和气泡摘要
    3. 用户消息: 包含用户的问题
    
    多语言支持:
    - AI会自动使用与用户问题相同的语言回复
    """
    # 处理请求并返回结果
    result = chat_service.process_chat(data)
    return result 

def handle_general_chat_request(data):
    """
    API入口点，处理通用聊天请求（不需要类别和气泡摘要）
    
    请求格式:
    {
        "policy_id": "...",            // 隐私政策的MongoDB ID
        "user_question": "..."         // 用户问题
    }
    
    响应格式:
    {
        "success": true,
        "response": {
            // AI生成的JSON响应
        },
        "policy_id": "隐私政策ID（如果提供）"
    }
    
    双段式Prompt结构:
    系统使用两部分结构的提示:
    1. 系统消息: 包含全局摘要和指导AI的指令
    2. 用户消息: 包含用户的问题
    
    多语言支持:
    - AI会自动使用与用户问题相同的语言回复
    """
    # 处理请求并返回结果
    result = chat_service.process_general_chat(data)
    return result 