import re
import unicodedata
from bs4 import BeautifulSoup
import logging
from typing import List, Dict, Any, Tuple
from openai import OpenAI
import os
import json
from models.mongodb_local import privacy_data

# 设置日志
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class TextProcessor:
    """
    文本处理类：负责HTML清洗、文本分块和向量存储
    """
    
    def __init__(self):
        """初始化处理器"""
        # 初始化OpenAI客户端用于生成向量嵌入
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY is not set")
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        
        self.client = OpenAI(api_key=api_key)
        self.embedding_model = "text-embedding-ada-002"  # OpenAI的嵌入模型
        self.chunk_size = 800  # 默认块大小（大约800 tokens）
    
    def clean_html(self, html_content: str) -> str:
        """
        清洗HTML内容，移除所有标签，只保留纯文本
        
        Args:
            html_content: 原始HTML内容
            
        Returns:
            清洗后的纯文本
        """
        if not html_content:
            logger.warning("HTML content is empty")
            return ""
        
        try:
            # 使用BeautifulSoup解析HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # 移除所有script和style元素
            for script_or_style in soup(["script", "style", "noscript", "iframe", "head"]):
                script_or_style.decompose()
            
            # 获取纯文本
            text = soup.get_text()
            
            # 对HTML实体进行解码
            text = self._decode_html_entities(text)
            
            # 将连续空白替换为单个空格
            text = self._normalize_whitespace(text)
            
            # Unicode归一化
            text = self._normalize_unicode(text)
            
            return text
        
        except Exception as e:
            logger.error(f"HTML cleaning error: {str(e)}")
            return html_content  # 返回原始内容以防出错
    
    def _decode_html_entities(self, text: str) -> str:
        """解码HTML实体"""
        # BeautifulSoup已经处理了大部分HTML实体，但为确保完整性，这里再次处理
        text = text.replace("&nbsp;", " ")
        text = text.replace("&ldquo;", """)
        text = text.replace("&rdquo;", """)
        text = text.replace("&lsquo;", "'")
        text = text.replace("&rsquo;", "'")
        text = text.replace("&mdash;", "—")
        text = text.replace("&ndash;", "–")
        return text
    
    def _normalize_whitespace(self, text: str) -> str:
        """将连续的空白字符（空格、换行、制表符等）替换为单个空格"""
        return re.sub(r'\s+', ' ', text).strip()
    
    def _normalize_unicode(self, text: str) -> str:
        """Unicode归一化（NFKC）"""
        return unicodedata.normalize("NFKC", text)
    
    def chunk_text(self, text: str, chunk_size: int = None) -> List[Dict[str, Any]]:
        """
        将长文本切分成更小的片段
        
        Args:
            text: 要切分的文本
            chunk_size: 每个片段的大致字符数，默认使用self.chunk_size
            
        Returns:
            包含文本片段及其元数据的列表
        """
        if not text:
            logger.warning("Text for chunking is empty")
            return []
        
        if chunk_size is None:
            chunk_size = self.chunk_size
        
        chunks = []
        
        # 按段落分割文本
        paragraphs = re.split(r'\n\s*\n', text)
        
        current_chunk = ""
        current_start = 0
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            
            # 如果当前段落加上已有内容超过了chunk_size，则创建新的chunk
            if len(current_chunk) + len(paragraph) > chunk_size and current_chunk:
                chunks.append({
                    "text": current_chunk,
                    "metadata": {
                        "start_char": current_start,
                        "end_char": current_start + len(current_chunk)
                    }
                })
                current_chunk = paragraph
                current_start = text.find(paragraph)
            else:
                # 追加到当前chunk
                if current_chunk:
                    current_chunk += "\n\n" + paragraph
                else:
                    current_chunk = paragraph
                    current_start = text.find(paragraph)
        
        # 添加最后一个chunk
        if current_chunk:
            chunks.append({
                "text": current_chunk,
                "metadata": {
                    "start_char": current_start,
                    "end_char": current_start + len(current_chunk)
                }
            })
        
        logger.info(f"Text split into {len(chunks)} chunks")
        return chunks
    
    def create_embeddings(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        为文本块创建向量嵌入
        
        Args:
            chunks: 文本块列表
            
        Returns:
            添加了embeddings字段的文本块列表
        """
        if not chunks:
            logger.warning("No chunks to create embeddings for")
            return []
        
        try:
            # 批量创建嵌入以提高效率
            texts = [chunk["text"] for chunk in chunks]
            
            # 分批处理，避免API请求过大
            batch_size = 20
            batched_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i+batch_size]
                response = self.client.embeddings.create(
                    model=self.embedding_model,
                    input=batch_texts
                )
                
                for embedding_data in response.data:
                    batched_embeddings.append(embedding_data.embedding)
            
            # 将嵌入添加到原始chunks中
            for i, chunk in enumerate(chunks):
                chunk["embedding"] = batched_embeddings[i]
            
            logger.info(f"Created embeddings for {len(chunks)} chunks")
            return chunks
            
        except Exception as e:
            logger.error(f"Embedding creation error: {str(e)}")
            # 返回原始chunks，但没有embedding
            return chunks
    
    def store_chunks(self, policy_id: str, chunks: List[Dict[str, Any]]) -> bool:
        """
        将分块和向量存储到MongoDB
        
        Args:
            policy_id: 政策ID
            chunks: 包含嵌入的文本块列表
            
        Returns:
            存储是否成功
        """
        if not policy_id or not chunks:
            logger.warning("Policy ID or chunks are empty, cannot store")
            return False
        
        try:
            # 更新MongoDB中的记录
            result = privacy_data.update_one(
                {"_id": policy_id},
                {"$set": {"text_chunks": chunks}}
            )
            
            logger.info(f"Stored {len(chunks)} chunks for policy {policy_id}")
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Store chunks error: {str(e)}")
            return False
    
    def process_html_to_chunks(self, policy_id: str, html_content: str) -> bool:
        """
        完整处理流程：HTML清洗→文本分块→创建嵌入→存储
        
        Args:
            policy_id: 政策ID
            html_content: 原始HTML内容
            
        Returns:
            处理是否成功
        """
        # 1. 清洗HTML
        clean_text = self.clean_html(html_content)
        
        # 2. 文本分块
        chunks = self.chunk_text(clean_text)
        
        # 3. 创建嵌入
        chunks_with_embeddings = self.create_embeddings(chunks)
        
        # 4. 存储到MongoDB
        return self.store_chunks(policy_id, chunks_with_embeddings)
    
    def search_most_relevant(self, policy_id: str, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        在政策中搜索与查询最相关的文本块
        
        Args:
            policy_id: 政策ID
            query: 搜索查询
            top_k: 返回的最相关结果数量
            
        Returns:
            最相关的文本块列表
        """
        try:
            # 1. 获取政策数据
            policy = privacy_data.find_one({"_id": policy_id})
            if not policy or "text_chunks" not in policy:
                logger.warning(f"Policy {policy_id} not found or has no chunks")
                return []
            
            chunks = policy["text_chunks"]
            
            # 2. 为查询创建嵌入
            query_response = self.client.embeddings.create(
                model=self.embedding_model,
                input=[query]
            )
            query_embedding = query_response.data[0].embedding
            
            # 3. 计算相似度并排序
            results = []
            for chunk in chunks:
                if "embedding" not in chunk:
                    continue
                
                # 计算余弦相似度
                similarity = self._cosine_similarity(query_embedding, chunk["embedding"])
                results.append({
                    "text": chunk["text"],
                    "metadata": chunk["metadata"],
                    "similarity": similarity
                })
            
            # 按相似度排序并返回top_k个结果
            results.sort(key=lambda x: x["similarity"], reverse=True)
            self.logger.info(f"result: {results}")
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            return []
    
    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """计算两个向量的余弦相似度"""
        import numpy as np
        v1 = np.array(v1)
        v2 = np.array(v2)
        return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))


# 创建单例实例 - 注意这里不要有缩进，应该在类的外部
text_processor = TextProcessor() 


