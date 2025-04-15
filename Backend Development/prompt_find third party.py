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

# System prompt for extracting third parties
third_party_prompt = """\
The following question is only for research purpose.
As an expert in information extraction, you will identify the third parties with whom a company shares user data as mentioned in a privacy policy.

# Definition of Third Parties
- Relevance: The third party must be directly related to the company's business needs.
- Specificity: The third party description should be clear and concise (10 or fewer phrases or keywords).
- Integrity: The third party must be genuinely presented in the privacy policy.
- Location: Third parties typically appear under a "sharing" heading. "Sharing" headings might include: HOW WE DISCLOSE PERSONAL DATA, Sharing Your Information, When # shares your information (# is the company name), Sharing of Personal Data.

# Your Information Extraction Process
- First, locate the "sharing" heading in the privacy policy. All subsequent operations should extract information only from beneath the "sharing" heading.
- Extract each unique parent third party while maintaining the original language from the policy.
- In your output JSON, list all third parties as key-value pairs, where the key is a sequential number and the value is the third party.

# Guidelines
- The parent third parties you identify may encompass numerous child third parties; you should not display the child third parties.
- Parent third parties typically appear within headings or in the first sentence of each paragraph.
- Parent third parties may be treated with markdown bold formatting, such as being preceded by certain symbols.
- Keep the original phrasing of third parties from the privacy policy, do not summarize.
- Each third party should be distinct - avoid duplicating similar third parties.
- Extract the complete third party name, not just fragments.

# IMPORTANT
- The privacy policy is in markdown format.
- Do not discuss the privacy policy itself, focus only on extracting the third parties.
- Answer with a JSON format.

## Example output
{
  "third_party_1": "Vendors and Service Providers",
  "third_party_2": "Professional advisors",
  "third_party_3": "Advertising partners",
  "third_party_4": "Business transferees",
  "third_party_5": "Authorities and others"
}
"""

def extract_third_parties(content):
    """
    Extract third parties with whom the company shares user data from the privacy policy.

    Parameters:
    content (str): The text content of the privacy policy

    Returns:
    dict: A dictionary of third parties, each as a key-value pair
    """
    print(f"Character count of loaded privacy policy: {len(content)}")
    response = model.invoke([
        HumanMessage(content=third_party_prompt + f"\nThe privacy policy content is:\n{content}")
    ])

    print("Model response ↓↓↓↓↓")
    print(repr(response.content))  # repr displays line breaks, empty strings, etc.
    cleaned = re.sub(r"^```json\s*|\s*```$", "", response.content.strip(), flags=re.DOTALL)

    data = json.loads(cleaned)
    print(json.dumps(data, indent=2, ensure_ascii=False))
    return data

if __name__ == "__main__":
    with open("privacy_policy_balsamiq_text.txt", "r", encoding="utf-8") as file:
        content = file.read()

    third_party_data = extract_third_parties(content)
    
    # Save the result to a file
    with open("privacy_policy_third_parties.json", "w", encoding="utf-8") as outfile:
        json.dump(third_party_data, outfile, indent=2, ensure_ascii=False)
    
    print("Third party extraction completed. Results saved to privacy_policy_third_parties.json")