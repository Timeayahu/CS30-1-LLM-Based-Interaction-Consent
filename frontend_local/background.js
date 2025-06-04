// background.js

const API_CONFIG = {
  BASE_URL: 'https://usyd-cs30-1-llm-based-consent-reader.com'
};

// Initialize the extension state
chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.set({ 
    isEnabled: true,
    serviceWorkerLastActive: Date.now()
  });
  updateIcon(true);
  console.log("Extension installed and initialized");
  
  // Create context menu for privacy policy links
  createContextMenu();
  
  // Set up periodic storage check to detect service worker failures
  setupServiceWorkerMonitoring();
  
  // Show tutorial on first install
  if (details.reason === 'install') {
    console.log("First install - opening tutorial");
    chrome.tabs.create({
      url: chrome.runtime.getURL('tutorial.html')
    });
  }
});

// Create context menu for privacy policy summarization
function createContextMenu() {
  try {
    // Remove existing context menu items to avoid duplicates
    chrome.contextMenus.removeAll(() => {
      // Create the main context menu item
      chrome.contextMenus.create({
        id: "summarize-privacy-policy",
        title: "Use LLM to summarize privacy policy",
        contexts: ["link", "selection"],
        documentUrlPatterns: ["*://*/*"]
      });
      
      console.log("Context menu created successfully");
    });
  } catch (error) {
    console.error("Failed to create context menu:", error);
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarize-privacy-policy") {
    console.log("Context menu clicked for privacy policy summarization");
    
    // Record activity to show service worker is active
    recordHeartbeat();
    
    // Get the URL to analyze
    let targetUrl = null;
    
    // If clicked on a link, use the link URL
    if (info.linkUrl) {
      targetUrl = info.linkUrl;
    } 
    // If text is selected, try to extract URL from selection
    else if (info.selectionText) {
      // Check if the selected text contains a URL
      const urlPattern = /https?:\/\/[^\s]+/g;
      const urlMatch = info.selectionText.match(urlPattern);
      if (urlMatch && urlMatch.length > 0) {
        targetUrl = urlMatch[0];
      }
    }
    
    // If no URL found from context, send message to content script to get current hovered element URL
    if (!targetUrl) {
      chrome.tabs.sendMessage(tab.id, {
        action: "getContextMenuTarget"
      }, (response) => {
        if (response && response.url) {
          targetUrl = response.url;
          processSummarization(targetUrl, tab.id);
        } else {
          // Fallback: try current page if it seems privacy-related
          chrome.tabs.sendMessage(tab.id, {
            action: "checkCurrentPageForPrivacy"
          }, (pageResponse) => {
            if (pageResponse && pageResponse.isPrivacyPage) {
              targetUrl = pageResponse.url;
              processSummarization(targetUrl, tab.id);
            } else {
              // Show error message
              chrome.tabs.sendMessage(tab.id, {
                action: "showSummary",
                error: "Please right-click directly on a privacy policy link or select text containing a privacy policy URL"
              });
            }
          });
        }
      });
      return;
    }
    
    // Process the summarization with the found URL
    processSummarization(targetUrl, tab.id);
  }
});

// Helper function to process summarization request
function processSummarization(url, tabId) {
  if (!url) {
    chrome.tabs.sendMessage(tabId, {
      action: "showSummary",
      error: "No valid privacy policy URL found"
    });
    return;
  }
  
  console.log("Processing summarization for URL:", url);
  
  // Record activity to show service worker is handling requests
  recordHeartbeat();
  
  // Check if extension is enabled
  chrome.storage.local.get(['isEnabled'], (result) => {
    if (!result.isEnabled) {
      chrome.tabs.sendMessage(tabId, {
        action: "showSummary",
        error: "The extension is currently disabled"
      });
      return;
    }
    
    // Send loading state
    chrome.tabs.sendMessage(tabId, {
      action: "showSummary",
      isLoading: true
    });
    
    // Create a mock sender object to reuse the existing summarizePolicy logic
    const mockSender = {
      tab: {
        id: tabId
      }
    };
    
    // Create a mock message object
    const mockMessage = {
      action: "summarizePolicy",
      url: url
    };
    
    // Reuse the existing summarizePolicy logic by calling the main message handler
    // This ensures we use the same caching, validation, and processing logic
    const summarizePolicyHandler = handleSummarizePolicyMessage;
    summarizePolicyHandler(mockMessage, mockSender);
  });
}

// Extract the summarizePolicy logic into a separate function for reuse
function handleSummarizePolicyMessage(message, sender) {
  const url = message.url;
  console.log("Summarizing policy from URL:", url);
  
  // Store current request tabId for potential cancellation
  chrome.storage.local.set({ 
    currentSummaryRequest: {
      tabId: sender.tab.id,
      url: url,
      timestamp: Date.now()
    }
  });
  
  // Enhanced regex for detecting privacy policy URLs
  const isPrivacyPolicyURL = (url) => {
    // JB HiFi special handling (priority matching)
    if (url.includes('support.jbhifi.com.au') && url.includes('Privacy-policy')) {
      return true;
    }
    
    if (url.includes('support.jbhifi.com.au') && url.includes('360052938974')) {
      return true;
    }
    
    // Split URL into base part and query parameters, only analyze base URL
    let baseUrl = url;
    try {
      // Try to remove query parameters
      const urlObj = new URL(url);
      baseUrl = urlObj.origin + urlObj.pathname;
    } catch (e) {
      // URL parsing failed, continue using original URL
    }
    
    // Basic keyword matching
    if (/privacy|policy|privacy-policy|隐私|政策|隐私政策|条款|terms|personal|data|个人信息|个人资料|プライバシー|datenschutz|privacidad|cookie|gdpr|ccpa/i.test(baseUrl)) {
      return true;
    }
    
  // Check common privacy policy URL patterns for major companies
  const knownPatterns = [
    /microsoft\.com.*privacy/i,
    /go\.microsoft\.com\/fwlink\/\?LinkId=521839/i,
    /go\.microsoft\.com\/fwlink.*privacy/i,
    /google\.com.*privacy/i,
    /facebook\.com.*privacy/i,
    /meta\.com.*privacy/i,
    /apple\.com.*privacy/i,
    /amazon\.com.*privacy/i,
    /twitter\.com.*privacy/i,
    /x\.com.*privacy/i,
    /alibaba\.com.*rule/i,
    /rulechannel\.alibaba\.com/i,
    /about\/privacy/i,
    /legal\/privacy/i,
    /privacy-center/i,
    /privacystatement/i,
    /privacypolicy/i,
    /privacy-policy/i,
    /privacy_policy/i,
    /dpa|dataprocessingagreement/i,
    /tiktok\.com.*privacy/i,
    /youtube\.com.*privacy/i,
    /netflix\.com.*privacy/i,
    /instagram\.com.*privacy/i,
    /linkedin\.com.*privacy/i,
    /baidu\.com.*privacy/i,
    /tencent\.com.*privacy/i,
    /qq\.com.*privacy/i,
    /weixin\.com.*privacy/i,
    /jbhifi\.com.*privacy/i,
    /support\.jbhifi\.com\.au\/hc\/.*\/articles\/.*Privacy-policy/i,
    /support\.jbhifi\.com\.au\/hc\/.*\/articles\/360052938974/i,
    /360052938974.*Privacy/i
    ];
    
    // Match base URL
    for (const pattern of knownPatterns) {
      if (pattern.test(baseUrl)) {
        return true;
      }
    }
    
    // Also match complete URL (including query parameters) in case base URL match fails
    for (const pattern of knownPatterns) {
      if (pattern.test(url)) {
        return true;
      }
    }
    
    // Special handling: JB HiFi additional privacy policy check
    const jbHifiPatterns = [
      'jbhifi.com', 
      'support.jbhifi.com.au',
      'Privacy-policy',
      '360052938974'
    ];
    
    // Consider it a privacy policy if URL contains multiple JB HiFi related patterns
    let jbHifiMatchCount = 0;
    for (const pattern of jbHifiPatterns) {
      if (url.includes(pattern)) {
        jbHifiMatchCount++;
      }
    }
    
    if (jbHifiMatchCount >= 2) {
      return true;
    }
    
    // Check if it's a Microsoft fwlink redirector (special case)
    if (/go\.microsoft\.com\/fwlink/i.test(url)) {
      console.log("Detected Microsoft fwlink redirector URL");
      return true;
    }
    
    // Check if it's a generic redirection link
    if (/redirect|goto|jumpto|r\.php|r\?|to=|link=|url=|rurl=|u=|ref=/i.test(url)) {
      // Too many redirection links, allowing for now, may adjust as needed later
      return true;
    }
    
    return false;
  };
  
  if (isPrivacyPolicyURL(url)) {
    // Create a timeout promise that rejects after 60 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out after 120 seconds")), 120000);
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
        const apiUrl = `http://localhost:5000/api/scheduling`;
        console.log("Making API request to:", apiUrl);
        
        // Set up API request heartbeat to keep service worker active during long requests
        const apiRequestHeartbeat = setInterval(recordHeartbeat, 5000);
        
        // Check if the request has been cancelled
        return new Promise((resolve, reject) => {
          chrome.storage.local.get(['currentSummaryRequest'], (data) => {
            // If request status is marked as cancelled, abort the request
            if (data.currentSummaryRequest && data.currentSummaryRequest.isCancelled) {
              console.log("Request was cancelled by user, aborting API call");
              clearInterval(apiRequestHeartbeat); // Clear API request heartbeat
              reject(new Error("Request cancelled by user"));
              return;
            }
            
            // Otherwise, continue with the request
            fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text: pageText, url: url })
            }).then(response => {
              if (!response.ok) {
                clearInterval(apiRequestHeartbeat);
                throw new Error(`API response error: ${response.status}`);
              }
              console.log("Received successful API response");
              clearInterval(apiRequestHeartbeat);
              return response.json();
            }).then(resolve).catch(err => {
              clearInterval(apiRequestHeartbeat);
              reject(err);
            });
          });
        });
      })
      .then(data => {
        // Check if the request has been cancelled again
        return new Promise((resolve, reject) => {
          chrome.storage.local.get(['currentSummaryRequest'], (requestData) => {
            if (requestData.currentSummaryRequest && requestData.currentSummaryRequest.isCancelled) {
              console.log("Request was cancelled after API response, ignoring results");
              reject(new Error("Request cancelled by user"));
              return;
            }
            
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
                  summary: data.summary,
                  policy_id: data.policy_id
                });
                console.log("Summary sent to content script successfully");
                
                // Record successful operation
                recordHeartbeat();
              } catch (e) {
                throw new Error("Invalid summary format: " + e.message);
              }
            }
            resolve();
          });
        });
      })
      .catch(err => {
        if (err.message === "Request cancelled by user") {
          console.log("Request cancelled by user, not showing error message");
          return;
        }
        
        console.error("Error in processing:", err);
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "showSummary",
          error: "Error: " + err.message
        });
      });
    
    // Race the fetch promise against the timeout promise
    Promise.race([fetchPromise, timeoutPromise]).catch(err => {
      if (err.message === "Request cancelled by user") {
        console.log("Request cancelled by user, not showing error message");
        return;
      }
      
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
}

// Create a more robust service worker monitoring system
function setupServiceWorkerMonitoring() {
  // Store initial startup time
  const startupTime = Date.now();
  chrome.storage.local.set({ 
    serviceWorkerStartupTime: startupTime,
    serviceWorkerHeartbeats: [] 
  });
  
  // Increased frequency of heartbeat and health checks
  setInterval(recordHeartbeat, 15000);
  setInterval(checkServiceWorkerHealth, 30000);
  setInterval(verifyServiceWorkerActivity, 2 * 60000);
  
  console.log("Service worker monitoring system initialized");
}

// Record heartbeat to track service worker activity
function recordHeartbeat() {
  chrome.storage.local.get(['serviceWorkerHeartbeats'], function(data) {
    const heartbeats = data.serviceWorkerHeartbeats || [];
    const now = Date.now();
    
    // Keep the last 60 heartbeats (15 seconds each, 15 minutes of history)
    while (heartbeats.length > 60) {
      heartbeats.shift();
    }
    
    heartbeats.push(now);
    
    chrome.storage.local.set({ 
      serviceWorkerHeartbeats: heartbeats,
      serviceWorkerLastActive: now
    });
  });
}

// Simple health check for Service Worker
function checkServiceWorkerHealth() {
  console.log("Service Worker health check executed");
  
  // Check registration status
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    console.log("Service worker controller active");
  }
  
  // Attempt to keep service worker alive with a meaningful operation
  chrome.runtime.getPlatformInfo(function(info) {
    console.log("Service worker active, platform: " + info.os);
  });
  
  // Also check storage to ensure data persistence
  chrome.storage.local.get(['isEnabled'], function(data) {
    if (data.isEnabled !== undefined) {
      console.log("Storage access successful, extension state: " + (data.isEnabled ? "enabled" : "disabled"));
    } else {
      console.warn("Storage access issue - extension state missing");
      chrome.storage.local.set({ isEnabled: true });
    }
  });
}

// Deeper verification of service worker activity 
function verifyServiceWorkerActivity() {
  chrome.storage.local.get(['serviceWorkerLastActive', 'serviceWorkerStartupTime'], function(data) {
    const now = Date.now();
    const lastActive = data.serviceWorkerLastActive || 0;
    const startupTime = data.serviceWorkerStartupTime || now;
    const inactiveTime = now - lastActive;
    
    console.log(`Service worker last active ${inactiveTime/1000} seconds ago`);
    
    // If service worker has been inactive for more than 5 minutes (more sensitive than previous 10 minutes)
    // and the extension has been running for at least 10 minutes (shorter than previous 15 minutes)
    if (inactiveTime > 5 * 60 * 1000 && (now - startupTime) > 10 * 60 * 1000) {
      console.warn("Service worker may be inactive, attempting recovery");
      attemptServiceWorkerRecovery();
    }
    
    // Proactively record heartbeat to ensure service worker stays active during verification
    recordHeartbeat();
  });
}

// Try to recover service worker if it becomes inactive
function attemptServiceWorkerRecovery() {
  console.log("Attempting to recover service worker...");
  
  // Force meaningful operations to keep service worker active
  chrome.runtime.getPlatformInfo(function(info) {
    console.log("Forced operation: getting platform info " + info.os);
  });
  
  // Update storage to trigger activity
  chrome.storage.local.set({ 
    serviceWorkerRecoveryAttempt: Date.now(),
    serviceWorkerForceRefresh: true
  });
  
  // Send a wake-up ping to ensure service worker is active
  chrome.runtime.sendMessage({ action: "serviceWorkerWakeUp" }, function(response) {
    if (response) {
      console.log("Service worker responded to wake-up ping");
      recordHeartbeat();
    } else {
      console.error("Service worker recovery failed, attempting last resort measures");
      
      // Force storage update to trigger activity
      chrome.storage.local.set({ 
        serviceWorkerRecoveryAttempt: Date.now(),
        serviceWorkerFatalRecovery: true
      }, function() {
        // Check if this operation succeeded
        chrome.storage.local.get(['serviceWorkerRecoveryAttempt'], function(data) {
          if (data.serviceWorkerRecoveryAttempt) {
            console.log("Storage write successful, service worker may be recovering");
            // Force a heartbeat
            recordHeartbeat();
          } else {
            console.error("Storage write failed, service worker may need manual restart");
            // Notify user of service worker failure
            notifyServiceWorkerFailure();
          }
        });
      });
    }
  });
}

// Notify user when service worker completely fails
function notifyServiceWorkerFailure() {
  // Show notification to user about extension issues
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "showSummary",
        error: "Extension service is having issues. Please try closing and reopening the extension."
      });
    }
  });
}

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

// No longer using action.onClicked since we now use popup.html
// Instead, listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateIcon") {
    updateIcon(message.isEnabled);
    
    // Record interaction to show service worker is active
    recordHeartbeat();
  }
});

// Handle wake-up pings for service worker recovery
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "serviceWorkerWakeUp") {
    // Just respond to confirm service worker is active
    sendResponse({ status: "active", timestamp: Date.now() });
    return true;
  }
  
  if (message.action === "summarizePolicy") {
    // Record activity to show service worker is handling requests
    recordHeartbeat();
    
    // Check if the extension is enabled
    chrome.storage.local.get(['isEnabled'], (result) => {
      if (!result.isEnabled) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "showSummary",
          error: "The extension is currently disabled"
        });
        return;
      }
      
      // Send loading state back to content script
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "showSummary",
        isLoading: true
      });
      
      // Use the same logic as context menu trigger
      handleSummarizePolicyMessage(message, sender);
    });
  } else if (message.action === "cancelSummary") {
    // Received cancellation request
    console.log("Received cancellation request from user");
    
    // Set cancellation flag
    chrome.storage.local.get(['currentSummaryRequest'], (data) => {
      if (data.currentSummaryRequest) {
        // Mark request as cancelled
        chrome.storage.local.set({
          currentSummaryRequest: {
            ...data.currentSummaryRequest,
            isCancelled: true
          }
        });
        
        // If the backend API supports cancelling requests, call it here
        try {
          const apiUrl = `http://localhost:5000/api/cancel`;
          fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              tabId: data.currentSummaryRequest.tabId,
              timestamp: data.currentSummaryRequest.timestamp
            })
          }).then(response => {
            if (response.ok) {
              console.log("Successfully sent cancellation request to API");
            } else {
              console.log("API cancellation request failed with status:", response.status);
            }
          }).catch(err => {
            console.error("Error sending cancellation request to API:", err);
          });
        } catch (error) {
          console.error("Failed to send cancellation request to API:", error);
        }
      }
    });
  } else if (message.action === "openOriginalText") {
    // Record activity to show service worker is active
    recordHeartbeat();
    
    // Open URL in new tab
    chrome.tabs.create({ url: message.url }, (tab) => {
      // Execute content script after page loads
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          function findAndHighlightText(searchText) {
            if (!searchText || searchText.trim() === '') {
              console.warn("Empty search text");
              showErrorNotification("Cannot find original text - Empty search");
              addReturnButton(null);
              return false;
            }
            
            // Special handling for Microsoft privacy page
            const isMicrosoftPrivacyPage = window.location.href.includes('microsoft.com') && 
                                          window.location.href.includes('privacy');
            
            if (isMicrosoftPrivacyPage) {
              console.log("Detected Microsoft privacy page, using specialized search method");
              return findTextInMicrosoftPrivacyPage(searchText);
            }
            
            // Clean and preprocess search text
            const cleanSearchText = preprocessText(searchText);
            console.log("Processing search text:", cleanSearchText.substring(0, 50) + "...");
            
            if (cleanSearchText.length < 5) {
              console.warn("Search text too short, might cause incorrect matches");
            }
            
            // Multi-strategy search with priority order
            let found = false;
            
            // 1. Exact match - highest priority
            console.log("Attempting exact match strategy...");
            found = tryExactMatch(searchText);
            if (found) {
              console.log("Exact match successful!");
              return true;
            }
            
            // 2. Check for hidden content that might contain our text
            console.log("Checking for hidden content...");
            found = checkAndExpandHiddenContent(searchText);
            if (found) {
              console.log("Found text in previously hidden content!");
              return true;
            }

            // 3. Normalized text match
            console.log("Attempting normalized match strategy...");
            found = tryNormalizedMatch(cleanSearchText);
            if (found) {
              console.log("Normalized match successful!");
              return true;
            }
            
            // 4. Multi-paragraph match for longer content
            console.log("Attempting multi-paragraph match strategy...");
            found = tryMultiParagraphMatch(searchText);
            if (found) {
              console.log("Multi-paragraph match successful!");
              return true;
            }
            
            // 5. Segment match - for text spanning multiple DOM nodes
            console.log("Attempting segment match strategy...");
            found = trySegmentMatch(cleanSearchText);
            if (found) {
              console.log("Segment match successful!");
              return true;
            }
            
            // 6. Keyword bubble match - highlight keywords and surrounding sentence
            console.log("Attempting keyword bubble match strategy...");
            found = tryKeywordBubbleMatch(searchText);
            if (found) {
              console.log("Keyword bubble match successful!");
              return true;
            }
            
            // 7. Fuzzy match - as a last resort
            console.log("Attempting fuzzy match as last resort...");
            found = tryFuzzyMatch(cleanSearchText);
            if (found) {
              console.log("Fuzzy match successful!");
              return true;
            }
            
            // If all attempts fail, show error and add return button
            console.log("All matching attempts failed");
            showErrorNotification("Cannot find original text");
            addReturnButton(null);
            return false;
          }
          
          // Text preprocessing - clean and normalize input text with improved handling
          function preprocessText(text) {
            if (!text) return '';
            
            // Store original length for logging
            const originalLength = text.length;
            
            // Perform basic cleaning with better unicode support
            let cleaned = text
              .trim()                                // Remove leading/trailing spaces
              .replace(/\s+/g, ' ')                  // Convert multiple spaces to single space
              .replace(/[\r\n\t]+/g, ' ')            // Replace newlines and tabs with spaces
              .replace(/\s+/g, ' ')                  // Normalize spaces again
              .trim();
            
            console.log(`Preprocessed text from ${originalLength} to ${cleaned.length} characters`);
            
            // If text becomes too short after preprocessing, return a less aggressive version
            if (cleaned.length < originalLength * 0.5 && originalLength > 20) {
              console.log("Preprocessing removed too much content, using less aggressive cleaning");
              // Less aggressive cleaning - preserve more of the original text
              cleaned = text
                .trim()
                .replace(/\s+/g, ' ');
            }
            
            return cleaned;
          }
          
          // Enhanced exact matching method with better support for special characters
          function tryExactMatch(searchText) {
            console.log("Trying exact match with text:", searchText.substring(0, 50) + (searchText.length > 50 ? "..." : ""));
            
            // Try both the original and preprocessed versions
            const searchVariants = [
              searchText,                            // Original text
              preprocessText(searchText),            // Preprocessed text
              searchText.replace(/\s+/g, ' '),       // Simple normalized spaces
              searchText.replace(/[^\w\s\u4e00-\u9fa5]/g, ' ').replace(/\s+/g, ' ') // No punctuation
            ];
            
            // Remove duplicates
            const uniqueVariants = [...new Set(searchVariants)];
            console.log(`Trying ${uniqueVariants.length} search text variants`);
            
            // Create TreeWalker to traverse text nodes with appropriate filtering
            const treeWalker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: function(node) {
                  // Exclude invisible elements
                  const parent = node.parentNode;
                  if (!parent) return NodeFilter.FILTER_REJECT;
                  
                  const tagName = parent.tagName ? parent.tagName.toLowerCase() : '';
                  if (['script', 'style', 'noscript', 'head', 'meta', 'link', 'option'].includes(tagName)) {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  // Check visibility - improved with computed style checks
                  const style = window.getComputedStyle(parent);
                  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || 
                      parent.offsetHeight === 0 || parent.offsetWidth === 0) {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  // Keep text content
                  const nodeText = node.textContent;
                  if (!nodeText || nodeText.trim() === '') {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  // Improved content check that handles multiple search variants
                  for (const variant of uniqueVariants) {
                    if (variant.length > 10 && nodeText.includes(variant)) {
                      return NodeFilter.FILTER_ACCEPT;
                    }
                  }
                  
                  return NodeFilter.FILTER_SKIP;
                }
              }
            );

            let currentNode;
            
            // Store successful matches for logging
            let matchedVariant = '';
            
            // First pass: attempt to find exact matches
            while ((currentNode = treeWalker.nextNode())) {
              // Try each search variant
              for (const variant of uniqueVariants) {
                // Skip variants that are too short
                if (variant.length < 10) continue;
                
                const index = currentNode.textContent.indexOf(variant);
                if (index >= 0) {
                  console.log(`Exact match success with variant (length ${variant.length})!`);
                  matchedVariant = variant;
                  
                  // Highlight the match
                  if (highlightNode(currentNode, index, variant.length)) {
                    return true;
                  }
                }
              }
            }
            
            // Second pass: try finding matches with more flexible context
            if (!matchedVariant) {
              console.log("No exact match found, trying secondary approach");
              
              // Try breaking text into key phrases
              const keyPhrases = breakIntoKeyPhrases(searchText);
              
              if (keyPhrases.length > 0) {
                console.log(`Trying ${keyPhrases.length} key phrases`);
                
                // Reset tree walker
                const phraseTreeWalker = document.createTreeWalker(
                  document.body,
                  NodeFilter.SHOW_TEXT,
                  null
                );
                
                // Try each key phrase
                for (const phrase of keyPhrases) {
                  // Skip phrases that are too short
                  if (phrase.length < 10) continue;
                  
                  while ((currentNode = phraseTreeWalker.nextNode())) {
                    const nodeText = currentNode.textContent;
                    const index = nodeText.indexOf(phrase);
                    
                    if (index >= 0) {
                      console.log(`Found key phrase match: "${phrase.substring(0, 30)}..."`);
                      if (highlightNode(currentNode, index, phrase.length)) {
                        return true;
                      }
                    }
                  }
                  
                  // Reset for next phrase
                  phraseTreeWalker.currentNode = document.body;
                }
              }
            }
            
            return false;
          }
          
          // Helper function to break text into meaningful phrases
          function breakIntoKeyPhrases(text) {
            // Try to get meaningful chunks of text that are likely to be found
            const phrases = [];
            
            // Split on standard sentence boundaries
            const sentenceBoundaries = text.split(/(?<=[.!?])\s+/);
            for (const sentence of sentenceBoundaries) {
              if (sentence.length >= 15) {
                phrases.push(sentence);
              }
            }
            
            // If we don't have good sentences, try clause boundaries
            if (phrases.length === 0 || (phrases.length === 1 && text.length > 100)) {
              const clauseBoundaries = text.split(/(?<=[:;,])\s+/);
              for (const clause of clauseBoundaries) {
                if (clause.length >= 15) {
                  phrases.push(clause);
                }
              }
            }
            
            // If still no good phrases, create overlapping chunks
            if (phrases.length === 0) {
              // Create overlapping chunks of reasonable size
              const chunkSize = Math.min(50, Math.floor(text.length / 2));
              for (let i = 0; i < text.length - chunkSize; i += Math.floor(chunkSize / 2)) {
                phrases.push(text.substring(i, i + chunkSize));
              }
            }
            
            return phrases;
          }
          
          // Normalized text matching
          function tryNormalizedMatch(cleanSearchText) {
            console.log("Trying normalized match");
            const searchTextLower = cleanSearchText.toLowerCase();
            
            const treeWalker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: function(node) {
                  // Skip invisible nodes
                  const parent = node.parentNode;
                  if (!parent) return NodeFilter.FILTER_REJECT;
                  
                  const tagName = parent.tagName ? parent.tagName.toLowerCase() : '';
                  if (['script', 'style', 'noscript', 'head', 'link'].includes(tagName)) {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  // Check node text
                  const nodeText = preprocessText(node.textContent).toLowerCase();
                  return nodeText.includes(searchTextLower) ?
                    NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                }
              }
            );
            
            let found = false;
            let currentNode;
            
            while ((currentNode = treeWalker.nextNode()) && !found) {
              const normalizedNodeText = preprocessText(currentNode.textContent).toLowerCase();
              const index = normalizedNodeText.indexOf(searchTextLower);
              
              if (index >= 0) {
                // When we find a normalized match, we need to rebuild the index in the original text
                const originalText = currentNode.textContent;
                let originalIndex = -1;
                let charCount = -1;
                
                // Traverse the original text, looking for position corresponding to normalized index
                for (let i = 0; i < originalText.length; i++) {
                  if (!isIgnoredChar(originalText[i])) {
                    charCount++;
                  }
                  
                  if (charCount === index) {
                    originalIndex = i;
                    break;
                  }
                }
                
                if (originalIndex >= 0) {
                  console.log("Normalized match success!");
                  // Find target length
                  const targetLength = findOriginalLength(originalText, originalIndex, cleanSearchText.length);
                  found = highlightNode(currentNode, originalIndex, targetLength);
                }
              }
            }
            
            return found;
          }
          
          // Segment match - for text spanning DOM nodes
          function trySegmentMatch(searchText) {
            console.log("Trying segment match");
            // Break search text into segments
            const segments = searchText.split(/\s+/).filter(seg => seg.length > 2);
            if (segments.length <= 1) return false;
            
            // For efficiency, only try the longest 3 segments
            segments.sort((a, b) => b.length - a.length);
            const keySegments = segments.slice(0, Math.min(3, segments.length));
            
            for (const segment of keySegments) {
              // Try to find each segment
              let found = false;
              const treeWalker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                  acceptNode: function(node) {
                    const nodeText = node.textContent.toLowerCase();
                    return nodeText.includes(segment.toLowerCase()) ?
                      NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                  }
                }
              );
              
              let currentNode;
              while ((currentNode = treeWalker.nextNode()) && !found) {
                const nodeText = currentNode.textContent.toLowerCase();
                const index = nodeText.indexOf(segment.toLowerCase());
                
                if (index >= 0) {
                  console.log(`Found segment match: "${segment}"`);
                  // Check the larger context where the segment is located
                  const containerElement = findContainerElement(currentNode);
                  if (containerElement) {
                    // Scroll to the element
                    containerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Highlight the element
                    const originalBackground = containerElement.style.backgroundColor;
                    const originalTransition = containerElement.style.transition;
                    
                    containerElement.style.transition = 'background-color 0.5s ease';
                    containerElement.style.backgroundColor = 'rgba(255, 213, 79, 0.2)';
                    
                    // Highlight the specific matching segment
                    found = highlightNode(currentNode, index, segment.length);
                    
                    return true;
                  }
                }
              }
            }
            return false;
          }
          
          // Fuzzy matching method - as a last resort
          function tryFuzzyMatch(searchText) {
            console.log("Trying fuzzy match");
            
            // Break into words and keep those longer than 2 chars
            const searchWords = searchText.split(/\s+/).filter(word => word.length > 2);
            if (searchWords.length === 0) return false;
            
            // Calculate paragraph scores
            const elements = Array.from(document.querySelectorAll('p, div, section, article, main, span, li, td, th, dd, figcaption'));
            let candidateElements = [];
            
            for (const element of elements) {
              // Skip invisible elements
              const style = window.getComputedStyle(element);
              if (style.display === 'none' || style.visibility === 'hidden' || 
                  style.opacity === '0' || element.offsetHeight === 0) {
                continue;
              }
              
              const text = element.textContent;
              if (!text || text.trim().length < 10) continue;
              
              const normalizedText = preprocessText(text).toLowerCase();
              let score = 0;
              let matchedWords = 0;
              
              // Word match scoring
              for (const word of searchWords) {
                if (normalizedText.includes(word.toLowerCase())) {
                  matchedWords++;
                  score += word.length;
                }
              }
              
              // Check phrase chunk matches
              if (searchText.length > 10) {
                const chunks = chunkString(searchText, 10);
                for (const chunk of chunks) {
                  if (normalizedText.includes(chunk.toLowerCase())) {
                    score += chunk.length * 2;
                  }
                }
              }
              
              // Penalize text length to avoid selecting too long paragraphs
              const lengthPenalty = Math.log(normalizedText.length) / Math.log(10);
              score = score / lengthPenalty;
              
              // Only consider when matching at least two words or one long word
              if ((matchedWords >= 2) || (matchedWords === 1 && score > 8)) {
                candidateElements.push({
                  element: element,
                  score: score,
                  text: text
                });
              }
            }
            
            // Sort and select best match
            if (candidateElements.length > 0) {
              candidateElements.sort((a, b) => b.score - a.score);
              const bestMatch = candidateElements[0];
              
              console.log(`Best fuzzy match, score: ${bestMatch.score}`);
              
              // Highlight best matching paragraph
              bestMatch.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // Add visual effect
              const originalStyle = {
                backgroundColor: bestMatch.element.style.backgroundColor,
                transition: bestMatch.element.style.transition,
                boxShadow: bestMatch.element.style.boxShadow
              };
              
              bestMatch.element.style.transition = 'all 0.5s ease';
              bestMatch.element.style.backgroundColor = 'rgba(255, 213, 79, 0.2)';
              bestMatch.element.style.boxShadow = '0 0 8px rgba(255, 193, 7, 0.5)';
              
              // Then try to find the best matching word in this element to highlight
              const treeWalker = document.createTreeWalker(
                bestMatch.element,
                NodeFilter.SHOW_TEXT,
                null
              );
              
              let bestWordMatch = '';
              let matchNode = null;
              let matchIndex = -1;
              
              // Find the longest matching word
              let currentNode;
              while (currentNode = treeWalker.nextNode()) {
                const nodeText = currentNode.textContent;
                
                for (const word of searchWords) {
                  if (word.length > bestWordMatch.length) {
                    const wordIndex = nodeText.toLowerCase().indexOf(word.toLowerCase());
                    if (wordIndex >= 0) {
                      bestWordMatch = word;
                      matchNode = currentNode;
                      matchIndex = wordIndex;
                    }
                  }
                }
              }
              
              // Highlight the best matching word
              let wordHighlighted = false;
              if (matchNode && matchIndex >= 0) {
                wordHighlighted = highlightNode(matchNode, matchIndex, bestWordMatch.length);
              }
              
              // Add return button even if no specific word is highlighted
              addReturnButton();
              
              return true;
            }
            
            // If all matching attempts fail, add a return button in fixed position and show error
            console.log("All matching methods failed, showing error notification");
            // Show error notification directly
            showErrorNotification();
            // Then add return button
            addReturnButton();
            return false;
          }
          
          // Helper function: Break string into chunks
          function chunkString(str, length) {
            const normalizedStr = preprocessText(str).toLowerCase();
            const chunks = [];
            // Overlapping chunks to increase match probability
            for (let i = 0; i < normalizedStr.length - length + 1; i += Math.max(3, Math.floor(length / 3))) {
              chunks.push(normalizedStr.substring(i, i + length));
            }
            return chunks;
          }
          
          // Helper function: Determine if character should be ignored
          function isIgnoredChar(char) {
            return /[\s\r\n\t,.;:!?()[\]{}""''""]/g.test(char);
          }
          
          // Helper function: Find original length in original text corresponding to normalized text length
          function findOriginalLength(originalText, startIndex, normalizedLength) {
            let charCount = 0;
            let endIndex = startIndex;
            
            while (endIndex < originalText.length && charCount < normalizedLength) {
              if (!isIgnoredChar(originalText[endIndex])) {
                charCount++;
              }
              endIndex++;
            }
            
            return endIndex - startIndex;
          }
          
          // Helper function: Find semantic container element containing the node
          function findContainerElement(node) {
            let current = node.parentNode;
            
            // Look for meaningful container
            while (current && current !== document.body) {
              const tagName = current.tagName.toLowerCase();
              
              // Semantic container elements
              if (['p', 'div', 'section', 'article', 'aside', 'header', 'footer', 
                   'li', 'td', 'th', 'dd', 'blockquote', 'figure', 'figcaption'].includes(tagName)) {
                
                // Ensure content is neither too short nor too long
                const text = current.textContent;
                if (text && text.length >= 20 && text.length <= 5000) {
                  return current;
                }
              }
              
              current = current.parentNode;
            }
            
            // If no ideal container found, return direct parent node
            return node.parentNode;
          }
          
          // Highlight specified node's text and add return button with improved sentence highlighting
          function highlightNode(node, startIndex, length) {
            try {
              // Ensure index is within valid range
              if (startIndex < 0 || startIndex >= node.textContent.length) {
                console.error("Invalid start index:", startIndex, "text length:", node.textContent.length);
                return false;
              }
              
              // Adjust length to ensure it doesn't exceed range
              length = Math.min(length, node.textContent.length - startIndex);
              
              // Get parent element background color
              const parentElement = node.parentElement;
              const computedStyle = window.getComputedStyle(parentElement);
              const backgroundColor = computedStyle.backgroundColor;
              
              // Determine if background is dark or light
              const bgColor = parseColor(backgroundColor);
              const isDarkBackground = calculateLuminance(bgColor) < 0.5;
              
              // Choose appropriate highlight color for keywords
              const keywordColor = isDarkBackground ? 
                'rgba(255, 255, 0, 0.85)' : // for dark backgrounds
                'rgba(255, 152, 0, 0.85)';  // for light backgrounds
              
              // Choose appropriate highlight color for sentence - increase opacity for better visibility
              const sentenceColor = isDarkBackground ? 
                'rgba(246, 246, 43, 0.96)' : // for dark backgrounds
                'rgba(224, 219, 82, 0.45)';  // for light backgrounds
            
              // Try to find the complete sentence containing the matched text
              const fullText = node.textContent;
              const matchedText = fullText.substring(startIndex, startIndex + length);
            
              // Find sentence boundaries
              let sentenceStart = startIndex;
              let sentenceEnd = startIndex + length;
            
              // Find sentence start (looking for sentence boundary before the match)
              for (let i = startIndex - 1; i >= 0; i--) {
                const char = fullText[i];
                // Stop at sentence boundaries or if we've gone too far
                if (char === '.' || char === '!' || char === '?' || char === '\n' || i < startIndex - 300) {
                  sentenceStart = i + 1;
                  break;
                }
              }
            
              // Find sentence end (looking for sentence boundary after the match)
              for (let i = startIndex + length; i < fullText.length; i++) {
                const char = fullText[i];
                // Stop at sentence boundaries or if we've gone too far
                if (char === '.' || char === '!' || char === '?' || char === '\n' || i > startIndex + length + 300) {
                  sentenceEnd = i + 1; // Include the punctuation
                  break;

                }
              }
            
              // Get the full sentence
              const sentenceText = fullText.substring(sentenceStart, sentenceEnd);
            
              // Calculate positions
              const keywordOffsetInSentence = startIndex - sentenceStart;
            
              // Create range for the sentence
              const sentenceRange = document.createRange();
              sentenceRange.setStart(node, sentenceStart);
              sentenceRange.setEnd(node, sentenceEnd);
            
              // Create span for sentence highlight
              const sentenceSpan = document.createElement('span');
              sentenceSpan.className = 'privacy-highlight-sentence';
              sentenceSpan.id = 'privacy-highlight-sentence';
              Object.assign(sentenceSpan.style, {
                backgroundColor: sentenceColor,
                borderRadius: '2px',
                padding: '2px 0',
                color: isDarkBackground ? '#fff' : 'inherit',
                textShadow: isDarkBackground ? '0 1px 1px rgba(0,0,0,0.5)' : 'none',
                display: 'inline',
                boxShadow: isDarkBackground ? 'none' : '0 0 0 1px rgba(0,0,0,0.05)'
              });
            
              // Surround the sentence
              try {
                sentenceRange.surroundContents(sentenceSpan);
                
                // Create range for the keyword inside the sentence span
                const keywordRange = document.createRange();
                const textNode = findTextNodeAtIndex(sentenceSpan, keywordOffsetInSentence);
                
                if (textNode) {
                  // Calculate local offset in the text node
                  const nodeOffset = getTextNodeOffset(sentenceSpan, textNode);
                  const localKeywordOffset = keywordOffsetInSentence - nodeOffset;
                  
                  keywordRange.setStart(textNode, localKeywordOffset);
                  keywordRange.setEnd(textNode, localKeywordOffset + length);
                  
                  // Create span for keyword highlight
                  const keywordSpan = document.createElement('span');
                  keywordSpan.className = 'privacy-highlight';
                  keywordSpan.id = 'privacy-highlight-primary';
                  Object.assign(keywordSpan.style, {
                    backgroundColor: keywordColor,
                    padding: '2px 4px',
                    borderRadius: '3px',
                    color: isDarkBackground ? '#000' : 'inherit',
                    fontWeight: 'bold',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 0 8px rgba(255, 193, 7, 0.3)',
                    display: 'inline-block'
                  });
                  
                  // Surround the keyword
                  try {
                    keywordRange.surroundContents(keywordSpan);
                  } catch (e) {
                    console.error("Failed to highlight keyword:", e);
                    // Fall back to just the sentence highlight
                  }
                }
              } catch (e) {
                console.error("Failed to highlight sentence, falling back to keyword-only highlight:", e);
                
                // Fall back to just highlighting the keyword
                const keywordRange = document.createRange();
                keywordRange.setStart(node, startIndex);
                keywordRange.setEnd(node, startIndex + length);
                
                // Create span for keyword
                const keywordSpan = document.createElement('span');
                keywordSpan.className = 'privacy-highlight';
                keywordSpan.id = 'privacy-highlight-primary';
                Object.assign(keywordSpan.style, {
                  backgroundColor: keywordColor,
                  padding: '2px 4px',
                  borderRadius: '3px',
                  color: isDarkBackground ? '#000' : 'inherit',
                  fontWeight: 'bold',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 0 8px rgba(255, 193, 7, 0.3)',
                  display: 'inline-block'
                });
                
                // Surround the keyword
                try {
                  keywordRange.surroundContents(keywordSpan);
                } catch (e2) {
                  console.error("All highlighting methods failed:", e2);
                  return false;
                }
              }
              
              // Helper function to find text node at specified index
              function findTextNodeAtIndex(element, targetIndex) {
                let currentIndex = 0;
                
                // Find all text nodes
                const textNodes = [];
                const walker = document.createTreeWalker(
                  element,
                  NodeFilter.SHOW_TEXT,
                  null
                );
                
                // Collect text nodes and their lengths
                while (walker.nextNode()) {
                  const node = walker.currentNode;
                  const length = node.textContent.length;
                  
                  if (currentIndex <= targetIndex && targetIndex < currentIndex + length) {
                    return node;
                  }
                  
                  currentIndex += length;
                }
                
                return null;
              }
              
              // Helper function to get offset from parent to specific text node
              function getTextNodeOffset(parent, targetNode) {
                let offset = 0;
                const walker = document.createTreeWalker(
                  parent,
                  NodeFilter.SHOW_TEXT,
                  null
                );
                
                while (walker.nextNode()) {
                  const node = walker.currentNode;
                  if (node === targetNode) {
                    return offset;
                  }
                  offset += node.textContent.length;
                }
                
                return 0;
              }

              // Add animation effect to make highlight more noticeable
              setTimeout(() => {
                const sentenceHighlight = document.getElementById('privacy-highlight-sentence');
                const keywordHighlight = document.getElementById('privacy-highlight-primary');
                
                if (keywordHighlight) {
                  // Set permanent highlight instead of temporary
                  keywordHighlight.style.backgroundColor = isDarkBackground ? 
                    'rgba(255, 255, 0, 0.9)' : 
                    'rgba(255, 152, 0, 0.9)';
                    
                  keywordHighlight.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.2), 0 0 8px rgba(255, 152, 0, 0.5)';
                }
                
                if (sentenceHighlight) {
                  sentenceHighlight.style.backgroundColor = isDarkBackground ? 
                    'rgba(255, 255, 150, 0.5)' : 
                    'rgba(255, 236, 179, 0.7)';
                }
                
                // Enhanced scrolling to the highlighted text with multiple attempts
                ensureScrollToHighlight();
                
              }, 300);
              
              // Add return button
              const targetElement = document.getElementById('privacy-highlight-sentence') || 
                                   document.getElementById('privacy-highlight-primary');
              addReturnButton(targetElement);
              return true;
            } catch (error) {
              console.error("Failed to highlight text:", error);
              return false;
            }
          }
          
          // Improved function to scroll to highlight with minimal jittering
          function ensureScrollToHighlight() {
            // Detect if element is already in view before scrolling
            function isElementInViewport(el) {
              const rect = el.getBoundingClientRect();
              const windowHeight = window.innerHeight || document.documentElement.clientHeight;
              // Consider element in viewport if at least 70% of it is visible
              const visibleThreshold = rect.height * 0.7;
              const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
              return visibleHeight >= visibleThreshold;
            }
            
            // Single smooth scrolling function that checks element visibility first
            const smoothScrollWithCheck = () => {
              const highlightEl = document.getElementById('privacy-highlight-primary') || 
                                document.querySelector('.privacy-highlight');
              
              if (!highlightEl) return false;
              
              // If element is already in good view, don't scroll
              if (isElementInViewport(highlightEl)) {
                console.log("Highlight already in viewport, skipping scroll");
                // Just add subtle animation to draw attention
                highlightEl.animate([
                  { transform: 'scale(1)' },
                  { transform: 'scale(1.02)' },
                  { transform: 'scale(1)' }
                ], {
                  duration: 600,
                  iterations: 1,
                  easing: 'ease-in-out'
                });
                return true;
              }
              
              console.log("Scrolling to highlight element");
              
              // Try to focus the element (helps browsers understand importance)
              try {
                highlightEl.setAttribute('tabindex', '-1');
                highlightEl.focus({preventScroll: true});
              } catch (e) {}
              
              // Calculate optimal scroll position with slight adjustments for headers
              const rect = highlightEl.getBoundingClientRect();
              const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
              
              // Check if there might be a fixed header
              const potentialHeaderHeight = 80;
              
              // Calculate position to place element slightly below potential header
              // and not exactly at screen center for better readability
              const targetY = rect.top + currentScrollY - potentialHeaderHeight - 40;
              
              // Use smooth scrolling
              window.scrollTo({
                top: targetY,
                behavior: 'smooth'
              });
              
              // Add subtle visual indication
              setTimeout(() => {
                highlightEl.animate([
                  { transform: 'scale(1)' },
                  { transform: 'scale(1.02)' },
                  { transform: 'scale(1)' }
                ], {
                  duration: 600,
                  iterations: 1,
                  easing: 'ease-in-out'
                });
              }, 800); // Wait for scroll to complete
              
              return true;
            };
            
            // First attempt immediate
            smoothScrollWithCheck();
            
            // If page is still loading or has dynamic content, one retry after a delay
            // This is a safety measure, not multiple competing scrolls
            setTimeout(() => {
              const highlightEl = document.getElementById('privacy-highlight-primary') || 
                               document.querySelector('.privacy-highlight');
              
              if (highlightEl && !isElementInViewport(highlightEl)) {
                console.log("Highlight not in viewport after initial scroll, retrying once");
                smoothScrollWithCheck();
              }
            }, 1000);
          }
          
          // Add return button
          function addReturnButton(highlightElement, errorContainer = null) {
            // Check if return button already exists
            if (document.querySelector('.privacy-return-button')) {
              return document.querySelector('.privacy-return-button');
            }
            
            const returnBtn = document.createElement('button');
            returnBtn.className = 'privacy-return-button';
            
            // If errorContainer is provided, add button to error notification container
            if (errorContainer) {
              returnBtn.innerText = 'Back to Summary';
              Object.assign(returnBtn.style, {
                padding: '8px 16px',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: '0',
                transition: 'all 0.3s ease',
                margin: '5px 0'
              });
              
              // Add hover effects
              returnBtn.addEventListener('mouseover', function() {
                this.style.opacity = '1';
                this.style.transform = 'scale(1.05)';
                this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                this.style.backgroundColor = '#1565c0';
              });
              
              returnBtn.addEventListener('mouseout', function() {
                this.style.opacity = '1';
                this.style.transform = 'scale(1)';
                this.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                this.style.backgroundColor = '#1976d2';
              });
              
              // Add to error container
              errorContainer.appendChild(returnBtn);
              
              // Show button with animation
              setTimeout(() => {
                returnBtn.style.opacity = '1';
              }, 600);
            }
            // If a highlight element is provided, position next to it
            else if (highlightElement) {
              // Create a compact button for highlighted text
              returnBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              `;
              
              // Create tooltip for button
              const tooltip = document.createElement('span');
              tooltip.innerText = 'Back to Summary';
              Object.assign(tooltip.style, {
                position: 'absolute',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                opacity: '0',
                transition: 'opacity 0.2s',
                pointerEvents: 'none',
                zIndex: '100001'
              });
              returnBtn.appendChild(tooltip);
              
              // Show tooltip on hover
              returnBtn.addEventListener('mouseover', () => {
                tooltip.style.opacity = '1';
              });
              
              returnBtn.addEventListener('mouseout', () => {
                tooltip.style.opacity = '0';
              });
              
              // Position button relative to the highlighted element
              const highlightRect = highlightElement.getBoundingClientRect();
              const scrollY = window.scrollY || window.pageYOffset;
              
              Object.assign(returnBtn.style, {
                position: 'absolute',
                top: `${highlightRect.top + scrollY - 12}px`,
                left: `${highlightRect.right + 8}px`,
                zIndex: 100000,
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                padding: '0',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: '0.9',
                transition: 'all 0.2s ease',
                transform: 'scale(0.9)'
              });
              
              // Add fade-in animation
              returnBtn.animate(
                [
                  { opacity: 0, transform: 'scale(0.7)' },
                  { opacity: 0.9, transform: 'scale(0.9)' }
                ],
                {
                  duration: 300,
                  easing: 'ease-out',
                  fill: 'forwards'
                }
              );
              
              // Enhanced hover effect
              returnBtn.addEventListener('mouseover', function() {
                this.style.opacity = '1';
                this.style.transform = 'scale(1.15)';
                this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                this.style.backgroundColor = '#1565c0';
              });
              
              returnBtn.addEventListener('mouseout', function() {
                this.style.opacity = '0.9';
                this.style.transform = 'scale(0.9)';
                this.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                this.style.backgroundColor = '#1976d2';
              });
              
              // Add scroll event to keep button visible when scrolling
              window.addEventListener('scroll', function updateButtonPosition() {
                // If button is removed, remove event listener
                if (!document.body.contains(returnBtn)) {
                  window.removeEventListener('scroll', updateButtonPosition);
                  return;
                }
                
                // Get latest highlight position (it may have moved due to DOM changes)
                const updatedHighlightRect = highlightElement.getBoundingClientRect();
                const currentScrollY = window.scrollY || window.pageYOffset;
                
                // Update button position to stay aligned with highlight
                returnBtn.style.top = `${updatedHighlightRect.top + currentScrollY - 12}px`;
                returnBtn.style.left = `${updatedHighlightRect.right + 8}px`;
              });
              
              document.body.appendChild(returnBtn);
            }
            else {
              // No highlight or error container - fallback to old behavior
              console.warn("Return button created without highlight or error container");
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
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: '1',
                transition: 'all 0.2s ease'
              });
              
              document.body.appendChild(returnBtn);
            }

            // Return to summary page
            returnBtn.onclick = () => {
              chrome.runtime.sendMessage({
                action: "returnToSummary",
                sourceUrl: window.location.href
              });
            };

            return returnBtn;
          }
          
          // Helper function to parse color string into RGB components
          function parseColor(colorStr) {
            // Default to white if color can't be determined
            if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') {
              return { r: 255, g: 255, b: 255 };
            }
            
            // Handle different color formats
            if (colorStr.startsWith('rgb')) {
              // Parse RGB/RGBA format
              const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
              if (match) {
                return {
                  r: parseInt(match[1], 10),
                  g: parseInt(match[2], 10),
                  b: parseInt(match[3], 10)
                };
              }
            } else if (colorStr.startsWith('#')) {
              // Parse Hex format
              let hex = colorStr.substring(1);
              if (hex.length === 3) {
                hex = hex.split('').map(h => h + h).join('');
              }
              return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16)
              };
            }
            
            // Default to white for unknown formats
            return { r: 255, g: 255, b: 255 };
          }
          
          // Calculate luminance to determine if background is light or dark
          function calculateLuminance(color) {
            // Convert RGB to relative luminance
            const r = color.r / 255;
            const g = color.g / 255;
            const b = color.b / 255;
            
            // Calculate luminance using the formula from WCAG 2.0
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          }

          // Fix issues in initializeHighlight function, ensure notifications disappear and show error messages
          function initializeHighlight() {
            let preloadNotice = null;
            let searchTimeout = null;
            let observer = null;
            
            chrome.storage.local.get(['originalTextHighlight'], (result) => {
              if (result.originalTextHighlight) {
                const searchText = result.originalTextHighlight.text;
                const startTime = Date.now();
                
                console.log("Preparing to highlight text:", searchText ? searchText.substring(0, 30) + "..." : "No text");
                
                // Ensure there is at least some text content to search
                if (!searchText || searchText.trim().length < 5) {
                  showErrorNotification("Cannot find original text - text too short");
                  addReturnButton(null);
                  return;
                }
                
                // Preload notice - let the user know the system is processing
                preloadNotice = document.createElement('div');
                preloadNotice.className = 'privacy-preload-notice';
                preloadNotice.textContent = 'Locating original content...';
                Object.assign(preloadNotice.style, {
                  position: 'fixed',
                  top: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#1976d2',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
                  zIndex: 100000,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  opacity: '0',
                  transition: 'opacity 0.3s ease'
                });
                document.body.appendChild(preloadNotice);
                
                // Show notification after a delay to avoid flashing
                setTimeout(() => {
                  if (preloadNotice && preloadNotice.parentNode) {
                    preloadNotice.style.opacity = '1';
                  }
                }, 300);
                
                // Define cleanup function to ensure all resources are released correctly
                const cleanupResources = () => {
                  // Clean up timers
                  if (searchTimeout) {
                    clearTimeout(searchTimeout);
                    searchTimeout = null;
                  }
                  
                  // Stop observer
                  if (observer) {
                    observer.disconnect();
                    observer = null;
                  }
                  
                  // Remove loading notice
                  if (preloadNotice && preloadNotice.parentNode) {
                    preloadNotice.style.opacity = '0';
                    setTimeout(() => {
                      if (preloadNotice && preloadNotice.parentNode) {
                        preloadNotice.parentNode.removeChild(preloadNotice);
                        preloadNotice = null;
                      }
                    }, 300);
                  }
                };
                
                // Execute search and highlight
                const executeSearch = () => {
                  console.log("Starting search execution");
                  
                  // Try to find and highlight text
                  const found = findAndHighlightText(searchText);
                  if (found) {
                    console.log("Found text immediately");
                    cleanupResources();
                    return true;
                  }
                  
                  console.log("First search failed, setting up observer");
                  
                  // Set up MutationObserver to observe DOM changes
                  observer = new MutationObserver((mutations, obs) => {
                    // Check if text can be found after DOM changes
                    if (findAndHighlightText(searchText)) {
                      console.log("Found text after DOM change");
                      cleanupResources();
                    }
                  });
                  
                  // Observe DOM changes more broadly
                  observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                    attributes: true // Also observe attribute changes, which may affect element visibility
                  });
                  
                  // Set search timeout
                  const maxSearchTime = 12000; // 12 seconds
                  searchTimeout = setTimeout(() => {
                    const searchDuration = Date.now() - startTime;
                    console.log(`Search timed out after ${searchDuration}ms`);
                    
                    // Check if highlight element exists
                    const highlightExists = document.querySelectorAll('.privacy-highlight').length > 0;
                    
                    if (!highlightExists) {
                      console.log("No highlights found after timeout");
                      
                      // Show timeout notification
                      if (preloadNotice && preloadNotice.parentNode) {
                        preloadNotice.textContent = 'Cannot find original text';
                        preloadNotice.style.backgroundColor = '#d32f2f';
                        
                        // Ensure notification is shown before removing
                        setTimeout(() => {
                          cleanupResources();
                          
                          // Show error notification and add return button
                          const errorContainer = showErrorNotification("Cannot find original text - search timed out");
                          addReturnButton(null, errorContainer);
                          
                          // Attempt final relaxed search - with the most lenient conditions
                          console.log("Attempting final relaxed search");
                          findAndHighlightText(searchText);
                        }, 1000);
                      } else {
                        cleanupResources();
                        const errorContainer = showErrorNotification("Cannot find original text - search timed out");
                        addReturnButton(null, errorContainer);
                      }
                    } else {
                      // Found highlight, just clean up resources
                      cleanupResources();
                    }
                  }, maxSearchTime);
                  
                  return false;
                };
                
                // Ensure DOM is ready before executing
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  // Give page some time to complete async loading
                  setTimeout(executeSearch, 500);
                } else {
                  // Wait for load to complete
                  window.addEventListener('DOMContentLoaded', () => setTimeout(executeSearch, 500));
                  // Alternative timeout, in case DOMContentLoaded event doesn't trigger
                  setTimeout(() => {
                    if (!document.querySelector('.privacy-highlight')) {
                      executeSearch();
                    }
                  }, 3000);
                }
                
                // Ensure the return button is still visible after page load timeout
                setTimeout(() => {
                  if (!document.querySelector('.privacy-highlight') && 
                      !document.querySelector('.privacy-return-button')) {
                    console.log("No highlight found after 10 seconds, showing error and return button");
                    cleanupResources();
                    const errorContainer = showErrorNotification("Cannot find original text - page may have incompatible structure");
                    addReturnButton(null, errorContainer);
                  }
                }, 10000);
              }
            });
          }

          // Wait for page load
          if (document.readyState === 'complete') {
            initializeHighlight();
          } else {
            window.addEventListener('load', initializeHighlight);
          }

          // Add error notification function for when original text is not found
          function showErrorNotification(errorMessage) {
            // Check if error notification already exists
            if (document.querySelector('.privacy-error-notification')) {
              return document.querySelector('.privacy-error-notification');
            }
            
            // Create error notification container
            const errorContainer = document.createElement('div');
            errorContainer.className = 'privacy-error-notification-container';
            Object.assign(errorContainer.style, {
              position: 'fixed',
              top: '70px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 'auto',
              maxWidth: '90%'
            });
            
            // Create error notification element
            const errorNotification = document.createElement('div');
            errorNotification.className = 'privacy-error-notification';
            errorNotification.textContent = errorMessage || 'Cannot find original text';
            
            // Style the notification
            Object.assign(errorNotification.style, {
              backgroundColor: '#d32f2f',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '4px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: '0',
              transition: 'opacity 0.3s ease',
              textAlign: 'center',
              marginBottom: '10px'
            });
            
            // Add to container
            errorContainer.appendChild(errorNotification);
            
            // Add to the document
            document.body.appendChild(errorContainer);
            
            // Create blinking animation with keyframes
            const styleElement = document.createElement('style');
            styleElement.textContent = `
              @keyframes blink-error {
                0%, 100% { opacity: 1; background-color: #d32f2f; }
                50% { opacity: 0.8; background-color: #f44336; }
              }
            `;
            document.head.appendChild(styleElement);
            
            // Show notification with animation
            setTimeout(() => {
              errorNotification.style.opacity = '1';
              errorNotification.style.animation = 'blink-error 1s ease-in-out 3';
            }, 300);
            
            return errorContainer;
          }
        }
      });
    });
  } else if (message.action === "getCurrentTabId") {
    // Record activity to show service worker is active
    recordHeartbeat();
    
    // Return the current tab ID
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        sendResponse({ tabId: tabs[0].id });
      }
    });
    return true; // Keep the message channel open for asynchronous response
  } else if (message.action === "returnToSummary") {
    // Record activity to show service worker is active
    recordHeartbeat();
    
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

// Additional safety check to periodically verify service worker is running
setInterval(() => {
  // Verify storage is accessible
  chrome.storage.local.get(['serviceWorkerStartupTime'], data => {
    if (data.serviceWorkerStartupTime) {
      const uptime = (Date.now() - data.serviceWorkerStartupTime) / (1000 * 60 * 60);
      console.log(`Service worker uptime: ${uptime.toFixed(2)} hours`);
    } else {
      console.warn("Service worker may have restarted, startup time not found");
      // Reinitialize if needed
      setupServiceWorkerMonitoring();
    }
  });
}, 30 * 60000); // Every 30 minutes

// Function to check for hidden content that might contain our target text
function checkAndExpandHiddenContent(searchText) {
  console.log("Checking for hidden/collapsed content...");

  // Common selectors for expandable/collapsible content - expanded to cover more patterns
  const expandableSelectors = [
    // Common privacy policy expandable elements
    '.accordion', '.expandable', '.collapsible', '.toggle', '.disclosure', '.dropdown',
    // Common disclosure triangles and expandable sections
    '[aria-expanded="false"]', '[data-expanded="false"]', '[aria-hidden="true"]',
    '.collapsed', '.hidden', '.closed', '.folded',
    // Hidden content with specific CSS properties
    '[style*="display: none"]', '[style*="visibility: hidden"]', '[style*="height: 0"]', 
    '[style*="max-height: 0"]', '[style*="overflow: hidden"]',
    // Common buttons used to expand sections
    'button[aria-controls]', 'button.expand', '.show-more', '.read-more', '.view-more',
    'a[role="button"]', 'a[data-toggle]', 'a.toggle', 'a.expand',
    // Details and summary elements
    'details:not([open])', 'summary', 
    // Common privacy-specific patterns
    '.privacy-section[hidden]', '.policy-section[hidden]', '.tos-section[hidden]',
    '.data-policy-section', '.section:not(.expanded)', '.section.collapsed',
    // Tab patterns
    '[role="tabpanel"][hidden]', '[role="tabpanel"][style*="display: none"]',
    'div[id$="-panel"]:not(.active)', '.tab-pane:not(.active)',
    // jQuery and Bootstrap patterns
    '.collapse:not(.in)', '.collapse:not(.show)'
  ];
  
  // Find all potential expandable elements
  const expandableElements = [];
  expandableSelectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => expandableElements.push(el));
    } catch (e) {
      // Skip invalid selectors
    }
  });
  
  // Also check elements with specific classes that often indicate expandable content
  const potentialExpandableClasses = [
    'collapse', 'accordion', 'dropdown', 'toggle', 'expandable', 
    'hidden', 'folded', 'closed', 'expandable-content'
  ];
  
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    if (el.classList) {
      const classNames = Array.from(el.classList);
      for (const className of classNames) {
        const lowerClass = className.toLowerCase();
        if (potentialExpandableClasses.some(c => lowerClass.includes(c)) && 
            !expandableElements.includes(el)) {
          expandableElements.push(el);
        }
      }
    }
  }
  
  console.log(`Found ${expandableElements.length} potentially expandable elements`);
  
  let foundInHidden = false;
  
  // Custom comparison for improved text search in expanded content
  function containsSearchText(element, searchText) {
    // Try plain text match first
    if (element.textContent.includes(searchText)) {
      return true;
    }
    
    // Try with normalized text
    const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
    if (normalizedSearch !== searchText && element.textContent.includes(normalizedSearch)) {
      return true;
    }
    
    // Try key phrases
    const keyPhrases = breakIntoKeyPhrases(searchText);
    for (const phrase of keyPhrases) {
      if (phrase.length > 10 && element.textContent.includes(phrase)) {
        return true;
      }
    }
    
    return false;
  }
  
  // Enhanced click simulation that works better with various frameworks
  function simulateClick(element) {
    // Try normal click
    try {
      element.click();
    } catch (e) {
      console.log("Standard click failed, trying event simulation", e);
      
      // Try createEvent (for older browsers and frameworks)
      try {
        const evt = document.createEvent('MouseEvents');
        evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        element.dispatchEvent(evt);
      } catch (e2) {
        console.log("Event simulation failed too", e2);
        
        // Try direct event dispatch (modern approach)
        try {
          element.dispatchEvent(new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          }));
        } catch (e3) {
          console.log("All click simulations failed", e3);
        }
      }
    }
  }
  
  // Attempt to expand elements and check for content
  for (const element of expandableElements) {
    // Check if element itself might be searchable but invisible - skip those
    if (containsSearchText(element, searchText) && 
        window.getComputedStyle(element).display === 'none') {
      
      // Save current state before modification
      const originalDisplay = element.style.display;
      const originalVisibility = element.style.visibility;
      const originalHeight = element.style.height;
      const originalMaxHeight = element.style.maxHeight;
      const originalOverflow = element.style.overflow;
      const originalAriaExpanded = element.getAttribute('aria-expanded');
      const originalAriaHidden = element.getAttribute('aria-hidden');
      
      // Try different methods to "expand" the element
      try {
        // Method 1: Enhanced click on the element and potential control elements
        if (element.tagName === 'BUTTON' || element.tagName === 'SUMMARY' || 
            element.getAttribute('role') === 'button' ||
            element.classList.contains('show-more') || element.classList.contains('read-more') ||
            element.getAttribute('data-toggle')) {
          simulateClick(element);
          
          // Also check if this element controls another element
          const controlsId = element.getAttribute('aria-controls') || 
                           element.getAttribute('data-target') || 
                           element.getAttribute('data-bs-target');
          
          if (controlsId) {
            const targetElement = document.getElementById(controlsId.replace(/^#/, ''));
            if (targetElement) {
              // Make target element visible too
              targetElement.style.display = '';
              targetElement.style.visibility = 'visible';
              targetElement.style.maxHeight = 'none';
              targetElement.style.overflow = 'visible';
              
              if (targetElement.hasAttribute('aria-hidden')) {
                targetElement.setAttribute('aria-hidden', 'false');
              }
            }
          }
        }
        
        // Method 2: Set all relevant attributes to make visible
        if (element.hasAttribute('aria-expanded')) {
          element.setAttribute('aria-expanded', 'true');
        }
        
        if (element.hasAttribute('aria-hidden')) {
          element.setAttribute('aria-hidden', 'false');
        }
        
        if (element.hasAttribute('hidden')) {
          element.removeAttribute('hidden');
        }
        
        // Handle common frameworks
        if (element.classList.contains('collapse')) {
          element.classList.add('in'); // Bootstrap 3
          element.classList.add('show'); // Bootstrap 4+
        }
        
        if (element.classList.contains('accordion-item') || 
            element.classList.contains('accordion-content')) {
          element.classList.add('active');
          element.classList.add('open');
        }
        
        // Method 3: Set CSS properties to make content visible
        element.style.display = 'block';  // More forceful than empty string
        element.style.visibility = 'visible';
        element.style.height = 'auto';
        element.style.maxHeight = 'none';
        element.style.overflow = 'visible';
        element.style.opacity = '1';
        
        // If it's a details element, set the open attribute
        if (element.tagName === 'DETAILS') {
          element.setAttribute('open', 'true');
        }
        
        // For tab panels, try to activate
        if (element.getAttribute('role') === 'tabpanel' || 
            element.classList.contains('tab-pane')) {
          element.classList.add('active');
          element.classList.add('show');
          
          // Try to find and click the corresponding tab
          const tabId = element.id;
          if (tabId) {
            const tabSelector = `[aria-controls="${tabId}"], [data-target="#${tabId}"], [href="#${tabId}"]`;
            const tabElement = document.querySelector(tabSelector);
            if (tabElement) {
              simulateClick(tabElement);
            }
          }
        }
        
        // Wait a longer moment for DOM to update
        setTimeout(() => {
          // After expanding, check if our text is now visible using improved detection
          const containsText = containsSearchText(element, searchText);
          
          if (containsText) {
            console.log("Found text in expanded element:", element);
            
            // Try to find the exact text node containing our text using TreeWalker
            const treeWalker = document.createTreeWalker(
              element,
              NodeFilter.SHOW_TEXT,
              { acceptNode: node => node.textContent.includes(searchText) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP }
            );
            
            if (treeWalker.nextNode()) {
              const matchNode = treeWalker.currentNode;
              const index = matchNode.textContent.indexOf(searchText);
              
              // If found, highlight the text
              if (index >= 0 && highlightNode(matchNode, index, searchText.length)) {
                foundInHidden = true;
                
                // Keep the element expanded by not restoring original state
                console.log("Found and highlighted text in previously hidden content");
                
                // Flag the element to make it more obvious it was expanded
                element.dataset.wasExpanded = 'true';
                element.style.boxShadow = '0 0 15px rgba(255, 193, 7, 0.5)';
                
                // Ensure the element and highlight are visible
                setTimeout(() => {
                  // Use our enhanced scrolling function to ensure the highlight is visible
                  ensureScrollToHighlight();
                }, 300);
                
                return true;
              }
            } else {
              // If we couldn't find the exact match but know it's in there,
              // try the flexible phrase approach
              const keyPhrases = breakIntoKeyPhrases(searchText);
              for (const phrase of keyPhrases) {
                if (phrase.length < 15) continue;
                
                const phraseWalker = document.createTreeWalker(
                  element,
                  NodeFilter.SHOW_TEXT,
                  { acceptNode: node => node.textContent.includes(phrase) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP }
                );
                
                if (phraseWalker.nextNode()) {
                  const matchNode = phraseWalker.currentNode;
                  const index = matchNode.textContent.indexOf(phrase);
                  
                  if (index >= 0 && highlightNode(matchNode, index, phrase.length)) {
                    foundInHidden = true;
                    element.dataset.wasExpanded = 'true';
                    element.style.boxShadow = '0 0 15px rgba(255, 193, 7, 0.5)';
                    setTimeout(() => ensureScrollToHighlight(), 300);
                    return true;
                  }
                }
              }
            }
          }
          
          // If text not found in this element, restore original state
          // Skip restoration if another successful match was already found
          if (!foundInHidden) {
            // Only restore if not found elsewhere, to keep relevant content visible
            element.style.display = originalDisplay;
            element.style.visibility = originalVisibility;
            element.style.height = originalHeight;
            element.style.maxHeight = originalMaxHeight;
            element.style.overflow = originalOverflow;
            
            if (originalAriaExpanded !== null) {
              element.setAttribute('aria-expanded', originalAriaExpanded);
            }
            
            if (originalAriaHidden !== null) {
              element.setAttribute('aria-hidden', originalAriaHidden);
            }
            
            if (element.tagName === 'DETAILS' && !element.hasAttribute('open')) {
              element.removeAttribute('open');
            }
            
            // Remove any added classes
            if (element.classList.contains('in') && !originalDisplay.includes('in')) {
              element.classList.remove('in');
            }
            
            if (element.classList.contains('show') && !originalDisplay.includes('show')) {
              element.classList.remove('show');
            }
            
            if (element.classList.contains('active') && !originalDisplay.includes('active')) {
              element.classList.remove('active');
            }
          }
        }, 200); // Increased delay for more DOM update time
        
      } catch (e) {
        console.error("Error when trying to expand element:", e);
      }
    }
  }
  
  return foundInHidden;
}

// Function to handle text spanning multiple paragraphs
function tryMultiParagraphMatch(searchText) {
  console.log("Trying multi-paragraph match");
  
  // If text is too short, skip this method
  if (searchText.length < 100) {
    return false;
  }
  
  // Split search text into sentences or logical chunks
  const searchChunks = searchText
    .split(/(?<=[.!?])\s+/)  // Split on sentence boundaries
    .filter(chunk => chunk.trim().length > 10);  // Only keep substantial chunks
    
  if (searchChunks.length <= 1) {
    return false; // Not a multi-paragraph text
  }
  
  console.log(`Split search text into ${searchChunks.length} chunks`);
  
  // Get all paragraphs in the document
  const paragraphs = document.querySelectorAll('p, div, section, article, li, td, blockquote');
  
  // Group adjacent paragraphs and check for matches
  let currentMatchStart = -1;
  let matchedChunks = 0;
  let bestMatchGroup = null;
  let bestMatchCount = 0;
  
  // For each paragraph, check if it's the start of a matching group
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraphText = paragraphs[i].textContent.trim();
    
    // Skip empty paragraphs
    if (paragraphText.length < 10) continue;
    
    // Check if this paragraph contains the first chunk
    if (paragraphText.includes(searchChunks[0])) {
      // This might be the start of a matching group
      currentMatchStart = i;
      matchedChunks = 1;
      
      // Check subsequent paragraphs for the next chunks
      let j = 1;
      while (j < searchChunks.length && (i + j) < paragraphs.length) {
        const nextParagraphText = paragraphs[i + j].textContent.trim();
        
        // If this paragraph contains the next chunk, increment matched count
        if (nextParagraphText.includes(searchChunks[j])) {
          matchedChunks++;
          j++;
        } else {
          // Check if the chunk might span two paragraphs
          const combinedText = nextParagraphText + " " + 
            (paragraphs[i + j + 1] ? paragraphs[i + j + 1].textContent.trim() : "");
            
          if (combinedText.includes(searchChunks[j])) {
            matchedChunks++;
            j += 2; // Skip two paragraphs
          } else {
            break; // No match found for this chunk
          }
        }
      }
      
      // If we matched more chunks than our previous best, update best match
      if (matchedChunks > bestMatchCount) {
        bestMatchCount = matchedChunks;
        bestMatchGroup = {
          startIndex: currentMatchStart,
          endIndex: currentMatchStart + j - 1,
          matchedChunks: matchedChunks
        };
      }
      
      // If we matched all chunks, we found our match
      if (matchedChunks === searchChunks.length) {
        break;
      }
    }
  }
  
  // Consider it a match if we found at least 50% of the chunks in sequence
  if (bestMatchGroup && bestMatchGroup.matchedChunks >= Math.max(2, Math.floor(searchChunks.length * 0.5))) {
    console.log(`Found ${bestMatchGroup.matchedChunks} of ${searchChunks.length} chunks in sequence`);
    
    // Highlight the first paragraph that contains our first chunk
    const firstMatchParagraph = paragraphs[bestMatchGroup.startIndex];
    const firstChunkIndex = firstMatchParagraph.textContent.indexOf(searchChunks[0]);
    
    // Create a container around all matched paragraphs
    const container = document.createElement('div');
    container.className = 'privacy-highlight-container';
    container.id = 'privacy-highlight-container';
    Object.assign(container.style, {
      backgroundColor: 'rgba(255, 245, 157, 0.2)',
      padding: '10px',
      border: '1px solid rgba(255, 193, 7, 0.3)',
      borderRadius: '4px',
      margin: '10px 0',
      position: 'relative'
    });
    
    // Insert the container before the first paragraph
    firstMatchParagraph.parentNode.insertBefore(container, firstMatchParagraph);
    
    // Move all matched paragraphs into the container
    for (let i = bestMatchGroup.startIndex; i <= bestMatchGroup.endIndex; i++) {
      if (paragraphs[i]) {
        container.appendChild(paragraphs[i]);
      }
    }
    
    // Highlight the first occurrence of first chunk
    if (firstChunkIndex >= 0) {
      // Find the text node containing our chunk
      const treeWalker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        { acceptNode: node => node.textContent.includes(searchChunks[0]) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP }
      );
      
      if (treeWalker.nextNode()) {
        const matchNode = treeWalker.currentNode;
        const index = matchNode.textContent.indexOf(searchChunks[0]);
        highlightNode(matchNode, index, searchChunks[0].length);
      }
    }
    
    // Use the enhanced scrolling function instead of simple scrollIntoView
    ensureScrollToHighlight();
    
    // Add return button near the container
    addReturnButton(container);
    
    return true;
  }
  
  return false;
}

// Function to highlight keywords in bubbles with surrounding sentences
function tryKeywordBubbleMatch(searchText) {
  console.log("Trying keyword bubble match");
  
  // Extract important keywords from search text (words with at least 5 chars)
  const keywords = searchText
    .split(/\s+/)
    .filter(word => word.replace(/[^\w\u4e00-\u9fa5]/g, '').length >= 5)  // Keep words with at least 5 chars (include Chinese)
    .map(word => word.replace(/[^\w\u4e00-\u9fa5]/g, ''))  // Remove punctuation
    .filter(word => !commonWords.includes(word.toLowerCase()));  // Remove common words
  
  // Common words to exclude
  const commonWords = ['about', 'these', 'those', 'their', 'there', 'would', 'should', 'could', 'which', 'where', 'when', 'what', 'information'];
  
  if (keywords.length < 2) {
    console.log("Not enough significant keywords found");
    return false;
  }
  
  console.log("Extracted keywords:", keywords);
  
  // Find paragraphs containing multiple keywords
  const paragraphs = document.querySelectorAll('p, div, section, article, li, td, blockquote');
  const matchingParagraphs = [];
  
  // Score each paragraph based on keyword matches
  for (const paragraph of paragraphs) {
    const text = paragraph.textContent;
    
    // Skip paragraphs that are too short
    if (text.length < 20) continue;
    
    // Check which keywords are present and count them
    const matchedKeywords = [];
    for (const keyword of keywords) {
      // Use word boundary search where possible
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(text)) {
        matchedKeywords.push(keyword);
      }
    }
    
    // If more than 1 keyword matches, add to matching paragraphs
    if (matchedKeywords.length >= 2) {
      matchingParagraphs.push({
        element: paragraph,
        text: text,
        matchedKeywords: matchedKeywords,
        score: matchedKeywords.length / keywords.length
      });
    }
  }
  
  // Sort by score (highest matches first)
  matchingParagraphs.sort((a, b) => b.score - a.score);
  
  // If we have no matches, return false
  if (matchingParagraphs.length === 0) {
    console.log("No paragraphs matched multiple keywords");
    return false;
  }
  
  console.log(`Found ${matchingParagraphs.length} paragraphs with multiple keyword matches`);
  
  // Get the best match (first in sorted array)
  const bestMatch = matchingParagraphs[0];
  console.log(`Best match has score ${bestMatch.score} with ${bestMatch.matchedKeywords.length} keywords`);
  
  // Create a container to highlight the paragraph
  const container = document.createElement('div');
  container.className = 'privacy-highlight-container';
  Object.assign(container.style, {
    backgroundColor: 'rgba(255, 245, 157, 0.2)',
    padding: '15px',
    border: '1px solid rgba(255, 193, 7, 0.3)',
    borderRadius: '4px',
    margin: '10px 0',
    position: 'relative'
  });
  
  // Clone the paragraph to preserve original page structure
  const clonedParagraph = bestMatch.element.cloneNode(true);
  container.appendChild(clonedParagraph);
  
  // Insert the container before the original paragraph
  bestMatch.element.parentNode.insertBefore(container, bestMatch.element);
  
  // Hide the original paragraph
  bestMatch.element.style.display = 'none';
  
  // Function to split text into sentences
  function splitIntoSentences(text) {
    // Match periods, question marks, and exclamation marks followed by spaces
    // while being careful not to split on common abbreviations
    return text.split(/(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|Inc|Ltd|Co|vs|e\.g|i\.e|etc)\.)(?<=[.!?])\s+/);
  }
  
  // Split paragraph into sentences
  const sentences = splitIntoSentences(bestMatch.text);
  
  // Look for keywords in each sentence and highlight the best ones
  let highlightedSentences = 0;
  
  // Track which keywords we've highlighted
  const highlightedKeywords = new Set();
  
  // Create keyword bubbles with position tracking
  const keywordPositions = [];
  
  // Find text nodes in the cloned paragraph
  const textNodes = [];
  const treeWalker = document.createTreeWalker(
    clonedParagraph,
    NodeFilter.SHOW_TEXT,
    { acceptNode: node => node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP }
  );
  
  while (treeWalker.nextNode()) {
    textNodes.push(treeWalker.currentNode);
  }
  
  // Function to get combined text from nodes
  function getCombinedText(nodes) {
    return nodes.map(node => node.textContent).join('');
  }
  
  // Create a mapping of sentence indices in the combined text
  const combinedText = getCombinedText(textNodes);
  const sentenceMap = [];
  let currentIndex = 0;
  
  for (const sentence of sentences) {
    const sentenceIndex = combinedText.indexOf(sentence, currentIndex);
    if (sentenceIndex !== -1) {
      sentenceMap.push({
        text: sentence,
        startIndex: sentenceIndex,
        endIndex: sentenceIndex + sentence.length
      });
      currentIndex = sentenceIndex + sentence.length;
    }
  }
  
  // For each keyword, find its occurrences in the text nodes
  for (const keyword of bestMatch.matchedKeywords) {
    // Skip if we've already highlighted this keyword
    if (highlightedKeywords.has(keyword)) continue;
    
    let currentNodeStartIndex = 0;
    
    // For each text node
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const nodeText = node.textContent;
      const nodeStartIndex = currentNodeStartIndex;
      const nodeEndIndex = nodeStartIndex + nodeText.length;
      
      // Look for keyword in this node
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      let match;
      
      while ((match = keywordRegex.exec(nodeText)) !== null) {
        const keywordIndex = match.index;
        const absoluteKeywordIndex = nodeStartIndex + keywordIndex;
        
        // Find which sentence this keyword belongs to
        const containingSentence = sentenceMap.find(
          s => absoluteKeywordIndex >= s.startIndex && absoluteKeywordIndex < s.endIndex
        );
        
        if (containingSentence) {
          // Record position of this keyword
          keywordPositions.push({
            keyword: keyword,
            node: node,
            nodeIndex: i,
            localIndex: keywordIndex,
            length: keyword.length,
            sentence: containingSentence.text,
            sentenceStartIndex: containingSentence.startIndex,
            sentenceEndIndex: containingSentence.endIndex
          });
          
          // Mark as highlighted
          highlightedKeywords.add(keyword);
        }
      }
      
      currentNodeStartIndex = nodeEndIndex;
    }
  }
  
  // Sort keyword positions by node index and then by local index
  keywordPositions.sort((a, b) => {
    if (a.nodeIndex !== b.nodeIndex) {
      return a.nodeIndex - b.nodeIndex;
    }
    return a.localIndex - b.localIndex;
  });
  
  // Highlight each keyword in a bubble
  for (const pos of keywordPositions) {
    // Create bubble highlight for this keyword
    const range = document.createRange();
    range.setStart(pos.node, pos.localIndex);
    range.setEnd(pos.node, pos.localIndex + pos.length);
    
    const keywordSpan = document.createElement('span');
    keywordSpan.className = 'privacy-highlight-keyword';
    Object.assign(keywordSpan.style, {
      backgroundColor: 'rgba(255, 193, 7, 0.8)',
      padding: '2px 5px',
      borderRadius: '3px',
      color: '#000',
      fontWeight: 'bold',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      display: 'inline-block'
    });
    
    range.surroundContents(keywordSpan);
    highlightedSentences++;
    
    // Also highlight the sentence with lighter background
    const sentenceRange = findSentenceRange(pos.sentence, textNodes);
    if (sentenceRange) {
      // Create a light highlight for the entire sentence
      const sentenceSpan = document.createElement('span');
      sentenceSpan.className = 'privacy-highlight-sentence';
      Object.assign(sentenceSpan.style, {
        backgroundColor: 'rgba(255, 245, 157, 0.3)',
        padding: '1px',
        borderRadius: '2px'
      });
      
      try {
        sentenceRange.surroundContents(sentenceSpan);
      } catch (e) {
        // If surrounding fails (e.g., due to split DOM nodes), just continue
        console.log("Could not highlight full sentence:", e);
      }
    }
  }
  
  // Helper function to find range for a sentence
  function findSentenceRange(sentence, nodes) {
    let currentNodeStartIndex = 0;
    const combinedText = getCombinedText(nodes);
    const sentenceIndex = combinedText.indexOf(sentence);
    
    if (sentenceIndex === -1) return null;
    
    // Find which node contains the start of the sentence
    let startNode = null;
    let startOffset = 0;
    let endNode = null;
    let endOffset = 0;
    
    for (let i = 0; i < nodes.length; i++) {
      const nodeText = nodes[i].textContent;
      const nodeStartIndex = currentNodeStartIndex;
      const nodeEndIndex = nodeStartIndex + nodeText.length;
      
      // Check if sentence starts in this node
      if (sentenceIndex >= nodeStartIndex && sentenceIndex < nodeEndIndex) {
        startNode = nodes[i];
        startOffset = sentenceIndex - nodeStartIndex;
      }
      
      // Check if sentence ends in this node
      const sentenceEndIndex = sentenceIndex + sentence.length;
      if (sentenceEndIndex > nodeStartIndex && sentenceEndIndex <= nodeEndIndex) {
        endNode = nodes[i];
        endOffset = sentenceEndIndex - nodeStartIndex;
      }
      
      // If we found both start and end, create the range
      if (startNode && endNode) {
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        return range;
      }
      
      currentNodeStartIndex = nodeEndIndex;
    }
    
    return null;
  }
  
  // Use the enhanced scrolling function instead of simple scrollIntoView
  ensureScrollToHighlight();
  
  // Add return button near the container
  addReturnButton(container);
  
  return highlightedSentences > 0;
}

// Specialized function to find text in Microsoft's privacy page
function findTextInMicrosoftPrivacyPage(searchText) {
  console.log("Using specialized Microsoft privacy page search method");
  
  // Get text cleaned for easier matching
  const cleanSearchText = searchText.replace(/\s+/g, ' ').trim();
  
  // Microsoft's privacy page often uses sections with headers
  // First try to find containing section by looking at section headers
  const sectionHeaders = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let bestSection = null;
  let maxScore = 0;
  
  // Extract keywords from the search text (words longer than 5 chars)
  const keywords = cleanSearchText
    .split(/\s+/)
    .filter(word => word.replace(/[.,;:!?()[\]{}'"]/g, '').length > 5)
    .map(word => word.replace(/[.,;:!?()[\]{}'"]/g, ''));
  
  console.log("Extracted keywords:", keywords);
  
  // Score each section based on whether it contains our keywords
  for (const header of sectionHeaders) {
    const section = findContainingSection(header);
    if (!section) continue;
    
    const sectionText = section.textContent;
    if (!sectionText) continue;
    
    // Score this section
    let score = 0;
    for (const keyword of keywords) {
      if (sectionText.toLowerCase().includes(keyword.toLowerCase())) {
        score += 2;
      }
    }
    
    // Bonus if section contains a substantial part of search text
    if (sectionText.includes(cleanSearchText.substring(0, Math.min(30, cleanSearchText.length)))) {
      score += 5;
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestSection = section;
    }
  }
  
  // If found a likely section, expand it and highlight
  if (bestSection && maxScore >= 5) {
    console.log("Found likely containing section with score:", maxScore);
    
    // Make sure section is visible (expand if collapsed)
    expandMicrosoftSection(bestSection);
    
    // Highlight the section
    bestSection.style.backgroundColor = 'rgba(255, 245, 157, 0.2)';
    bestSection.style.padding = '10px';
    bestSection.style.border = '1px solid rgba(255, 193, 7, 0.3)';
    bestSection.style.borderRadius = '4px';
    
    // Scroll to the section
    bestSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Look for the specific text in this section
    const treeWalker = document.createTreeWalker(
      bestSection,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentNode;
    while (currentNode = treeWalker.nextNode()) {
      const nodeText = currentNode.textContent;
      
      // First try exact match
      const exactIndex = nodeText.indexOf(cleanSearchText);
      if (exactIndex >= 0) {
        highlightNode(currentNode, exactIndex, cleanSearchText.length);
        addReturnButtonMicrosoft(bestSection);
        return true;
      }
      
      // Then try partial matches with substantial chunks
      for (let i = 0; i < cleanSearchText.length - 20; i += 20) {
        const chunk = cleanSearchText.substring(i, i + 40);
        const chunkIndex = nodeText.indexOf(chunk);
        if (chunkIndex >= 0) {
          highlightNode(currentNode, chunkIndex, chunk.length);
          addReturnButtonMicrosoft(bestSection);
          return true;
        }
      }
    }
    
    // If we couldn't find the exact text but found the section
    // Add the return button to the section
    addReturnButtonMicrosoft(bestSection);
    return true;
  }
  
  // If section-based approach failed, try the paragraph approach
  const paragraphs = document.querySelectorAll('p, div, li');
  let bestParagraph = null;
  maxScore = 0;
  
  for (const paragraph of paragraphs) {
    const text = paragraph.textContent;
    if (!text || text.length < 20) continue;
    
    // Skip non-visible paragraphs
    const style = window.getComputedStyle(paragraph);
    if (style.display === 'none' || style.visibility === 'hidden' || paragraph.offsetHeight === 0) {
      continue;
    }
    
    // Score this paragraph
    let score = 0;
    for (const keyword of keywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    // Bonus for sequence of words appearing in same order
    let keywordSequenceCount = 0;
    let lastIndex = -1;
    
    for (const keyword of keywords) {
      const index = text.toLowerCase().indexOf(keyword.toLowerCase(), lastIndex + 1);
      if (index > lastIndex) {
        keywordSequenceCount++;
        lastIndex = index;
      }
    }
    
    if (keywordSequenceCount >= 3) {
      score += 3;
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestParagraph = paragraph;
    }
  }
  
  if (bestParagraph && maxScore >= 3) {
    console.log("Found likely paragraph with score:", maxScore);
    
    // Highlight the paragraph
    bestParagraph.style.backgroundColor = 'rgba(255, 245, 157, 0.2)';
    bestParagraph.style.padding = '10px';
    bestParagraph.style.border = '1px solid rgba(255, 193, 7, 0.3)';
    bestParagraph.style.borderRadius = '4px';
    
    // Scroll to it
    bestParagraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add return button near the paragraph
    addReturnButtonMicrosoft(bestParagraph);
    return true;
  }
  
  // If all else fails, add a return button in a fixed position
  const fixedReturnBtn = addReturnButtonMicrosoft(null);
  return false;
}

// Helper function to find containing section of a header in Microsoft's privacy page
function findContainingSection(header) {
  // First check if the header is inside a section element
  let current = header.parentElement;
  while (current && current !== document.body) {
    if (current.tagName === 'SECTION' || 
        current.className.includes('section') ||
        current.getAttribute('role') === 'region') {
      return current;
    }
    current = current.parentElement;
  }
  
  // If no containing section found, try to find the content between this header
  // and the next header of same level or higher
  const level = parseInt(header.tagName.substring(1));
  const headerContainer = document.createElement('div');
  headerContainer.className = 'privacy-highlight-container';
  headerContainer.style.position = 'relative';
  headerContainer.appendChild(header.cloneNode(true));
  
  // Get the parent that contains both this header and potentially the next
  const parent = header.parentElement;
  if (!parent) return headerContainer;
  
  // Find all elements between this header and the next one
  let nextElements = [];
  let sibling = header.nextElementSibling;
  
  while (sibling) {
    const tagName = sibling.tagName.toLowerCase();
    if (tagName.startsWith('h') && parseInt(tagName.substring(1)) <= level) {
      break;
    }
    nextElements.push(sibling);
    sibling = sibling.nextElementSibling;
  }
  
  // If we found elements, create a container
  if (nextElements.length > 0) {
    const contentContainer = document.createElement('div');
    contentContainer.className = 'privacy-highlight-content';
    
    // Add all elements to our container
    for (const element of nextElements) {
      contentContainer.appendChild(element.cloneNode(true));
    }
    
    // Create the full section with header + content
    const fullSection = document.createElement('div');
    fullSection.className = 'privacy-highlight-section';
    fullSection.appendChild(header.cloneNode(true));
    fullSection.appendChild(contentContainer);
    
    return fullSection;
  }
  
  return headerContainer;
}

// Function to expand collapsed sections on Microsoft's privacy page
function expandMicrosoftSection(section) {
  // Try to find and click any "expand" buttons in the section
  const expandButtons = section.querySelectorAll('button[aria-expanded="false"], [role="button"][aria-expanded="false"]');
  for (const button of expandButtons) {
    try {
      button.click();
      console.log("Expanded a collapsed section");
    } catch (e) {
      console.error("Failed to expand section:", e);
    }
  }
  
  // Try to make hidden elements visible
  const hiddenElements = section.querySelectorAll('[aria-hidden="true"], [hidden], .collapsed, .hidden');
  for (const element of hiddenElements) {
    try {
      element.removeAttribute('aria-hidden');
      element.removeAttribute('hidden');
      element.classList.remove('collapsed');
      element.classList.remove('hidden');
      element.style.display = '';
      element.style.visibility = 'visible';
    } catch (e) {
      console.error("Failed to show hidden element:", e);
    }
  }
}

// Special return button function for Microsoft pages to ensure correct positioning
function addReturnButtonMicrosoft(highlightElement) {
  // Check if return button already exists
  if (document.querySelector('.privacy-return-button')) {
    return document.querySelector('.privacy-return-button');
  }
  
  const returnBtn = document.createElement('button');
  returnBtn.className = 'privacy-return-button';
  
  // Fixed position for Microsoft pages regardless of highlight
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
    fontSize: '14px',
    fontWeight: 'bold',
    opacity: '1',
    transition: 'all 0.2s ease'
  });
  
  // Add hover effects
  returnBtn.addEventListener('mouseover', function() {
    this.style.backgroundColor = '#1565c0';
    this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
  });
  
  returnBtn.addEventListener('mouseout', function() {
    this.style.backgroundColor = '#1976d2';
    this.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  });
  
  // Return to summary page
  returnBtn.onclick = () => {
    chrome.runtime.sendMessage({
      action: "returnToSummary",
      sourceUrl: window.location.href
    });
  };
  
  document.body.appendChild(returnBtn);
  return returnBtn;
}
