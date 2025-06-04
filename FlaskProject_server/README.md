
# LLM-based Consent Reader

This is the server node for running our privacy policy reader, which runs in an cloud environment provided by AWS.

## Features🚀

- LLM summarization for privacy policy
- Mongodb & Redis for storing existing records
- Chatbox for general and detail questions of privacy policy
- Login and admin control




## 📘 API Documentation

This Flask-based API consists of three main modules: **Chat**, **Login**, and **Scheduling**. Below is a breakdown of each endpoint, request format, and response format.

---

### 🧠 Chat Endpoints (`chat_routes.py`)

#### 🔹 POST `/api/chat`
Handles contextual AI chat using a 3-part prompt structure.

**Request JSON:**
```json
{
  "policy_id": "...",
  "category_name": "...",
  "bubble_summary": "...",
  "user_question": "...",
  "session_id": "..."  // optional
}
```

**Response:**
```json
{
  "success": true,
  "response": { ... },
  "session_id": "...",
  "policy_id": "..."
}
```

---

#### 🔹 POST `/api/general-chat`
Handles general AI Q&A without category or summary.

**Request JSON:**
```json
{
  "policy_id": "...",
  "user_question": "...",
  "session_id": "..."  // optional
}
```

**Response:**
Same structure as `/api/chat`.

---

#### 🔹 GET `/api/sessions/<session_id>`
Fetch session history.

**Response:**
```json
{
  "success": true,
  "session_id": "...",
  "messages": [...]
}
```

---

#### 🔹 POST `/api/sessions/<session_id>/close`
Closes an existing session.

**Response:**
```json
{
  "success": true,
  "message": "Session closed successfully"
}
```

---

#### 🔹 GET `/api/policy/<policy_id>`
Fetch a privacy policy by ID.

**Response:**
```json
{
  "success": true,
  "summary_content": { ... },
  "policy_id": "...",
  "policy_url": "...",
  "markdown_content": "..."
}
```

---

### 👤 Auth & Feature Control Endpoints (`login_routes.py`)

#### 🔹 POST `/api/signup`
Registers a new user or admin (`admin_user`).

**Request JSON:**
```json
{
  "username": "...",
  "password": "..."
}
```

---

#### 🔹 POST `/api/login`
Authenticates user/admin.

**Request JSON:**
```json
{
  "username": "...",
  "password": "..."
}
```

**Response:**
```json
{
  "message": "Login successful",
  "role": "user" | "admin"
}
```

---

#### 🔹 POST `/api/toggle_visibility`
Admin toggles a feature’s visibility in Redis.

**Request JSON:**
```json
{
  "username": "...",
  "feature": "...",
  "visible": true | false
}
```

---

#### 🔹 GET `/api/get_visibility?feature=...`
Gets the current visibility status for a feature.

**Response:**
```json
{
  "feature": "...",
  "visible": true | false
}
```

---

### 📆 Scheduling Endpoint (`scheduling_routes.py`)

#### 🔹 POST `/api/scheduling`
Triggers traffic scheduling.

**Request JSON:**
```json
{
  "url": "https://example.com",
  "text": "..."
}
```

**Response:**
```json
{
  "result": { ... }
}
```

---
## ☁️ AWS Cloud Environment Establishment

This guide walks you through setting up:

- A **VPC**
- **3 Subnets** (e.g., 2 public, 1 private)
- An **Internet Gateway**
- A **Route Table**
- A **t2.micro EC2 instance**

---

### ✅ Prerequisites

- An AWS account
- AWS region selected (e.g., `ap-southeast-2`)
- A key pair for SSH (or create one during EC2 launch)

---

### 1️⃣ Create a VPC

- **Go to**: **VPC Dashboard** → **Your VPCs** → **Create VPC**
- **Choose**: "VPC only"
- **Set**:
  - **Name tag**: `MyVPC`
  - **IPv4 CIDR block**: `10.0.0.0/16`
- **Leave everything else** as default
- **Click**: **Create VPC**

---

### 2️⃣ Create Subnets

- **Go to**: **Subnets** → **Create subnet**
- **Select your VPC**: `MyVPC`
- **Create three subnets** with the following example settings:

| Subnet Name | CIDR Block   | Availability Zone | Type   |
|-------------|--------------|-------------------|--------|
| Subnet-A    | 10.0.1.0/24  | ap-southeast-2a   | Public |
| Subnet-B    | 10.0.2.0/24  | ap-southeast-2b   | Public |
| Subnet-C    | 10.0.3.0/24  | ap-southeast-2c   | Private |

> Tag them accordingly. AWS won't automatically mark them public/private — that depends on route table association.

---

### 3️⃣ Create and Attach Internet Gateway

- **Go to**: **Internet Gateways** → **Create internet gateway**
- **Name it**: `MyIGW`
- **Click**: Create, then **Actions → Attach to VPC**, and select `MyVPC`

---

### 4️⃣ Create a Route Table

- **Go to**: **Route Tables** → **Create route table**
- **Name**: `PublicRouteTable`, **VPC**: `MyVPC`
- After creation, go to the **Routes tab** → **Edit routes**
- Add a route:
  - **Destination**: `0.0.0.0/0`
  - **Target**: Select `Internet Gateway` → `MyIGW`
- Go to **Subnet associations** tab → **Edit subnet associations**
- Associate `Subnet-A` and `Subnet-B` (public subnets)

---

### 🧠 Notes

- To let private subnets access the internet, create a **NAT Gateway** in one of the public subnets.
- Use **Security Groups** to manage access, and **Network ACLs** for subnet-level controls.


## 🔐 EC2 Setup Guide with PuTTY Key Pair (.ppk) from AWS Console

This guide walks you through launching an EC2 instance and preparing a `.ppk` key for use with **PuTTY on Windows**.

---

### ✅ Prerequisites

- AWS account
- PuTTY and PuTTYgen installed ([Download here](https://www.putty.org))
- Windows system

---

### 1️⃣ Launch EC2 Instance and Create Key Pair

- **Go to**: **EC2 Dashboard** → **Instances** → **Launch Instance**
- **Name**: `MyEC2Instance`
- **AMI**: Amazon Linux 2023 (or Ubuntu)
- **Instance type**: `t2.micro` (Free Tier)
- **Key pair**:
  - Click **Create new key pair**
  - Set:
    - **Name**: `my-ec2-key`
    - **Key pair type**: RSA
    - **Private key file format**: `.ppk` (for PuTTY)
  - Click **Create key pair**
  - A `.ppk` file will be downloaded automatically (e.g., `my-ec2-key.ppk`)
- **Network settings**:
  - Choose existing VPC and subnet
  - Enable **Auto-assign public IP**
- **Firewall (Security Group)**:
  - Allow SSH (port 22)
  - Allow HTTP (port 80) if hosting a web server
- **Click**: **Launch instance**

---

### 2️⃣ Connect to EC2 via PuTTY

- Open **PuTTY**
- **Host Name**: `ec2-user@<public-ip>`
- In **Connection → SSH → Auth**, browse for the `.ppk` file you just downloaded
- Click **Open**
- Accept the server prompt, and you are now connected!

---

### 🧠 Notes

- You don’t need to use PuTTYgen if you already download the `.ppk` key during instance creation.
- If you accidentally selected `.pem`, use **PuTTYgen** to convert it to `.ppk`.


## ☁️ AWS Service Setup Guide: DocumentDB, ElastiCache (Redis)

This guide provides step-by-step instructions for setting up key AWS services via the **AWS Management Console**:

- **Amazon DocumentDB (MongoDB-compatible)**
- **Amazon ElastiCache for Redis**

---

### ✅ Prerequisites

- AWS account with admin or appropriate IAM permissions
- AWS CLI installed (optional)
- A VPC created beforehand (see previous guide)

---

### 📘 1️⃣ Create Amazon DocumentDB

- **Go to**: **DocumentDB Dashboard** → **Create Cluster**
- **Select**: "Standard create"
- **Set**:
  - **Cluster identifier**: `my-docdb-cluster`
  - **Engine version**: Default
  - **Instance class**: `db.t3.medium` (or preferred)
  - **Number of instances**: At least 1
- **Authentication**: Create a username and password
- **Network settings**:
  - Choose your VPC
  - Select at least two subnets (different AZs)
  - Ensure security group allows port `27017`
- **Click**: **Create cluster**

---

### 📕 2️⃣ Create Amazon ElastiCache for Redis

- **Go to**: **ElastiCache Dashboard** → **Redis** → **Create**
- **Choose**: "Cluster Mode Disabled" (unless using sharding)
- **Set**:
  - **Name**: `my-redis-cluster`
  - **Node type**: `cache.t3.micro` (Free Tier eligible)
  - **Number of replicas**: 0 (or as needed)
- **Network settings**:
  - Select your VPC and subnet group
  - Ensure security group allows Redis port `6379`
- **Click**: **Create**

---


## 🔐 EC2 SSH + Docker Deployment Guide (Windows + PuTTY + GitHub + ECR)

This guide walks you through:

- SSH into an EC2 instance using **PuTTY (.ppk)** from Windows
- Pulling code from **GitHub** or uploading using **WinSCP** or **FileZilla**
- Running a **Dockerfile** to build and test an image
- Creating a **AWS ECR** repository and pushing the Docker image to it
---

### ✅ Prerequisites

- EC2 instance is running
- `.ppk` key file (downloaded during EC2 key pair creation)
- PuTTY & PuTTYgen installed: [https://www.putty.org](https://www.putty.org)
- GitHub repo with `Dockerfile`
- Docker installed on EC2

---

### 🔑 1️⃣ SSH to EC2 Using PuTTY (.ppk)

#### Step 1: Launch PuTTY
- **Host Name**: `ec2-user@<your-ec2-public-ip>`
- In the **left pane**, go to `Connection > SSH > Auth`
- Click **Browse** and select your `.ppk` file
- Click **Open** to connect

You should now be connected to your EC2 instance terminal.

---

### 📥 2️⃣ Transfer or Clone Project Code

#### Option A: Clone from GitHub (on EC2)

```bash
sudo yum install -y git       # Amazon Linux
git clone https://github.com/yourusername/your-repo.git
cd your-repo
```

#### Option B: Upload from Windows using WinSCP

- Use **WinSCP** (https://winscp.net)
- Connect using your `.ppk` key (same as PuTTY settings)
- Drag and drop your project folder to `/home/ec2-user/`

Then run:

```bash
cd your-project-folder
```

#### Option C: Upload from Windows using FileZilla

- Open **FileZilla** and go to **File > Site Manager**
- Create a new site:
   - **Protocol**: SFTP - SSH File Transfer Protocol
   - **Host**: Your EC2 public IP
   - **Logon Type**: Key file
   - **User**: `ec2-user`
   - **Key file**: Browse and select your `.ppk` file
- Click **Connect**
- Drag your project folder from your local machine to `/home/ec2-user/`

Then SSH into the EC2 and run:

```bash
cd your-project-folder
```

---

### 🐳 3️⃣ Build and Test Docker Image

#### Step 1: Install Docker

```bash
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user
```

**Log out and log back in** to apply Docker permissions.

#### Step 2: Build Docker Image

```bash
docker build -t my-app .
```

#### Step 3: Run and Test

```bash
docker run -d -p 5000:5000 my-app
curl http://localhost:5000     # Or visit EC2_PUBLIC_IP:5000 in your browser
```

---

### 📦 4️⃣ Set Up and Push Docker Image to Amazon ECR

#### Step 1: Create ECR Repository

- Go to **ECR Dashboard** in the AWS Console
- Click **Create repository**
- Set:
  - **Name**: `my-app`
  - Leave other settings as default (or enable scan on push)
- Click **Create repository**
- Copy the **Repository URI**, e.g.:
  ```
  <aws_account_id>.dkr.ecr.<region>.amazonaws.com/my-app
  ```

#### Step 2: Authenticate Docker to ECR

```bash
aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<region>.amazonaws.com
```

#### Step 3: Tag and Push the Image

```bash
docker tag my-app:latest <aws_account_id>.dkr.ecr.<region>.amazonaws.com/my-app:latest
docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/my-app:latest
```


### 🧠 Notes

- Ensure **port 5000** is open in your EC2 security group for web access
- Use `docker logs <container-id>` to debug
- Use `docker ps` to see running containers

## 🌐 Domain Name + Load Balancer + ECS Setup Guide

This guide walks you through the process of:

- Registering a domain name (via Route 53 or external provider)
- Setting up an **Application Load Balancer (ALB)**
- Routing **port 80/443 traffic** to container **port 5000**
- Securing your domain with **ACM SSL certificates**

---

### ✅ Prerequisites

- An ECS service running in Fargate or EC2 with container port `5000` exposed
- A public **Elastic Container Registry (ECR)** image linked to the task
- VPC with at least two public subnets
- Security group that allows inbound traffic on **ports 80 and 443**

---

### 🌍 1️⃣ Register or Use a Domain

#### Option A: Register via AWS Route 53

- Go to **Route 53 → Registered Domains → Register Domain**
- Search for a domain name and follow the registration steps
- Once complete, it automatically creates a hosted zone

#### Option B: Use a domain from another registrar (e.g., GoDaddy)

- Get access to DNS settings on your registrar's dashboard
- You’ll update **A records or NS records** later using your ALB's DNS name

---

### ⚖️ 2️⃣ Set Up Application Load Balancer (ALB)

- Go to **EC2 → Load Balancers → Create Load Balancer**
- Choose **Application Load Balancer**
- **Set**:
  - Name: `my-app-alb`
  - Scheme: Internet-facing
  - Listeners: HTTP (port 80), HTTPS (port 443)
- **Select VPC and two public subnets**
- **Security Groups**: Allow **inbound HTTP (port 80)** and **HTTPS (port 443)**

---

### 🔀 3️⃣ Create Target Group

- Go to **Target Groups → Create Target Group**
- Type: `IP` or `Instance` (depending on ECS type)
- Protocol: `HTTP`, Port: `5000`
- Name: `ecs-target-5000`
- Select your VPC
- Register your ECS tasks (or leave it for ECS to manage)

---

### 🔒 4️⃣ Use ACM for HTTPS Certificate

- Go to **AWS Certificate Manager (ACM)** → **Request a certificate**
- Choose **Request a public certificate**
- Enter your domain name: `example.com` or `*.example.com`
- Choose **DNS validation**
- ACM will give you a CNAME record to add to your domain’s DNS settings
  - If using Route 53, choose **Add record to Route 53**
  - If using another provider, add the record manually
- Wait for validation to complete

Once validated:

- Go to **EC2 → Load Balancers → Listeners → HTTPS (443)** → **View/edit rules**
- Add a rule to forward traffic to your `ecs-target-5000`
- Attach the ACM certificate to the HTTPS listener

---

### 🌐 5️⃣ Point Domain to ALB

#### If using Route 53:

- Go to **Route 53 → Hosted Zones → Your domain**
- Click **Create Record**
- Set:
  - **Type**: A (Alias)
  - **Alias to**: Application Load Balancer
  - Select your ALB from the dropdown
- Click **Create records**

#### If using external registrar:

- Go to your domain registrar's dashboard
- Edit the **A record**
- Set it to **ALB DNS name** (found in Load Balancer details)

Example:

```
mydomain.com A  →  my-app-alb-1234567890.region.elb.amazonaws.com
```

---

### 🧠 Notes

- ECS service must remain healthy for ALB to route traffic
- HTTPS requires that the ALB uses a valid ACM certificate in the same region
- Use security groups and listener rules to control access

### 🚀 6️⃣ Set Up ECS Cluster, Task Definition, and Run Service

---

#### 🛠️ Create ECS Cluster

- Go to **ECS Dashboard → Clusters → Create Cluster**
- Choose **"Networking only" (Fargate)** for serverless deployment
- Set a name, e.g., `my-app-cluster`
- Choose your existing VPC and two public subnets
- Click **Create**

---

#### 📦 Create Task Definition

- Go to **Task Definitions → Create new Task Definition**
- Launch type: **Fargate**
- Set:
  - **Task name**: `my-app-task`
  - **Task role**: Create or select an IAM role (optional unless needed)
  - **Operating system family**: Linux
  - **CPU**: 1 vCPU
  - **Memory**: 2 GB

- Under **Container Definitions**:
  - Click **Add container**
  - Name: `my-container`
  - Image: Use the ECR URI for your image (e.g., `<account-id>.dkr.ecr.<region>.amazonaws.com/my-app:latest`)
  - Port mappings: **5000** → **5000**
  - Click **Add**

- Click **Create**

---

#### ⚙️ Run ECS Service

- Go to **ECS → Clusters → Your Cluster → Services → Create**
- Launch type: **Fargate**
- Task definition: Select the one you just created
- Service name: `my-app-service`
- Number of tasks: 1 (or more)
- Load balancing:
  - **Enable** Application Load Balancer
  - Select your ALB
  - Listener: **HTTPS: 443**
  - Target group: `ecs-target-5000`
- Network configuration:
  - VPC: Choose your VPC
  - Subnets: Select public subnets
  - Security group: Allow ports **5000**, **80**, and **443**
  - Auto-assign public IP: **ENABLED**

- Click **Create Service**

---

### ✅ Validate Deployment

- Wait for the service to stabilize
- Visit your domain (e.g., `https://yourdomain.com`) in the browser
- You should see your app running via ECS behind HTTPS## 🛠️ Environment Variable Configuration

The application uses environment variables for secure and flexible configuration of external services like MongoDB, Redis, and OpenAI.

### 🔹 Option 1: Local `.env` File

Create a `.env` file in the project root directory with the following content (the values are just an example which we used in our project):

```env
# MongoDB
MONGODB_DB=CS30
MONGODB_PORT=27017
MONGODB_USERNAME=cs30admin
MONGODB_PASSWORD=cs30_123456
MONGODB_CLUSTER_ENDPOINT=cs30-1-docdbcluster.cluster-xxxxxxx.us-east-1.docdb.amazonaws.com

# Redis
REDIS_HOST=test-cache-cpcxto.serverless.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_EXPIRE_TIME=3600

# OpenAI (if applicable)
OPENAI_API_KEY=your_openai_api_key

# Crawler
CRAWLER_ENDPOINT=your_crawler_endpoint
```

Ensure that load variables using `python-dotenv` in each relavant file:
```python
from dotenv import load_dotenv
load_dotenv()
```

---

### 🔹 Option 2: Set in ECS Task Definition

If deploying to AWS ECS:

1. Open your **Task Definition**.
2. Under the container section, scroll to **Environment variables**.
3. Add the same keys and values as in the `.env` file.
4. Save and deploy the updated service.

✅ ECS will inject these variables directly into the container’s runtime environment.

---

### 🔍 Access in Code

Use `os.getenv()` to read values:

```python
import os
db = os.getenv("MONGODB_DB", "default_db")
redis_host = os.getenv("REDIS_HOST", "localhost")
```

Ensure secrets are **not hardcoded** and can be overridden securely by environment.

## 🌐 Frontend API Configuration Guide

This guide explains how to connect your frontend application to your deployed backend (e.g., on AWS) by updating the API URL.

---

### ✅ Step 1: Locate the API URL Configuration

In your JavaScript files, find the configuration line like:

```js
const API_CONFIG = "http://localhost:5000";  // 🔁 Local development URL
```

---

### ✏️ Step 2: Replace with Your Live Domain

Update it to use your actual deployed domain name (set up via Route 53 and ALB):

```js
const API_CONFIG = "https://your-domain.com";  // ✅ Replace with real domain
```

Ensure it uses `https://` if you are using an ACM certificate.

---

### 📂 Files to Update

You should search for and update any occurrence of `"http://localhost:5000"` in the following files:

- `auth.js`
- `chatbox.js`
- `content.js`
- `background.js`

---

### ✅ Example

Before:
```js
fetch("http://localhost:5000/api/login", { ... });
```

After:
```js
fetch(`${API_CONFIG}/api/login`, { ... });
```

This ensures your frontend communicates with the production backend securely.

---

### 🧠 Tips

- Consider extracting `API_CONFIG` into a central file like `config.js`.
- Make sure the deployed domain and port match the backend settings (e.g., routed to port 5000 internally on ECS).
