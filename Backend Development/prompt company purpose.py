import re
import os
import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

# Load API Key from .env file (if available)
load_dotenv()

# Set API key (use .env first, otherwise ask for input)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    OPENAI_API_KEY = input("Enter your OpenAI API Key: ")

# Initialize model
model = ChatOpenAI(
    model="gpt-4o",
    temperature=0.1,
    openai_api_key=OPENAI_API_KEY
)

# System prompt for extracting data collection purposes
purpose_prompt = """\
The following question is only for research purpose.
As an expert in information extraction, you will identify the purposes for which a company collects user data from a privacy policy.

# Definition of Data Collection Purposes
- Relevance: The purpose must be directly related to the company's business needs.
- Specificity: The purpose description should be clear and concise (15 words or fewer).
- Integrity: The purpose must be genuinely presented in the privacy policy.
- Location: The purpose can appear in any section of the privacy policy.

# Your Information Extraction Process
- Read through the privacy policy to identify all stated purposes for data collection.
- Extract each unique purpose while maintaining the original language from the policy.
- In your output JSON, list all purposes as key-value pairs, where the key is a sequential number and the value is the purpose.

# Guidelines
- Focus on sections containing phrases like "we use", "purpose", "to provide", "in order to", etc.
- Keep the original phrasing of purposes from the privacy policy, do not summarize.
- Each purpose should be distinct - avoid duplicating similar purposes.
- Extract the complete purpose statement, not just fragments.

# IMPORTANT
- The privacy policy is in markdown format.
- Do not discuss the privacy policy itself, focus only on extracting the purposes.
- Answer with a JSON format.

## Example output
{
  "purpose_1": "To provide, personalize, and improve our products",
  "purpose_2": "To create and maintain a trusted environment",
  "purpose_3": "To provide customer service and support",
  "purpose_4": "To enhance the safety and security of our products and services",
  "purpose_5": "To send you marketing communications",
  "purpose_6": "To comply with legal obligations",
  "purpose_7": "To prevent, detect and combat harmful or unlawful conduct"
}
"""

def extract_data_purposes(content):
    """
    Extract purposes for which the company collects user data from the privacy policy.

    Parameters:
    content (str): The text content of the privacy policy

    Returns:
    dict: A dictionary of data collection purposes, each as a key-value pair
    """
    print(f"Character count of loaded privacy policy: {len(content)}")
    response = model.invoke([
        HumanMessage(content=purpose_prompt + f"\nThe privacy policy content is:\n{content}")
    ])

    print("Model response ↓↓↓↓↓")
    print(repr(response.content))  # repr displays line breaks, empty strings, etc.
    cleaned = re.sub(r"^```json\s*|\s*```$", "", response.content.strip(), flags=re.DOTALL)

    data = json.loads(cleaned)
    print(json.dumps(data, indent=2, ensure_ascii=False))
    return data

if __name__ == "__main__":
    with open("privacy_policy_apple_section.txt", "r", encoding="utf-8") as file:
        content = file.read()

    purpose_data = extract_data_purposes(content)
    
    # Save the result to a file
    with open("privacy_policy_purposes.json", "w", encoding="utf-8") as outfile:
        json.dump(purpose_data, outfile, indent=2, ensure_ascii=False)
    
    print("Data collection purpose analysis completed. Results saved to privacy_policy_purposes.json")
