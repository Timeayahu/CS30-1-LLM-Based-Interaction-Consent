# Docker Usage Guide

## Install Docker

### For Windows (WSL2 Recommended)

1. Install WSL2 + Ubuntu  
   https://learn.microsoft.com/en-us/windows/wsl/install

2. Install Docker Desktop for Windows  
   https://www.docker.com/products/docker-desktop/

> During installation, make sure to enable WSL2 integration.

### For macOS or Linux

Download and install Docker Desktop from:  
https://www.docker.com/products/docker-desktop/

### Verify Installation

After installation, open a terminal and run:

- `docker --version`  
- `docker-compose --version`  

You should see the version numbers if installed correctly.

---

## Build and Start the Project

Navigate to the root directory of the project (where `docker-compose.yml` is located), and run:

- `docker-compose up --build` — builds and starts the containers

To check if the container is running:

- `docker ps`

Then open your browser and visit:  
`http://localhost:5000`

You should see the message:  
**"Welcome to the Privacy Policy Crawling and Analysis System. For API documentation, please visit /api/docs"**

> You only need to build once. For future runs, use:  
> `docker-compose up -d`

---

## Common Commands During Development

- First-time build and start (detached mode):  
  `docker-compose up --build -d`

- Daily development start (after initial build):  
  `docker-compose up -d`

- Code modifications:  
  No need to restart; changes are auto-synced.

- If you modify `requirements.txt`, `Dockerfile`, or other configuration files:  
  `docker-compose down`  
  `docker-compose up --build -d`

- To stop the service:  
  `docker-compose down`  
  or  
  `docker-compose stop`

- View real-time logs:  
  `docker-compose logs -f webapp`

---

## Docker Commands

### Image & Container Management

- `docker build -t myimage .` — Manually build image from Dockerfile  
- `docker images` — List all images  
- `docker rmi <imageID>` — Remove image by ID  
- `docker ps -a` — List all containers (including stopped ones)  
- `docker rm <containerID>` — Remove container by ID (must be stopped first)

### docker-compose Management

- `docker-compose up` — Start and auto-build if needed  
- `docker-compose up --build` — Rebuild and start (use if code/config changed)  
- `docker-compose down` — Stop and remove containers (keep volumes/images)  
- `docker-compose down --volumes` — Also remove volumes (⚠️ database will be cleared)  
- `docker-compose down --rmi all` — Remove all containers and images  
- `docker-compose logs -f` — View real-time logs of all services

---

## Run app.py Directly (Optional)

For quick testing, you can also start the app using:

- `python app.py`

> Before pushing code, rebuild the container with:  
> `docker-compose down`  
> `docker-compose up --build -d`

---

## Run Tests (Optional)

If your project includes a test configuration file:

Run the following in your terminal:

- `docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit`

---

