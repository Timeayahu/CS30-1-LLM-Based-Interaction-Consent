

### docker使用指南


1. **安装Docker**
   推荐下载ubuntu
   下载docker：https://www.bilibili.com/video/BV1Zn4y1X7AZ?spm_id_from=333.788.videopod.episodes&vd_source=bba9d41c2e94e3f19b77e8cbac2eff78&p=6

   进入终端通过命令：wsl -d Ubuntu进入

   进入后输入docker-compose up --build新建docker容器
   输入docker ps查看容器是否正常启动
   如果正常启动，那么打开浏览器输入网址：http://localhost:5000应该会弹出一个页面显示：欢迎使用隐私政策爬取和分析系统，API文档请访问/api/docs

   容器构建一次即可。后续只需要docker-compose start就可以重新启动。
   

   **写完代码后常用命令：**
   每次写完新代码在push前使用
   1. docker-compose down    # 停止并移除旧容器（可选）
   2. docker-compose up --build  # 重新构建并启动新容器


2. **常用命令**
   **镜像 & 容器管理命令**
   
   docker build -t myimage .	手动根据 Dockerfile 构建镜像（开发阶段一般用 docker-compose）
   docker images	查看已有镜像
   docker rmi <镜像ID>	删除镜像
   docker ps -a	查看所有容器（包括停止的）
   docker rm <容器ID>	删除容器（先停掉再删）
   
   
   **docker-compose 常用命令**
   
   docker-compose up	启动容器（如果镜像不存在，会自动 build）
   docker-compose up --build	重新构建镜像并启动（代码改了必须用这个）
   docker-compose down	停止并移除容器（保留镜像和卷）
   docker-compose down --volumes	同时清除数据卷（慎用，数据库也会被清）
   docker-compose down --rmi all	清除所有容器 + 镜像
   docker-compose logs -f	实时查看服务输出日志（调试用）

### app.py直接启动
   也可以用app.py直接启动，方便开发过程中的测试。在最后push前记得用compose down和build两条命令构建好容器方便后续使用。






