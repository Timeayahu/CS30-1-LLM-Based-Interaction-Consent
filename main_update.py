from langchain.text_splitter import RecursiveCharacterTextSplitter
import os
import json
import openai
from groq import Groq
import re

# Set key of OpenAPI
#client = Groq(api_key="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")
client = openai.OpenAI(api_key="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")


directory = "/Users/gaorongbin/Documents/Course/2025-s1/COMP5703/CS30-1-2025-S1/Backend Development/Prompt Design/Test_privacy"

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
Your task is to identify and extract relevant information from the given privacy policy 
for the following 16 privacy concerns and improve the readability of your output.

For each privacy concern, provide a detailed summary based on the given policy. 
If a concern is not addressed, provide a brief placeholder explanation or context.

Assessment & Self-Improvement
Before finalizing your response, evaluate the readability of your generated content 
based on the following criteria and make improvements accordingly:

1. Logical Coherence (Awkward Flow): Ensure clear logical connections between sentences, 
   smooth transitions, and consistent structuring.
2. Professional Language Use: Eliminate informal, vague, or unprofessional expressions 
   while maintaining clarity and precision.
3. Grammar and Spelling Accuracy: Identify and correct any grammatical mistakes 
   or spelling errors.

If any issue is detected in your output, revise and refine the content before submitting.

Output Format：
Strictly follow this structure:
- Company Name: [Extracted from the file name]
- Privacy Policy:
  - [Privacy Concern1]: [Refined Summary]
  - [Privacy Concern2]: [Refined Summary]
  - ...

Do not add extra headings or sections. Keep your response structured, clear, and legally precise.

### **Privacy Concerns**
{', '.join(privacy_issues)}
"""


# Initialize text splitter
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,
    chunk_overlap=100,
    separators=["\n\n", "\n", "。", ". "]
)

# Traverse all the privacy policies in the directory.
policy_files = [f for f in os.listdir(directory) if f.endswith(".txt")]

summaries = []

# Process multiple privacy policies
for index, file_name in enumerate(policy_files, start=1):
    file_path = os.path.join(directory, file_name)

    # Read privacy policy text
    with open(file_path, "r", encoding="utf-8") as file:
        privacy_policy_text = file.read()
        privacy_policy_text = re.sub(r'\s+', ' ', privacy_policy_text)  # Replace multiple spaces/newlines with single space
        privacy_policy_text = privacy_policy_text.strip()  # Remove leading/trailing whitespace

    # Split the text into smaller chunks
    chunks = splitter.split_text(privacy_policy_text)

    company_summary = {
        "Company Name": file_name[:-4],
        "Privacy Policy": {}
    }

    # Process each chunk separately
    for chunk in chunks:
        # Combine the prompt with the policy text chunk
        full_prompt = privacy_prompt + f"\n\nCompany Name: {file_name[:-4]}\n\n{chunk}"

        response = client.chat.completions.create(
            #model="llama-3.3-70b-versatile",
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an AI assistant that specializes in privacy policy analysis."},
                {"role": "user", "content": full_prompt}
            ]
        )

        # Extract text from API response and remove spaces at the start and end
        summary = response.choices[0].message.content.strip()

        # Split summary into individual privacy concerns
        for issue in privacy_issues:
            # Extract the relevant information from the summary
            match = re.search(f"- {re.escape(issue)}: (.*?)(?=\n- |$)", summary, re.DOTALL)
            if match:
                company_summary["Privacy Policy"][issue] = match.group(1).strip()

    summaries.append(company_summary)

# Save the output to a JSON file
output_file_path = "/Users/gaorongbin/Documents/Course/2025-s1/COMP5703/CS30-1-2025-S1/Backend Development/Prompt Design/Summary.json"
with open(output_file_path, "w", encoding="utf-8") as json_file:
    json.dump(summaries, json_file, ensure_ascii=False, indent=4)

print(f"Summaries saved to {output_file_path}")