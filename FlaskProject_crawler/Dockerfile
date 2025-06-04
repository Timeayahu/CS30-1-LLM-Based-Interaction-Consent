# Base image using Amazon Linux 2023
FROM public.ecr.aws/amazonlinux/amazonlinux:2023

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    LANG=C.UTF-8 \
    FLASK_ENV=production \
    PYTHONPATH=/app

# Update and install system dependencies
RUN yum update -y && \
    yum install -y \
    python3 \
    python3-pip \
    wget \
    unzip \
    tar \
    shadow-utils \
    fontconfig \
    alsa-lib \
    dbus-glib \
    gtk3 \
    libX11-xcb \
    libXi \
    glib2 \
    nss \
    libXext \
    libXrender \
    libXtst \
    libXScrnSaver \
    xdg-utils \
    java-17-amazon-corretto \
    xorg-x11-server-Xvfb && \
    yum clean all

# Fix symlinks for Python and pip
RUN ln -sf /usr/bin/python3 /usr/bin/python && ln -sf /usr/bin/pip3 /usr/bin/pip

# Install latest Google Chrome
RUN curl -sSL https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm -o chrome.rpm && \
    yum install -y ./chrome.rpm && \
    rm -f chrome.rpm && \
    yum install -y jq unzip

# Create working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .

# Install required Python packaging tools
RUN pip install --ignore-installed setuptools wheel gunicorn

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Extract Chrome version
RUN CHROME_VERSION=$(google-chrome --version | awk '{print $3}') && \
    echo "Detected Chrome version: $CHROME_VERSION" && \
    MAJOR_VERSION=$(echo $CHROME_VERSION | cut -d '.' -f 1) && \
    DRIVER_URL=$(curl -s https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json \
      | jq -r --arg major "$MAJOR_VERSION" \
      '.channels.Stable.downloads.chromedriver[] | select(.platform == "linux64") | .url') && \
    echo "Downloading ChromeDriver from $DRIVER_URL" && \
    curl -sSL "$DRIVER_URL" -o chromedriver.zip && \
    unzip chromedriver.zip && \
    mv chromedriver-linux64/chromedriver /usr/bin/chromedriver && \
    chmod +x /usr/bin/chromedriver && \
    rm -rf chromedriver.zip chromedriver-linux64


# Copy application source
COPY . .

# Expose app port
EXPOSE 8001

# Start app with Gunicorn
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8001", "app:create_app()"]
