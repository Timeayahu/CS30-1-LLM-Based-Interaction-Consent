// 1) 安装或更新时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarizePolicy",
    title: "Use LLM to Summarize Privacy Policy",
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
    
    if (/privacy|policy|legal/i.test(info.linkUrl)) {
      fetch(info.linkUrl)
        .then(res => res.text())
        .then(pageText => {
          // 调用后端API进行总结
          fetch('http://localhost:5000/summarize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: pageText })
          })
          .then(response => response.json())
          .then(data => {
            if (data.error) {
              chrome.tabs.sendMessage(tab.id, {
                action: "showSummary",
                error: data.error
              });
            } else {
              chrome.tabs.sendMessage(tab.id, {
                action: "showSummary",
                summary: data.summary
              });
            }
          })
          .catch(err => {
            chrome.tabs.sendMessage(tab.id, {
              action: "showSummary",
              error: "Backend API error: " + err.message
            });
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
