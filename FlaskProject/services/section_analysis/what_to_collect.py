from dotenv import load_dotenv
from langchain_openai.chat_models import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
import json
from .encode_and_decode import (
    sensitive_word_in_paragraph,
    sensitive_words,
    encode_paragraph,
    decode_paragraph
)

load_dotenv()

# prompt for the first llm chat for data collection purposes
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



# IMPORTANT
- The privacy policy is in markdown format.
- Remember, to keep the name under the original category from the privacy policy.
- Do not discuss the privacy policy itself, focus on the content: names of personal data, and categorization.
- Keep the names personal data in their original text in the privacy policy, do not make summarization.
- When there's a "such as"/"including" in the text, you need to include all the names appeared after it.
- If there is a hierarchy, you need to set the lowest level of topic 
(not necessarily to be titles, can also be bold text at the beginning of a parapraph) as key of the output
 as key of the output. For example, if there is a title and a few paragraphs with bolded keywords at the beginning, you should use keywords as the keys.
-The output should strictly be in a JSON format.

## Example output
{{"Account information": ["name", "email address"], "Device information":["device serial number", "browser type"], ...}}
"""

# personal data categories extracted from GDPR
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

# sensitivity level definition for the personal data categories, which is inferred from GDPR
sensitivity_level_definition = {'Level 4': ['identification number', 'biometric data', 'genetic data', 'health data', 'financial data',
                                'political opinions', 'religious or philosophical_beliefs', 'sexual orientation and sex life',
                                'trade union membership', 'psychological profiles and mental state', 'criminal records or legal cases'],
                                'Level 3': ['employment data', 'photographs and videos', 'device and technology data', 'smart home and iot data', 'social behavior and connections'],
                                'Level 2': ['online identifiers', 'location data', 'educational data', 'personal habits and interests'],
                                'Level 1': ['name', 'contact details']}

# assign a sensitivity level for the personal data categories
def sensitivity_level(data_type, definition):
    if sum([1 if item in data_type else 0 for item in definition['Level 4']]):
        return 4
    elif sum([1 if item in data_type else 0 for item in definition['Level 3']]):
        return 3
    elif sum([1 if item in data_type else 0 for item in definition['Level 2']]):
        return 2
    elif sum([1 if item in data_type else 0 for item in definition['Level 1']]):
        return 1
    else:
        return 0

# response format for the second llm chat for data collection purposes
response_format = """\
{"Your profile information": {"type": ["name", "contact details", 
"photographs and videos"], "summary": "...", "original sentence": "..."}, ...}
"""

# analyse the data collection purposes using asyncronous programming
async def info_collection(text):
    try:
        # check if the privacy policy is from a specific company that OpenAI avoids to analyze
        sensitive_word, encode_dict = sensitive_word_in_paragraph(text, 3, sensitive_words)
        if sensitive_word != None:
            text = encode_paragraph(text, encode_dict)
        result = []
        # call the first llm chat for data collection purposes
        model = ChatOpenAI(model="gpt-4o", temperature=0.1, model_kwargs={"response_format": {"type": "json_object"}})
        response = await model.ainvoke([SystemMessage(content=prompt), HumanMessage(content=f"The privacy policy content is:\n {text}")])
        # parse the response from the first llm chat
        data = json.loads(response.content)
        # prompt for the second llm chat for data collection purposes
        analyse_prompt = f"""\
        You are required to do the following analysis tasks for only research purpose:
        You will be given personal data types found from a privacy policy, which is {data}
        You need to analyse what type of information each item contains using the following categories:{personal_data_categories}.
        The output format should be a json object like: {response_format}

        ## Important
        - you should keep the key of each item unchanged if they are less than or equal to 6 words, otherwise you need to make a summary to make it short
        - For "type", the result can only come from the given categories. You need to analyse according to the value of each item.
        - For "summary", you should find why personal data is being collected and what it will be used for, if this cannot be found, you need to mark it as "unknown purpose"
        - For "oiginal sentence", you should only include the original text from the document. It should only contain the first sentence in a paragraph
        - the output should be a json object
        """
        # call the second llm chat for data collection purposes
        response = await model.ainvoke([SystemMessage(content=analyse_prompt), HumanMessage(content=f"The privacy policy is:\n {text}")])
        # parse the response from the second llm chat
        summary = json.loads(response.content)
        # process the response from the second llm chat to the desired format
        for key in summary.keys():
            content = summary[key]
            new_content = dict()
            # add the keyword to the new content
            new_content['keyword'] = key
            # add the summary to the new content
            new_content['summary'] = "Data to be collected:\n" + ', '.join(data.get(key, [])) + "\n\nData type:\n" + ", ".join(content['type']) + "\n\nSummary:\n" + content['summary']
            # add the original sentence to the new content
            new_content['context'] = content['original sentence']
            # add the sensitivity level to the new content
            if "unknown purpose" in new_content['summary']:
                new_content['importance'] = 5
            else:
                new_content['importance'] = sensitivity_level(content['type'], sensitivity_level_definition)
            # add the new content to the result
            result.append(new_content)
        # if the privacy policy is encoded, decode it
        if sensitive_word != None:
            for content in result:
                content['keyword'] = decode_paragraph(content['keyword'], encode_dict)
                content['context'] = decode_paragraph(content['context'], encode_dict)
                content['summary'] = decode_paragraph(content['summary'], encode_dict)
        # sort the result by the importance 
        result.sort(key=lambda x: x['importance'], reverse=True)
        summary = {'collected_info': result}
        return summary

    except Exception as e:
        return {'collected_info': str(e)}
