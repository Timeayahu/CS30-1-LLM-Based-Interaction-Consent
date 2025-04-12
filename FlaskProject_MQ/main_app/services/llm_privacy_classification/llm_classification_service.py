from openai import OpenAI
import os
import json
from dotenv import load_dotenv
from utils import text_processor

text_processor = text_processor.TextProcessor()

class ClassificationService:
    def __init__(self):
        load_dotenv()
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    def classification_privacy_policy(self, privacy_markdown_dict, format):
        results = {}
        for company_name, markdown_content in privacy_markdown_dict.items():
            # identify prompt
            prompt = f"""
        Below is a privacy policy in {format} format:

        {markdown_content}

        Please classify this privacy policy based on the following 12 categories. Multiple categories may apply:

        1. **First Party Collection/Use** - how and why the information is collected.
        2. **Third Party Sharing/Collection** - how the information may be used or collected by third parties.
        3. **User Access/Edit/Deletion** - if users can modify their information and how.
        4. **Data Retention** - how long the information is stored.
        5. **Data Security** - how is users' data secured.
        6. **International/Specific Audiences** - practices that target a specific group of users (e.g., children, Europeans, etc.)
        7. **Do Not Track** - if and how Do Not Track signals is honored.
        8. **Policy Change** - if the service provider will change their policy and how the users are informed.
        9. **User Choice/Control** - choices and controls available to to users.
        10. **Introductory/Generic** - Does it contain general or introductory information about the privacy policy?
        11. **Practice not covered** - Does it mention any privacy practices not covered by the above categories?
        12. **Privacy contact information** - Does it provide contact information for users to inquire about privacy-related issues?

        ### **Instructions**
        - Extract relevant sections from the policy and classify them under the appropriate categories.
        - If a section belongs to multiple categories, list all applicable categories.
        - **Ensure that all 12 categories are included in the output, even if some categories do not have relevant content.**
        - If no information is found for a category, return an empty list (`[]`).
        - Return the output as a JSON object, where each category contains a list of text excerpts from the policy.

        ### **Example Output Format**
        {{
            "First Party Collection/Use": [...],
            "Third Party Sharing/Collection": [...],
            "User Access/Edit/Deletion": [...],
            "Data Retention": [...],
            "Data Security": [...],
            "International/Specific Audiences": [...],
            "Do Not Track": [...],
            "Policy Change": [...],
            "User Choice/Control": [...],
            "Introductory/Generic": [...],
            "Practice not covered": [...],
            "Privacy contact information": [...]
        }}
        """
            # classify the privacy policy text
            completion = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            result = completion.choices[0].message.content
            print(f"Classification for {company_name}: {result}")

            # parse the JSON result
            try:
                clean_result = text_processor.clean_json_string(result)
                result_json = json.loads(clean_result)
            except json.JSONDecodeError:
                print(f"Failed to parse JSON for {company_name}, raw response: {result}")
                result_json = {"error": "Invalid JSON response from API"}

            # print(company_name, markdown_content)
            print(f"Classification for {company_name}: {json.dumps(result_json, indent=4)}")
            results[company_name] = result_json

            # save the results to a JSON file
            output_dir = "data/classification_result"
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)

            base_name = os.path.splitext(company_name)[0]

            output_filename = os.path.join(output_dir, f"{base_name}_classification_result.json")
            try:
                with open(output_filename, "w", encoding="utf-8") as json_file:
                    json.dump(result_json, json_file, indent=4, ensure_ascii=False)
                print(f"Results saved to {output_filename}")
            except Exception as e:
                print(f"Error saving results to file: {str(e)}")

        return results