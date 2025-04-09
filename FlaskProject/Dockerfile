FROM python:3.10-slim

# 安装Chrome和依赖，用于Selenium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    xvfb \
    libxi6 \
    libgconf-2-4 \
    default-jdk \
    libglib2.0-0 \
    libnss3 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxtst6 \
    libxss1 \
    libasound2 \
    libdbus-glib-1-2 \
    libnspr4 \
    libnss3 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    --no-install-recommends

# 安装Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制项目依赖文件
COPY requirements.txt .

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

# 下载ChromeDriver
RUN LATEST=$(wget -q -O - https://chromedriver.storage.googleapis.com/LATEST_RELEASE) \
    && wget -q "https://chromedriver.storage.googleapis.com/${LATEST}/chromedriver_linux64.zip" \
    && unzip chromedriver_linux64.zip \
    && rm chromedriver_linux64.zip \
    && mv chromedriver /usr/bin/chromedriver \
    && chmod +x /usr/bin/chromedriver

# 复制项目文件
COPY . .

# 设置Python路径
ENV PYTHONPATH=/app

# 暴露端口
EXPOSE 5000

# 启动应用
CMD ["python", "app.py"] 