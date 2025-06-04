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

# prompt for the LLM to extract the purposes for which a company collects user data from a privacy policy
prompt = """\
The following question is only for research purpose.
As an expert in information extraction, you will identify the purposes for which a company collects user data from a privacy policy.

# Definition of Data Collection Purposes
- Relevance: The purpose must be directly related to the company's business needs.
- Specificity: The purpose description should be clear and concise (15 words or fewer).
- Integrity: The purpose must be genuinely presented in the privacy policy.
- Location: The purpose can appear in any section of the privacy policy.

# Your Information Extraction Process
- Read through the privacy policy to identify all stated purposes for data collection.
- Extract each unique purpose while maintaining the original language from the policy.
- In your output JSON, list all purposes as key-value pairs, where the key is a sequential number and the value is the purpose.

# Guidelines
- Focus on sections containing phrases like "we use", "purpose", "to provide", "in order to", etc.
- Keep the original phrasing of purposes from the privacy policy, do not summarize.
- Each purpose should be distinct - avoid duplicating similar purposes.
- Extract the complete purpose statement, not just fragments.

# IMPORTANT
- You should focus on the purposes that appear as a leading title of a parapraph or as an element of a form 
- The privacy policy is in markdown format.
- Do not discuss the privacy policy itself, focus only on extracting the purposes.
- Answer with a JSON format.

## Example output
{{
  "purpose_1": "To provide, personalize, and improve our products",
  "purpose_2": "To create and maintain a trusted environment",
  "purpose_3": "To provide customer service and support",
  "purpose_4": "To enhance the safety and security of our products and services",
  "purpose_5": "To send you marketing communications",
  "purpose_6": "To comply with legal obligations",
  "purpose_7": "To prevent, detect and combat harmful or unlawful conduct"
}}
"""

# lawful basis for personal data processing derived from the GDPR
personal_data_processing_purposes = """\
consent: Freely given, specific, informed and unambiguous agreement by the data subject. 
    Example: Subscribing to a newsletter or agreeing to be tracked by cookies.

contractual necessity: Processing required to fulfill a contract or take steps before entering a contract. 
    Example: Processing a customer's address and payment details for order delivery.

legal obligation: Processing necessary to comply with a legal obligation under EU or Member State law. 
    Example: Keeping employee payroll records for tax compliance.

vital interests: Processing necessary to protect someone's life or physical integrity. 
    Example: Accessing a patient's medical records in an emergency.

public interest or official authority: Processing necessary for a task in the public interest or under official authority. 
    Example: Public health authorities tracking vaccination records during a pandemic.

legitimate interests: Processing necessary for the legitimate interests of the controller or a third party, unless overridden by individual rights. 
    Example: Using customer data to prevent fraud or sending direct marketing to existing customers.

scientific or historical research: Processing for scientific or historical study purposes, with safeguards in place. 
    Example: Medical research on disease patterns using anonymized patient data.

statistical purposes: Processing for statistical analysis that benefits public knowledge or policy. 
    Example: National statistics offices analyzing census data.

archiving in public interest: Long-term preservation of data for historical or cultural value. 
    Example: Digital archiving of newspapers or historical government documents.

healthcare management and public health: Processing necessary for healthcare delivery or public health emergencies. 
    Example: Managing patient appointments or contact tracing during a disease outbreak.
"""

# sensitivity level definition
sensitivity_level_definition = {
    'Level 5': ['consent'],
    'Level 4': ['contractual necessity', 'legitimate interests'],
    'Level 3': ['scientific or historical research', 'healthcare management and public health'],
    'Level 2': ['statistical purposes', 'public interest or official authority', 'archiving in public interest'],
    'Level 1': ['legal obligation', 'vital interests']
}

# check the sensitivity level of the data type
def sensitivity_level(data_type, definition):
    if sum([1 if item in data_type else 0 for item in definition['Level 5']]):
        return 5
    elif sum([1 if item in data_type else 0 for item in definition['Level 4']]):
        return 4
    elif sum([1 if item in data_type else 0 for item in definition['Level 3']]):
        return 3
    elif sum([1 if item in data_type else 0 for item in definition['Level 2']]):
        return 2
    elif sum([1 if item in data_type else 0 for item in definition['Level 1']]):
        return 1
    else:
        return 0

# response format for the LLM to extract the purposes for which a company collects user data from a privacy policy
response_format = """\
{"power our services": {"lawful basis": "legitimate interests / contractual necessity", 
                        "explanation": "Includes improving services, troubleshooting, data analysis, and content delivery like Apple Music, which are either core to service delivery (contractual) or internal business optimization (legitimate interest).",
                        "original sentence": "Apple collects personal data necessary to power our services, ..."},

"process your transactions": {"lawful basis": "contractual necessity",
                              "explanation": "Collecting personal data to process purchases and payments is directly related to fulfilling contractual obligations.",
                              "original sentence": "To process transactions, Apple must collect data such as your name, purchase, and..."}, ...
}
"""

# extract the purposes for which a company collects user data from a privacy policy
def info_use(text):
    try:
        # check if the text is in sensitive words
        sensitive_word, encode_dict = sensitive_word_in_paragraph(text, 3, sensitive_words)
        if sensitive_word != None:
            # encode the text
            text = encode_paragraph(text, encode_dict)
        result = []
        model = ChatOpenAI(model="gpt-4o", temperature=0.1, model_kwargs={"response_format": {"type": "json_object"}})
        # Call OpenAI API for extracting the purposes for which a company collects user data from a privacy policy
        response = model.invoke([SystemMessage(content=prompt), HumanMessage(content=f"The privacy policy content is:\n {text}")])
        data = json.loads(response.content)
        # prompt for the LLM to extract the lawful basis for the purposes for which a company collects user data from a privacy policy
        analyse_prompt = f"""\
        Provide lawful basis, summarization and orignial sentence for the following data usage purposes{data}
        Guidelines:
        - You can only choose from the following lawful basis: {personal_data_processing_purposes}.
        - If you can not find any matching basis for a purpose, then mark it as consent.
        - If the name of a purpose is longer than 6 words, you should summarize it to <= 6 words.
        - The output format should be a json object like: {response_format}
        - you should only include the first sentence of the relevant paragraph in the original text from the document in 'original sentence' attribute
        - In the 'explanation' attribute, You need to introduce each purpose in detail, including any mentioned examples or activities
        """
        # Call OpenAI API for finding the lawful basis and generating the summary the purposes for which a company collects user data from a privacy policy
        response = model.invoke([SystemMessage(content=analyse_prompt), HumanMessage(content=f"The text of the privacy policy is:\n {text}")])
        summary = json.loads(response.content)
        # Reorganize the result of the LLM to the desired format
        for key in summary.keys():
            content = summary[key]
            new_content = dict()
            new_content['keyword'] = key
            new_content['summary'] = f"Lawful basis: {content['lawful basis']}\n\nExplanation: {content['explanation']}"
            new_content['context'] = content['original sentence']
            new_content['importance'] = sensitivity_level(content['lawful basis'], sensitivity_level_definition)
            result.append(new_content)

        # decode the text if the text is encoded
        if sensitive_word != None:
            for content in result:
                content['keyword'] = decode_paragraph(content['keyword'], encode_dict)
                content['context'] = decode_paragraph(content['context'], encode_dict)
                content['summary'] = decode_paragraph(content['summary'], encode_dict)

        # sort the result by the importance
        result.sort(key=lambda x: x['importance'], reverse=True)
        summary = {'data_usage': result}

        return summary

    except Exception as e:
        return {'data_usage': str(e)}
