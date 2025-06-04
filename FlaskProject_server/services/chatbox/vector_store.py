import os
import json
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    logging.warning("FAISS not installed, vector search will be unavailable.")

class VectorStore:
    def __init__(self, dimension: int = 1536):
        """
        Initialize a vector store using FAISS
        
        Args:
            dimension: Dimension of the embedding vectors
        """
        self.logger = logging.getLogger(__name__)
        self.dimension = dimension
        self.documents = []  # 存储文档内容
        self.index = None    # FAISS索引
        
        if not FAISS_AVAILABLE:
            self.logger.error("FAISS is not available. Please install faiss-cpu or faiss-gpu.")
            return
            
        try:
            # 创建一个基本的L2距离索引
            self.index = faiss.IndexFlatL2(dimension)
            self.logger.info(f"Created FAISS index with dimension {dimension}")
        except Exception as e:
            self.logger.error(f"Error creating FAISS index: {str(e)}")
            self.index = None
    
    def add_documents(self, texts: List[str], embeddings: List[List[float]], 
                     metadatas: Optional[List[Dict[str, Any]]] = None) -> bool:
        """
        将文档和对应的嵌入向量添加到向量存储中
        
        Args:
            texts: 文档文本列表
            embeddings: 对应的嵌入向量列表
            metadatas: 文档元数据列表 (可选)
            
        Returns:
            bool: 是否添加成功
        """
        if not FAISS_AVAILABLE or self.index is None:
            self.logger.error("FAISS index not available")
            return False
            
        if len(texts) != len(embeddings):
            self.logger.error("Number of texts and embeddings must match")
            return False
            
        if metadatas is None:
            metadatas = [{} for _ in texts]
            
        if len(metadatas) != len(texts):
            self.logger.error("Number of metadatas must match number of texts")
            return False
            
        try:
            # 转换为numpy数组
            embeddings_np = np.array(embeddings).astype('float32')
            
            # 获取当前的文档数量作为起始ID
            start_id = len(self.documents)
            
            # 添加到索引
            self.index.add(embeddings_np)
            
            # 存储文档和元数据
            for i, (text, metadata) in enumerate(zip(texts, metadatas)):
                doc_id = start_id + i
                self.documents.append({
                    "id": doc_id,
                    "text": text,
                    "metadata": metadata
                })
                
            self.logger.info(f"Added {len(texts)} documents to vector store")
            return True
            
        except Exception as e:
            self.logger.error(f"Error adding documents to vector store: {str(e)}")
            return False
    
    def search(self, query_embedding: List[float], top_k: int = 3) -> List[Dict[str, Any]]:
        """
        使用查询向量搜索最相似的文档
        
        Args:
            query_embedding: 查询向量
            top_k: 返回的结果数量
            
        Returns:
            List[Dict]: 搜索结果列表
        """
        if not FAISS_AVAILABLE or self.index is None:
            self.logger.error("FAISS index not available")
            return []
            
        if len(self.documents) == 0:
            self.logger.warning("Vector store is empty")
            return []
            
        try:
            # 转换为numpy数组
            query_np = np.array([query_embedding]).astype('float32')
            
            # 搜索
            distances, indices = self.index.search(query_np, min(top_k, len(self.documents)))
            
            # 格式化结果
            results = []
            for i, idx in enumerate(indices[0]):
                if idx < 0 or idx >= len(self.documents):
                    continue
                    
                doc = self.documents[idx]
                results.append({
                    "id": doc["id"],
                    "text": doc["text"],
                    "metadata": {
                        **doc["metadata"],
                        "score": float(1.0 / (1.0 + distances[0][i]))  # 将距离转换为相似度分数
                    }
                })
                
            return results
            
        except Exception as e:
            self.logger.error(f"Error searching vector store: {str(e)}")
            return []
    
    def save(self, filepath: str) -> bool:
        """
        将向量存储保存到文件
        
        Args:
            filepath: 文件路径
            
        Returns:
            bool: 是否保存成功
        """
        if not FAISS_AVAILABLE or self.index is None:
            self.logger.error("FAISS index not available")
            return False
            
        try:
            # 创建目录
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            # 保存索引
            index_path = f"{filepath}.index"
            faiss.write_index(self.index, index_path)
            
            # 保存文档和元数据
            docs_path = f"{filepath}.json"
            with open(docs_path, 'w', encoding='utf-8') as f:
                json.dump(self.documents, f, ensure_ascii=False, indent=2)
                
            self.logger.info(f"Vector store saved to {filepath}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving vector store: {str(e)}")
            return False
    
    @classmethod
    def load(cls, filepath: str) -> Optional['VectorStore']:
        """
        从文件加载向量存储
        
        Args:
            filepath: 文件路径
            
        Returns:
            VectorStore: 加载的向量存储，失败则返回None
        """
        if not FAISS_AVAILABLE:
            logging.error("FAISS is not available. Please install faiss-cpu or faiss-gpu.")
            return None
            
        try:
            # 检查文件是否存在
            index_path = f"{filepath}.index"
            docs_path = f"{filepath}.json"
            
            if not os.path.exists(index_path) or not os.path.exists(docs_path):
                logging.error(f"Vector store files not found: {filepath}")
                return None
                
            # 加载索引
            index = faiss.read_index(index_path)
            
            # 加载文档和元数据
            with open(docs_path, 'r', encoding='utf-8') as f:
                documents = json.load(f)
                
            # 创建实例
            vector_store = cls(dimension=index.d)
            vector_store.index = index
            vector_store.documents = documents
            
            logging.info(f"Vector store loaded from {filepath} with {len(documents)} documents")
            return vector_store
            
        except Exception as e:
            logging.error(f"Error loading vector store: {str(e)}")
            return None 
