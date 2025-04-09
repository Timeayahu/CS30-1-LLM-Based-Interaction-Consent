# 隐私政策分析系统

## 项目简介
本项目是一个隐私政策爬取和分析系统，可以对网站的隐私政策进行爬取、分析和分类。

## 环境需求
- Python 3.10+
- Docker（可选，推荐）

## 使用方法

### 方法一：使用Docker（推荐）

Docker提供了一致的运行环境，避免依赖问题，强烈推荐团队成员使用此方式。

#### 首次设置

1. **安装Docker**
   - Windows: 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop) 或使用 [WSL 2 + Docker Engine](https://docs.docker.com/engine/install/ubuntu/)
   - Mac: 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Linux: 安装 [Docker Engine](https://docs.docker.com/engine/install/)

2. **配置环境变量**
   ```bash
   # 复制示例环境文件
   cp .env.example .env
   
   # 编辑.env文件，填入API密钥
   # OPENAI_API_KEY=sk-your-real-key-here
   ```

3. **构建并启动容器**
   ```bash
   # 构建并在后台启动
   docker-compose up -d
   ```

#### 日常使用

1. **启动项目**
   ```bash
   # 如果容器已停止（如重启电脑后）
   docker-compose start
   
   # 或者完整启动（如果容器不存在）
   docker-compose up -d
   ```

2. **查看运行状态**
   ```bash
   docker-compose ps
   ```

3. **查看日志**
   ```bash
   docker-compose logs -f
   ```

4. **停止项目**
   ```bash
   docker-compose stop
   ```

5. **更新代码后重建**
   ```bash
   docker-compose up -d --build
   ```

### 方法二：直接使用Python

如果您不想使用Docker，可以直接在Python环境中运行项目。

1. **创建虚拟环境**
   ```bash
   python -m venv venv
   
   # Windows激活
   venv\Scripts\activate
   
   # Linux/Mac激活
   source venv/bin/activate
   ```

2. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

3. **设置环境变量**
   - 复制并编辑.env.example为.env，填入必要的API密钥

4. **运行项目**
   ```bash
   python app.py
   ```

## 访问应用
无论使用哪种方式，应用都将运行在：
- http://localhost:5000

## Docker命令解释

- `docker-compose up -d`: 构建并在后台启动容器
- `docker-compose start`: 启动已存在的容器
- `docker-compose stop`: 停止容器但不删除
- `docker-compose down`: 停止并删除容器
- `docker-compose logs -f`: 查看实时日志

## 常见问题

### Docker相关

1. **容器无法启动**
   - 检查Docker服务是否运行
   - 验证端口5000是否被占用: `netstat -ano | findstr 5000`

2. **依赖包更新**
   - 修改requirements.txt后需要重新构建: `docker-compose up -d --build`

### Python环境相关

1. **包安装失败**
   - 尝试更新pip: `python -m pip install --upgrade pip`
   - 检查Python版本是否为3.10+

2. **找不到模块错误**
   - 确保激活了虚拟环境
   - 验证所有依赖已安装: `pip list` 