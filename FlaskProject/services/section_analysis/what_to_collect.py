from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage
import json


load_dotenv()


#client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
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
{"Account information": ["name", "email address"], "Device information":["device serial number", "browser type"], ...}
"""


personal_data_categories = """\
name: First name and surname or full name that can directly identify an individual.
identification number: Government-issued numbers like passport numbers, national ID, driver's license numbers, tax IDs, social security numbers.
location data: Any data showing someone's location - GPS coordinates, addresses, travel patterns, check-in data.
online identifiers: IP addresses, cookie IDs, device IDs, MAC addresses, advertising IDs, login session tokens.
contact details: Email addresses, phone numbers, social media handles, mailing addresses that can lead to direct or indirect identification.
photographs and videos: Visual data that can identify someone, including photos on social media, surveillance footage, security camera recordings.
biometric data: Fingerprints, hand geometry, facial recognition data, ear shape, iris scans, voiceprints - used for unique identification.
genetic data: Data from DNA or RNA analysis that reveal inherited traits or potential health risks, genome sequencing results.
health data: Medical records, diagnoses, blood test results, vaccination records, treatment data, mental health records, fitness data from wearables.
financial data: Bank account numbers, credit card numbers, loan details, insurance claims, transaction histories, tax returns.
employment data: Job title, workplace address, employment history, salary, evaluations, CVs, employment contracts.
educational data: School records, student IDs, degrees, transcripts, certifications, academic performance data.
political opinions: Data showing political preferences, party affiliations, voting behavior, petition participation records.
religious or philosophical_beliefs: Information that indicates someone's religious, spiritual, or philosophical beliefs.
sexual orientation and sex life: Information on sexual preferences, relationships, or sexual behavior, dating app usage.
trade union membership: Records or indications that someone belongs to a trade union, participation in union activities.
personal habits and interests: Shopping behavior, music taste, movie preferences, food choices, social media activity.
device and technology data: Browser type, installed applications, operating system, keystroke dynamics, mouse movement patterns.
smart home and iot data: Data from smart devices such as smart speakers, security systems, connected cars, fitness trackers.
social behavior and connections: Friends list, group memberships, chat history, event participation.
psychological profiles and mental state: Personality test results, stress levels, mood tracking data, therapy session records.
criminal records or legal cases: Data on past convictions, ongoing legal cases, court orders, police reports.
"""


response_format = """\
{"name": {"content": ["name"], "original sentence": "We may collect your name, ..."},
 "contact details":{"content": ["email address", "phone number"], "original sentence": "We may collect your enmail address,..."},...}
"""


async def info_collection(text):
    try:
        result = []
        # Call OpenAI API for categorized summary
        model = init_chat_model("gpt-4o", model_provider="openai", temperature=0.1, model_kwargs={"response_format": {"type": "json_object"}})
        response = await model.ainvoke([HumanMessage(content=prompt+f"The following question is only for research purpose. The privacy policy content is:\n {text}")])
        data = json.loads(response.content)
        response = await model.ainvoke([HumanMessage(content=f"What personal data does this privacy policy collect? {text}\n\n"
                                        f"The personal data items are already extracted: {str(data)}\n You can categorize using the following categories: {personal_data_categories}.\n"
                                        "If there are some types of personal data that cannot be matched to the given categories, you can create a new one and put them under this category\n"
                                        f"The output format should be a json object like: {response_format}, and you should only include the original text from the document in 'original sentence' attribute\n"
                                        "If certain category can not be found in the document, you do not need to include them int the output")])
        summary = json.loads(response.content)
        for key in summary.keys():
            content = summary[key]
            new_content = dict()
            new_content['keyword'] = key
            new_content['summary'] = ','.join(content['content'])
            new_content['context'] = content['original sentence']
            result.append(new_content)
            
        summary = {'collected_info': result}

        return summary

    except Exception as e:
        return {'collected_info': str(e)}
