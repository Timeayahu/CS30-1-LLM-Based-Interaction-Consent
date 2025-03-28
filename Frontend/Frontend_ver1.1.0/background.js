const OPENAI_API_KEY = "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";

// 1) 安装或更新时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarizePolicy",
    title: "Summarize Privacy Policy (LLM)",
    contexts: ["link"]
  });
});

// 2) 监听右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarizePolicy") {
    chrome.tabs.sendMessage(tab.id, {
      action: "showSummary",
      isLoading: true
    });
    // 例如简单判断链接中带有“privacy” or "policy"
    if (/privacy|policy|legal/i.test(info.linkUrl)) {
      // 这里可以直接发起 fetch，不用跳转页面:
      fetch(info.linkUrl)
        .then(res => res.text())
        .then(pageText => {
          // 假设拿到原始页面 HTML，这里可以做更多解析
          // 或者此处省略 fetch，改为让 content script 去提取
          // 见下文 alternative 做法
          summarizeWithOpenAI(pageText, (summary, error) => {
            if (error) {
              // 把错误信息发送到 content script 显示
              chrome.tabs.sendMessage(tab.id, {
                action: "showSummary",
                error
              });
            } else {
              // 把 summary 发送到 content script 显示
              chrome.tabs.sendMessage(tab.id, {
                action: "showSummary",
                summary
              });
            }
          });
        })
        .catch(err => {
          chrome.tabs.sendMessage(tab.id, {
            action: "showSummary",
            error: "Failed to fetch link content: " + err.message
          });
        });
    } else {
      chrome.tabs.sendMessage(tab.id, {
        action: "showSummary",
        error: "This link doesn't look like a privacy policy URL"
      });
    }
  }
});
// 3) 调用 OpenAI Summarize
function summarizeWithOpenAI(originalText, callback) {
  if (!originalText || !originalText.trim()) {
    callback(null, "No content to summarize");
    return;
  }

  const apiUrl = "https://api.openai.com/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${OPENAI_API_KEY}`
  };
  const requestBody = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant specialized in summarizing text." },
      { role: "user", content: "Summarize the following privacy policy:\n\n" + originalText }
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
    const summary = data?.choices?.[0]?.message?.content?.trim() || "(No summary available)";
    callback(summary, null);
  })
  .catch(err => {
    callback(null, "OpenAI API error: " + err.message);
  });
}
