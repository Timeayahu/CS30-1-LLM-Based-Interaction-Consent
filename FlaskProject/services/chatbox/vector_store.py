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
        self.documents = []  # store the documents content
        self.index = None    # FAISS index
        
        if not FAISS_AVAILABLE:
            self.logger.error("FAISS is not available. Please install faiss-cpu or faiss-gpu.")
            return
            
        try:
            # create a basic L2 distance index
            self.index = faiss.IndexFlatL2(dimension)
            self.logger.info(f"Created FAISS index with dimension {dimension}")
        except Exception as e:
            self.logger.error(f"Error creating FAISS index: {str(e)}")
            self.index = None
    
    def add_documents(self, texts: List[str], embeddings: List[List[float]], 
                     metadatas: Optional[List[Dict[str, Any]]] = None) -> bool:
        """
        Add documents and their corresponding embeddings to the vector store
        
        Args:
            texts: list of document texts
            embeddings: list of corresponding embedding vectors
            metadatas: list of document metadata (optional)
            
        Returns:
            bool: whether the addition is successful
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
            # convert to numpy array
            embeddings_np = np.array(embeddings).astype('float32')
            
            # get the current number of documents as the starting ID
            start_id = len(self.documents)
            self.index.add(embeddings_np)
            
            # store the documents and metadata
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
        #Search for the most similar documents using the query vector
        if not FAISS_AVAILABLE or self.index is None:
            self.logger.error("FAISS index not available")
            return []
            
        if len(self.documents) == 0:
            self.logger.warning("Vector store is empty")
            return []
            
        try:
            # convert to numpy array
            query_np = np.array([query_embedding]).astype('float32')
            
            # search
            distances, indices = self.index.search(query_np, min(top_k, len(self.documents)))
            
            # format the results
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
                        "score": float(1.0 / (1.0 + distances[0][i]))  # convert the distance to a similarity score
                    }
                })
                
            return results
            
        except Exception as e:
            self.logger.error(f"Error searching vector store: {str(e)}")
            return []
    
    def save(self, filepath: str) -> bool:
        
        #Save the vector store to a file
        if not FAISS_AVAILABLE or self.index is None:
            self.logger.error("FAISS index not available")
            return False
            
        try:
            
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            index_path = f"{filepath}.index"
            faiss.write_index(self.index, index_path)
            
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
        #load the vector store from a file
        
        if not FAISS_AVAILABLE:
            logging.error("FAISS is not available. Please install faiss-cpu or faiss-gpu.")
            return None
            
        try:
            # check if the files exist
            index_path = f"{filepath}.index"
            docs_path = f"{filepath}.json"
            
            if not os.path.exists(index_path) or not os.path.exists(docs_path):
                logging.error(f"Vector store files not found: {filepath}")
                return None
                
            index = faiss.read_index(index_path)
            
            # load the documents and metadata
            with open(docs_path, 'r', encoding='utf-8') as f:
                documents = json.load(f)
                
            # create an instance
            vector_store = cls(dimension=index.d)
            vector_store.index = index
            vector_store.documents = documents
            
            logging.info(f"Vector store loaded from {filepath} with {len(documents)} documents")
            return vector_store
            
        except Exception as e:
            logging.error(f"Error loading vector store: {str(e)}")
            return None 