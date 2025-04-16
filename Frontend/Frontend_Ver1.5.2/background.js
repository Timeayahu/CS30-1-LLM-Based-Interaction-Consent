// background.js

// Initialize the extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ isEnabled: true });
  updateIcon(true);
  console.log("Extension installed and initialized");
});

// Simple health check for Service Worker
function checkServiceWorkerHealth() {
  console.log("Service Worker health check executed");
  // Attempt to keep service worker alive
  chrome.runtime.getPlatformInfo(function(info) {
    // Just a simple operation to ensure service worker is responsive
    console.log("Service worker active, platform: " + info.os);
  });
}

// Periodically check Service Worker health
setInterval(checkServiceWorkerHealth, 60000); // Check every minute

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
      console.log("Summarizing policy from URL:", url);
      
      // Send loading state back to content script
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "showSummary",
        isLoading: true
      });
      
      if (/privacy|policy|legal|privacy-policy/i.test(url)) {
        // Create a timeout promise that rejects after 60 seconds
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Request timed out after 60 seconds")), 60000);
        });
        
        // Create the main fetch promise
        const fetchPromise = fetch(url)
          .then(res => {
            if (!res.ok) {
              throw new Error(`Network response error: ${res.status}`);
            }
            console.log("Successfully fetched page content from:", url);
            return res.text();
          })
          .then(pageText => {
            console.log("Page content fetched, sending to API for processing");
            // Call backend API for summarization
            const apiUrl = 'http://localhost:5000/api/scheduling';
            console.log("Making API request to:", apiUrl);
            
            return fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text: pageText })
            }).then(response => {
              if (!response.ok) {
                throw new Error(`API response error: ${response.status}`);
              }
              console.log("Received successful API response");
              return response.json();
            });
          })
          .then(data => {
            console.log("Parsed API response data:", Object.keys(data));
            if (data.error) {
              chrome.tabs.sendMessage(sender.tab.id, {
                action: "showSummary",
                error: data.error
              });
            } else {
              // Verify data.summary exists before sending
              if (!data.summary) {
                throw new Error("API response missing summary data");
              }
              
              try {
                // Make sure we can parse it if it's a string
                if (typeof data.summary === 'string') {
                  JSON.parse(data.summary);
                }
                
                chrome.tabs.sendMessage(sender.tab.id, {
                  action: "showSummary",
                  summary: data.summary
                });
                console.log("Summary sent to content script successfully");
              } catch (e) {
                throw new Error("Invalid summary format: " + e.message);
              }
            }
          })
          .catch(err => {
            console.error("Error in processing:", err);
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "showSummary",
              error: "Error: " + err.message
            });
          });
        
        // Race the fetch promise against the timeout promise
        Promise.race([fetchPromise, timeoutPromise]).catch(err => {
          console.error("Request timed out or failed:", err);
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
                  // Send message to background script to handle tab switching
                  chrome.runtime.sendMessage({
                    action: "returnToSummary",
                    sourceUrl: window.location.href
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
  } else if (message.action === "getCurrentTabId") {
    // Return the current tab ID
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        sendResponse({ tabId: tabs[0].id });
      }
    });
    return true; // Keep the message channel open for asynchronous response
  } else if (message.action === "returnToSummary") {
    // Handle the request to return to the summary page
    chrome.storage.local.get(['originalTextHighlight'], (data) => {
      if (data.originalTextHighlight && data.originalTextHighlight.sourceTabId) {
        // Get all tabs
        chrome.tabs.query({}, (tabs) => {
          // Find the current tab (the tab that sent the message)
          const currentTab = tabs.find(tab => tab.url === message.sourceUrl);
          
          if (currentTab) {
            // Find the source tab (using the stored source tab ID)
            const sourceTab = tabs.find(tab => tab.id === data.originalTextHighlight.sourceTabId);
            
            if (sourceTab) {
              // Activate the source tab and close the current tab
              chrome.tabs.update(sourceTab.id, {active: true});
              chrome.tabs.remove(currentTab.id);
            } else {
              // If the source tab cannot be found, try to find any tab that is not the current tab
              const anyOtherTab = tabs.find(tab => tab.id !== currentTab.id);
              if (anyOtherTab) {
                // Activate the found tab and close the current tab
                chrome.tabs.update(anyOtherTab.id, {active: true});
                chrome.tabs.remove(currentTab.id);
              }
            }
          }
        });
      }
    });
  }
});
