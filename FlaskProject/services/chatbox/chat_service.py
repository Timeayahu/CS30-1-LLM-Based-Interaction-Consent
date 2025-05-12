import os
import re
import json
import logging
import traceback
from openai import OpenAI
from models.mongodb_local import (
    get_policy_by_id, 
    get_summary, 
    get_session, 
    get_session_messages,
    create_session,
    add_message_to_session,
    mark_session_initialized
)

class ChatService:
    
    def __init__(self):

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logging.error("OPENAI_API_KEY is not set")
            raise ValueError("OPENAI_API_KEY environment variable is not set")
            
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4-turbo"
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
    
    def _format_global_summary(self, policy_id):
        """get global summary"""
        global_summary = "This policy covers data collection, usage, and sharing practices."
        if policy_id:
            try:
                summary_data = get_summary(policy_id)
                if summary_data and 'summary_content' in summary_data:
                    summary_content = summary_data.get('summary_content', {})             
                    
                    # 处理字符串类型的summary_content
                    if isinstance(summary_content, str):
                        try:
                            # try to parse the string as a dictionary
                            summary_content = json.loads(summary_content)
                        except json.JSONDecodeError:
                            self.logger.warning(f"can not parse summary_content to JSON: {summary_content[:100]}...")
                            # 不返回，继续处理字符串格式
                    
                    # 处理字典类型的summary_content
                    if isinstance(summary_content, dict):
                        formatted_summary = []
                        
                        # 添加Company Name
                        if "Company Name" in summary_content:
                            formatted_summary.append(f"Company: {summary_content['Company Name']}")
                        else:
                            self.logger.info("summary does not have Company Name field")
                        
                        # 添加Privacy Policy
                        if "Privacy Policy" in summary_content:
                            policy_items = summary_content["Privacy Policy"]
                            formatted_summary.append("Policy Highlights:")
                            for key, value in policy_items.items():
                                formatted_summary.append(f"- {key}: {value}")
                        else:
                            self.logger.info("summary does not have Privacy Policy field")
                        
                        # 合并摘要内容
                        if formatted_summary:
                            global_summary = "\n".join(formatted_summary)
                        else:
                            global_summary = "summary misses key information fields"
                    else:
                        self.logger.warning(f"Unexpected summary_content type: {type(summary_content)}")
                        global_summary = str(summary_content)
            except Exception as e:
                self.logger.error(f"get summary error: {str(e)}")
                global_summary = "get summary error, use default summary"
        return global_summary
        
    def _get_system_content(self, policy_id):
        """build system message content"""

        global_summary = self._format_global_summary(policy_id)
        return (
            "You are a privacy-policy expert assistant.\n\n"
            "You have three sources of information, in this priority order:\n"
            "1. Bubble Context (Category Name + Bubble Summary)\n"
            "2. Global Summary (the full policy overview)\n"
            "3. If neither contains the answer, you must reply that the information is not available.\n\n"
            "Global Summary:\n"
            f"{global_summary}\n\n"
            "When a user asks a question:\n"
            "- Step 1: Check if the answer can be found in the Bubble Context.\n"
            "- Step 2: If not found there, check the Global Summary.\n"
            "- Step 3: If still not found, reply that the provided summary does not contain relevant information.\n\n"
            "IMPORTANT: You have access to the complete conversation history. If the user asks about previous questions or wants to see past interactions, you should review the conversation history and provide that information. You CAN track, recall, and summarize previous questions and answers when asked.\n\n"
            "Always respond in the same language as the user's question.\n"
            "Ensure your answer is semantically accurate, concise, and directly grounded in the provided summary or context.\n"
            "After providing your main answer, always include a follow-up question or suggestion to guide the user deeper into the topic.\n"
            "Examples of good follow-up questions:\n"
            "- \"Would you like me to explain how this data collection might affect you personally?\"\n"
            "- \"Would you like to know more about specific privacy controls available to you?\"\n"
            "- \"Is there a particular aspect of this policy you're concerned about?\"\n"
            "Your response must be in JSON format with the following structure:\n"
            "{\n"
            '  "answer": "Your detailed response to the user",\n'
            '  "follow_up": "A relevant follow-up question to guide the conversation",\n'
            '  "source": ["Any relevant sources or policy sections"]\n'
            "}"
        )
    
    def _extract_json_from_text(self, text):
        """Actually, the result returned by GPT sometimes is not strictly JSON (possibly mixed Markdown, extra comments),
        and sometimes the output is JSON but lacks the follow_up field.
        This function is designed to solve these problems, ensuring that you always get a standard JSON structure and a reasonable follow_up field.
        """
        try:
            json_data = json.loads(text)
            # 确保JSON响应包含follow_up字段
            if "follow_up" not in json_data:
                # 如果没有找到信息，但回答表明没有相关信息，添加适当的后续问题
                if json_data.get("answer", "").find("no information") >= 0 or \
                   json_data.get("answer", "").find("not available") >= 0 or \
                   json_data.get("answer", "").find("not contain") >= 0:
                    json_data["follow_up"] = "do you want to know about other aspects of the privacy policy?" if \
                                            json_data.get("answer", "").find("no information") >= 0 else \
                                            "Would you like to know about other aspects of the privacy policy?"
                else:
                    json_data["follow_up"] = "do you want to know more about any specific aspect of this privacy policy?" if \
                                            json_data.get("answer", "").find("you") >= 0 or \
                                            json_data.get("answer", "").find("your") >= 0 or \
                                            json_data.get("answer", "").find("this") >= 0 else \
                                            "Would you like to know more about any specific aspect of this privacy policy?"
            return json_data
        except json.JSONDecodeError:
            json_pattern = re.compile(r'({.*})', re.DOTALL)
            match = json_pattern.search(text)
            if match:
                try:
                    json_data = json.loads(match.group(1))
                    # 确保JSON响应包含follow_up字段
                    if "follow_up" not in json_data:
                        # 识别语言并添加适当的后续问题
                        if any(char in json_data.get("answer", "") for char in "你我他她它们这那您"):
                            json_data["follow_up"] = "您想了解更多关于这个隐私政策的细节吗？"
                        else:
                            json_data["follow_up"] = "Would you like to know more about any specific aspect of this privacy policy?"
                    return json_data
                except json.JSONDecodeError:
                    pass
            
            # 检测语言并提供适当的默认响应
            has_chinese = re.search(r'[\u4e00-\u9fff]', text)
            
            # 构建默认响应结构
            default_response = {
                "answer": text,
                "source": [],
                "follow_up": "您想了解隐私政策的其他方面吗？" if has_chinese else 
                            "Would you like to know more about any specific aspect of this privacy policy?"
            }
            return default_response
        
    def process_chat(self, data):
        """
        处理聊天请求并返回响应
        
        参数:
            data (dict): 包含聊天请求数据的字典
                - policy_id: 政策ID
                - category_name: 类别名称
                - bubble_summary: 气泡摘要
                - user_question: 用户问题
                - session_id: 会话ID（可选）
        
        返回:
            dict 或 tuple(dict, int): 包含AI响应和相关元数据的字典，失败时可能附带HTTP状态码
        """
        try:
            # 1. parameter extraction and validation
            policy_id = data.get('policy_id')
            category_name = data.get('category_name', '')
            bubble_summary = data.get('bubble_summary', '')
            user_question = data.get('user_question', '')
            session_id = data.get('session_id')
            
            if not user_question:
                return {"success": False, "error": "missing user question parameter"}, 400
            
            # 2. session management - simplify logic to avoid repeated calls
            session = get_session(session_id) if session_id else None
            if not session:
                session_id = create_session(policy_id)
                self.logger.info(f"create new session: {session_id}")
                session = get_session(session_id)
                if not session:
                    return {"success": False, "error": "create session failed"}, 500
            
            # use the policy_id stored in the session (if not provided)
            if not policy_id and session.get("policy_id"):
                policy_id = session["policy_id"]
                
            # 3. build user message content
            user_message_content = f"Question: {user_question}\n\nPlease provide your answer in JSON format."
            
            # 4. initialize session (only on the first time)
            if not session.get("initialized", False):
                # build system content, include global summary and context information
                system_content = self._get_system_content(policy_id)
                
                # if there is category and bubble summary, add them to the system content
                if category_name or bubble_summary:
                    context_addition = f"\n\nBubble Context:\nCategory: {category_name}\nBubble Summary: {bubble_summary}"
                    system_content += context_addition
                
                # try to initialize session
                success = mark_session_initialized(session_id, system_content)
                if not success:
                    # only record warning, not block the process
                    self.logger.warning(f"initialize session {session_id} failed, but continue to process the request")
                    self.logger.info("try to reinitialize session...")
                    success = mark_session_initialized(session_id, system_content)
                    if not success:
                        self.logger.warning("retry initialize still failed, continue to process the request without system message")
            
            # 5. add user message
            add_message_to_session(session_id, "user", user_message_content)
            
            # 6. get full message history
            messages = get_session_messages(session_id)
            if messages is None:
                return {"success": False, "error": "get session messages failed"}, 500
            
            # 7. call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                response_format={"type": "json_object"}  
            )
            
            response_content = response.choices[0].message.content
            
            # 8. save AI response to session
            add_message_to_session(session_id, "assistant", response_content)
            
            # 9. parse JSON response - use enhanced parsing method
            json_response = self._extract_json_from_text(response_content)
            
            # 10. return result
            result = {
                "success": True,
                "response": json_response,
                "session_id": session_id,
                "policy_id": policy_id
            }
            
            return result
            
        except Exception as e:
            self.logger.error(f"process chat request error: {str(e)}")
            self.logger.error(traceback.format_exc())
            return {
                "success": False,
                "error": str(e)
            }
            
    def process_general_chat(self, data):
        """
        处理通用聊天请求并返回响应（无类别和气泡摘要）
        
        参数:
            data (dict): 包含聊天请求数据的字典
                - policy_id: 政策ID
                - user_question: 用户问题
                - session_id: 会话ID（可选）
        
        返回:
            dict 或 tuple(dict, int): 包含AI响应和相关元数据的字典，失败时可能附带HTTP状态码
        """
        try:
            # 1. parameter extraction and validation
            policy_id = data.get('policy_id')
            user_question = data.get('user_question', '')
            session_id = data.get('session_id')
            
            if not user_question:
                return {"success": False, "error": "missing user question parameter"}, 400
            
            # 2. session management - simplify logic to avoid repeated calls
            session = get_session(session_id) if session_id else None
            if not session:
                session_id = create_session(policy_id)
                self.logger.info(f"create new session: {session_id}")
                session = get_session(session_id)
                if not session:
                    return {"success": False, "error": "create session failed"}, 500
            
            # use the policy_id stored in the session (if not provided)
            if not policy_id and session.get("policy_id"):
                policy_id = session["policy_id"]
                
            # 3. build user message content
            user_message_content = f"Question: {user_question}\n\nPlease provide your answer in JSON format."
            
            # 4. initialize session (only on the first time)
            if not session.get("initialized", False):
                # build system content, include global summary and context information
                system_content = self._get_system_content(policy_id)
                
                # try to initialize session
                success = mark_session_initialized(session_id, system_content)
                if not success:
                    # only record warning, not block the process
                    self.logger.warning(f"initialize session {session_id} failed, but continue to process the request")
                    # try to reinitialize
                    self.logger.info("try to reinitialize session...")
                    success = mark_session_initialized(session_id, system_content)
                    if not success:
                        self.logger.warning("retry initialize still failed, continue to process the request without system message")
            
            # 5. add user message
            add_message_to_session(session_id, "user", user_message_content)
            
            # 6. get full message history
            messages = get_session_messages(session_id)
            if messages is None:
                return {"success": False, "error": "get session messages failed"}, 500
            
            # 7. call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                response_format={"type": "json_object"}  
            )
            
            response_content = response.choices[0].message.content
            
            # 8. save AI response to session
            add_message_to_session(session_id, "assistant", response_content)
            
            # 9. parse JSON response - use enhanced parsing method
            json_response = self._extract_json_from_text(response_content)
            
            # 10. return result
            result = {
                "success": True,
                "response": json_response,
                "session_id": session_id,
                "policy_id": policy_id
            }
            
            return result
            
        except Exception as e:
            self.logger.error(f"process general chat request error: {str(e)}")
            self.logger.error(traceback.format_exc())
            return {
                "success": False,
                "error": str(e)
            } 