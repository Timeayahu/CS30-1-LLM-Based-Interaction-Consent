// background.js

// Initialize the extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ isEnabled: true });
  updateIcon(true);
});

// Update the icon state
function updateIcon(isEnabled) {
  // Set the badge text
  chrome.action.setBadgeText({
    text: isEnabled ? '' : 'OFF'
  });
  
  // Set the badge background color
  chrome.action.setBadgeBackgroundColor({
    color: '#666666'
  });
}

// Handle the icon click event
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.get(['isEnabled'], (result) => {
    const newState = !result.isEnabled;
    chrome.storage.local.set({ isEnabled: newState });
    updateIcon(newState);
    
    // Notify the content script of the state change
    chrome.tabs.sendMessage(tab.id, {
      action: "toggleEnabled",
      isEnabled: newState
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('background.js收到消息:', message);
  
  if (message.action === "summarizePolicy") {
    // Check if the extension is enabled
    chrome.storage.local.get(['isEnabled'], (result) => {
      if (!result.isEnabled) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "showSummary",
          error: "The extension is currently disabled"
        });
        return;
      }
      
      const url = message.url;
      console.log('处理URL:', url);
      
      // Send loading state back to content script
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "showSummary",
        isLoading: true
      });
      
      if (/privacy|policy|legal|privacy-policy/i.test(url)) {
        console.log('开始获取页面内容...');
        fetch(url)
          .then(res => {
            console.log('页面内容获取响应:', res.status);
            return res.text();
          })
          .then(pageText => {
            console.log('获取页面内容成功，长度:', pageText.length);
            console.log('准备发送API请求到后端...');
            
            // Call backend API for summarization
            return fetch('http://localhost:5000/api/scheduling', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text: pageText, url: url })
            }).catch(fetchError => {
              console.error('API请求失败:', fetchError);
              
              // 当后端API请求失败时，返回模拟数据进行测试
              console.log('使用测试数据...');
              return new Response(JSON.stringify({
                success: true,
                summary: {
                  global_result: "这是一个测试的隐私政策摘要，用于在后端API不可用时测试前端显示功能。",
                  section_result: null
                }
              }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            });
          })
          .then(response => {
            // 检查响应状态码
            console.log('后端API响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
              // 记录详细的错误信息
              console.error(`服务器返回错误状态码: ${response.status}`);
              throw new Error(`服务器返回错误状态码: ${response.status}`);
            }
            return response.text().then(text => {
              try {
                // 记录原始响应内容
                console.log('API原始响应:', text);
                // 尝试解析JSON
                const parsedData = JSON.parse(text);
                console.log('API响应解析结果:', parsedData);
                return parsedData;
              } catch (e) {
                // 如果解析失败，返回错误信息
                console.error(`解析响应数据失败: ${e.message}`, text);
                throw new Error(`解析响应数据失败: ${e.message}, 原始数据: ${text.substring(0, 100)}...`);
              }
            });
          })
          .then(data => {
            console.log('处理API响应数据:', data);
            if (data.error) {
              console.error('API返回错误:', data.error);
              chrome.tabs.sendMessage(sender.tab.id, {
                action: "showSummary",
                error: data.error
              });
            } else {
              // 检查返回的数据结构
              let summaryData = data.summary;
              console.log('提取的summary数据:', summaryData);
              
              // 如果summary是字符串，尝试解析为JSON
              if (typeof summaryData === 'string') {
                try {
                  summaryData = JSON.parse(summaryData);
                  console.log('解析后的summary数据:', summaryData);
                } catch (e) {
                  // 如果无法解析，则不做处理，保持原始字符串
                  console.log('summary数据无法解析为JSON，保持原始字符串');
                }
              }
              
              console.log('发送给content.js的最终数据:', summaryData);
              chrome.tabs.sendMessage(sender.tab.id, {
                action: "showSummary",
                summary: summaryData
              });
            }
          })
          .catch(err => {
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "showSummary",
              error: "Error: " + err.message
            });
          });
      } else {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "showSummary",
          error: "This link doesn't look like a privacy policy URL"
        });
      }
    });
  } else if (message.action === "openOriginalText") {
    // Open URL in new tab
    chrome.tabs.create({ url: message.url }, (tab) => {
      // Execute content script after page loads
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          function findAndHighlightText(searchText) {
            // Create new highlight
            const treeWalker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: function(node) {
                  return node.textContent.includes(searchText) ?
                    NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
              }
            );

            let found = false;
            let currentNode;
            while ((currentNode = treeWalker.nextNode()) && !found) {
              const index = currentNode.textContent.indexOf(searchText);
              if (index >= 0) {
                const range = document.createRange();
                range.setStart(currentNode, index);
                range.setEnd(currentNode, index + searchText.length);
                
                const span = document.createElement('span');
                span.className = 'privacy-highlight';
                Object.assign(span.style, {
                  backgroundColor: '#ffeb3b',
                  padding: '2px'
                });
                
                range.surroundContents(span);
                
                // Scroll to the highlighted text
                setTimeout(() => {
                  span.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center'
                  });
                }, 500);
                
                found = true;

                // Create return button
                const returnBtn = document.createElement('button');
                returnBtn.innerText = 'Back to Summary';
                Object.assign(returnBtn.style, {
                  position: 'fixed',
                  top: '20px',
                  right: '20px',
                  zIndex: 100000,
                  padding: '8px 16px',
                  backgroundColor: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  fontSize: '14px'
                });

                returnBtn.addEventListener('mouseover', () => {
                  returnBtn.style.opacity = '0.8';
                });
                returnBtn.addEventListener('mouseout', () => {
                  returnBtn.style.opacity = '1';
                });

                // Return to summary page
                returnBtn.onclick = () => {
                  chrome.storage.local.get(['originalTextHighlight'], (data) => {
                    if (data.originalTextHighlight) {
                      // Get the current tab ID
                      chrome.tabs.getCurrent(currentTab => {
                        // Find the source tab by checking all tabs
                        chrome.tabs.query({}, (tabs) => {
                          // Find the tab that is not the privacy policy page
                          const sourceTab = tabs.find(tab => 
                            tab.id !== currentTab.id && 
                            tab.url !== data.originalTextHighlight.sourceUrl
                          );
                          
                          if (sourceTab) {
                            // Activate the source tab and close current tab
                            chrome.tabs.update(sourceTab.id, {active: true});
                            chrome.tabs.remove(currentTab.id);
                          }
                        });
                      });
                    }
                  });
                };

                document.body.appendChild(returnBtn);
              }
            }
            return found;
          }

          function initializeHighlight() {
            chrome.storage.local.get(['originalTextHighlight'], (result) => {
              if (result.originalTextHighlight) {
                const searchText = result.originalTextHighlight.text;
                
                // Try to find and highlight immediately
                if (!findAndHighlightText(searchText)) {
                  // If not found, set up a MutationObserver to watch for changes
                  const observer = new MutationObserver((mutations, obs) => {
                    if (findAndHighlightText(searchText)) {
                      obs.disconnect(); // Stop observing once found
                    }
                  });

                  observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true
                  });

                  // Set a timeout to stop the observer after 10 seconds
                  setTimeout(() => {
                    observer.disconnect();
                  }, 10000);
                }
              }
            });
          }

          // Wait for page load
          if (document.readyState === 'complete') {
            initializeHighlight();
          } else {
            window.addEventListener('load', initializeHighlight);
          }
        }
      });
    });
  }
});
