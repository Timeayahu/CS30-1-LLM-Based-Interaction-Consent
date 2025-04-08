import os
import json
import re
from dotenv import load_dotenv
from openai import OpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from openai import OpenAI
from utils import text_processor

text_processor = text_processor.TextProcessor()

class SummaryService:
    def __init__(self):
        load_dotenv()
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    def summary_privacy_policy(self, privacy_markdown_dict, format):
        results = {}
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=3000,
            chunk_overlap=100,
            separators=["\n\n", "\n", "。", ". "]
        )

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
        from the given privacy policy for the following 16 privacy concerns and assess the readability.

        Provide a detailed summary for each concern, even if it is not explicitly mentioned in the policy. 
        If a concern is not addressed, provide a brief placeholder explanation or context.

        Assessment Criteria:
        1. Awkward Flow (Logical Coherence): Identify any sentences with unclear connections, abrupt transitions, or inconsistent logic.
        2. Inappropriate Language (Unprofessional Expressions): Detect any use of informal, vague, or unprofessional terminology.
        3. Grammar and Spelling Errors: Highlight grammatical mistakes and spelling errors.

        Compute the Readability Score using:
          Readability Score = 1 - (Number of Problematic Sentences / Total Sentences)
          (Higher scores indicate better readability.)

        The output should strictly follow this format:
        - Company Name: [Extracted from the file name]
        - Readability: [Readability Score]
        - Privacy Policy:
          - [Privacy Concern1]: [Summary]
          - [Privacy Concern2]: [Summary]
          - ...
        """

        for company_name, markdown_content in privacy_markdown_dict.items():
            chunks = splitter.split_text(markdown_content)
            company_summary = {"Company Name": company_name, "Privacy Policy": {}}

            for chunk in chunks:
                full_prompt = privacy_prompt + f"\n\nCompany Name: {company_name}\n\n{chunk}"

                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system",
                         "content": "You are an AI assistant that specializes in privacy policy analysis."},
                        {"role": "user", "content": full_prompt}
                    ]
                )
                results = response.choices[0].message.content.strip()
                print(results)

                for issue in privacy_issues:
                    match = re.search(rf"- {re.escape(issue)}:\s*(.*?)(?=\n- [A-Z]|$)", summary,
                                      re.DOTALL | re.MULTILINE)
                    if match:
                        company_summary["Privacy Policy"][issue] = match.group(1).strip()
                    else:
                        company_summary["Privacy Policy"][issue] = "Not mentioned."

            results[company_name] = company_summary

        output_dir = "data/summary_result"
        os.makedirs(output_dir, exist_ok=True)

        output_filename = os.path.join(output_dir, "summary_results.json")
        with open(output_filename, "w", encoding="utf-8") as json_file:
            json.dump(results, json_file, ensure_ascii=False, indent=4)

        return results
