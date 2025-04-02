# 隐私政策总结Chrome扩展

这是一个Chrome浏览器扩展，用于快速总结网页上的隐私政策内容。

## 项目结构

```
.
├── app.py              # Flask后端服务
├── background.js       # Chrome扩展的后台脚本
├── requirements.txt    # Python依赖
└── .env               # 环境变量配置
```

## 设置说明

1. 安装Python依赖：
```bash
pip install -r requirements.txt
```

2. 配置环境变量：
- 确保.env文件中包含有效的OpenAI API密钥

3. 启动后端服务：
```bash
python app.py
```

4. 在Chrome中加载扩展：
- 打开Chrome扩展管理页面 (chrome://extensions/)
- 启用"开发者模式"
- 点击"加载已解压的扩展程序"
- 选择包含background.js的目录

## 使用方法

1. 在任意网页上右键点击包含"privacy"、"policy"或"legal"的链接
2. 选择"Summarize Privacy Policy (LLM)"选项
3. 等待总结结果在页面上显示

## 注意事项

- 确保后端服务在运行状态
- 确保.env文件中的API密钥有效
- 扩展默认连接到localhost:5000，如需修改请更新background.js中的API地址