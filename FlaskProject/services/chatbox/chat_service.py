import os
import re
import json
import logging
import traceback
import requests
import random
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
from services.chatbox.kb_search import KnowledgeBaseSearch

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
        
        # Initialize knowledge base search service
        try:
            self.kb_search = KnowledgeBaseSearch()
            self.kb_search_enabled = True
        except Exception as e:
            self.logger.warning(f"Failed to initialize knowledge base search: {str(e)}")
            self.kb_search_enabled = False
    
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
                self.logger.warning(f"Policy with ID {policy_id} not found")
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

    def get_system_rules(self):
        """Build system rules - flexible assistant rules"""
        return """You are a helpful and knowledgeable AI assistant. You can answer questions on any topic.

    RESPONSE STYLE:
    Always begin with a short, friendly encouragement (≤ 15 words) before the main answer.
    Examples: "Great question!", "Good thinking!", "Excellent inquiry!", "That's a thoughtful question!", "Nice question!"

    INFORMATION SOURCES (in priority order):
    1. External Knowledge (relevant information and best practices)
    2. Bubble Context (Category Name + Bubble Summary)
    3. Global Summary (overall policy overview)
    4. Original Policy (full policy text)

    ANSWERING PROCEDURE:
    1. Check External Knowledge for relevant information or guidelines
    2. Then search Bubble Context & Global Summary if available
    3. If answer NOT found, search the Original Policy if available
    4. If answer not found in any source, provide explanation based on general knowledge
    5. If still uncertain, apologize and suggest where to find more information

    SOURCE EXCERPT RULES:
    ONLY IF user explicitly asks for original wording or uses trigger words:
    "original policy", "original text", "exact wording", "direct quote", "source excerpt", 
    "policy excerpt", "quote the policy", "where in the policy", "which clause", 
    "show me the clause", 
    — then locate most relevant passage and quote up to 3 consecutive sentences under === Source excerpt ===

    CITATION FORMAT:
    When citing regulations or standards: [Source: Section/Article]
    Examples: [GDPR: Article 13] or [CCPA: Section 1798.100]

    LANGUAGE RULE:
    Always respond in the same language as the user."""

    def get_answer_blueprint(self):
        """Build answer template blueprint with response level adaptation"""
        return """## Response-level rules
        • First judge user question complexity → select appropriate template:
        - **Level A (Brief)**: Only answer "🤔 Brief Answer" and "📝 Summary", keep within 120 words.
        - **Level B (Standard)**: Output "🤔 Brief Answer", "📌 Detailed Explanation", and "📝 Summary".
        - **Level C (In-depth)**: Complete template (including analysis, risk table, excerpt, etc.).
        • Judgment criteria:
        - ≤ 1 sentence, only needs facts/definitions/yes-no → Level A
        - ≤ 3 sentences, or requests general explanation → Level B
        - Involves multi-level analysis, asks for "reasons/risks/recommendations" → Level C

        ANSWER BLUEPRINT - Follow this conditional Markdown structure:

        ### 🤔 Brief Answer
        One sentence summarizing the core conclusion.

        {{#if level in ["B","C"]}}
        ### 📌 Detailed Explanation
        1. **Key Point 1**: [Specific explanation]
        2. **Key Point 2**: [Specific explanation]
        3. **Key Point 3**: [If needed]
        {{/if}}

        {{#if level == "C"}}
        ### 🔍 Analysis and Inference
        - Reasonable inference 1
        - Reasonable inference 2

        ### ⚠️ Privacy Risks and Recommendations
        | Risk | Description | Recommendation |
        |------|-------------|----------------|
        | [Risk Type] | [Risk Description] | [Specific Recommendation] |
        {{/if}}

        ### 📝 Summary
        A natural concluding summary.

        {{#if level == "C" and user triggers original text request}}
        === Source excerpt ===
        > [Extract 1-3 sentences from original text]
        {{/if}}

        STYLE GUIDELINES:
        • Use short, plain-language paragraphs
        • Convert bullet lists into smooth sentences
        • Keep conversational and natural tone
        • Do NOT expose raw field names like 'Type', 'Details', 'keyword'
        • For Level A: Maximum 120 words total
        • For Level B: Maximum 300 words total
        • For Level C: Maximum 600 words total"""

    def get_thinking_instruction(self):
        """Build thinking instruction"""
        return """You MUST think step-by-step internally for at least 3 steps before answering:
        1. Analyze the question type and required information sources
        2. Search relevant information from available sources
        3. Structure the answer according to the blueprint

        Do NOT expose this reasoning process to the user. Only output the final structured answer."""

    def get_fewshot_example(self):
        """Build Few-shot examples covering three response levels"""
        examples = [
            # Level A Example
            {
                "question": "What is VIN?",
                "answer": """Great question! 

### 🤔 Brief Answer
VIN (Vehicle Identification Number) is a unique 17-character code that identifies each vehicle.

### 📝 Summary
VIN serves as a vehicle's fingerprint for identification and tracking purposes."""
            },
            # Level B Example
            {
                "question": "Why does BYD collect VIN numbers?",
                "answer": """Good thinking! 

### 🤔 Brief Answer
BYD collects VIN numbers primarily for vehicle registration, warranty management, and customer service support.

### 📌 Detailed Explanation
1. **Vehicle Registration**: Links the vehicle to user accounts in their mobile app and service systems
2. **Warranty Management**: Tracks warranty status and service history for each specific vehicle
3. **Customer Support**: Enables targeted technical support and recall notifications

### 📝 Summary
VIN collection is a standard automotive practice that enables BYD to provide personalized vehicle services and support."""
            },
            # Level C Example
            {
                "question": "Please analyze the legality, potential risks, and provide recommendations regarding BYD's VIN collection practices.",
                "answer": """Excellent inquiry! 

                ### 🤔 Brief Answer
                BYD's VIN collection is legally justified for legitimate business purposes but raises privacy concerns regarding location tracking and data sharing.

                ### 📌 Detailed Explanation
                1. **Legal Basis**: VIN collection falls under legitimate business interests for warranty, safety recalls, and customer service
                2. **Regulatory Compliance**: Meets automotive industry standards and consumer protection requirements
                3. **Data Processing**: VIN enables vehicle-specific services, maintenance scheduling, and safety communications

                ### 🔍 Analysis and Inference
                - VIN data may be combined with GPS location data to create detailed driving profiles
                - Potential sharing with insurance companies or government agencies for regulatory compliance
                - Long-term retention could enable comprehensive vehicle usage analysis

                ### ⚠️ Privacy Risks and Recommendations
                | Risk | Description | Recommendation |
                |------|-------------|----------------|
                | Location Tracking | VIN combined with GPS creates movement patterns | Review location sharing settings regularly |
                | Data Retention | Indefinite storage of vehicle usage data | Request data deletion when selling vehicle |
                | Third-party Sharing | Potential sharing with insurers or authorities | Read privacy policy carefully for sharing practices |

                ### 📝 Summary
                While VIN collection serves legitimate automotive purposes, users should monitor associated data practices and exercise available privacy controls."""
            }
        ]
        
        return examples

    def get_system_content(self, policy_id, bubble_context=None):
        """Build complete system message: using hierarchical role design"""
        global_summary = self.format_global_summary(policy_id)
        policy_original = self.get_policy_content(policy_id)

        # Build data sources section
        data_sources = []
        
        # Insert bubble context
        if bubble_context:
            data_sources.extend([
                "### Bubble Context:",
                bubble_context,
                ""
            ])

        # Insert global summary
        data_sources.extend([
            "### Global Summary:",
            global_summary,
            ""
        ])

        # Insert original policy
        if policy_original:
            data_sources.append("### Original Policy:")
            data_sources.append(policy_original)
            data_sources.append("")

        return "\n".join(data_sources)

    def estimate_response_level(self, user_question, use_fixed_tokens=False):
        """Estimate response level based on question complexity"""
        if use_fixed_tokens:
            # Use a high fixed value to ensure complete responses
            return 'AUTO', 1500
            
        question_lower = user_question.lower()
        question_length = len(user_question.split())
        
        level_c_keywords = [
            'analyze', 'analysis', 'detailed', 'explain why', 'reasons', 'risks', 
            'recommendations', 'suggest', 'compare', 'evaluate', 'assess',
            'implications', 'consequences', 'impact', 'legality', 'compliance'
        ]
         
        level_a_keywords = [
            'what is', 'define', 'meaning', 'yes or no', 'true or false',
            'is it', 'does it', 'can it', 'will it'
        ]
        
        # Check for Level C - increase token limit for complete analysis
        if any(keyword in question_lower for keyword in level_c_keywords) or question_length > 15:
            return 'C', 1500  # Further increased for complete analysis with tables
        
        # Check for Level A - sufficient for brief answers
        if any(keyword in question_lower for keyword in level_a_keywords) or question_length <= 5:
            return 'A', 600   # Further increased to ensure complete brief answers
            
        # Default to Level B - sufficient for standard explanations
        return 'B', 1000     # Further increased to ensure complete explanations

    def build_messages_with_hierarchy(self, policy_id, bubble_context, user_question, session_messages=None):
        """Build hierarchical message structure"""
        messages = []
        
        # 1. System rules (permanent hard rules)
        messages.append({
            "role": "system", 
            "content": self.get_system_rules()
        })
        
        # 2. Thinking instruction (implicit chain-of-thought)
        messages.append({
            "role": "system", 
            "content": self.get_thinking_instruction()
        })
        
        # 3. Answer template (Assistant-primer)
        messages.append({
            "role": "system", 
            "content": self.get_answer_blueprint()
        })
        
        # 4. Few-shot examples
        examples = self.get_fewshot_example()
        for example in examples:
            messages.append({"role": "user", "content": example["question"]})
            messages.append({"role": "assistant", "content": example["answer"]})
        
        # 5. Data source information
        data_sources = self.get_system_content(policy_id, bubble_context)
        if data_sources.strip():
            messages.append({
                "role": "system",
                "content": data_sources
            })
        
        # 6. Historical conversation (if any)
        if session_messages:
            # Skip old system messages, only keep user and assistant messages
            for msg in session_messages:
                if msg["role"] in ["user", "assistant"]:
                    messages.append(msg)
        
        # 7. Current user question
        messages.append({
            "role": "user", 
            "content": f"Question: {user_question}"
        })
        
        return messages
    
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
    
    def ensure_encouraging_opening(self, text: str, user_question: str) -> str:
        """Ensure the response starts with an encouraging phrase"""
        # Define encouraging phrases in English
        english_encouragements = [
            "Great question!", "Good thinking!", "Excellent inquiry!", 
            "That's a thoughtful question!", "Nice question!", "Wonderful question!",
            "Good point!", "Interesting question!", "Smart question!"
        ]
        
        # Check if text already starts with an encouraging phrase
        text_start = text.strip()[:50].lower()
        
        # Common encouraging patterns to check
        encouraging_patterns = [
            r'^(great|good|excellent|nice|wonderful|fantastic|smart|interesting)',
            r'^(that\'s|what a)',
            r'[!]'  # Contains exclamation mark in first 50 chars
        ]
        
        has_encouragement = any(re.search(pattern, text_start) for pattern in encouraging_patterns)
        
        if not has_encouragement:
            # Add a random encouraging phrase
            encouragement = random.choice(english_encouragements)
            return f"{encouragement} \n\n{text}"
        
        return text
    
    def is_privacy_related_question(self, question: str) -> bool:
        """Check if the question is related to privacy/data protection - now accepts all questions"""
        # Allow all questions to pass through
        # This removes the restriction that only privacy-related questions can be answered
        return True
    
    def create_privacy_decline_response(self, user_question: str) -> dict:
        """Create a polite decline response for non-privacy questions"""
        encouragement = random.choice([
            "Thanks for your question!", "I appreciate your interest!", "Good question!"
        ])
        
        decline_message = f"""{encouragement}

### 🤔 Brief Answer
I'm specialized in privacy policy questions. Please ask about data privacy, GDPR, CCPA, or related topics.

### 📝 Summary
I can help you understand privacy policies, data protection laws, user rights, and compliance matters."""
        
        return {
            "success": True,
            "response": {
                "answer": decline_message,
                "follow_up": "Would you like to ask about privacy or data protection instead?",
                "source": []
            }
        }
        
    def wrap_plain_text(self, text: str, user_question: str = "") -> dict:
        """
        Wrap the original answer with encouraging opening if needed
        """
        # Ensure encouraging opening
        if user_question:
            text = self.ensure_encouraging_opening(text, user_question)
            
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
            dict or tuple(dict, int): dictionary containing AI response and related metadata
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
            
            # 2. Check if question is privacy-related (now allows all questions)
            if not self.is_privacy_related_question(user_question):
                self.logger.info(f"Question declined: {user_question[:50]}...")
                return self.create_privacy_decline_response(user_question)
            
            # 3. session management
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
            
            # 4. prepare bubble context
            bubble_context = None
            if category_name or bubble_summary:
                bubble_context = f"Category: {category_name}\nBubble Summary: {bubble_summary}"
            
            # 5. Get relevant information from knowledge base
            kb_chunks = []
            kb_formatted = ""
            if self.kb_search_enabled:
                try:
                    kb_results = self.kb_search.kb_search(user_question, top_k=2)
                    if kb_results:
                        kb_chunks = [r["text"] for r in kb_results]
                        kb_formatted = self.kb_search.format_kb_results(kb_results)
                except Exception as e:
                    self.logger.error(f"Error during knowledge base search: {str(e)}")
            
            # 6. Get historical messages (only user and assistant messages)
            session_messages = []
            if session.get("initialized", False):
                all_messages = get_session_messages(session_id)
                if all_messages:
                    # Only keep user and assistant historical conversations
                    session_messages = [msg for msg in all_messages 
                                      if msg["role"] in ["user", "assistant"]]
            
            # 7. Build hierarchical message structure
            messages = self.build_messages_with_hierarchy(
                policy_id=policy_id,
                bubble_context=bubble_context,
                user_question=user_question,
                session_messages=session_messages
            )
            
            # 8. If there are knowledge base results, insert before user question
            if kb_formatted:
                # Insert knowledge base information before the last user message
                user_msg = messages.pop()  # Remove user question
                messages.append({
                    "role": "system",
                    "content": f"### External Privacy Knowledge:\n{kb_formatted}"
                })
                messages.append(user_msg)  # Re-add user question
            
            # 9. Estimate response level and adjust parameters
            response_level, max_tokens = self.estimate_response_level(user_question, use_fixed_tokens=True)
            
            # 10. call OpenAI API with optimized parameters
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.25,  # Lower temperature for better format consistency
                max_tokens=max_tokens,  # Dynamic based on question complexity
                top_p=1.0
            )
            
            response_content = response.choices[0].message.content
            
            # 11. Mark session as initialized and save messages
            if not session.get("initialized", False):
                mark_session_initialized(session_id, "hierarchical_structure")
            
            # Save user message and AI reply to session
            add_message_to_session(session_id, "user", f"Question: {user_question}")
            add_message_to_session(session_id, "assistant", response_content)
            
            # 12. wrap answer text
            wrapped = self.wrap_plain_text(response_content, user_question)

            # 13. generate follow_up
            wrapped['follow_up'] = self.generate_follow_up(user_question, wrapped['answer'])

            # 14. return structured result
            result = {
                "success": True,
                "response": wrapped,
                "session_id": session_id,
                "policy_id": policy_id,
                "kb_chunks": kb_chunks  # Return knowledge base chunks used for frontend display
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
            
            # 2. Check if question is privacy-related (now allows all questions)
            if not self.is_privacy_related_question(user_question):
                self.logger.info(f"Question declined: {user_question[:50]}...")
                return self.create_privacy_decline_response(user_question)
            
            # 3. session management
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
            
            # 4. Get historical messages (only user and assistant messages)
            session_messages = []
            if session.get("initialized", False):
                all_messages = get_session_messages(session_id)
                if all_messages:
                    # Only keep user and assistant historical conversations
                    session_messages = [msg for msg in all_messages 
                                      if msg["role"] in ["user", "assistant"]]
            
            # 5. Build hierarchical message structure (no bubble context)
            messages = self.build_messages_with_hierarchy(
                policy_id=policy_id,
                bubble_context=None,
                user_question=user_question,
                session_messages=session_messages
            )
            
            # 6. Estimate response level and adjust parameters
            response_level, max_tokens = self.estimate_response_level(user_question, use_fixed_tokens=True)
            
            # 7. call OpenAI API with optimized parameters
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.25,  # Lower temperature for better format consistency
                max_tokens=max_tokens,  # Dynamic based on question complexity
                top_p=1.0
            )
            
            response_content = response.choices[0].message.content
            
            # 8. Mark session as initialized and save messages
            if not session.get("initialized", False):
                mark_session_initialized(session_id, "hierarchical_structure")
            
            # Save user message and AI reply to session
            add_message_to_session(session_id, "user", f"Question: {user_question}")
            add_message_to_session(session_id, "assistant", response_content)
            
            # 9. wrap answer text
            wrapped = self.wrap_plain_text(response_content, user_question)
            wrapped['follow_up'] = self.generate_follow_up(user_question, wrapped['answer'])

            # 10. return structured result
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