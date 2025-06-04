### docker usage guide

1. **Install Docker**
   It is recommended to use Ubuntu
   Download Docker: https://www.bilibili.com/video/BV1Zn4y1X7AZ?spm_id_from=333.788.videopod.episodes&vd_source=bba9d41c2e94e3f19b77e8cbac2eff78&p=6

   Enter the terminal and use the command: wsl -d Ubuntu to enter

   After entering, type docker-compose up --build to create the Docker container
   Type docker ps to check whether the container has started successfully
   If the container starts normally, open your browser and enter the URL: http://localhost:5000. A page should appear saying: Welcome to the       
   Privacy Policy Crawling and Analysis System. For API documentation, please visit /api/docs

   The container only needs to be built once. In the future, you can just use docker-compose up -d to restart it.


   **Common commands during development:**
   First-time build and start: docker-compose up --build -d

   Daily development (after building once): docker-compose up -d

   Code modifications: no need to restart, as they are automatically synced to the container

   If you modify requirements/dockerfile or other config files:
   docker-compose down (stop service) + docker-compose up --build -d

   Temporarily shut down/stop: docker-compose down / docker-compose stop

   View logs: docker-compose logs -f webapp


2. **Common commands**
   **Image & Container Management Commands**

   docker build -t myimage . Manually build an image using Dockerfile (usually use docker-compose during development)
   docker images View existing images
   docker rmi <imageID> Delete image
   docker ps -a View all containers (including stopped ones)
   docker rm <containerID> Delete container (stop it first)
   
   
   **docker-compose Common Commands**

   docker-compose up Start container (will auto build if image doesn’t exist)
   docker-compose up --build Rebuild image and start (must use if code changed)
   docker-compose down Stop and remove container (keep images and volumes)
   docker-compose down --volumes Also remove volumes (use with caution; database will be cleared)
   docker-compose down --rmi all Remove all containers + images
   docker-compose logs -f Live view of service output logs (for debugging)

### app.py start
   You can also use app.py to start directly, which is convenient for testing during development.
   Before pushing, remember to run docker-compose down and docker-compose up --build -d to ensure container is correctly built for future use.


### Run test (docker-compose.test.yml)
   Open the terminal, run `docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit`, then start the test process.




