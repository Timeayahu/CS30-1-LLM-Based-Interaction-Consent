import json
import os

# process openai_file.ipynb
try:
    with open('Backend Development/openai_file.ipynb', 'r') as f:
        notebook = json.load(f)
    
    # find and replace API keys
    for cell in notebook['cells']:
        if cell['cell_type'] == 'code':
            for i, line in enumerate(cell['source']):
                if 'OPENAI_API_KEY' in line and 'sk-' in line:
                    cell['source'][i] = line.replace(line.split('=')[1], ' \"YOUR_OPENAI_API_KEY\" # 请替换为您的API密钥或从环境变量中加载\n')
                if 'SERPAPI_API_KEY' in line and len(line.split('=')) > 1:
                    cell['source'][i] = line.replace(line.split('=')[1], ' \"YOUR_SERPAPI_API_KEY\" # 请替换为您的API密钥或从环境变量中加载\n')
    
    # save the modified file
    with open('Backend Development/openai_file.ipynb', 'w') as f:
        json.dump(notebook, f, indent=1)
    print("cleaned API keys in openai_file.ipynb")

except Exception as e:
    print(f"error processing openai_file.ipynb: {e}")

# process benchmark.ipynb
try:
    with open('Backend Development/benchmark.ipynb', 'r') as f:
        notebook = json.load(f)
    
    # find and replace API keys
    for cell in notebook['cells']:
        if cell['cell_type'] == 'code':
            for i, line in enumerate(cell['source']):
                if 'OPENAI_API_KEY' in line and 'sk-' in line:
                    cell['source'][i] = line.replace(line.split('=')[1], ' \"YOUR_OPENAI_API_KEY\" # 请替换为您的API密钥或从环境变量中加载\n')
    
    # save the modified file
    with open('Backend Development/benchmark.ipynb', 'w') as f:
        json.dump(notebook, f, indent=1)
    print("cleaned API keys in benchmark.ipynb")

except Exception as e:
    print(f"error processing benchmark.ipynb: {e}")

print("completed API key cleanup") 