import os
from models.mongodb_local import client, db, privacy_policies, save_policy, get_policy_by_url

# test MongoDB connection
def test_connection():
    try:
        # show server information
        info = client.server_info()
        print(f"MongoDB连接成功: {info.get('version', 'unknown')}")
        
        # show database name
        current_db = os.getenv('MONGODB_DB', 'CS30')
        print(f"current database: {current_db}")
        
        # show collections
        collections = db.list_collection_names()
        print(f"collections: {collections}")
        
        # show the number of documents in the privacy_policy collection
        count = privacy_policies.count_documents({})
        print(f"number of documents in the privacy_policy collection: {count}")
        
        return True
    except Exception as e:
        print(f"MongoDB connection test failed: {e}")
        return False

# test save and get
def test_save_and_get():
    try:
        # test data
        test_url = "https://test.example.com/privacy"
        test_html = "<html><body><h1>Test Privacy Policy</h1><p>This is a test.</p></body></html>"
        test_markdown = "# Test Privacy Policy\n\nThis is a test."
        
        # save test data
        policy_id = save_policy(test_url, test_html, test_markdown)
        print(f"save test data, ID: {policy_id}")
        
        # get test data
        policy = get_policy_by_url(test_url)
        if policy:
            print(f"successfully get test data: {policy['_id']}")
            print(f"URL: {policy['url']}")
            print(f"HTML length: {len(policy['html_content'])}")
            print(f"Markdown length: {len(policy['markdown_content'])}")
            
            # verify data consistency
            if policy['url'] == test_url:
                print("✅ URL verification passed")
            else:
                print("❌ URL verification failed")
                
            if policy['html_content'] == test_html:
                print("✅ HTML content verification passed")
            else:
                print("❌ HTML content verification failed")
            
            # clean test data
            # privacy_policies.delete_one({"_id": policy['_id']})
            # print(f"test data deleted")
            
            return True
        else:
            print("failed to get test data")
            return False
    except Exception as e:
        print(f"test save and get failed: {e}")
        return False

if __name__ == "__main__":
    print("===== MongoDB connection test =====")
    conn_result = test_connection()
    
    if conn_result:
        print("\n===== data operation test =====")
        test_save_and_get()
    else:
        print("connection test failed, skip data operation test") 