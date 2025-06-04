import pymongo
import os


database_name = os.getenv('MONGODB_DB', 'CS30_login')
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
    
    try:
        connection_string = f'mongodb://{username}:{password}@{cluster_endpoint}:{port}/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false'
        
        client = pymongo.MongoClient(connection_string)
        
        # Test the connection
        client.server_info()
        
        # Initialize database and collection
        db = client[database_name]
        
        print(f"Successfully connected to MongoDB: {cluster_endpoint}:{port}")
        print(f"Using database: {database_name}")

        
        return client, db
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        return None, None

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


def get_user_collection(db):
    collection = db.get_collection('users')
    return collection


def get_admin_collection(db):
    collection = db.get_collection('admin')
    return collection
