# 隐私政策数据包初始化文件
# 本包用于存储各公司隐私政策文本文件

# 简单访问接口，返回可用的隐私政策公司列表
def get_available_companies():
    """返回当前已爬取的公司隐私政策列表"""
    import os
    companies = []
    for filename in os.listdir(os.path.dirname(__file__)):
        # 只处理txt文件
        if filename.endswith(".txt"):
            # 移除后缀
            company = filename[:-4]
            companies.append(company)
    return companies

# 读取指定公司的隐私政策文本
def get_policy_text(company_name):
    """获取指定公司的隐私政策文本
    
    Args:
        company_name: 公司名称（不含.txt后缀）
    
    Returns:
        str: 隐私政策文本内容，如果不存在则返回None
    """
    import os
    file_path = os.path.join(os.path.dirname(__file__), f"{company_name}.txt")
    if not os.path.exists(file_path):
        return None
        
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read() 