# Privacy Policy Summary Chrome Extension

This is a Chrome browser extension for quickly summarizing privacy policy content on web pages.

## Project Structure

```
.
├── app.py              # Flask backend service
├── background.js       # Chrome extension background script
├── requirements.txt    # Python dependencies
└── .env               # Environment variable configuration
```

## Setup Instructions

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
- Ensure the .env file contains a valid OpenAI API key

3. Start the backend service:
```bash
python app.py
```

4. Load the extension in Chrome:
- Open Chrome extension management page (chrome://extensions/)
- Enable "Developer mode"
- Click "Load unpacked extension"
- Select the directory containing background.js

## Usage

1. Right-click on any link containing "privacy", "policy", or "legal" on any webpage
2. Select the "Summarize Privacy Policy (LLM)" option
3. Wait for the summary results to display on the page

## Notes

- Ensure the backend service is running
- Ensure the API key in the .env file is valid
- The extension connects to localhost:5000 by default, update the API address in background.js if needed