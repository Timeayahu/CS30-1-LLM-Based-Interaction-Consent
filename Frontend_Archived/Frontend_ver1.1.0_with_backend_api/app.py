from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

app = Flask(__name__)
CORS(app)  # 启用CORS支持

# 配置OpenAI客户端
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

        # 调用OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant specialized in summarizing text."},
                {"role": "user", "content": f"Summarize the following privacy policy:\n\n{text}"}
            ],
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