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

# Create working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .

# Install required Python packaging tools
RUN pip install --ignore-installed setuptools wheel gunicorn

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Expose app port
EXPOSE 5000

# Start app with Gunicorn
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "120", "app:create_app()"]
