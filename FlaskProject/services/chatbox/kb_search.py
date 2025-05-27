import os
import logging
import json
from typing import List, Optional, Dict, Any

# 您可以根据需要替换为其他嵌入模型库
from openai import OpenAI
from services.chatbox.vector_store import VectorStore

class KnowledgeBaseSearch:
    def __init__(self):
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logging.error("OPENAI_API_KEY is not set")
            raise ValueError("OPENAI_API_KEY environment variable is not set")
            
        self.client = OpenAI(api_key=api_key)
        self.logger = logging.getLogger(__name__)
        self.model = "text-embedding-3-small"  # 可以根据需要替换为其他模型
        
        # 初始化向量存储
        self.vector_store = None
        self.initialize_vector_store()
        
    def initialize_vector_store(self):
        """初始化向量存储，如果存在则加载，否则创建新的"""
        try:
            # 尝试从文件加载向量存储
            vector_store_path = os.path.join("data", "vector_store", "privacy_knowledge")
            self.vector_store = VectorStore.load(vector_store_path)
            
            if self.vector_store is None:
                # 如果加载失败，创建新的向量存储
                self.vector_store = VectorStore()
                
                # 加载示例知识库数据
                self.load_sample_knowledge()
                
        except Exception as e:
            self.logger.error(f"Failed to initialize vector store: {str(e)}")
            # 如果出错，仍然创建一个空的向量存储
            self.vector_store = VectorStore()
    
    def load_sample_knowledge(self):
        """加载示例知识库数据"""
        try:
            # 示例隐私法规数据
            sample_docs = [
                {
                    "text": "个人数据应该以合法、公平和透明的方式处理。数据控制者应确保用户了解其数据如何被收集和使用。",
                    "source": "GDPR Article 5"
                },
                {
                    "text": "数据控制者必须实施适当的技术和组织措施，以确保数据处理符合本条例的要求，并保护数据主体的权利。",
                    "source": "GDPR Article 24"
                },
                {
                    "text": "数据主体有权要求数据控制者删除其个人数据，这通常被称为'被遗忘权'。",
                    "source": "GDPR Article 17"
                },
                {
                    "text": "企业在收集用户个人信息前，必须告知用户其收集和使用个人信息的目的、方式和范围。",
                    "source": "CCPA Section 1798.100"
                },
                {
                    "text": "消费者有权知道企业收集了哪些个人信息，以及这些信息被出售给谁或与谁共享。",
                    "source": "CCPA Section 1798.110"
                },
                {
                    "text": "消费者有权要求企业删除其收集的个人信息，除非该信息对于完成交易、安全目的或其他法律例外情况是必需的。",
                    "source": "CCPA Section 1798.105"
                },
                {
                    "text": "个人信息处理者应当向个人告知其收集个人信息的目的、方式和范围，以及保存期限等规则。",
                    "source": "PIPL Article 17"
                },
                {
                    "text": "个人有权访问和复制其个人信息，有权要求个人信息处理者更正或补充不准确或不完整的个人信息。",
                    "source": "PIPL Article 44-45"
                }
            ]
            
            # 提取文本和元数据
            texts = [doc["text"] for doc in sample_docs]
            metadatas = [{"source": doc["source"]} for doc in sample_docs]
            
            # 生成嵌入向量
            embeddings = []
            for text in texts:
                embedding = self.embed_text(text)
                if embedding:
                    embeddings.append(embedding)
                else:
                    # 如果生成嵌入失败，跳过该文档
                    self.logger.warning(f"Failed to generate embedding for: {text[:50]}...")
                    return
            
            # 添加到向量存储
            if len(texts) == len(embeddings):
                success = self.vector_store.add_documents(texts, embeddings, metadatas)
                if success:
                    self.logger.info(f"Added {len(texts)} sample documents to vector store")
                    
                    # 保存向量存储
                    vector_store_path = os.path.join("data", "vector_store", "privacy_knowledge")
                    self.vector_store.save(vector_store_path)
            
        except Exception as e:
            self.logger.error(f"Error loading sample knowledge: {str(e)}")
            
    def embed_text(self, text: str) -> List[float]:
        """将文本转换为向量嵌入"""
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            self.logger.error(f"Error generating embeddings: {str(e)}")
            return []
            
    def kb_search(self, question: str, top_k: int = 2) -> List[Dict[str, Any]]:
        """搜索知识库并返回最相关的片段"""
        try:
            # 确保向量存储已初始化
            if self.vector_store is None:
                self.logger.warning("Vector store not initialized")
                return []
                
            # 1. 对问题进行向量化
            question_embedding = self.embed_text(question)
            if not question_embedding:
                self.logger.error("Failed to generate embedding for question")
                return []
                
            # 2. 在向量数据库中搜索相似内容
            results = self.vector_store.search(question_embedding, top_k=top_k)
            
            # 如果没有任何结果，返回空列表
            if not results:
                return []
                
            # 3. 格式化结果
            formatted_results = []
            for item in results:
                formatted_results.append({
                    "text": item["text"],
                    "metadata": {
                        "source": item["metadata"].get("source", "Unknown source"),
                        "score": item["metadata"].get("score", 0.0)
                    }
                })
                
            return formatted_results
            
        except Exception as e:
            self.logger.error(f"Error in knowledge base search: {str(e)}")
            return []
            
    def format_kb_results(self, results: List[Dict[str, Any]]) -> str:
        """将检索结果格式化为文本"""
        if not results:
            return ""
            
        formatted_chunks = []
        for item in results:
            text = item.get("text", "")
            metadata = item.get("metadata", {})
            source = metadata.get("source", "Unknown source")
            formatted_chunks.append(f"Source: {source}\nContent: {text}")
            
        return "\n\n".join(formatted_chunks) 