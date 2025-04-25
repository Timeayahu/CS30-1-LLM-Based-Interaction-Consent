import pymongo
from bson import ObjectId
import os
import datetime  

host = os.getenv('MONGODB_HOST', 'localhost')  
port = 27017
database_name = os.getenv('MONGODB_DB', 'CS30')

connection_string = f'mongodb://{host}:{port}/'


client = pymongo.MongoClient(
    connection_string,
    serverSelectionTimeoutMS=5000,  
    connectTimeoutMS=5000,
    retryWrites=True  
)

db = client[database_name]

# 修改集合名称为privacy_policy
privacy_policies = db['privacy_policy'] 
policy_summaries = db['policy_summaries']  
chat_histories = db['chat_histories']     

# check the connection status
try:
    client.server_info()
    print(f"Successfully connected to MongoDB: {host}:{port}")
    print(f"使用数据库: {database_name}")
    print(f"使用集合: privacy_policy, policy_summaries, chat_histories")
except Exception as e:
    print(f"MongoDB connection error: {e}")

# helper function: get the privacy policy by url
def get_policy_by_url(url):
    try:
        return privacy_policies.find_one({"url": url})
    except Exception as e:
        print(f"查询URL失败: {e}")
        return None

# helper function: get the privacy policy by id
def get_policy_by_id(policy_id):
    try:
        return privacy_policies.find_one({"_id": ObjectId(policy_id)})
    except Exception as e:
        print(f"查询ID失败: {e}")
        return None

# 辅助函数：保存隐私政策
def save_policy(url, html_content, markdown_content):
    try:
        # 检查是否已存在
        existing = privacy_policies.find_one({"url": url})
        if existing:
            return existing["_id"]
        
        # 不存在则保存
        policy_data = {
            "url": url,
            "html_content": html_content,
            "markdown_content": markdown_content,
            "created_at": datetime.datetime.now()  # 使用标准的datetime模块
        }
        result = privacy_policies.insert_one(policy_data)
        return result.inserted_id
    except Exception as e:
        print(f"保存隐私政策失败: {e}")
        return None

# 辅助函数：保存摘要
def save_summary(policy_id, summary_content):
    try:
        # 检查是否已存在
        existing = policy_summaries.find_one({"policy_id": policy_id})
        if existing:
            # 更新现有摘要
            policy_summaries.update_one(
                {"_id": existing["_id"]},
                {"$set": {"summary_content": summary_content}}
            )
            return existing["_id"]
        
        # 不存在则保存
        summary_data = {
            "policy_id": policy_id,
            "summary_content": summary_content,
            "created_at": datetime.datetime.now()  # 使用标准的datetime模块
        }
        result = policy_summaries.insert_one(summary_data)
        return result.inserted_id
    except Exception as e:
        print(f"保存摘要失败: {e}")
        return None

# 辅助函数：获取摘要
def get_summary(policy_id):
    try:
        return policy_summaries.find_one({"policy_id": policy_id})
    except Exception as e:
        print(f"获取摘要失败: {e}")
        return None
