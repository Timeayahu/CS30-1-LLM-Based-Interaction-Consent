import os
import re
import json
import logging
import traceback
from openai import OpenAI
from models.mongodb_local import get_policy_by_id, get_summary

class ChatService:
    """处理与OpenAI API的聊天交互的服务类"""

    def __init__(self):
        """初始化ChatService"""
        # 创建OpenAI客户端实例
        self.client = OpenAI(
            api_key=os.environ.get("OPENAI_API_KEY")
        )
        
        if not os.environ.get("OPENAI_API_KEY"):
            logging.error("OPENAI_API_KEY未设置")
            raise ValueError("OPENAI_API_KEY环境变量未设置")
            
        self.model = "gpt-4-turbo"
        
        # 初始化日志记录器
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
    
    def process_chat(self, data):
        """
        处理聊天请求并返回响应
        
        参数:
            data (dict): 包含聊天请求数据的字典
                - policy_id: 政策ID
                - category_name: 类别名称
                - bubble_summary: 气泡摘要
                - user_question: 用户问题
        
        返回:
            dict: 包含AI响应和相关元数据的字典
        """
        try:
            # 提取请求参数
            policy_id = data.get('policy_id')
            category_name = data.get('category_name', '')
            bubble_summary = data.get('bubble_summary', '')
            user_question = data.get('user_question', '')
            
            # 获取全局摘要（如果有policy_id）
            global_summary = "This policy covers data collection, usage, and sharing practices."
            if policy_id:
                try:
                    summary_data = get_summary(policy_id)
                    if summary_data and 'summary_content' in summary_data:
                        summary_content = summary_data.get('summary_content', {})
                        # 如果是字典格式，格式化为文本
                        if isinstance(summary_content, dict):
                            formatted_summary = []
                            if "Company Name" in summary_content:
                                formatted_summary.append(f"Company: {summary_content['Company Name']}")
                            
                            if "Privacy Policy" in summary_content:
                                policy_items = summary_content["Privacy Policy"]
                                formatted_summary.append("Policy Highlights:")
                                for key, value in policy_items.items():
                                    formatted_summary.append(f"- {key}: {value}")
                            
                            global_summary = "\n".join(formatted_summary)
                        else:
                            global_summary = str(summary_content)
                except Exception as e:
                    self.logger.error(f"获取摘要时出错: {str(e)}")
            
            # 构建三段式prompt
            messages = [
                # 1️⃣ 系统消息
                {
                    "role": "system",
                    "content": (
                        "You are a privacy-policy expert assistant.\n"
                        "Here is a brief overview of the policy:\n"
                        f"{global_summary}\n\n"
                        "Always respond in the same language as the user's question.\n"
                        "Your response must be in JSON format with the following structure:\n"
                        "{\n"
                        '  "answer": "Your detailed response to the user",\n'
                        '  "source": ["Any relevant sources or policy sections"]\n'
                        "}"
                    )
                },
                
                # 2️⃣ 上下文消息
                {
                    "role": "assistant",
                    "content": (
                        f"Category: {category_name}\n"
                        f"Bubble Summary: {bubble_summary}"
                    )
                },
                
                # 3️⃣ 用户消息
                {
                    "role": "user",
                    "content": (
                        f"Question: {user_question}\n\n"
                        "Please provide your answer in JSON format."
                    )
                }
            ]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                response_format={"type": "json_object"}
            )
            
            response_content = response.choices[0].message.content
            
            try:
                json_response = json.loads(response_content)
            except json.JSONDecodeError:
                # IF the response cannot be parsed as JSON, wrap the pure text response as JSON
                json_response = {
                    "answer": response_content,
                    "source": []
                }
            
            # Build the final response
            result = {
                "success": True,
                "response": json_response,
                "policy_id": policy_id if policy_id else None
            }
            
            return result
            
        except Exception as e:
            self.logger.error(f"处理聊天时出错: {str(e)}")
            self.logger.error(traceback.format_exc())
            return {
                "success": False,
                "error": str(e)
            }
            
    def process_general_chat(self, data):
        """
        处理通用聊天请求并返回响应 (不需要类别和气泡摘要)
        
        参数:
            data (dict): 包含聊天请求数据的字典
                - policy_id: 政策ID
                - user_question: 用户问题
        
        返回:
            dict: 包含AI响应和相关元数据的字典
        """
        try:
            # 提取请求参数
            policy_id = data.get('policy_id')
            user_question = data.get('user_question', '')
            
            # 获取全局摘要（如果有policy_id）
            global_summary = "This policy covers data collection, usage, and sharing practices."
            if policy_id:
                try:
                    summary_data = get_summary(policy_id)
                    if summary_data and 'summary_content' in summary_data:
                        summary_content = summary_data.get('summary_content', {})
                        # 如果是字典格式，格式化为文本
                        if isinstance(summary_content, dict):
                            formatted_summary = []
                            if "Company Name" in summary_content:
                                formatted_summary.append(f"Company: {summary_content['Company Name']}")
                            
                            if "Privacy Policy" in summary_content:
                                policy_items = summary_content["Privacy Policy"]
                                formatted_summary.append("Policy Highlights:")
                                for key, value in policy_items.items():
                                    formatted_summary.append(f"- {key}: {value}")
                            
                            global_summary = "\n".join(formatted_summary)
                        else:
                            global_summary = str(summary_content)
                except Exception as e:
                    self.logger.error(f"获取摘要时出错: {str(e)}")
            
            # 构建双段式prompt (没有上下文消息)
            messages = [
                # 1️⃣ 系统消息
                {
                    "role": "system",
                    "content": (
                        "You are a privacy-policy expert assistant.\n"
                        "Here is a brief overview of the policy:\n"
                        f"{global_summary}\n\n"
                        "Always respond in the same language as the user's question.\n"
                        "Your response must be in JSON format with the following structure:\n"
                        "{\n"
                        '  "answer": "Your detailed response to the user",\n'
                        '  "source": ["Any relevant sources or policy sections"]\n'
                        "}"
                    )
                },
                
                # 2️⃣ 用户消息
                {
                    "role": "user",
                    "content": (
                        f"Question: {user_question}\n\n"
                        "Please provide your answer in JSON format."
                    )
                }
            ]
            
            # 调用OpenAI API (使用新版API)
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                response_format={"type": "json_object"}
            )
            
            # 解析响应
            response_content = response.choices[0].message.content
            
            try:
                json_response = json.loads(response_content)
            except json.JSONDecodeError:
                # 如果无法解析为JSON，则将纯文本响应包装为JSON
                json_response = {
                    "answer": response_content,
                    "source": []
                }
            
            # 构建最终响应
            result = {
                "success": True,
                "response": json_response,
                "policy_id": policy_id if policy_id else None
            }
            
            return result
            
        except Exception as e:
            self.logger.error(f"处理通用聊天时出错: {str(e)}")
            self.logger.error(traceback.format_exc())
            return {
                "success": False,
                "error": str(e)
            } 