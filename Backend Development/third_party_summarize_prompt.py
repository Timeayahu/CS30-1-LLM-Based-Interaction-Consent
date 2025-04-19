import os
import openai
import json
import re

# 1. Load API Key manually
OPENAI_API_KEY = input("Enter your OpenAI API Key: ").strip()
if not OPENAI_API_KEY:
    raise ValueError("OpenAI API key is required.")

# 2. Chat completion wrapper using openai>=1.0.0
client = openai.OpenAI(api_key=OPENAI_API_KEY)

def chat_completion(messages):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0,
    )
    return response.choices[0].message.content.strip()

# 3. Build merged prompt
def build_combined_prompt(policy_text):
    return f"""
You are a privacy policy analysis expert.

Your task is twofold. Follow the steps one by one:

Step 1:
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
{{
  "third_party_1": "Vendors and Service Providers",
  "third_party_2": "Professional advisors",
}}

Step 2:
For each extracted third party, find the most relevant sentence or clause in the policy that explains why data is shared with them. Then, write a short summary sentence that captures the purpose of sharing.

Summary requirements:
- Begin each summary with a verb (e.g., "Share", "Provide", "Support", "Enable").
- Avoid subjective phrases like "we", "our", or "the company".
- Only summarize explicit information found in the policy—do not make up reasons.
- If no purpose is found, write: Not mentioned.
- If stated, include what types of personal data are shared with the third party (e.g., contact info, location).
- If mentioned, describe any usage restrictions placed on the third party (e.g., use limited to services, must delete data).
- If applicable, state whether users have any control over the sharing (e.g., consent required, opt-out available).
- If provided, include any legal basis or compliance reason for the sharing (e.g., consent, contract, legal obligation).

Final output format:
Return a JSON list, where each item includes:
- "third_party": the original third-party name
- "summary": A summary paragraph of around 40 words
- "source_snippet": the sentence or clause from the policy that supports the summary

]

Policy text:
---
{policy_text}
---
Please complete the two steps and output the result in valid JSON format.
""".strip()


# 4. Main function
def main():
    input_path = "privacy_policy_google_text.txt"
    output_path = "third_party_summaries.json"

    with open(input_path, "r", encoding="utf-8") as f:
        policy_text = f.read()

    prompt = build_combined_prompt(policy_text)
    messages = [{"role": "user", "content": prompt}]
    response_text = chat_completion(messages)

    try:
        cleaned = re.sub(r"^```json\s*|\s*```$", "", response_text.strip(), flags=re.DOTALL)
        parsed = json.loads(cleaned)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(parsed, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Extraction and summarization completed. Results saved to: {output_path}")
    except Exception as e:
        print("\n⚠️ Failed to parse JSON. Please check the model's response.")
        print("Error message:", str(e))
        print("\nRaw model output:\n")
        print(response_text)

if __name__ == "__main__":
    main()
