FROM python:3.10-slim

# download Chrome and dependencies, for Selenium
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

# install Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy project dependencies
COPY requirements.txt .

# install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 删除现有的ChromeDriver
RUN rm -f /usr/bin/chromedriver

# 安装135版本的ChromeDriver
RUN wget -q "https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/135.0.7049.84/linux64/chromedriver-linux64.zip" && \
    unzip chromedriver-linux64.zip && \
    mv chromedriver-linux64/chromedriver /usr/bin/chromedriver && \
    chmod +x /usr/bin/chromedriver && \
    rm -rf chromedriver-linux64.zip chromedriver-linux64

# copy project files
COPY . .

ENV PYTHONPATH=/app

EXPOSE 5000

# start application
ENV FLASK_ENV=development
CMD ["python", "app.py"]