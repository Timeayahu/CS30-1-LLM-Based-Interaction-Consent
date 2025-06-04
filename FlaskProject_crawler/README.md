
# 🕷️ Crawler API Deployment Guide (No Domain Required)

This guide outlines how to deploy your Flask-based **crawler node** as an internal API service behind an **Application Load Balancer (ALB)** using **AWS ECS (Fargate)** — without attaching a domain name.

---

## ✅ Assumptions

- You have followed previous ALB + ECS setup guidelines
- Your Flask crawler is packaged with a `Dockerfile` and exposes an endpoint at `/api/crawl`
- ECR image is already pushed (see previous guide)

---

## 🐳 1️⃣ Ensure Dockerfile Exposes Port 8001

Your `Dockerfile` should include:

```dockerfile
EXPOSE 8001
CMD ["python", "app.py"]  # Or whatever script starts Flask
```

---

## 📦 2️⃣ Push Image to Amazon ECR

Same as before:

```bash
docker tag crawler-app:latest <account-id>.dkr.ecr.<region>.amazonaws.com/crawler-api:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/crawler-api:latest
```

---

## 🚀 3️⃣ Create Task Definition for Crawler

- Go to **ECS → Task Definitions → Create**
- Launch type: **Fargate**
- Add container:
  - **Image**: your ECR image URI
  - **Port**: 8001
- Set task memory/cpu: e.g., 512 MiB / 0.25 vCPU
- Save

---

## ⚙️ 4️⃣ Create ECS Service

- Go to **ECS → Clusters → Your Cluster → Services → Create**
- Launch type: **Fargate**
- Task Definition: crawler task
- Service name: `crawler-service`
- Number of tasks: 1
- Enable **Load Balancer**
  - Load Balancer type: **Application Load Balancer**
  - Listener: **HTTP (port 80)**
  - Target Group: `crawler-target-8001`
- Network:
  - Select same VPC and public subnets
  - Auto-assign public IP: **ENABLED**
  - Security Group: allow **port 8001**

---

## 🧭 5️⃣ Set Up Target Group

- Go to **EC2 → Target Groups → Create Target Group**
- Type: `IP`
- Protocol: `HTTP`, Port: `8001`
- Register targets automatically via ECS service
- Health check path: `/api/crawl`

---

## 🔁 6️⃣ Route Traffic (ALB Listener Rule)

- Go to **Load Balancers → Your ALB → Listeners → HTTP:80**
- Add rule:
  - **IF path is `/api/crawl` → Forward to crawler-target-8001**

This allows your primary server node (frontend/backend) to **call the crawler service directly** via:

```
http://<ALB-DNS-name>/api/crawl
```

---

## 🧪 7️⃣ Test

Send a POST request to the crawler endpoint:

```bash
curl -X POST http://<ALB-DNS-name>/api/crawl -H "Content-Type: application/json" -d '{"url": "https://example.com/privacy"}'
```

You should receive a response like:

```json
{
  "success": true,
  "url": "...",
  "markdown": "...",
  "html": "...",
  "content_length": 12345
}
```

---

## 🧠 Notes

- Do not expose this service to the public if it’s only needed internally
- You may restrict access using a security group or IAM if necessary
