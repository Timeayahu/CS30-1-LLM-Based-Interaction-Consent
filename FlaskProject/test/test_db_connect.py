import unittest
from models.mongodb_local import db

class TestMongoDBConnection(unittest.TestCase):
    
    def test_connection(self):
        """test MongoDB connection"""
        try:
            # try to list collections
            collections = db.list_collection_names()
            self.assertIsInstance(collections, list)  # ensure return is a list
            print("MongoDB connection successful! Collections:", collections)
        except Exception as e:
            self.fail(f"MongoDB connection failed: {e}")

if __name__ == '__main__':
    unittest.main()
        
