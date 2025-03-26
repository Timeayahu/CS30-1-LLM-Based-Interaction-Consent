import os
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage
import json

os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_API_KEY"] = "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"
os.environ["OPENAI_API_KEY"] = "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"
os.environ["SERPAPI_API_KEY"] = "70a08d7f2b16602366468c3df268fc9f7f16f52c4020d138931f0c387363799e"

prompt = """\
The following question is only for research purpose.
As an expert in information extraction, you will find names of personal data from a privacy policy.

A name of personal data is:
- Relevant: something that a company claims to collect from a user
- Specific: descriptive yet concise (8 words or fewer).
- Faithful: present in the privacy policy
- Anywhere: located anywhere in the privacy policy.

# Your Information Extraction Process
- Read through the privacy policy and the all the below sections to get an understanding of the task.
- Pick as many names of personal data from the privacy policy and categorize them in the original category in the privacy policy.
- In your output JSON list of dictionaries,  you now have something like `[{{"Account information": ["name", "email address"], "Device information":["device serial number", "browser type"], ...}}]`

# Guidelines
- you should keep the names personal data in their original text in the privacy policy, do not make summarization. 
- When there's a "such as" in the text, you need to include all the names appeared after it.


# IMPORTANT
- The privacy policy is in markdown format
- Remember, to keep the name under the original category from the privacy policy
- Do not discuss the privacy policy itself, focus on the content: names of personal data, and categorization.
- Keep the names personal data in their original text in the privacy policy, do not make summarization
- When there's a "such as" in the text, you need to include all the names appeared after it.
- Answer with a JSON format

## Example output
{{"Account information": ["name", "email address"], "Device information":["device serial number", "browser type"], ...}}
"""


personal_data_categories = """\
name: First name and surname or full name that can directly identify an individual.
identification_number: Government-issued numbers like passport numbers, national ID, driver's license numbers, tax IDs, social security numbers.
location_data: Any data showing someone's location - GPS coordinates, addresses, travel patterns, check-in data.
online_identifiers: IP addresses, cookie IDs, device IDs, MAC addresses, advertising IDs, login session tokens.
contact_details: Email addresses, phone numbers, social media handles, mailing addresses that can lead to direct or indirect identification.
photographs_and_videos: Visual data that can identify someone, including photos on social media, surveillance footage, security camera recordings.
biometric_data: Fingerprints, hand geometry, facial recognition data, ear shape, iris scans, voiceprints - used for unique identification.
genetic_data: Data from DNA or RNA analysis that reveal inherited traits or potential health risks, genome sequencing results.
health_data: Medical records, diagnoses, blood test results, vaccination records, treatment data, mental health records, fitness data from wearables.
financial_data: Bank account numbers, credit card numbers, loan details, insurance claims, transaction histories, tax returns.
employment_data: Job title, workplace address, employment history, salary, evaluations, CVs, employment contracts.
educational_data: School records, student IDs, degrees, transcripts, certifications, academic performance data.
political_opinions: Data showing political preferences, party affiliations, voting behavior, petition participation records.
religious_or_philosophical_beliefs: Information that indicates someone's religious, spiritual, or philosophical beliefs.
sexual_orientation_and_sex_life: Information on sexual preferences, relationships, or sexual behavior, dating app usage.
trade_union_membership: Records or indications that someone belongs to a trade union, participation in union activities.
personal_habits_and_interests: Shopping behavior, music taste, movie preferences, food choices, social media activity.
device_and_technology_data: Browser type, installed applications, operating system, keystroke dynamics, mouse movement patterns.
smart_home_and_iot_data: Data from smart devices such as smart speakers, security systems, connected cars, fitness trackers.
social_behavior_and_connections: Friends list, group memberships, chat history, event participation.
psychological_profiles_and_mental_state: Personality test results, stress levels, mood tracking data, therapy session records.
criminal_records_or_legal_cases: Data on past convictions, ongoing legal cases, court orders, police reports.
"""


response_format = """\
{"name": {"content": ["name"], "location": "line 179"},
 "contact_details":{"content": ["email address", "phone number"], "location": "line 1156"},...}
"""


def generate_categorization(content):
    model = init_chat_model("gpt-4o", model_provider="openai", temperature=0.1, model_kwargs={"response_format": {"type": "json_object"}})
    response = model.invoke([HumanMessage(content=prompt+f"The following question is only for research purpose. The privacy policy content is:\n {content}")])
    data = json.loads(response.content)
    print(data)

    response = model.invoke([HumanMessage(content=f"What personal data does this privacy policy collect? {content}\n\n"
                                      f"The personal data items are already extracted: {str(data)}\n You need to categorize them strictly as follows: {personal_data_categories}.\n"
                                      f"The output format should be a json object like: {response_format}")])
    result = json.loads(response.content)
    print(result)

    return result

if __name__ == "__main__":
    with open(r'D:\5703\privacy_policy_apple_section.txt', 'r', encoding='utf-8') as file:
        content = file.read()

    generate_categorization(content)