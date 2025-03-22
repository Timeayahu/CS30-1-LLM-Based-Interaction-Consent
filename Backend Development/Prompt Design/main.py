import os
import json
import openai
import re

# Set key of OpenAPI
client = openai.OpenAI(api_key="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")

directory = "/Users/gaorongbin/PycharmProjects/Prompt Design/Privacy"

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


# Design prompt for API.
privacy_prompt = f"""
You are a professional expert specializing in privacy policies. 
Your task is to identify and extract relevant information 
from the given privacy policy for the following 16 privacy concerns.
Provide a detailed summary for each concern, even if it is not explicitly mentioned in the policy. 
If a concern is not addressed, provide a brief placeholder explanation or context.

The output should strictly follow this format:
- Company Name: [Extracted from the file name]
- Privacy Policy:
  - [Privacy Concern1]: [Summary]
  - [Privacy Concern2]: [Summary]
  - ...

Do not add any extra headings or sections. Make sure your excerpt is clear and concise. 
Use precise legal language where applicable.

Privacy Concerns:
{', '.join(privacy_issues)}
"""

# Traverse all the privacy policies in the directory.
policy_files = [f for f in os.listdir(directory) if f.endswith(".txt")]

summaries = []

# Process multiple privacy policies
for index, file_name in enumerate(policy_files, start=1):
    file_path = os.path.join(directory, file_name)

    # Read privacy policy text
    with open(file_path, "r", encoding="utf-8") as file:
        privacy_policy_text = file.read()

    # Combine the prompt with the policy text
    full_prompt = privacy_prompt + f"\n\nCompany Name: {file_name[:-4]}\n\n{privacy_policy_text}"

    # Use gpt-4o for analysis
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are an AI assistant that specializes in privacy policy analysis."},
            {"role": "user", "content": full_prompt}
        ]
    )

    # Extract text from API response and remove spaces at the start and end
    summary = response.choices[0].message.content.strip()

    # Output format
    company_summary = {
        "Company Name": file_name[:-4],
        "Privacy Policy": {}
    }

    # Split summary into individual privacy concerns
    for issue in privacy_issues:
        # Extract the relevant information from the summary
        # Pattern: f"- {re.escape(issue)}: (.*?)(?=\n- |$)"
        # re.escape(issue): escapes special characters (such as "", .)
        # (.*?): Non-greedy match, capture content of issues
        # (?=\n- |$): \n- means the start of next issue, $ means the end of text.
        # Ensure only capture the content specific to the current issue.
        match = re.search(f"- {re.escape(issue)}: (.*?)(?=\n- |$)", summary, re.DOTALL)
        if match:
            company_summary["Privacy Policy"][issue] = match.group(1).strip()

    summaries.append(company_summary)

# Save the output to a JSON file
output_file_path = "/Users/gaorongbin/PycharmProjects/Prompt Design/Privacy_Policies_Summary.json"
with open(output_file_path, "w", encoding="utf-8") as json_file:
    json.dump(summaries, json_file, ensure_ascii=False, indent=4)

print(f"Summaries saved to {output_file_path}")
