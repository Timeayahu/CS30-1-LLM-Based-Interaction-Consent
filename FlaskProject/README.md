

### 方法一：使用Docker（推荐）


1. **安装Docker**
   windows下载ubuntu
   进入终端通过命令：wsl -d Ubuntu进入

2. **常用命令**
   **镜像 & 容器管理命令**
   命令	用法
   docker build -t myimage .	手动根据 Dockerfile 构建镜像（开发阶段一般用 docker-compose）
   docker images	查看已有镜像
   docker rmi <镜像ID>	删除镜像
   docker ps -a	查看所有容器（包括停止的）
   docker rm <容器ID>	删除容器（先停掉再删）
   
   
   **docker-compose 常用命令**
   命令	用法
   docker-compose up	启动容器（如果镜像不存在，会自动 build）
   docker-compose up --build	重新构建镜像并启动（代码改了必须用这个）
   docker-compose down	停止并移除容器（保留镜像和卷）
   docker-compose down --volumes	同时清除数据卷（慎用，数据库也会被清）
   docker-compose down --rmi all	清除所有容器 + 镜像
   docker-compose logs -f	实时查看服务输出日志（调试用）

### 方法二：直接使用Python

如果不想使用Docker，可以直接在Python环境中运行项目。


## 访问应用
无论使用哪种方式，应用都将运行在：
- http://localhost:5000


