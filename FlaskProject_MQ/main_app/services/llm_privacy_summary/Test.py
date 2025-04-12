import os
import json
import re
from dotenv import load_dotenv
from openai import OpenAI
from openai import OpenAI
from utils import text_processor

text_processor = text_processor.TextProcessor()

class SummaryService:
    def __init__(self):
        load_dotenv()
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    def summary_privacy_policy(self, privacy_markdown_dict, format):
        results = {}
        privacy_issues = [
            "First party collection and use",
            "The storage duration of personal information",
            "GPS location tracking",
            "Social relationship network collection",
            "User behavior tracking and analytics",
            "Third-party sharing",
            "User control",
            "Monitored private conversations",
            "Company's right to dispose of published content.",
            "Data security",
            "Specific audiences (children)",
            "Do not track",
            "Policy change",
            "Generic",
            "Practice not covered",
            "Privacy contact information"
        ]

        privacy_prompt = f"""
        You are a professional expert specializing in privacy policies. 
        Your task is to identify and extract relevant information 
        from the given privacy policy for the following 12 privacy concerns. Multiple categories may apply:

        1. First Party Collection/Use - how and why the information is collected.
        2. Third Party Sharing/Collection - how the information may be used or collected by third parties.
        3. User Access/Edit/Deletion - if users can modify their information and how.
        4. Data Retention - how long the information is stored.
        5. Data Security - how is users' data secured.
        6. International/Specific Audiences - practices that target a specific group of users (e.g., children, Europeans, etc.)
        7. Do Not Track - if and how Do Not Track signals is honored.
        8. Policy Change - if the service provider will change their policy and how the users are informed.
        9. User Choice/Control - choices and controls available to users.
        10. Introductory/Generic - Does it contain general or introductory information about the privacy policy?
        11. Practice not covered - Does it mention any privacy practices not covered by the above categories?
        12. Privacy contact information - Does it provide contact information for users to inquire about privacy-related issues?

        Provide a detailed summary for each concern, even if it is not explicitly mentioned in the policy. 
        If a concern is not addressed, provide a brief placeholder explanation or context.

        The output should strictly follow this format:
        - Company Name: [Extracted from the file name]
        - Privacy Policy:
          - [Privacy Concern1]: [Summary]
          - [Privacy Concern2]: [Summary]
          - ...
        """

        output_dir = "data/summary_result"
        os.makedirs(output_dir, exist_ok=True)

        for company_name, markdown_content in privacy_markdown_dict.items():
            company_summary = {"Company Name": company_name, "Privacy Policy": {}}
            full_prompt = privacy_prompt + f"\n\nCompany Name: {company_name}\n\n{markdown_content}"

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an AI assistant that specializes in privacy policy analysis."},
                    {"role": "user", "content": full_prompt}
                ]
            )

            full_summary = response.choices[0].message.content.strip()
            print(full_summary)

            '''for issue in privacy_issues:
                pattern = rf"(?i){re.escape(issue)}[\s:：\-*•]*\s*(.*?)(?=\n\s*(?:-|\*|•|\d+\.|[A-Z][a-z]*)|$)"
                match = re.search(pattern, full_summary, re.DOTALL)

                if match:
                    company_summary["Privacy Policy"][issue] = match.group(1).strip()
                else:
                    company_summary["Privacy Policy"][issue] = "Not mentioned."

            results[company_name] = company_summary'''
            lines = full_summary.split("\n")
            privacy_policy = {}
            for line in lines[2:]:
                if ": " in line:
                    issue, summary = line.split(": ", 1)
                    privacy_policy[issue.strip()] = summary.strip()

            company_summary["Privacy Policy"] = privacy_policy
            results[company_name] = company_summary

        #output_filename = os.path.join(output_dir, "summary.json")
        output_filename = os.path.join(output_dir, f"{company_name}_privacy_summary.json")
        with open(output_filename, "w", encoding="utf-8") as json_file:
            json.dump(results, json_file, ensure_ascii=False, indent=4)

        return results
