import os
import logging
import json
from typing import List, Optional, Dict, Any

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
        self.model = "text-embedding-3-small"  # Can be replaced with other models as needed
        
        # Initialize vector store
        self.vector_store = None
        self.initialize_vector_store()
        
    def initialize_vector_store(self):
        """Initialize vector store, load if exists, otherwise create new one"""
        try:
            # Try to load vector store from file
            vector_store_path = os.path.join("data", "vector_store", "privacy_knowledge")
            self.vector_store = VectorStore.load(vector_store_path)
            
            if self.vector_store is None:
                # If loading fails, create new vector store
                self.vector_store = VectorStore()
                
                # Load sample knowledge base data
                self.load_sample_knowledge()
                
        except Exception as e:
            self.logger.error(f"Failed to initialize vector store: {str(e)}")
            # If error occurs, still create an empty vector store
            self.vector_store = VectorStore()
    
    def load_sample_knowledge(self):
        """Load sample knowledge base data"""
        try:
            # Sample privacy regulation data - comprehensive GDPR articles
            sample_docs = [
                {
                    "text": "Personal data shall be processed lawfully, fairly and in a transparent manner in relation to the data subject. Data controllers must ensure that individuals understand how their data is being collected and used.",
                    "source": "GDPR Article 5(1)(a)"
                },
                {
                    "text": "Personal data shall be collected for specified, explicit and legitimate purposes and not further processed in a manner that is incompatible with those purposes.",
                    "source": "GDPR Article 5(1)(b)"
                },
                {
                    "text": "Personal data shall be adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed (data minimisation).",
                    "source": "GDPR Article 5(1)(c)"
                },
                {
                    "text": "Personal data shall be accurate and, where necessary, kept up to date; every reasonable step must be taken to ensure that personal data that are inaccurate are erased or rectified without delay.",
                    "source": "GDPR Article 5(1)(d)"
                },
                {
                    "text": "Personal data shall be kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which the personal data are processed.",
                    "source": "GDPR Article 5(1)(e)"
                },
                {
                    "text": "Personal data shall be processed in a manner that ensures appropriate security of the personal data, including protection against unauthorised or unlawful processing and against accidental loss, destruction or damage.",
                    "source": "GDPR Article 5(1)(f)"
                },
                {
                    "text": "The controller shall be responsible for, and be able to demonstrate compliance with the principles relating to processing of personal data.",
                    "source": "GDPR Article 5(2)"
                },
                {
                    "text": "Processing shall be lawful only if and to the extent that at least one of the following applies: the data subject has given consent, processing is necessary for the performance of a contract, or processing is necessary for compliance with a legal obligation.",
                    "source": "GDPR Article 6(1)"
                },
                {
                    "text": "Where processing is based on consent, the controller shall be able to demonstrate that the data subject has consented to processing of his or her personal data.",
                    "source": "GDPR Article 7(1)"
                },
                {
                    "text": "The data subject shall have the right to withdraw his or her consent at any time. The withdrawal of consent shall not affect the lawfulness of processing based on consent before its withdrawal.",
                    "source": "GDPR Article 7(3)"
                },
                {
                    "text": "The controller shall provide information about the purposes of the processing, the categories of personal data concerned, and the recipients or categories of recipients of the personal data.",
                    "source": "GDPR Article 13(1)"
                },
                {
                    "text": "The controller shall provide information about the period for which the personal data will be stored, or the criteria used to determine that period.",
                    "source": "GDPR Article 13(2)(a)"
                },
                {
                    "text": "The data subject shall have the right to obtain from the controller confirmation as to whether or not personal data concerning him or her are being processed.",
                    "source": "GDPR Article 15(1)"
                },
                {
                    "text": "The data subject shall have the right to obtain from the controller without undue delay the rectification of inaccurate personal data concerning him or her.",
                    "source": "GDPR Article 16"
                },
                {
                    "text": "The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay where the personal data are no longer necessary.",
                    "source": "GDPR Article 17(1)"
                },
                {
                    "text": "The data subject shall have the right to obtain from the controller restriction of processing where the accuracy of the personal data is contested by the data subject.",
                    "source": "GDPR Article 18(1)"
                },
                {
                    "text": "The data subject shall have the right to receive the personal data concerning him or her in a structured, commonly used and machine-readable format.",
                    "source": "GDPR Article 20(1)"
                },
                {
                    "text": "The data subject shall have the right to object, on grounds relating to his or her particular situation, to processing of personal data which is based on legitimate interests.",
                    "source": "GDPR Article 21(1)"
                },
                {
                    "text": "The controller shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk of processing.",
                    "source": "GDPR Article 32(1)"
                },
                {
                    "text": "In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the supervisory authority.",
                    "source": "GDPR Article 33(1)"
                },
                {
                    "text": "When the personal data breach is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall communicate the breach to the data subject without undue delay.",
                    "source": "GDPR Article 34(1)"
                },
                {
                    "text": "Where processing is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall carry out a data protection impact assessment.",
                    "source": "GDPR Article 35(1)"
                },
                {
                    "text": "The controller shall designate a data protection officer where the core activities consist of processing operations which require regular and systematic monitoring of data subjects on a large scale.",
                    "source": "GDPR Article 37(1)"
                },
                {
                    "text": "Each supervisory authority shall have the power to impose administrative fines up to 20,000,000 EUR, or in the case of an undertaking, up to 4% of the total worldwide annual turnover.",
                    "source": "GDPR Article 83(5)"
                }
            ]
            
            # Extract text and metadata
            texts = [doc["text"] for doc in sample_docs]
            metadatas = [{"source": doc["source"]} for doc in sample_docs]
            
            # Generate embedding vectors
            embeddings = []
            for text in texts:
                embedding = self.embed_text(text)
                if embedding:
                    embeddings.append(embedding)
                else:
                    # If embedding generation fails, skip this document
                    self.logger.warning(f"Failed to generate embedding for: {text[:50]}...")
                    return
            
            # Add to vector store
            if len(texts) == len(embeddings):
                success = self.vector_store.add_documents(texts, embeddings, metadatas)
                if success:
                    self.logger.info(f"Added {len(texts)} sample documents to vector store")
                    
                    # Save vector store
                    vector_store_path = os.path.join("data", "vector_store", "privacy_knowledge")
                    self.vector_store.save(vector_store_path)
            
        except Exception as e:
            self.logger.error(f"Error loading sample knowledge: {str(e)}")
            
    def embed_text(self, text: str) -> List[float]:
        """Convert text to vector embedding"""
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
        """Search knowledge base and return most relevant snippets"""
        try:
            # Ensure vector store is initialized
            if self.vector_store is None:
                self.logger.warning("Vector store not initialized")
                return []
                
            # 1. Vectorize the question
            question_embedding = self.embed_text(question)
            if not question_embedding:
                self.logger.error("Failed to generate embedding for question")
                return []
                
            # 2. Search for similar content in vector database
            results = self.vector_store.search(question_embedding, top_k=top_k)
            
            # If no results, return empty list
            if not results:
                return []
                
            # 3. Format results
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
        """Format search results as text"""
        if not results:
            return ""
            
        formatted_chunks = []
        for item in results:
            text = item.get("text", "")
            metadata = item.get("metadata", {})
            source = metadata.get("source", "Unknown source")
            formatted_chunks.append(f"Source: {source}\nContent: {text}")
            
        return "\n\n".join(formatted_chunks) 
