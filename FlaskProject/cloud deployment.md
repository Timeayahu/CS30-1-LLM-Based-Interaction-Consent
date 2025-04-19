# Instructions on How to Connect to AWS Resources

  This file includes guide to connect to the AWS container (service node) and EC2 instance (testing and debugging environment)

## Connect to AWS ESC (Elastic Container Service)

  To connect to the container service node, you just need to modify the api in Frontend/background.js. You need to install Frontend package later than 1.4.0

  ![图片](https://media.github.sydney.edu.au/user/22652/files/a5d3a5ff-f00d-4416-a7f9-9bcb582f5d02)

  You should replace <localhost> with the Public IPaddress of the servcie node (currently it is 52.90.54.199), then you will be able to use this node normally, which can schedule requests, call crawler and chat with LLM.

## Connect to AWS EC2 instance

  You can also connect to a EC2 instance, which provides commandline interface for accessing GitHub repository and running python file.
  
  First, download a putty app from official website. Then enter the configuration details in the picture below.
  
  ![图片](https://media.github.sydney.edu.au/user/22652/files/22c0e4d2-3dcb-4fcd-b8b5-9e160bee4c9f)
  
  On the leftside panel, switch to /Connection/SSH/Auth/Credential, and browse the hadoop_key file for authentication
  
  ![图片](https://media.github.sydney.edu.au/user/22652/files/8c5572a0-044c-4801-b116-d7209d3f761d)

  Finally, click 'open' to ssh to the EC2 instance. In the popup window, click 'accept' if it's your first login. Enter ec2-user as the login user role.
  
  After you successfully login, you can change directory to the CS30-1-S1-2025, which is a git repository for our whole project. You can use pull and push request like on your own computer. But it's suggested that you push you change to our GitHub repository first and use a pull request to get the update, rather than directly modifying code in this commandline interface. After the update, you can python app.py to test your update in a cloud environment
