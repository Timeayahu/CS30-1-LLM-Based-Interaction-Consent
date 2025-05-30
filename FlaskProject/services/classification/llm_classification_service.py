from openai import OpenAI
import os
import json
from dotenv import load_dotenv
from utils import text_processor
from services.section_analysis.encode_and_decode import (
    sensitive_word_in_paragraph,
    sensitive_words,
    encode_paragraph,
    decode_paragraph
)

# text processor for processing json strings
text_processor = text_processor.TextProcessor()

# service for the classification of the privacy policy
class ClassificationService:
    def __init__(self):
        load_dotenv()
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    def classification_privacy_policy(self, privacy_dict):
        results = {}

        # get the content of the privacy policy
        content = privacy_dict['content']

        # check if the privacy policy contains sensitive words
        sensitive_word, encode_dict = sensitive_word_in_paragraph(content, 5, sensitive_words)
        if sensitive_word != None:
            content = encode_paragraph(content, encode_dict)

        # get the company name of the privacy policy
        company_name = privacy_dict['company_name']

        # get the format of the privacy policy
        input_format = privacy_dict['format']

        # prompt for the classification of the privacy policy
        prompt = f"""
            Below is a privacy policy in {input_format} format:
            {content}

            Please classify this privacy policy based on the following 12 categories. Under each category, subcategory can be applied as described. Multiple categories may apply:
            1. **User Access/Edit/Deletion** - if users can modify their information and how.
            Subcategory: (1) Access Scope (2) Access Rights
            2. **Data Retention** - how long the information is stored.
            Subcategory: (1) Retention Period (2) Retention Purpose (3) Information Type
            3. **Data Security** - how is users' data secured.
            Subcategory: (1) Security Measure
            4. **International/Specific Audiences** - practices that target a specific group of users (e.g., children, Europeans, etc.)
            Subcategory: (1) Audience Group
            5. **Do Not Track** - if and how Do Not Track signals is honored.
            Subcategory: (1) Do Not Track
            6. **Policy Change** - if the service provider will change their policy and how the users are informed.
            Subcatgory: (1) Change Type (2) User Choice (3) Notification Type
            7. **User Choice/Control** - choices and controls available to to users.
            Subcategory: (1) Choice Type (2) Choice Scope
            8. **Introductory/Generic** - Does it contain general or introductory information about the privacy policy?
            Subcategory: (1) Introductory
            9. **Practice not covered** - Does it mention any privacy practices not covered by the above categories?
            Subcatgory: (1) Practice Not Covered
            10. **Privacy contact information** - Does it provide contact information for users to inquire about privacy-related issues?
            Subcategory: (1) Contact information


            ### **Example Output Format**
            {{ "user_access_edit_deletion": [{{"keyword": "Access Scope", "summary": "...", "context": "..."}}, {{"keyword": "Access Right", "summary": "...", "context": "..."}}],
                "data_retention": [{{"keyword": "Retention Period", "summary": "...", "context": "..."}}, {{"keyword": "Retention Purpose", "summary": "...", "context": "..."}}, {{"keyword": "Information Type", "summary": "...", "context": "..."}}],
                "data_security": [...],
                "international_specific_audiences": [...],
                "do_not_track": [...],
                "policy_change": [...],
                "user_choice_control": [...],
                "introductory_generic": [...],
                "practice_not_covered": [...],
                "privacy_contact_information": [...]
            }}


            ### **Instructions**
            - Extract relevant sections from the policy and classify them under the appropriate categories and subcategories.
            - If a section belongs to multiple categories, list all applicable categories.
            - For each item, provide:
              keyword: the subcategory name (e.g., “Information Type” or “Retention Period”)
              context: the first sentence of a relevant paragraph in the original provacy policy. DO NOT paraphrase
              summary: a detailed summary of the practice described
            - No duplicate keyword in any category.
            - **Ensure that all 12 categories are included in the output, even if some categories do not have relevant content.**
            - If no information is found for a category, return an empty list (`[]`).
            - Return the output as a JSON object, where each category contains a list of text excerpts from the policy.
            """
        # classify the privacy policy text
        try:
            completion = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.2
            )
            result = completion.choices[0].message.content
        except Exception as e:
            return {'error': str(e)}
        
        # parse the JSON result
        try:
            clean_result = text_processor.clean_json_string(result)
            result_json = json.loads(clean_result)
        except json.JSONDecodeError:
            print(f"Failed to parse JSON for {company_name}, raw response: {result}")
            return {"error": "Invalid JSON response from API"}
        
        # if the result is empty, add a default result
        for key in result_json.keys():
            if result_json[key] == []:
                result_json[key] = [{"keyword": "Not found", "summary": "This content is not mentioned in the privacy policy",
                                     "context": "Not mentioned"}]

        # if the privacy policy is encoded, decode it
        if sensitive_word != None:
            for key in result_json.keys():
                for content in result_json[key]:
                    content['context'] = decode_paragraph(content['context'], encode_dict)
                    content['summary'] = decode_paragraph(content['summary'], encode_dict)
        results['result'] = result_json

        return results
