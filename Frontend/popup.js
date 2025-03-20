document.addEventListener('DOMContentLoaded', function() {
    const summarizeBtn = document.getElementById('summarizeBtn');
    const statusEl = document.getElementById('status');
    const summaryEl = document.getElementById('summary');
  
    function showLoading() {
      statusEl.textContent = "Summarizing the policy... please wait.";
      summaryEl.textContent = "";
      summarizeBtn.disabled = true;
    }
  
    function displayResult(text, isError = false) {
      summaryEl.textContent = text;
      if (isError) {
        statusEl.textContent = "❗️ " + text;
        statusEl.classList.add('error');
      } else {
        statusEl.textContent = "✅ Summary ready:";
        statusEl.classList.remove('error');
      }
      summarizeBtn.disabled = false;
    }
  
    summarizeBtn.addEventListener('click', () => {
      showLoading();
  
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs && tabs.length > 0) {
          const currentUrl = tabs[0].url;
          if (!/privacy|policy|legal/i.test(currentUrl)) {
            displayResult("Cannot find any keyword related to privacy policy", true);
            return;
          }
          chrome.scripting.executeScript(
            {
              target: { tabId: tabs[0].id },
              files: ['content.js']
            },
            () => {
              console.log('Content script injected for tab ' + tabs[0].id);
            }
          );
        } else {
          displayResult("No active tab found.", true);
        }
      });
    });
  
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "summaryResult") {
        if (message.summary) {
          displayResult(message.summary, false);
        } else if (message.error) {
          displayResult(message.error, true);
        }
      }
    });
  });
  