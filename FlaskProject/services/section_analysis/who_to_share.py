from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
from dotenv import load_dotenv
import html2text
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


#client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

prompt = """\
The following question is only for research purposes.
As an expert in information extraction, you will identify all third parties and purposes/scenarios explicitly mentioned in a privacy policy about sharing user data.

# Definition of Third Parties
- Third parties include any external entity (individual, company, authority, service provider, partner, affiliate, or international organization) mentioned as receiving user data.
- This includes processors, affiliates, marketing partners, government bodies, analytics providers, hosting services, etc.

# Definition of purposes/scenario
- Some privacy polices do not direcly organize this part using third party categories, instead they divide the data sharing section by the purpose of sharing user data or in which scenario they will share user data.
- This includes: for external processing, for legal compliance, when required by authorities, with user consent

# Your Information Extraction Process
- Read through the privacy policy to first understand the structure of the data sharing section, like how many levels of titles are used, what is the hierarchy.
- identify all the lowest level of titles or topics, then under each title or topic, identify named or described third parties or categories of third parties with whom the company may share user data.
- Include both individual organizations and broader categories (e.g., "service providers", "advertising partners", "law enforcement").

# Output Requirements
- Output should be a JSON object where each lowest level of title or topic is a key and each value is the name or description of the third party or group of third parties mentioned in that individual section.

{{
  "Service providers": "Service providers who perform services on our behalf",
  "Business partners": "Advertising partners",
  "For External Processing": "Analytics providers",
  "Required by authorities": "Government regulators and law enforcement",
}}

- Keep the original wording used in the privacy policy (no summarizing or rephrasing).


# Guidelines
- Understand the how this section of privacy policy is structured
- Focus on sections containing phrases like "we may share", "data is disclosed to", "we provide your data to", "third parties", "partners", "authorities", etc.
- The privacy policy is in markdown format.
- Do not speculate — include only what is explicitly stated or clearly implied.

# IMPORTANT
- You should focus on third-party entities or categories that appear as paragraph headings or items in a list or table.
- Do not discuss or summarize the privacy policy itself, only extract relevant third parties.
- If there is a hierarchy, you need to set the lowest level of title as key of the output.
- Return only a JSON object.
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


sensitivity_level_definition = {'Level 5': ['international organisations and third countries', 'consent'],
                                'Level 4': ['legitimate interest parties'],
                                'Level 3': ['processors and subprocessors', 'group of undertakings'],
                                'Level 2': ['certification bodies and supervisory authorities', 'judicial authorities'],
                                'Level 1': ['emergency services', 'public authorities']}


def sensitivity_level(data_type, definition):
    if data_type in definition['Level 5']:
        return 5
    elif data_type in definition['Level 4']:
        return 4
    elif data_type in definition['Level 3']:
        return 3
    elif data_type in definition['Level 2']:
        return 2
    elif data_type in definition['Level 1']:
        return 1
    else:
        return 0

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
        sensitive_word, encode_dict = sensitive_word_in_paragraph(text, 3, sensitive_words)
        if sensitive_word != None:
            text = encode_paragraph(text, encode_dict)
        # Call OpenAI API for categorized summary
        model = ChatOpenAI(model="gpt-4o", temperature=0.1, model_kwargs={"response_format": {"type": "json_object"}})
        response = await model.ainvoke([SystemMessage(content=prompt), HumanMessage(content=f"The privacy policy content is:\n {text}")])
        data = json.loads(response.content)
        analyse_prompt = f"""\
        Identify third party type, create a summarization, and find orignial sentence from a privacy policy
        There are already a dict for third party categories or data shareing purposes/scenarios, which is developed from a privacy policy: {data}

        Guidelines:
        The output format should be a json object like: {response_format}
        - You need to follow the structure provided above, like if the dict has 4 items, you also need to have 4
        - the key of the output can be a third party category, or data sharing purposes / scenarios. If the its length is longer than 6 words, you can do summarize to keep it short and concise
        - For asssiging types to each item, you can only choose from the following types of third party: {third_party_data_sharing}.
        - You should only include the first sentence of the original text from the document in 'original sentence' attribute
        - If you can not find any matching type for a third party, then mark it as consent
        - In the summary attribute, You need to introduce each third party in detail, including any mentioned examples or activities"""
        response = await model.ainvoke([SystemMessage(content=analyse_prompt), HumanMessage(content=f"The text of the privacy policy is:\n {text}")])
        summary = json.loads(response.content)
        for key in summary.keys():
            content = summary[key]
            new_content = dict()
            new_content['keyword'] = key
            new_content['summary'] = f"Type: {content['type']}\n\nSummary: {content['summary']}"
            new_content['context'] = content['original sentence']
            new_content['importance'] = sensitivity_level(content['type'], sensitivity_level_definition)
            result.append(new_content)

        if sensitive_word != None:
            for content in result:
                content['keyword'] = decode_paragraph(content['keyword'], encode_dict)
                content['context'] = decode_paragraph(content['context'], encode_dict)
                content['summary'] = decode_paragraph(content['summary'], encode_dict)

        result.sort(key=lambda x: x['importance'], reverse=True)
        summary = {'data_sharing': result}

        return summary

    except Exception as e:
        return {'data_sharing': str(e)}
