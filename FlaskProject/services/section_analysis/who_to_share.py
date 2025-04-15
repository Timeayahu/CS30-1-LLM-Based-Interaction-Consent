from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
from dotenv import load_dotenv
import html2text
from langchain_openai.chat_models import ChatOpenAI
from langchain_core.messages import HumanMessage
import json


load_dotenv()


#client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

prompt = """\
The following question is only for research purposes.
As an expert in information extraction, you will identify all third parties explicitly mentioned in a privacy policy as recipients of user data.

# Definition of Third Parties
- Third parties include any external entity (individual, company, authority, service provider, partner, affiliate, or international organization) mentioned as receiving user data.
- This includes processors, affiliates, marketing partners, government bodies, analytics providers, hosting services, etc.

# Your Information Extraction Process
- Read through the privacy policy to identify all named or described third parties or categories of third parties with whom the company may share user data.
- Include both individual organizations and broader categories (e.g., "service providers", "advertising partners", "law enforcement").

# Output Requirements
- Output should be a JSON object where each key is a sequential identifier (e.g., "third_party_1") and each value is the name or description of the third party or group of third parties.
- Keep the original wording used in the privacy policy (no summarizing or rephrasing).
- Each third party entry must be unique — do not duplicate similar entries.
- List each third party only once, even if it appears in multiple places.

# Guidelines
- Focus on sections containing phrases like "we may share", "data is disclosed to", "we provide your data to", "third parties", "partners", "authorities", etc.
- The privacy policy is in markdown format.
- Do not speculate — include only what is explicitly stated or clearly implied.

# IMPORTANT
- You should focus on third-party entities or categories that appear as paragraph headings or items in a list or table.
- Do not discuss or summarize the privacy policy itself, only extract relevant third parties.
- Return only a JSON object.

## Example output
{
  "third_party_1": "Service providers who perform services on our behalf",
  "third_party_2": "Advertising partners",
  "third_party_3": "Analytics providers",
  "third_party_4": "Payment processors",
  "third_party_5": "Government regulators and law enforcement",
  "third_party_6": "Affiliates and subsidiaries",
  "third_party_7": "Cloud hosting vendors"
}
"""



third_party_data_sharing = """\
public authorities: Authorities that may receive data in accordance with the law for official investigations, but are not considered recipients in such cases.
    Example: A tax authority requesting records for an audit.

international organisations and third countries: Entities outside the EU/EEA to whom data can be transferred with adequate safeguards.
    Example: A cloud provider in the US receiving personal data under a Standard Contractual Clause agreement.

processors and subprocessors: External vendors processing data on behalf of a controller, under contract and instruction.
    Example: An IT service company managing a database for a hospital.

legitimate interest parties: Entities with a justified interest in processing data, provided it doesn't override individual rights.
    Example: A parent company analyzing subsidiary customer data to improve services.

group of undertakings: Controlled and affiliated undertakings that may exchange personal data internally for administrative purposes.
    Example: HR departments within an international corporate group sharing employee data.

emergency services: Entities accessing personal data in life-critical scenarios.
    Example: Emergency responders accessing health records during disaster relief.

judicial authorities: Courts or bodies acting in a judicial capacity where processing is governed by national law.
    Example: A court accessing data during a legal dispute.

certification bodies and supervisory authorities: Organizations verifying GDPR compliance or handling regulatory oversight.
    Example: A data protection authority reviewing data sharing practices during an investigation.
"""



response_format = """\
{
  "Apple-Affiliated Companies": {
    "type": "group of undertakings",
    "summary": "Apple may share data with its affiliated companies under the Apple corporate group,...",
    "original sentence": "Apple may share personal data with Apple-affiliated companies..."
  },
  "Service Providers": {
    "type": "processors and subprocessors",
    "summary": "Third parties performing tasks like processing or storing data on Apple's behalf.,,,",
    "original sentence": "Apple may engage third parties to act as our service providers and perform certain tasks on our behalf..."
  },...
}
"""


async def info_share(text):
    try:
        result = []

        # Call OpenAI API for categorized summary
        model = ChatOpenAI(model="gpt-4o", temperature=0.1, model_kwargs={"response_format": {"type": "json_object"}})
        response = await model.ainvoke([HumanMessage(content=prompt+f"The following question is only for research purpose. The privacy policy content is:\n {text}")])
        data = json.loads(response.content)
        response = await model.ainvoke([HumanMessage(content=f"Identify third party type, create a summarization, and find orignial sentence for the following third party (recipients of user data): {data}\n\n"
                                         "Guidelines:\n"     
                                        f"- You can only choose from the following types of third party: {third_party_data_sharing}.\n"
                                        "- If you can not find any matching type for a third party, then mark it as consent\n"
                                        "- If the name of a third party is longer than 4, you should summarize it to <=4\n"
                                        f"- The output format should be a json object like: {response_format}, and you should only include the original text from the document in 'original sentence' attribute\n"
                                        "- In the summary attribute, You need to introduce each third party in detail, including any mentioned examples or activities\n"
                                        "- The key of the output should be the name of the mentioned third party, and its length is strictly limited to 4 words in English\n\n"
                                        f"Let's begin: The text of the privacy policy is {text}")])
        summary = json.loads(response.content)
        for key in summary.keys():
            content = summary[key]
            new_content = dict()
            new_content['keyword'] = key
            new_content['summary'] = f"Type: {content['type']}\n\nSummary: {content['summary']}"
            new_content['context'] = content['original sentence']
            result.append(new_content)

        summary = {'data_sharing': result}

        return summary

    except Exception as e:
        return {'data_sharing': str(e)}