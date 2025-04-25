import os
from models.mongodb_local import client, db, privacy_policies, save_policy, get_policy_by_url

# 测试MongoDB连接
def test_connection():
    try:
        # 显示服务器信息
        info = client.server_info()
        print(f"MongoDB连接成功: {info.get('version', 'unknown')}")
        
        # 显示数据库名称
        current_db = os.getenv('MONGODB_DB', 'CS30')
        print(f"当前数据库: {current_db}")
        
        # 显示集合
        collections = db.list_collection_names()
        print(f"集合列表: {collections}")
        
        # 显示privacy_policy集合中的文档数
        count = privacy_policies.count_documents({})
        print(f"privacy_policy集合中的文档数: {count}")
        
        return True
    except Exception as e:
        print(f"MongoDB连接测试失败: {e}")
        return False

# 测试保存和获取
def test_save_and_get():
    try:
        # 测试数据
        test_url = "https://test.example.com/privacy"
        test_html = "<html><body><h1>Test Privacy Policy</h1><p>This is a test.</p></body></html>"
        test_markdown = "# Test Privacy Policy\n\nThis is a test."
        
        # 保存测试数据
        policy_id = save_policy(test_url, test_html, test_markdown)
        print(f"保存测试数据，ID: {policy_id}")
        
        # 获取测试数据
        policy = get_policy_by_url(test_url)
        if policy:
            print(f"成功获取测试数据: {policy['_id']}")
            print(f"URL: {policy['url']}")
            print(f"HTML长度: {len(policy['html_content'])}")
            print(f"Markdown长度: {len(policy['markdown_content'])}")
            
            # 验证数据一致性
            if policy['url'] == test_url:
                print("✅ URL验证通过")
            else:
                print("❌ URL验证失败")
                
            if policy['html_content'] == test_html:
                print("✅ HTML内容验证通过")
            else:
                print("❌ HTML内容验证失败")
            
            # 清理测试数据
            # privacy_policies.delete_one({"_id": policy['_id']})
            # print(f"已删除测试数据")
            
            return True
        else:
            print("获取测试数据失败")
            return False
    except Exception as e:
        print(f"测试保存和获取失败: {e}")
        return False

if __name__ == "__main__":
    print("===== MongoDB连接测试 =====")
    conn_result = test_connection()
    
    if conn_result:
        print("\n===== 数据操作测试 =====")
        test_save_and_get()
    else:
        print("连接测试失败，跳过数据操作测试") 