const OPENAI_API_KEY = "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";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "summarize") {
    const policyText = message.text || "";
    if (!policyText.trim()) {
      chrome.runtime.sendMessage({ action: "summaryResult", error: "No privacy policy text found on this page." });
      return;
    }

    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    };
    const requestBody = {
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant specialized in summarizing text." },
        { role: "user", content: "Summarize the following privacy policy in a concise manner:\n\n" + policyText }
      ],
      temperature: 0.7
    };

    fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      let summary = "";
      if (data && data.choices && data.choices.length > 0) {
        summary = data.choices[0].message.content.trim();
      } else {
        summary = "*(No summary available)*";
      }
      chrome.runtime.sendMessage({ action: "summaryResult", summary: summary });
    })
    .catch(err => {
      console.error("Error during ChatGPT API call:", err);
      chrome.runtime.sendMessage({ 
        action: "summaryResult", 
        error: "Error: Failed to summarize policy. " + err.message 
      });
    });

    return true;
  }
});