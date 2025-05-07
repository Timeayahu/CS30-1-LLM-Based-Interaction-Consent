# import pymongo

# username = 'cs30admin'
# password = 'cs30_123456'
# cluster_endpoint = 'cs30-1-docdbcluster.cluster-c5m0iqmyku0l.us-east-1.docdb.amazonaws.com'

# connection_string = f'mongodb://cs30admin:{password}@cs30-1-docdbcluster.cluster-c5m0iqmyku0l.us-east-1.docdb.amazonaws.com:27017/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false'

# client = pymongo.MongoClient(connection_string)

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

client = None
db = None
privacy_data = None

def connect_to_mongodb():
    """
    Establishes connection to MongoDB and initializes the database and collection.
    Returns True if connection is successful, False otherwise.
    """
    global client, db, privacy_data
    
    try:
        connection_string = f'mongodb://{username}:{password}@{cluster_endpoint}:{port}/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false'
        
        client = pymongo.MongoClient(connection_string)
        
        # Test the connection
        client.server_info()
        
        # Initialize database and collection
        db = client[database_name]
        privacy_data = db['privacy_data']
        
        print(f"Successfully connected to MongoDB: {cluster_endpoint}:{port}")
        print(f"Using database: {database_name}")
        print(f"Using collection: privacy_data")
        
        return client, db, privacy_data
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


