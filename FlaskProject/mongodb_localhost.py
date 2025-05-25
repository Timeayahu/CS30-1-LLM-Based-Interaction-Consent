import json
import pymongo
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['capstone']
collection = db['cs30-1']

# collection.insert_one({"test": "this is a test data"})
# documents = collection.find()

# print("📦 MongoDB current all data:")
# for doc in documents:
#     print(json.dumps(doc, indent=4, default=str, ensure_ascii=False))

collection.delete_many({})
