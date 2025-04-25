import unittest
from models.mongodb_local import db

class TestMongoDBConnection(unittest.TestCase):
    
    def test_connection(self):
        """测试 MongoDB 连接是否成功"""
        try:
            # 尝试列出集合
            collections = db.list_collection_names()
            self.assertIsInstance(collections, list)  # 确保返回的是列表
            print("MongoDB connection successful! Collections:", collections)
        except Exception as e:
            self.fail(f"MongoDB connection failed: {e}")

if __name__ == '__main__':
    unittest.main()
        
