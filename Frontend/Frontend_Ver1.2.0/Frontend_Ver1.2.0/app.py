from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app) 

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

@app.route('/summarize', methods=['POST'])
def summarize():
    try:
        data = request.json
        text = data.get('text')
        
        if not text or not text.strip():
            return jsonify({
                'error': 'No content to summarize'
            }), 400

        # Call OpenAI API for categorized summary
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": """You are an assistant specialized in analyzing privacy policies. Please analyze the privacy policy and extract information in the following three aspects:
                1. Personal Information Collected (including keywords and detailed explanations)
                2. Data Usage Methods (including keywords and detailed explanations)
                3. Data Sharing Entities (including keywords and detailed explanations)
                
                For each aspect, please extract keywords and provide corresponding detailed explanations. Also mark the location of this content in the original text (through key sentence positioning).
                
                The response should be in JSON format:
                {
                    "collected_info": [
                        {"keyword": "...", "summary": "...", "context": "...original key sentence..."}
                    ],
                    "data_usage": [
                        {"keyword": "...", "summary": "...", "context": "...original key sentence..."}
                    ],
                    "data_sharing": [
                        {"keyword": "...", "summary": "...", "context": "...original key sentence..."}
                    ]
                }"""},
                {"role": "user", "content": f"Please summarize the following privacy policy:\n\n{text}"}
            ],
            response_format={ "type": "json_object" },
            temperature=0.7
        )

        summary = response.choices[0].message.content.strip()
        return jsonify({
            'summary': summary
        })

    except Exception as e:
        return jsonify({
            'error': f'OpenAI API error: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)