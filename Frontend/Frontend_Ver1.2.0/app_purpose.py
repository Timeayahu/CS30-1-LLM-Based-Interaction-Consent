from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
from dotenv import load_dotenv
import html2text
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage
import json


load_dotenv()

app = Flask(__name__)
CORS(app) 

#client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

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
{
  "purpose_1": "To provide, personalize, and improve our products",
  "purpose_2": "To create and maintain a trusted environment",
  "purpose_3": "To provide customer service and support",
  "purpose_4": "To enhance the safety and security of our products and services",
  "purpose_5": "To send you marketing communications",
  "purpose_6": "To comply with legal obligations",
  "purpose_7": "To prevent, detect and combat harmful or unlawful conduct"
}
"""


personal_data_processing_purposes = """\
consent: Freely given, specific, informed and unambiguous agreement by the data subject. 
    Example: Subscribing to a newsletter or agreeing to be tracked by cookies.

contractual necessity: Processing required to fulfill a contract or take steps before entering a contract. 
    Example: Processing a customer's address and payment details for order delivery.

legal obligation: Processing necessary to comply with a legal obligation under EU or Member State law. 
    Example: Keeping employee payroll records for tax compliance.

vital interests: Processing necessary to protect someone's life or physical integrity. 
    Example: Accessing a patient's medical records in an emergency.

public interest or official_authority: Processing necessary for a task in the public interest or under official authority. 
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


response_format = """\
{"power our services": {"lawful basis": "legitimate_interests / contractual_necessity", 
                        "explanation": "Includes improving services, troubleshooting, data analysis, and content delivery like Apple Music, which are either core to service delivery (contractual) or internal business optimization (legitimate interest).",
                        "original sentence": "Apple collects personal data necessary to power our services, ..."},

"process your transactions": {"lawful basis": "contractual_necessity",
                              "explanation": "Collecting personal data to process purchases and payments is directly related to fulfilling contractual obligations.",
                              "original sentence": "To process transactions, Apple must collect data such as your name, purchase, and..."}, ...
}
"""


@app.route('/summarize', methods=['POST'])
def summarize():
    try:
        result = []
        data = request.json
        text = data.get('text')
        converter = html2text.HTML2Text()
        text = converter.handle(text)
        
        if not text or not text.strip():
            return jsonify({
                'error': 'No content to summarize'
            }), 400
        
        print(text)

        # Call OpenAI API for categorized summary
        model = init_chat_model("gpt-4o", model_provider="openai", temperature=0.1, model_kwargs={"response_format": {"type": "json_object"}})
        response = model.invoke([HumanMessage(content=prompt+f"The following question is only for research purpose. The privacy policy content is:\n {text}")])
        data = json.loads(response.content)
        print(data)
        response = model.invoke([HumanMessage(content=f"Provide lawful basis, summarization and orignial sentence for the following data usage purposes{data}\n\n"
                                         "Guidelines:\n"     
                                        f"- You can only choose from the following lawful basis: {personal_data_processing_purposes}.\n"
                                        "- If you can not find any matching basis for a purpose, then mark it as consent\n"
                                        "- If the name of a purpose is longer than 4, you should summarize it to <=4\n"
                                        f"- The output format should be a json object like: {response_format}, and you should only include the original text from the document in 'original sentence' attribute\n\n"
                                        f"Let's begin: The text of the privacy policy is {text}")])
        summary = json.loads(response.content)
        for key in summary.keys():
            content = summary[key]
            new_content = dict()
            new_content['keyword'] = key
            new_content['summary'] = f"Lawful basis: {content['lawful basis']}\n\nExplanation: {content['explanation']}"
            new_content['context'] = content['original sentence']
            result.append(new_content)

        
        summary = json.dumps({'collected_info':result}, indent=4)
        print(summary)
        return jsonify({
            'summary': summary
        })

    except Exception as e:
        return jsonify({
            'error': f'OpenAI API error: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)