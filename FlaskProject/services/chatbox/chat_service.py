import os
import re
import json
import logging
import traceback
import requests
from openai import OpenAI
from models.mongodb_local import (
    get_policy_by_id,
    get_policy_by_url,
    get_summary,
    get_session,
    get_session_messages,
    create_session,
    add_message_to_session,
    mark_session_initialized,
    update_system_message
)

class ChatService:
    
    def __init__(self):

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logging.error("OPENAI_API_KEY is not set")
            raise ValueError("OPENAI_API_KEY environment variable is not set")
            
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o"
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.DEBUG)
        
        # Google搜索API配置
        self.google_api_key = os.environ.get("GOOGLE_API_KEY")
        self.google_cse_id = os.environ.get("GOOGLE_CSE_ID")
        if not self.google_api_key or not self.google_cse_id:
            self.logger.warning("Google搜索API未完全配置，联网搜索功能将不可用")
            self.google_search_enabled = False
        else:
            self.google_search_enabled = True
    
    def google_search(self, query, num_results=3):
        """执行Google搜索并返回结果"""
        if not self.google_search_enabled:
            self.logger.warning("try to use Google search, but API is not configured")
            return "search function is not configured."
            
        try:
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': self.google_api_key,
                'cx': self.google_cse_id,
                'q': query,
                'num': num_results
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            search_results = response.json()
            
            if 'items' not in search_results:
                return "no related results found."
                
            formatted_results = []
            for item in search_results['items']:
                title = item.get('title', '')
                link = item.get('link', '')
                snippet = item.get('snippet', '').replace('\n', ' ')
                formatted_results.append(f"Title: {title}\nLink: {link}\nSnippet: {snippet}\n")
                
            return "\n".join(formatted_results)
        except Exception as e:
            self.logger.error(f"Google search error: {str(e)}")
            return f"Google search error: {str(e)}"

    def format_global_summary(self, policy_id):
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
                            # 如果无法解析为JSON，直接使用字符串内容
                            return summary_content
                    
                    # 处理任意JSON格式
                    if isinstance(summary_content, dict):
                        formatted_summary = []
                        
                        # 添加公司名称（如果有的话）
                        if "Company Name" in summary_content:
                            formatted_summary.append(f"Company: {summary_content['Company Name']}")
                        
                        # 处理所有顶级键，无论它们的名称是什么
                        for key, value in summary_content.items():
                            # 跳过已处理的Company Name
                            if key == "Company Name":
                                continue
                                
                            # 处理数组类型的值（如collected_info、data_usage、data_sharing等）
                            if isinstance(value, list):
                                formatted_summary.append(f"\n{key.replace('_', ' ').title()}:")
                                for item in value:
                                    if isinstance(item, dict):
                                        # 清除标签，合并为自然语言
                                        sentence = []
                                        for k, v in item.items():
                                            if k.lower() in {"context", "importance"}:
                                                continue
                                            # 去除标签前缀
                                            clean_value = self.clean_value(str(v))
                                            sentence.append(clean_value)
                                        if sentence:
                                            formatted_summary.append(f"- {'; '.join(sentence)}")
                            # 处理嵌套字典（如Privacy Policy）
                            elif isinstance(value, dict):
                                formatted_summary.append(f"\n{key.replace('_', ' ').title()}:")
                                for k, v in value.items():
                                    formatted_summary.append(f"- {self.clean_value(str(v))}")
                            # 处理简单值
                            else:
                                formatted_summary.append(f"\n{key}: {value}")
                        
                        # 合并摘要内容
                        if formatted_summary:
                            global_summary = "\n".join(formatted_summary)
                        else:
                            global_summary = "Summary is available but contains no displayable content."
                    else:
                        self.logger.warning(f"Unexpected summary_content type: {type(summary_content)}")
                        # 如果不是字典类型，直接返回原始内容的字符串表示
                        global_summary = str(summary_content)
            except Exception as e:
                self.logger.error(f"get summary error: {str(e)}")
                global_summary = "get summary error, use default summary"
        return global_summary
        
    def clean_value(self, value):
        """去除标签前缀"""
        return re.sub(r'^\s*(Type|Details|Description|keyword|summary)\s*:\s*', '', value, flags=re.I)
        
    def get_policy_content(self, policy_id):
        """获取政策原文内容"""
        if not policy_id:
            return None
        
        try:
            policy_data = get_policy_by_id(policy_id)
            if not policy_data:
                self.logger.warning(f"找不到ID为{policy_id}的政策")
                return None
            
            # 检查是否有原始内容
            markdown_content = policy_data.get("markdown_content")
            html_content = policy_data.get("content")
            
            # 优先使用markdown格式（更易读）
            if markdown_content:
                return markdown_content
            elif html_content:
                return html_content
            else:
                self.logger.warning(f"政策{policy_id}没有内容")
                return None
        except Exception as e:
            self.logger.error(f"获取政策内容错误: {str(e)}")
            return None

    def get_system_content(self, policy_id, bubble_context=None):
        """构建完整的system消息：包含指令、气泡上下文、全局摘要、原始政策和联网搜索"""
        global_summary = self.format_global_summary(policy_id)
        policy_original = self.get_policy_content(policy_id)

        parts = [
            "You are a privacy-policy expert assistant.",
            "",
            "You have information sources, in this priority order:",
            "  1. Bubble Context (Category Name + Bubble Summary)",
            "  2. Global Summary (the full policy overview)",
            "  3. Original Policy (the complete privacy policy document)",
            "  4. Internet Search (for latest information and context)",
            "If none contains the answer, reply: \"I'm sorry, the provided information does not contain that information.\"",
            "",
        ]

        # 插入气泡上下文
        if bubble_context:
            parts.extend([
                "### Bubble Context:",
                bubble_context,
                ""
            ])

        # 插入全局摘要
        parts.extend([
            "### Global Summary:",
            global_summary,
            ""
        ])

        # 插入原始政策
        if policy_original:
            parts.append("### Original Policy:")
            parts.append(policy_original)
            parts.append("")

        # 回答指南
        parts.extend([
            "When answering a user question:",
            "- First search the Bubble Context and Global Summary for the answer;",
            "- If not found in these summaries, then search the Original Policy;",
            "- If still not found, request an Internet search with the relevant keywords;",
            "- Only if all have no relevant info, use the fallback apology above.",
            "",
            "---- RESPONSE STYLE GUIDELINES ----",
            "• Answer with short, plain-language paragraphs.",
            "• Convert any bullet lists or tables in the summary into smooth sentences.",
            "• Do NOT expose raw field names such as 'Type', 'Details', 'keyword', etc.",
            "",
            "Always respond in the same language as the user.",
            "Keep answers conversational and natural, as if you're having a friendly chat.",
        ])

        return "\n".join(parts)
    
    def generate_follow_up(self, user_question: str, answer: str) -> str:
      
        prompt = (
            "You are an assistant that crafts concise, GPT-4o style follow-up questions. "
            f"User asked: \"{user_question}\" Assistant answered: \"{answer}\". "
            "If user use English, generate exactly one simple English question, for example: 'Would you like me to explain further?' or 'Do you want me to continue?'"
            "If user use other language, always respond in the same language as the user."
        )
        messages = [
            {"role": "system", "content": "You create crisp, single-sentence follow-ups, no extra commentary."},
            {"role": "user", "content": prompt}
        ]
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.5,
            max_tokens=16
        )
        follow_up = response.choices[0].message.content.strip().strip('"')
        if not follow_up.endswith('?'):
            follow_up = follow_up.rstrip('.') + '?'
        return follow_up
        
    def wrap_plain_text(self, text: str) -> dict:
        """
        仅包装原生回答，不再生成默认 follow_up，由 _generate_follow_up 负责。
        """
        return {
            "answer": text.strip(),
            "follow_up": "",
            "source": []
        }
        
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
                
            # 3. build user message content - 移除JSON格式要求
            user_message_content = f"Question: {user_question}"
            
            # 4. initialize session (only on the first time)
            if not session.get("initialized", False):
                # 准备气泡上下文
                bubble_context = None
                if category_name or bubble_summary:
                    bubble_context = f"Category: {category_name}\nBubble Summary: {bubble_summary}"
                
                # 构建系统消息内容，包括全局摘要和气泡上下文
                system_content = self.get_system_content(policy_id, bubble_context)
                
                # 初始化会话
                success = mark_session_initialized(session_id, system_content)
                if not success:
                    # only record warning, not block the process
                    self.logger.warning(f"Initialize session {session_id} failed, but continue to process the request")
                    self.logger.info("Try to reinitialize session...")
                    success = mark_session_initialized(session_id, system_content)
                    if not success:
                        self.logger.warning("Retry initialize still failed, continue to process the request without system message")
            else:
                # 如果会话已初始化，但前端发送了新的bubble_summary或category_name，需要更新系统消息
                if (category_name or bubble_summary) and session.get("messages"):
                    # 检查会话中是否有系统消息
                    system_messages = [msg for msg in session["messages"] if msg["role"] == "system"]
                    
                    if system_messages:
                        current_system_msg = system_messages[0]["content"]
                        
                        # 检查当前系统消息中的Bubble Context信息
                        current_category = ""
                        current_bubble_summary = ""
                        
                        if "### Bubble Context:" in current_system_msg:
                            bubble_section = current_system_msg.split("### Bubble Context:")[1].split("###")[0].strip()
                            for line in bubble_section.split("\n"):
                                if line.startswith("Category:"):
                                    current_category = line.replace("Category:", "").strip()
                                elif line.startswith("Bubble Summary:"):
                                    current_bubble_summary = line.replace("Bubble Summary:", "").strip()
                        
                        # 判断是否需要更新
                        if current_category != category_name or current_bubble_summary != bubble_summary:
                            # 准备新的气泡上下文
                            new_bubble_context = f"Category: {category_name}\nBubble Summary: {bubble_summary}"
                            
                            # 更新系统消息
                            new_system_content = self.get_system_content(policy_id, new_bubble_context)
                            
                            # 更新会话中的系统消息
                            update_system_message(session_id, new_system_content)
                            self.logger.info(f"Updated session {session_id} with new bubble context")
            
            # 5. add user message
            add_message_to_session(session_id, "user", user_message_content)
            
            # 6. get full message history
            messages = get_session_messages(session_id)
            if messages is None:
                return {"success": False, "error": "get session messages failed"}, 500
            
            # 7. call OpenAI API - 移除严格JSON格式约束
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            response_content = response.choices[0].message.content
            
            # 8. 检查是否需要联网搜索
            if "需要搜索" in response_content.lower() or "请搜索" in response_content.lower() or "internet search" in response_content.lower():
                # 提取搜索关键词
                search_terms = user_question  # 默认使用用户问题作为搜索词
                
                # 尝试从回复中提取更精确的搜索关键词
                search_pattern = r"搜索[：:]\s*([^\n]+)|search[：:]\s*([^\n]+)"
                search_match = re.search(search_pattern, response_content, re.IGNORECASE)
                if search_match:
                    search_terms = search_match.group(1) or search_match.group(2)
                
                # 执行搜索
                search_results = self.google_search(search_terms)
                
                # 添加搜索结果作为额外消息
                search_message = f"搜索结果（关键词：{search_terms}）:\n\n{search_results}"
                add_message_to_session(session_id, "user", search_message)
                
                # 重新获取消息并生成最终回复
                messages = get_session_messages(session_id)
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1000
                )
                response_content = response.choices[0].message.content
            
            # 9. save AI response to session
            add_message_to_session(session_id, "assistant", response_content)
            
             # 10. wrap answer text
            wrapped = self.wrap_plain_text(response_content)

            # 11. 智能生成 follow_up
            wrapped['follow_up'] = self.generate_follow_up(user_question, wrapped['answer'])

            # 12. 返回结构化结果
            result = {
                "success": True,
                "response": wrapped,
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
                
            # 3. build user message content - 移除JSON格式要求
            user_message_content = f"Question: {user_question}"
            
            # 4. initialize session (only on the first time)
            if not session.get("initialized", False):
                # 构建系统消息内容，只包含全局摘要（无气泡上下文）
                system_content = self.get_system_content(policy_id)
                
                # 初始化会话
                success = mark_session_initialized(session_id, system_content)
                if not success:
                    # only record warning, not block the process
                    self.logger.warning(f"Initialize session {session_id} failed, but continue to process the request")
                    # try to reinitialize
                    self.logger.info("Try to reinitialize session...")
                    success = mark_session_initialized(session_id, system_content)
                    if not success:
                        self.logger.warning("Retry initialize still failed, continue to process the request without system message")
            
            # 5. add user message
            add_message_to_session(session_id, "user", user_message_content)
            
            # 6. get full message history
            messages = get_session_messages(session_id)
            if messages is None:
                return {"success": False, "error": "get session messages failed"}, 500
            
            # 添加调试日志
            self.logger.info("Messages to OpenAI:\n" + json.dumps(messages, ensure_ascii=False, indent=2))
            
            # 专门输出系统消息
            if messages and messages[0]["role"] == "system":
                self.logger.info(
                    "--------------SYSTEM MSG--------------\n" + 
                    messages[0]["content"] + 
                    "\n--------------END SYSTEM--------------"
                )
            
            # 7. call OpenAI API - 移除严格JSON格式约束
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            response_content = response.choices[0].message.content
            
             # 9. wrap answer text
            wrapped = self.wrap_plain_text(response_content)

            # 10. 智能生成 follow_up
            wrapped['follow_up'] = self.generate_follow_up(user_question, wrapped['answer'])

            # 11. 返回结构化结果
            result = {
                "success": True,
                "response": wrapped,
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