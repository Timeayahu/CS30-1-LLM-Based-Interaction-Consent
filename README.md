# CS30-1-2025-S1

Project number: CS30

Project Source: Carnegie Mellon University in Qatar

Project Title: LLM-based interactive consent

Project Description and Scope: Consent remains one of the main ways of
managing privacy on the Web. Consent is often multiple pages of legal document
that is both tedious and difficult for a common people. As a result, many people
do not read the consent but simply press the “I Accept / I Decline” button.
This project aims to address this issue by simplifying the consent by proposing a
LLM based interactive consent reader. This tool will help by providing a simple
summary of the consent understandable for general public. If someone wants to
get more information, the tool will interactively provide more information about
specific aspect(s) of the consent form.

Expected outcomes/deliverables: A tool-based publication

Specific required knowledge, skills, and/or technology: LLM, AI, tool
development

Fields that this project may involve: Artificial Intelligence;Web Development;

Dataset provided by the client: No, the students need to find dataset.

Resources provided by the client: nan


---
## Backend version Explanation

- If you want to deploy this project locally, you need to follow the README.md in **FlaskProject**.
- If you want to deploy in AWS cloud environment, you need to follow the README.md in **FlaskProject_crawler** and **FlaskProject_server** (deploy both of these two program needs to be deployed, connected through API call).

## Frontend version Explanation

- The **frontend_local** is for the local version of backend (FlaskProject)
- The **Frontend_Cloud** is for the cloud version of backend (FlaskProject_server and FlaskProject_crawler)


## How to quickly use our interactive consent reader?

If you want to deploy the project by yourself, you can follow the README.md inside **FlaskProject** to deploy it locally (or **FlaskProject_server** & **FlaskProject_crawler** to deploy it on AWS environment).

But we also provide a quick setup option, which only requires loading the frontend folder to your Chrome Extension (We currently have a server running on AWS).

- **step 1**:  Open the extension page of Chrome

![图片](https://github.com/user-attachments/assets/15655def-8424-4571-8d0c-1d80861f2f56)

- **step 2**:  Turn on the Developer mode on the right top,  and click load unpacked

![图片](https://github.com/user-attachments/assets/dc0b3147-57fb-4f50-81c1-f9c5d83ca9e7)

- **step 3**:  Select the folder "Frontend_Cloud" and confirm

![图片](https://github.com/user-attachments/assets/b466b979-d9f9-4630-8b37-b712308b0a78)

- **step 4**: If you can see this on the Extension configuration page, you have successfully installed the Frontend and you can start explore it!

![图片](https://github.com/user-attachments/assets/fdf0c171-3e7c-48e0-9971-1147a2eec8a7)



