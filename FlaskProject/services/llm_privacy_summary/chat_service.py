import os
import json
from dotenv import load_dotenv
from openai import OpenAI

class ChatService:
    def __init__(self):
        load_dotenv()
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.history = {}  # 用于存储不同会话的历史记录
    
    def process_chat(self, data):
        """
        处理用户聊天请求并返回AI回复
        
        参数:
        data - 包含用户输入的字典，格式为:
            {
                "user_input": "用户输入的文本",
                "session_id": "会话ID（可选）",
                "context": "额外的上下文信息（可选）"
            }
            
        返回:
        JSON格式的响应
        """
        try:
            # 验证输入
            if not data or 'user_input' not in data:
                return {
                    'success': False,
                    'error': '请求中缺少用户输入'
                }, 400
            
            user_input = data['user_input']
            session_id = data.get('session_id', 'default')
            context = data.get('context', '')
            
            # 获取历史记录（如果有）
            messages = self.history.get(session_id, [])
            
            # 如果是新会话，初始化系统消息
            if not messages:
                messages = [
                    {"role": "system", "content": "你是一个专注于隐私政策分析和解释的AI助手。你能帮助用户理解隐私条款、回答相关问题，并提供关于数据隐私的建议。请用简洁、专业但易于理解的方式回答问题。请以JSON格式回复。"}
                ]
            
            # 添加用户输入 - 确保包含"json"一词以符合OpenAI的要求
            modified_input = user_input
            if "json" not in user_input.lower():
                modified_input = f"{user_input} 请以json格式回复。"
            
            messages.append({"role": "user", "content": modified_input})
            
            # 生成回复
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # 可以根据需要更换模型
                messages=messages,
                response_format={"type": "json_object"}  # 指定返回JSON格式
            )
            
            # 获取AI回复
            ai_response = response.choices[0].message.content
            
            # 添加到历史记录
            messages.append({"role": "assistant", "content": ai_response})
            self.history[session_id] = messages
            
            # 解析JSON响应
            try:
                response_json = json.loads(ai_response)
            except json.JSONDecodeError:
                # 如果无法解析为JSON，则包装为JSON
                response_json = {"message": ai_response}
            
            # 返回成功响应
            return {
                'success': True,
                'response': response_json,
                'session_id': session_id
            }, 200
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }, 500 