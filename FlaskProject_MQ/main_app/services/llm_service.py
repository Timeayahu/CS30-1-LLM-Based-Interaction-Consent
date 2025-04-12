from openai import OpenAI
import os
import json
import re
from dotenv import load_dotenv

from utils import text_processor


class LLMService:
    def __init__(self):
        load_dotenv()
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.system_prompt = """You are a professional privacy policy analyst. 
        Please provide a concise summary of the following privacy policy text, 
        highlighting key terms and important information. Focus on:
        1. Data collection and usage
        2. User rights and obligations
        3. Security measures
        4. Third-party sharing
        5. Policy updates and changes"""

    def generate_summary(self, text):
        """
        Generate text summary using OpenAI API
        :param text: Input text
        :return: Generated summary
        """
        response = self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": text}
            ],
            temperature=0.7,
            max_tokens=500
        )

        return response.choices[0].message.content

    def classify_privacy_policy(self, privacy_text_dict):
        results = {}
        for text_name, privacy_text in privacy_text_dict.items():
            # identify prompt
            prompt = f"""
        Below is a privacy policy text:

        {privacy_text}

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
        - Return the output as a JSON object, where each category contains a list of text excerpts from the policy.

        ### **Example Output Format**
        {{
            "First Party Collection/Use": ["We collect user data to improve our services..."],
            "Third Party Sharing/Collection": ["We may share your data with third-party advertisers..."],
            "User Choice/Control": ["Users can opt out of data collection by adjusting their settings..."],
            "User Access/Edit/Deletion": ["You can update or delete your information by contacting support..."],
            "Data Retention": ["We retain user data for up to 2 years..."],
            "Data Security": ["We implement encryption and access control to protect data..."],
            "Policy Change": ["We may update this policy, and users will be notified via email..."],
            "Do Not Track": ["We respect Do Not Track signals in supported browsers..."],
            "International/Specific Audiences": ["Our service complies with GDPR for European users..."]
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
            print(f"Classification for {text_name}: {result}")

            # parse the JSON result
            try:
                clean_result = text_processor.TextProcessor.clean_json_string(result)
                result_json = json.loads(clean_result)
            except json.JSONDecodeError:
                print(f"Failed to parse JSON for {text_name}, raw response: {result}")
                result_json = {"error": "Invalid JSON response from API"}

            print(f"Classification for {text_name}: {json.dumps(result_json, indent=4)}")
            results[text_name] = result_json

            # save the results to a JSON file
            output_dir = "result"
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)

            base_name = os.path.splitext(text_name)[0]

            output_filename = os.path.join(output_dir, f"{base_name}_category_result.json")
            try:
                with open(output_filename, "w", encoding="utf-8") as json_file:
                    json.dump(result_json, json_file, indent=4, ensure_ascii=False)
                print(f"Results saved to {output_filename}")
            except Exception as e:
                print(f"Error saving results to file: {str(e)}")

        return results
