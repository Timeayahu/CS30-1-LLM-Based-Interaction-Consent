import re
import unicodedata
from bs4 import BeautifulSoup
import logging
from typing import List, Dict, Any, Tuple
from openai import OpenAI
import os
import json
from models.mongodb_local import privacy_data

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class TextProcessor:
    
    # Text processing class: responsible for HTML cleaning, text chunking and vector storage
    def __init__(self):
        
        # Initialize OpenAI client for generating vector embeddings
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY is not set")
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        
        self.client = OpenAI(api_key=api_key)
        self.embedding_model = "text-embedding-ada-002" 
        self.chunk_size = 800 
    
    def clean_html(self, html_content: str) -> str:
        # Clean HTML content, remove all tags, keep only plain text

        if not html_content:
            logger.warning("HTML content is empty")
            return ""
        
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove all script and style elements
            for script_or_style in soup(["script", "style", "noscript", "iframe", "head"]):
                script_or_style.decompose()
            
            # Get plain text
            text = soup.get_text()
            
            # Decode HTML entities
            text = self._decode_html_entities(text)
            
            # Replace consecutive whitespace with single space
            text = self._normalize_whitespace(text)
            
            # Unicode normalization
            text = self._normalize_unicode(text)
            
            return text
        
        except Exception as e:
            logger.error(f"HTML cleaning error: {str(e)}")
            return html_content  # Return original content in case of error
    
    def _decode_html_entities(self, text: str) -> str:
        """Decode HTML entities"""
        # BeautifulSoup has handled most HTML entities, but process again for completeness
        text = text.replace("&nbsp;", " ")
        text = text.replace("&ldquo;", """)
        text = text.replace("&rdquo;", """)
        text = text.replace("&lsquo;", "'")
        text = text.replace("&rsquo;", "'")
        text = text.replace("&mdash;", "—")
        text = text.replace("&ndash;", "–")
        return text
    
    def _normalize_whitespace(self, text: str) -> str:
        """Replace consecutive whitespace characters (spaces, newlines, tabs, etc.) with single space"""
        return re.sub(r'\s+', ' ', text).strip()
    
    def _normalize_unicode(self, text: str) -> str:
        """Unicode normalization (NFKC)"""
        return unicodedata.normalize("NFKC", text)
    
    def chunk_text(self, text: str, chunk_size: int = None) -> List[Dict[str, Any]]:
        """
        Split long text into smaller segments
        
        Args:
            text: Text to be split
            chunk_size: Approximate character count per segment, defaults to self.chunk_size
            
        Returns:
            List containing text segments and their metadata
        """
        if not text:
            logger.warning("Text for chunking is empty")
            return []
        
        if chunk_size is None:
            chunk_size = self.chunk_size
        
        chunks = []
        
        # Split text by paragraphs
        paragraphs = re.split(r'\n\s*\n', text)
        
        current_chunk = ""
        current_start = 0
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            
            # If current paragraph plus existing content exceeds chunk_size, create new chunk
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
                # Append to current chunk
                if current_chunk:
                    current_chunk += "\n\n" + paragraph
                else:
                    current_chunk = paragraph
                    current_start = text.find(paragraph)
        
        # Add the last chunk
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
        Create vector embeddings for text chunks
        
        Args:
            chunks: List of text chunks
            
        Returns:
            List of text chunks with added embeddings field
        """
        if not chunks:
            logger.warning("No chunks to create embeddings for")
            return []
        
        try:
            # Create embeddings in batches for efficiency
            texts = [chunk["text"] for chunk in chunks]
            
            # Process in batches to avoid oversized API requests
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
            
            # Add embeddings to original chunks
            for i, chunk in enumerate(chunks):
                chunk["embedding"] = batched_embeddings[i]
            
            logger.info(f"Created embeddings for {len(chunks)} chunks")
            return chunks
            
        except Exception as e:
            logger.error(f"Embedding creation error: {str(e)}")
            # Return original chunks without embedding
            return chunks
    
    def store_chunks(self, policy_id: str, chunks: List[Dict[str, Any]]) -> bool:
        """
        Store chunks and vectors to MongoDB
        
        Args:
            policy_id: Policy ID
            chunks: List of text chunks with embeddings
            
        Returns:
            Whether storage was successful
        """
        if not policy_id or not chunks:
            logger.warning("Policy ID or chunks are empty, cannot store")
            return False
        
        try:
            # Update record in MongoDB
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
        Complete processing pipeline: HTML cleaning → text chunking → create embeddings → storage
        
        Args:
            policy_id: Policy ID
            html_content: Original HTML content
            
        Returns:
            Whether processing was successful
        """
        # 1. Clean HTML
        clean_text = self.clean_html(html_content)
        
        # 2. Text chunking
        chunks = self.chunk_text(clean_text)
        
        # 3. Create embeddings
        chunks_with_embeddings = self.create_embeddings(chunks)
        
        # 4. Store to MongoDB
        return self.store_chunks(policy_id, chunks_with_embeddings)
    
    def search_most_relevant(self, policy_id: str, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Search for text chunks most relevant to the query in a policy
        
        Args:
            policy_id: Policy ID
            query: Search query
            top_k: Number of most relevant results to return
            
        Returns:
            List of most relevant text chunks
        """
        try:
            # 1. Get policy data
            policy = privacy_data.find_one({"_id": policy_id})
            if not policy or "text_chunks" not in policy:
                logger.warning(f"Policy {policy_id} not found or has no chunks")
                return []
            
            chunks = policy["text_chunks"]
            
            # 2. Create embedding for query
            query_response = self.client.embeddings.create(
                model=self.embedding_model,
                input=[query]
            )
            query_embedding = query_response.data[0].embedding
            
            # 3. Calculate similarity and sort
            results = []
            for chunk in chunks:
                if "embedding" not in chunk:
                    continue
                
                # Calculate cosine similarity
                similarity = self._cosine_similarity(query_embedding, chunk["embedding"])
                results.append({
                    "text": chunk["text"],
                    "metadata": chunk["metadata"],
                    "similarity": similarity
                })
            
            # Sort by similarity and return top_k results
            results.sort(key=lambda x: x["similarity"], reverse=True)
            logger.info(f"result: {results}")
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            return []
    
    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """Calculate cosine similarity of two vectors"""
        import numpy as np
        v1 = np.array(v1)
        v2 = np.array(v2)
        return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))


text_processor = TextProcessor() 


