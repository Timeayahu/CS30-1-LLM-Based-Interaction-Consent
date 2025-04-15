from .chat_service import ChatService

# 创建服务实例
chat_service = ChatService()

def handle_chat_request(data):
    """
    处理聊天请求的API入口点
    
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
    return chat_service.process_chat(data) 