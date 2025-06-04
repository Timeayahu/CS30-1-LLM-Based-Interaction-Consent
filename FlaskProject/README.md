### docker usage guide

**Install Docker**
   For Windows (WSL2 recommended):
      1.Install WSL2 + Ubuntu:
      https://learn.microsoft.com/en-us/windows/wsl/install

      2.Install Docker Desktop for Windows:
      https://www.docker.com/products/docker-desktop/


   For macOS or Linux:
      Download and install Docker Desktop from:
      https://www.docker.com/products/docker-desktop/

   After installation, open a terminal and run:
      docker --version
      docker-compose --version

**Build and start the project**
   please run this command in the project root directory (flask project):
      docker-compose up --build

   Type docker ps to check whether the container has started successfully

   If the container starts normally, open your browser and enter the URL: http://localhost:5000. 

   A page should appear saying: Welcome to the Privacy Policy Crawling and Analysis System. For API documentation, please visit /api/docs
   
   The container only needs to be built once. In the future, you can just use docker-compose up -d to restart it.

   **Common commands during development:**
   First-time build and start: docker-compose up --build -d

   Daily development (after building once): docker-compose up -d

   Code modifications: no need to restart, as they are automatically synced to the container

   If you modify requirements/dockerfile or other config files:
   docker-compose down (stop service) + docker-compose up --build -d

   Temporarily shut down/stop: docker-compose down / docker-compose stop

   View logs: docker-compose logs -f webapp


   **Common commands**
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




