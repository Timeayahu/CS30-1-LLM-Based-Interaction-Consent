# Instructions on How to Connect to AWS Resources

This file includes guide to connect to the AWS container (service node) and EC2 instance (testing and debugging environment)

## Connect to AWS ESC (Elastic Container Service)

To connect to the ESC service node, you just need to modify the api in Frontend/background.js.
![图片](https://media.github.sydney.edu.au/user/22652/files/a5d3a5ff-f00d-4416-a7f9-9bcb582f5d02)
You should replace <localhost> with the Public IPaddress of the servcie node (currently it is 52.90.54.199), then you will be able to use this node normally, which can schedule requests, call crawler and chat with LLM.

## Connect to AWS EC2 instance
