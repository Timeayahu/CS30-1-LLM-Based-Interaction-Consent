import pymongo
from bson import ObjectId
import os
import datetime  
import uuid

database_name = os.getenv('MONGODB_DB', 'CS30')
port = os.getenv('MONGODB_PORT', 27017)
username = os.getenv('MONGODB_USERNAME', 'cs30admin')
password = os.getenv('MONGODB_PASSWORD', 'cs30_123456')
cluster_endpoint = os.getenv('MONGODB_CLUSTER_ENDPOINT', 'cs30-1-docdbcluster.cluster-c5m0iqmyku0l.us-east-1.docdb.amazonaws.com')



def connect_to_mongodb():
    """
    Establishes connection to MongoDB and initializes the database and collection.
    Returns True if connection is successful, False otherwise.
    """
    client = None
    db = None
    chat_sessions = None
    
    try:
        connection_string = f'mongodb://{username}:{password}@{cluster_endpoint}:{port}/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false'
        
        client = pymongo.MongoClient(connection_string)
        
        # Test the connection
        client.server_info()
        
        # Initialize database and collection
        db = client[database_name]
        chat_sessions = db['chat_sessions']
        
        print(f"Successfully connected to MongoDB: {cluster_endpoint}:{port}")
        print(f"Using database: {database_name}")
        print(f"Using collection: chat_sessions")

        chat_sessions.create_index("last_active", expireAfterSeconds=86400)
        
        return client, db, chat_sessions
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        return None, None, None

def close_mongodb_connection(client):
    """
    Closes the MongoDB connection.
    """
    if client:
        try:
            client.close()
            print("MongoDB connection closed successfully")
        except Exception as e:
            print(f"Error closing MongoDB connection: {e}")

# generate unique id
def generate_policy_id():
    return str(uuid.uuid4())

# check the id type and handle it
def handle_id(id_value):
    # if the id is ObjectId type, convert to string
    if isinstance(id_value, ObjectId):
        return str(id_value)
    # if the id is string but looks like ObjectId, try to convert
    elif isinstance(id_value, str) and len(id_value) == 24 and all(c in '0123456789abcdef' for c in id_value):
        try:
            return str(ObjectId(id_value))
        except:
            return id_value
    return id_value

# get the privacy policy by url
def get_policy_by_url(url, privacy_data):
    try:
        doc = privacy_data.find_one({"url": url})
        if doc and '_id' in doc:
            doc['policy_id'] = handle_id(doc['_id'])
        return doc
    except Exception as e:
        print(f"Get policy by URL failed: {e}")
        return None

# get privacy policy by id
def get_policy_by_id(policy_id, privacy_data):
    try:
        # try to query by id, not convert to ObjectId
        doc = privacy_data.find_one({"_id": policy_id})
        # if not found, try to query by ObjectId (compatible with old data)
        if not doc and len(policy_id) == 24:
            try:
                doc = privacy_data.find_one({"_id": ObjectId(policy_id)})
            except:
                pass
        
        if doc and '_id' in doc:
            doc['policy_id'] = handle_id(doc['_id'])
        return doc
    except Exception as e:
        print(f"Get policy by ID failed: {e}")
        return None

# get summary
def get_summary(policy_id, privacy_data):
    try:
        policy = privacy_data.find_one({"_id": policy_id})
        if not policy and len(policy_id) == 24:
            try:
                policy = privacy_data.find_one({"_id": ObjectId(policy_id)})
            except:
                pass
                
        if policy and "summary_content" in policy:
            return {
                "policy_id": handle_id(policy['_id']),
                "summary_content": policy.get("summary_content")
            }
        return None
    except Exception as e:
        print(f"Get summary failed: {e}")
        return None

# update last checked time
def update_last_checked_time(policy_id, privacy_data):
    """
    Updates the 'last_checked' timestamp of a policy without changing other fields
    
    Args:
        policy_id: The ID of the policy to update
        
    Returns:
        bool: True if the update was successful, False otherwise
    """
    try:
        # Handle different ID formats
        object_id = policy_id
        if isinstance(policy_id, str) and len(policy_id) == 24:
            try:
                object_id = ObjectId(policy_id)
            except:
                pass
                
        # Update the last_checked field
        result = privacy_data.update_one(
            {"_id": object_id},
            {"$set": {
                "last_checked": datetime.datetime.now()
            }}
        )
        
        return result.modified_count > 0
    except Exception as e:
        print(f"Update last checked time failed: {e}")
        return False

#save privacy policy with summary
def save_policy(url, html_content, markdown_content, summary_content, privacy_data):
    try:
        # check if policy already exists
        existing = privacy_data.find_one({"url": url})
        if existing:
            # update the existing record
            policy_id = existing["_id"]
            update_data = {
                "html_content": html_content,
                "markdown_content": markdown_content,
                "summary_content": summary_content,  
                "updated_at": datetime.datetime.now(),
                "last_checked": datetime.datetime.now()
            }
                
            privacy_data.update_one(
                {"_id": policy_id},
                {"$set": update_data}
            )
            return handle_id(policy_id)
        
        # generate custom id
        policy_id = generate_policy_id()
        
        # if policy does not exist, save it
        policy_data = {
            "_id": policy_id,  
            "url": url,
            "html_content": html_content,
            "markdown_content": markdown_content,
            "summary_content": summary_content,  
            "created_at": datetime.datetime.now(),
            "last_checked": datetime.datetime.now()
        }
            
        privacy_data.insert_one(policy_data)
        return policy_id  
    except Exception as e:
        print(f"Save policy failed: {e}")
        return None

#save or update summary
def save_summary(policy_id, summary_content, privacy_data):
    try:
        # directly use policy_id, not convert to ObjectId
        result = privacy_data.update_one(
            {"_id": policy_id},
            {"$set": {"summary_content": summary_content}}
        )
        
        if result.matched_count == 0 and len(policy_id) == 24:
            try:
                object_id = ObjectId(policy_id)
                result = privacy_data.update_one(
                    {"_id": object_id},
                    {"$set": {"summary_content": summary_content}}
                )
            except:
                pass
        
        if result.modified_count > 0 or result.matched_count > 0:
            return policy_id
        else:
            print(f"No policy found with ID: {policy_id}")
            return None
    except Exception as e:
        print(f"Save summary failed: {e}")
        return None

def check_db_update(existing_policy, time_interval):
    current_time = datetime.datetime.now()
    last_update_time = existing_policy.get("updated_at") or existing_policy.get("created_at")
    
    # calculate time interval
    time_elapsed = current_time - last_update_time

    if time_elapsed < time_interval:
        return time_elapsed
    else:
        return False
    
def generate_session_id():
    return str(uuid.uuid4())

def create_session(chat_sessions, policy_id=None, user_id=None):
    session_id = generate_session_id()
    session_data = {
        "_id": session_id,  # 直接用生成的UUID作为_id
        "user_id": user_id,
        "policy_id": policy_id,
        "created_at": datetime.datetime.now(),
        "last_active": datetime.datetime.now(),
        "initialized": False,  # 标记是否已初始化系统消息
        "messages": []
    }
    chat_sessions.insert_one(session_data)
    return session_id

def add_message_to_session(chat_sessions, session_id, role, content):
    message = {
        "role": role,
        "content": content,
        "timestamp": datetime.datetime.now()
    }
    result = chat_sessions.update_one(
        {"_id": session_id},
        {
            "$push": {"messages": {"$each": [message], "$slice": -50}},  # 只保留最新的50条消息
            "$set": {"last_active": datetime.datetime.now()}
        }
    )
    return result.modified_count > 0

def mark_session_initialized(chat_sessions, session_id, system_content):
    """标记会话已初始化系统消息"""
    message = {
        "role": "system",
        "content": system_content,
        "timestamp": datetime.datetime.now()
    }
    result = chat_sessions.update_one(
        {"_id": session_id, "initialized": False},  # 确保只初始化一次
        {
            "$set": {"initialized": True},
            "$push": {"messages": message}
        }
    )
    return result.modified_count > 0

def get_session(chat_sessions, session_id):
    """获取完整会话"""
    session = chat_sessions.find_one({"_id": session_id})
    if session:
        # 处理所有日期时间字段
        if "created_at" in session:
            session["created_at"] = session["created_at"].isoformat()
        if "last_active" in session:
            session["last_active"] = session["last_active"].isoformat()
        
        # 处理消息中的时间戳
        for msg in session.get("messages", []):
            if "timestamp" in msg:
                msg["timestamp"] = msg["timestamp"].isoformat()
    return session

def get_session_messages(chat_sessions, session_id):
    """获取会话消息"""
    session = chat_sessions.find_one({"_id": session_id})
    if session:
        messages = session.get("messages", [])
        # 将datetime对象转换为ISO格式字符串
        for msg in messages:
            if "timestamp" in msg and isinstance(msg["timestamp"], datetime.datetime):
                msg["timestamp"] = msg["timestamp"].isoformat()
        return messages
    return None

def close_session(chat_sessions, session_id):
    """关闭会话（可选）"""
    return chat_sessions.update_one(
        {"_id": session_id},
        {"$set": {"closed": True}}
    ).modified_count > 0


def update_system_message(chat_sessions, session_id, new_system_content):
    """更新会话中的系统消息内容"""
    try:
        result = chat_sessions.update_one(
            {
                "_id": session_id,
                "messages.role": "system"  # 定位到系统消息
            },
            {
                "$set": {
                    "messages.$.content": new_system_content,
                    "messages.$.timestamp": datetime.datetime.now(),
                    "last_active": datetime.datetime.now()
                }
            }
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Update system message failed: {e}")
        return False
