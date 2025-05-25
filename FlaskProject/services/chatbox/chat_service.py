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
        
        # Google search API configuration
        self.google_api_key = os.environ.get("GOOGLE_API_KEY")
        self.google_cse_id = os.environ.get("GOOGLE_CSE_ID")
        if not self.google_api_key or not self.google_cse_id:
            self.logger.warning("Google search API is not fully configured, the online search function will be unavailable")
            self.google_search_enabled = False
        else:
            self.google_search_enabled = True
    
    def google_search(self, query, num_results=3):
        """execute Google search and return the results"""
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
                    
                    # handle string type summary_content
                    if isinstance(summary_content, str):
                        try:
                            # try to parse the string as a dictionary
                            summary_content = json.loads(summary_content)
                        except json.JSONDecodeError:
                            self.logger.warning(f"can not parse summary_content to JSON: {summary_content[:100]}...")
                            # if cannot parse to JSON, use the string content directly
                            return summary_content
                    
                    # handle any JSON format
                    if isinstance(summary_content, dict):
                        formatted_summary = []
                        
                        # add company name
                        if "Company Name" in summary_content:
                            formatted_summary.append(f"Company: {summary_content['Company Name']}")
                        
                        # handle all top-level keys
                        for key, value in summary_content.items():
                            # skip the processed Company Name
                            if key == "Company Name":
                                continue
                                
                            # handle array type values
                            if isinstance(value, list):
                                formatted_summary.append(f"\n{key.replace('_', ' ').title()}:")
                                for item in value:
                                    if isinstance(item, dict):
                                        # clear the tags, merge into natural language
                                        sentence = []
                                        for k, v in item.items():
                                            if k.lower() in {"context", "importance"}:
                                                continue
                                            # remove the prefix of the tag
                                            clean_value = self.clean_value(str(v))
                                            sentence.append(clean_value)
                                        if sentence:
                                            formatted_summary.append(f"- {'; '.join(sentence)}")
                            # handle nested dictionaries
                            elif isinstance(value, dict):
                                formatted_summary.append(f"\n{key.replace('_', ' ').title()}:")
                                for k, v in value.items():
                                    formatted_summary.append(f"- {self.clean_value(str(v))}")
                           
                            else:
                                formatted_summary.append(f"\n{key}: {value}")
                        
                        # merge summary content
                        if formatted_summary:
                            global_summary = "\n".join(formatted_summary)
                        else:
                            global_summary = "Summary is available but contains no displayable content."
                    else:
                        self.logger.warning(f"Unexpected summary_content type: {type(summary_content)}")
                        
                        global_summary = str(summary_content)
            except Exception as e:
                self.logger.error(f"get summary error: {str(e)}")
                global_summary = "get summary error, use default summary"
        return global_summary
        
    def clean_value(self, value):
        """remove the prefix of the tag"""
        return re.sub(r'^\s*(Type|Details|Description|keyword|summary)\s*:\s*', '', value, flags=re.I)
        
    def get_policy_content(self, policy_id):
        """get the original policy content"""
        if not policy_id:
            return None
        
        try:
            policy_data = get_policy_by_id(policy_id)
            if not policy_data:
                self.logger.warning(f"找不到ID为{policy_id}的政策")
                return None
            
            # check if there is original content
            markdown_content = policy_data.get("markdown_content")
            html_content = policy_data.get("content")
            
            # use markdown format
            if markdown_content:
                return markdown_content
            elif html_content:
                return html_content
            else:
                self.logger.warning(f"policy {policy_id} has no content")
                return None
        except Exception as e:
            self.logger.error(f"get policy content error: {str(e)}")
            return None

    def get_system_content(self, policy_id, bubble_context=None):
        """build the complete system message: include instructions, bubble context, global summary, original policy and internet search"""
        global_summary = self.format_global_summary(policy_id)
        policy_original = self.get_policy_content(policy_id)

        parts = [
            "You are a privacy-policy expert assistant.",
            "",
            "INFORMATION SOURCES (in order):",
            "  1. Bubble Context (Category Name + Bubble Summary)",
            "  2. Global Summary (overall policy overview)",
            "  3. Original Policy (full policy text)",
            "  4. Internet Search",
            "",

            "After formulating an answer, ALWAYS locate the most relevant passage "
            "in the Original Policy and add it verbatim under a heading "
            "=== Source excerpt === (max 5 consecutive sentences).",
            "If no suitable passage exists, write: \"[Original policy excerpt not found]\".",
            "",
        ]

        # insert bubble context
        if bubble_context:
            parts.extend([
                "### Bubble Context:",
                bubble_context,
                ""
            ])

        # insert global summary
        parts.extend([
            "### Global Summary:",
            global_summary,
            ""
        ])

        # insert original policy
        if policy_original:
            parts.append("### Original Policy:")
            parts.append(policy_original)
            parts.append("")

        # answering guidelines
        parts.extend([
            "Answering procedure:",
            "When answering a user question:",
            "1. Search Bubble Context & Global Summary first.",
            "2. If the answer is NOT found, search the Original Policy.",
            "3. If still not found, request an Internet search.",
            "4. If none contains the answer, apologise as specified.",
            "",
            "ONLY IF the user's question explicitly asks for the original wording "
            "or contains any of these trigger words (case-insensitive): "
            "\"original policy\", \"original text\", \"exact wording\", \"direct quote\", "
            "\"source excerpt\", \"policy excerpt\", \"quote the policy\", "
            "\"where in the policy\", \"which clause\", \"show me the clause\", "
            "\"原文\", \"原句\", \"原始文本\", \"政策原文\", \"出处\", \"具体怎么写\" "
            "— then locate the most relevant passage in the Original Policy and "
            "quote up to 3 consecutive sentences under the heading === Source excerpt ===.",
            "If the user does NOT ask for the original wording, DO NOT include any excerpt.",
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
            "You are an privacy policy assistant, after answer the question you should ask the GPT-4o style follow-up questions. "
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
        only wrap the original answer, do not generate default follow_up, let _generate_follow_up handle it.
        """
        return {
            "answer": text.strip(),
            "follow_up": "",
            "source": []
        }
        
    def process_chat(self, data):
        """
        process chat request and return response
        
        parameters:
            data (dict): dictionary containing chat request data
                - policy_id: policy ID
                - category_name: category name
                - bubble_summary: bubble summary
                - user_question: user question
                - session_id: session ID (optional)
        
        return:
            dict or tuple(dict, int): dictionary containing AI response and related metadata, may附带HTTP状态码
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
            user_message_content = f"Question: {user_question}"
            
            # 4. initialize session (only on the first time)
            if not session.get("initialized", False):
                # prepare bubble context
                bubble_context = None
                if category_name or bubble_summary:
                    bubble_context = f"Category: {category_name}\nBubble Summary: {bubble_summary}"
                
                # build system message content, include global summary and bubble context
                system_content = self.get_system_content(policy_id, bubble_context)
                
                # initialize session
                success = mark_session_initialized(session_id, system_content)
                if not success:
                    # only record warning, not block the process
                    self.logger.warning(f"Initialize session {session_id} failed, but continue to process the request")
                    self.logger.info("Try to reinitialize session...")
                    success = mark_session_initialized(session_id, system_content)
                    if not success:
                        self.logger.warning("Retry initialize still failed, continue to process the request without system message")
            else:
                # if session is initialized, but the frontend sends new bubble_summary or category_name, update the system message
                if (category_name or bubble_summary) and session.get("messages"):
                    # check if there is system message
                    system_messages = [msg for msg in session["messages"] if msg["role"] == "system"]
                    
                    if system_messages:
                        current_system_msg = system_messages[0]["content"]
                        
                        # check the Bubble Context information in the current system message
                        current_category = ""
                        current_bubble_summary = ""
                        
                        if "### Bubble Context:" in current_system_msg:
                            bubble_section = current_system_msg.split("### Bubble Context:")[1].split("###")[0].strip()
                            for line in bubble_section.split("\n"):
                                if line.startswith("Category:"):
                                    current_category = line.replace("Category:", "").strip()
                                elif line.startswith("Bubble Summary:"):
                                    current_bubble_summary = line.replace("Bubble Summary:", "").strip()
                        
                        # check if update is needed
                        if current_category != category_name or current_bubble_summary != bubble_summary:
                            # prepare new bubble context
                            new_bubble_context = f"Category: {category_name}\nBubble Summary: {bubble_summary}"
                            
                            # update system message
                            new_system_content = self.get_system_content(policy_id, new_bubble_context)
                            
                            # update system message
                            update_system_message(session_id, new_system_content)
                            self.logger.info(f"Updated session {session_id} with new bubble context")
            
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
                max_tokens=1000
            )
            
            response_content = response.choices[0].message.content
            
            # 8. check if internet search is needed
            if "search" in response_content.lower() or "internet search" in response_content.lower():
                # extract search keywords
                search_terms = user_question  # use user question as default
                
                # try to extract more precise search keywords from the response
                search_pattern = r"search[：:]\s*([^\n]+)|search[：:]\s*([^\n]+)"
                search_match = re.search(search_pattern, response_content, re.IGNORECASE)
                if search_match:
                    search_terms = search_match.group(1) or search_match.group(2)
                
                # execute search
                search_results = self.google_search(search_terms)
                
                # add search results as extra message
                search_message = f"Search results (keywords: {search_terms}):\n\n{search_results}"
                add_message_to_session(session_id, "user", search_message)
                
                # get messages again and generate final response
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

            # 11. generate follow_up
            wrapped['follow_up'] = self.generate_follow_up(user_question, wrapped['answer'])

            # 12. return structured result
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
        process general chat request and return response (no category and bubble summary)
        
        parameters:
            data (dict): dictionary containing chat request data
                - policy_id: policy ID
                - user_question: user question
                - session_id: session ID (optional)
        
        return:
            dict or tuple(dict, int): dictionary containing AI response and related metadata
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
            user_message_content = f"Question: {user_question}"
            
            # 4. initialize session (only on the first time)
            if not session.get("initialized", False):
          
                system_content = self.get_system_content(policy_id)
                
       
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
            
       
            self.logger.info("Messages to OpenAI:\n" + json.dumps(messages, ensure_ascii=False, indent=2))
            
         
            if messages and messages[0]["role"] == "system":
                self.logger.info(
                    "--------------SYSTEM MSG--------------\n" + 
                    messages[0]["content"] + 
                    "\n--------------END SYSTEM--------------"
                )
            
        
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            response_content = response.choices[0].message.content     
            wrapped = self.wrap_plain_text(response_content)
            wrapped['follow_up'] = self.generate_follow_up(user_question, wrapped['answer'])

           
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