import json
import pymongo
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['capstone']
collection = db['cs30-1']

# collection.insert_one({"test": "这是一个测试数据"})
# 查询所有文档
# documents = collection.find()

# 打印结果
# print("📦 MongoDB 当前所有数据：")
# for doc in documents:
#     print(json.dumps(doc, indent=4, default=str, ensure_ascii=False))

collection.delete_many({})
