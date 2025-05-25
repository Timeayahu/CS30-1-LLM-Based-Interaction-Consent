import json
import os

# 处理openai_file.ipynb
try:
    with open('Backend Development/openai_file.ipynb', 'r') as f:
        notebook = json.load(f)
    
    # 查找并替换API密钥
    for cell in notebook['cells']:
        if cell['cell_type'] == 'code':
            for i, line in enumerate(cell['source']):
                if 'OPENAI_API_KEY' in line and 'sk-' in line:
                    cell['source'][i] = line.replace(line.split('=')[1], ' \"YOUR_OPENAI_API_KEY\" # 请替换为您的API密钥或从环境变量中加载\n')
                if 'SERPAPI_API_KEY' in line and len(line.split('=')) > 1:
                    cell['source'][i] = line.replace(line.split('=')[1], ' \"YOUR_SERPAPI_API_KEY\" # 请替换为您的API密钥或从环境变量中加载\n')
    
    # 保存修改后的文件
    with open('Backend Development/openai_file.ipynb', 'w') as f:
        json.dump(notebook, f, indent=1)
    print("已清理 openai_file.ipynb 文件中的API密钥")

except Exception as e:
    print(f"处理 openai_file.ipynb 时出错: {e}")

# 处理benchmark.ipynb
try:
    with open('Backend Development/benchmark.ipynb', 'r') as f:
        notebook = json.load(f)
    
    # 查找并替换API密钥
    for cell in notebook['cells']:
        if cell['cell_type'] == 'code':
            for i, line in enumerate(cell['source']):
                if 'OPENAI_API_KEY' in line and 'sk-' in line:
                    cell['source'][i] = line.replace(line.split('=')[1], ' \"YOUR_OPENAI_API_KEY\" # 请替换为您的API密钥或从环境变量中加载\n')
    
    # 保存修改后的文件
    with open('Backend Development/benchmark.ipynb', 'w') as f:
        json.dump(notebook, f, indent=1)
    print("已清理 benchmark.ipynb 文件中的API密钥")

except Exception as e:
    print(f"处理 benchmark.ipynb 时出错: {e}")

print("完成API密钥清理") 