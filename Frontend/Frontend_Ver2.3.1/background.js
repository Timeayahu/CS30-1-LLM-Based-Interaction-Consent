// background.js

const API_CONFIG = {
  BASE_URL: 'https://usyd-cs30-1-llm-based-consent-reader.com'
};

// Initialize the extension state
chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.set({ 
    isEnabled: true,
    serviceWorkerLastActive: Date.now() // Track when service worker was last active
  });
  updateIcon(true);
  console.log("Extension installed and initialized");
  
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

// Create a more robust service worker monitoring system
function setupServiceWorkerMonitoring() {
  // Store initial startup time
  const startupTime = Date.now();
  chrome.storage.local.set({ 
    serviceWorkerStartupTime: startupTime,
    serviceWorkerHeartbeats: [] 
  });
  
  // Increased frequency of heartbeat and health checks
  setInterval(recordHeartbeat, 15000);      // Changed to 15 seconds
  setInterval(checkServiceWorkerHealth, 30000);  // Changed to 30 seconds
  setInterval(verifyServiceWorkerActivity, 2 * 60000);  // Changed to 2 minutes
  
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
    // Just a simple operation to ensure service worker is responsive
    console.log("Service worker active, platform: " + info.os);
  });
  
  // Also check storage to ensure data persistence
  chrome.storage.local.get(['isEnabled'], function(data) {
    if (data.isEnabled !== undefined) {
      console.log("Storage access successful, extension state: " + (data.isEnabled ? "enabled" : "disabled"));
    } else {
      console.warn("Storage access issue - extension state missing");
      // Try to reset the state
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
      recordHeartbeat(); // Record successful ping
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
      
      const url = message.url;
      console.log("Summarizing policy from URL:", url);
      
      // Send loading state back to content script
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "showSummary",
        isLoading: true
      });
      
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
        // Basic keyword matching
        if (/privacy|policy|privacy-policy|隐私|政策|隐私政策|条款|terms|personal|data|个人信息|个人资料|プライバシー|datenschutz|privacidad|cookie|gdpr|ccpa/i.test(url)) {
          return true;
        }
        
        // Check common privacy policy URL patterns for major companies
        const knownPatterns = [
          /microsoft\.com.*privacy/i,
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
          /weixin\.com.*privacy/i
        ];
        
        for (const pattern of knownPatterns) {
          if (pattern.test(url)) {
            return true;
          }
        }
        
        // Check if it's a redirection link
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
            const apiUrl = `${API_CONFIG.BASE_URL}/api/scheduling`;
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
                    clearInterval(apiRequestHeartbeat); // Clear API request heartbeat
                    throw new Error(`API response error: ${response.status}`);
                  }
                  console.log("Received successful API response");
                  clearInterval(apiRequestHeartbeat); // Clear API request heartbeat
                  return response.json();
                }).then(resolve).catch(err => {
                  clearInterval(apiRequestHeartbeat); // Ensure API request heartbeat is cleared in all cases
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
          const apiUrl = `${API_CONFIG.BASE_URL}/api/cancel`;
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
              return false;
            }
            
            // Clean and preprocess search text
            const cleanSearchText = preprocessText(searchText);
            console.log("Processed search text:", cleanSearchText);
            
            if (cleanSearchText.length < 5) {
              console.warn("Search text too short, might cause incorrect matches");
            }
            
            // Multi-strategy search
            let found = false;
            
            // 1. Exact match
            found = tryExactMatch(searchText);
            if (found) return true;
            
            // 2. Normalized text match
            found = tryNormalizedMatch(cleanSearchText);
            if (found) return true;
            
            // 3. Segment match - for text spanning multiple DOM nodes
            found = trySegmentMatch(cleanSearchText);
            if (found) return true;
            
            // 4. Fuzzy match - as a last resort
            found = tryFuzzyMatch(cleanSearchText);
            if (found) return true;
            
            // If all attempts fail, notify user
            console.log("All matching attempts failed");
            // Ensure return button is added even when no highlight is found
            addReturnButton();
            return false;
          }
          
          // Text preprocessing - clean and normalize input text
          function preprocessText(text) {
            if (!text) return '';
            
            return text
              .trim()                              // Remove leading/trailing spaces
              .replace(/\s+/g, ' ')                // Convert multiple spaces to single space
              .replace(/[\r\n\t]+/g, ' ')          // Replace newlines and tabs with spaces
              .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ') // Replace punctuation with spaces, keep Chinese characters
              .replace(/\s+/g, ' ')                // Normalize spaces again
              .trim();
          }
          
          // Exact matching method
          function tryExactMatch(searchText) {
            console.log("Trying exact match");
            // Create TreeWalker to traverse text nodes
            const treeWalker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: function(node) {
                  // Exclude text in invisible elements like script, style
                  const parent = node.parentNode;
                  if (!parent) return NodeFilter.FILTER_REJECT;
                  
                  const tagName = parent.tagName ? parent.tagName.toLowerCase() : '';
                  if (['script', 'style', 'noscript', 'head', 'meta', 'link', 'option'].includes(tagName)) {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  // Check if node is visible
                  const style = window.getComputedStyle(parent);
                  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  // Check text content
                  const nodeText = node.textContent;
                  if (!nodeText || nodeText.trim() === '') {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  // Check if node contains search text
                  return nodeText.includes(searchText) ?
                    NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                }
              }
            );

            let found = false;
            let currentNode;
            
            while ((currentNode = treeWalker.nextNode()) && !found) {
              const index = currentNode.textContent.indexOf(searchText);
              if (index >= 0) {
                console.log("Exact match success!");
                found = highlightNode(currentNode, index, searchText.length);
              }
            }
            
            return found;
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
                    
                    // setTimeout(() => {
                    //   containerElement.style.backgroundColor = originalBackground;
                    //   containerElement.style.transition = originalTransition;
                    // }, 2000);
                    
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
                    score += chunk.length * 2; // Phrase matches get higher scores
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
              
              // setTimeout(() => {
              //   bestMatch.element.style.boxShadow = originalStyle.boxShadow;
              //   bestMatch.element.style.backgroundColor = 'rgba(255, 213, 79, 0.1)';
              // }, 2000);
              
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
          
          // Highlight specified node's text and add return button
          function highlightNode(node, startIndex, length) {
            try {
              // Ensure index is within valid range
              if (startIndex < 0 || startIndex >= node.textContent.length) {
                console.error("Invalid start index:", startIndex, "text length:", node.textContent.length);
                return false;
              }
              
              // Adjust length to ensure it doesn't exceed range
              length = Math.min(length, node.textContent.length - startIndex);
              
              // Create range
              const range = document.createRange();
              range.setStart(node, startIndex);
              range.setEnd(node, startIndex + length);
              
              // Get parent element background color
              const parentElement = node.parentElement;
              const computedStyle = window.getComputedStyle(parentElement);
              const backgroundColor = computedStyle.backgroundColor;
              
              // Determine if background is dark or light
              const bgColor = parseColor(backgroundColor);
              const isDarkBackground = calculateLuminance(bgColor) < 0.5;
              
              // Choose appropriate highlight color
              const highlightColor = isDarkBackground ? 
                'rgba(255, 255, 0, 0.7)' : // Bright yellow for dark backgrounds
                'rgba(255, 193, 7, 0.6)';  // Gold for light backgrounds
              
              // Create highlight span
              const span = document.createElement('span');
              span.className = 'privacy-highlight';
              Object.assign(span.style, {
                backgroundColor: highlightColor,
                padding: '2px 4px',
                borderRadius: '3px',
                color: isDarkBackground ? '#fff' : 'inherit',
                textShadow: isDarkBackground ? '0 1px 1px rgba(0,0,0,0.7)' : 'none',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 0 8px rgba(255, 193, 7, 0.3)',
                display: 'inline-block',
                transition: 'all 0.5s ease'
              });
              
              try {
                range.surroundContents(span);
              } catch (e) {
                console.error("Failed to create highlight:", e);
                // Try alternative approach - highlight only part of text
                try {
                  // Extract text from the region
                  const textToHighlight = node.textContent.substring(startIndex, startIndex + length);
                  
                  // Create new range
                  const newRange = document.createRange();
                  newRange.setStart(node, startIndex);
                  newRange.setEnd(node, startIndex + length);
                  
                  // Delete original range content
                  newRange.deleteContents();
                  
                  // Create span with highlight
                  const newSpan = document.createElement('span');
                  newSpan.className = 'privacy-highlight';
                  Object.assign(newSpan.style, span.style);
                  newSpan.textContent = textToHighlight;
                  
                  // Insert into DOM
                  newRange.insertNode(newSpan);
                } catch (e2) {
                  console.error("Alternative highlight method also failed:", e2);
                  return false;
                }
              }
              
              // Add animation effect to make highlight more noticeable
              setTimeout(() => {
                const allHighlights = document.querySelectorAll('.privacy-highlight');
                allHighlights.forEach(highlight => {
                  const originalColor = highlight.style.backgroundColor;
                  const originalBoxShadow = highlight.style.boxShadow;
                  
                  // Set permanent highlight instead of temporary
                  highlight.style.backgroundColor = isDarkBackground ? 
                    'rgba(255, 255, 0, 0.9)' : 
                    'rgba(255, 193, 7, 0.8)';
                  highlight.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.2), 0 0 12px rgba(255, 193, 7, 0.7)';
                });
                
                // Scroll to the first highlighted text
                const firstHighlight = document.querySelector('.privacy-highlight');
                if (firstHighlight) {
                  firstHighlight.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center'
                  });
                }
              }, 300);
              
              // Add return button
              addReturnButton();
              return true;
            } catch (error) {
              console.error("Failed to highlight text:", error);
              return false;
            }
          }
          
          // Add return button
          function addReturnButton() {
            // Check if return button already exists
            if (document.querySelector('.privacy-return-button')) {
              return;
            }
            
            const returnBtn = document.createElement('button');
            returnBtn.className = 'privacy-return-button';
            
            // Check if we have a highlighted text to place the button next to
            const highlightEl = document.querySelector('.privacy-highlight');
            
            if (highlightEl) {
              // Position next to highlighted text
              const highlightRect = highlightEl.getBoundingClientRect();
              const scrollY = window.scrollY || window.pageYOffset;
              
              // Create a compact button instead of traditional rectangle button
              // Use a circular button with an arrow icon for better visibility
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
              
              // Position on the right side of the highlight with minimal space impact
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
                transform: 'scale(0.9)' // Start slightly smaller for animation
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
              
              // Enhanced hover effect for the circular button
              // Store reference to highlight element for event handlers
              const highlightReference = highlightEl;
              
              returnBtn.addEventListener('mouseover', function() {
                this.style.opacity = '1';
                this.style.transform = 'scale(1.15)'; // Increased scale for more obvious effect
                this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                this.style.backgroundColor = '#1565c0'; // Slightly darker blue on hover
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
                const updatedHighlightRect = highlightReference.getBoundingClientRect();
                const currentScrollY = window.scrollY || window.pageYOffset;
                
                // Update button position to stay aligned with highlight
                returnBtn.style.top = `${updatedHighlightRect.top + currentScrollY - 12}px`;
                returnBtn.style.left = `${updatedHighlightRect.right + 8}px`;
              });
            } else {
              // Always show full text button in fixed position when no highlight is found
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
                transition: 'all 0.2s ease' // Faster transition
              });
              
              // Add hover effects for the standard button
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
            }

            // Return to summary page
            returnBtn.onclick = () => {
              chrome.runtime.sendMessage({
                action: "returnToSummary",
                sourceUrl: window.location.href
              });
            };

            document.body.appendChild(returnBtn);
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

          function initializeHighlight() {
            chrome.storage.local.get(['originalTextHighlight'], (result) => {
              if (result.originalTextHighlight) {
                const searchText = result.originalTextHighlight.text;
                const startTime = Date.now();
                
                console.log("Preparing to highlight text:", searchText ? searchText.substring(0, 30) + "..." : "No text");
                
                // Preload notice - let the user know the system is processing
                const preloadNotice = document.createElement('div');
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
                  preloadNotice.style.opacity = '1';
                }, 300);
                
                // Ensure search executes after DOM is fully loaded
                const executeSearch = () => {
                  console.log("Starting search execution");
                  // Try to find and highlight immediately
                  if (!findAndHighlightText(searchText)) {
                    console.log("First search failed, setting up observer");
                    
                    // If not found, set up a MutationObserver to watch for DOM changes
                    const observer = new MutationObserver((mutations, obs) => {
                      // Check if text can be found on each DOM change
                      if (findAndHighlightText(searchText)) {
                        console.log("Found text after DOM change");
                        obs.disconnect(); // Stop observing once found
                        if (preloadNotice.parentNode) {
                          preloadNotice.style.opacity = '0';
                          setTimeout(() => preloadNotice.remove(), 300);
                        }
                      }
                    });
                    
                    observer.observe(document.body, {
                      childList: true,
                      subtree: true,
                      characterData: true
                    });
                    
                    // Set maximum observation time
                    const maxSearchTime = 15000;
                    setTimeout(() => {
                      const searchDuration = Date.now() - startTime;
                      console.log(`Search timed out, duration: ${searchDuration}ms`);
                      observer.disconnect();
                      
                                              // If still not found, change notification to error
                        if (document.querySelectorAll('.privacy-highlight').length === 0) {
                          if (preloadNotice.parentNode) {
                            preloadNotice.textContent = 'Cannot find original text, attempting to show related content.';
                            preloadNotice.style.backgroundColor = '#d32f2f'; // Red background for error
                            preloadNotice.style.color = '#ffffff';
                            
                            setTimeout(() => {
                              preloadNotice.style.opacity = '0';
                              setTimeout(() => preloadNotice.remove(), 300);
                            }, 2000); // Show for shorter time as we'll show permanent error after
                          }
                          
                          // Show error notification immediately
                          showErrorNotification();
                          
                          // Final attempt - lower matching standards for looser search
                          console.log("Executing final relaxed search");
                          const foundFinal = findAndHighlightText(searchText);
                          console.log("Final search result:", foundFinal ? "success" : "failure");
                          
                          // Ensure a return button is added even after all searches fail
                          if (!foundFinal && document.querySelectorAll('.privacy-highlight').length === 0) {
                            console.log("No highlight found after all attempts, showing error notification");
                            // Show error notification and add fixed position return button
                            showErrorNotification();
                            addReturnButton();
                          }
                        }
                    }, maxSearchTime);
                  } else {
                    console.log("Text successfully highlighted, duration:", Date.now() - startTime, "ms");
                    // Remove notification after finding
                    if (preloadNotice.parentNode) {
                      preloadNotice.style.opacity = '0';
                      setTimeout(() => preloadNotice.remove(), 300);
                    }
                  }
                };
                
                // Ensure DOM is ready before executing
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  // Give page some time to complete any async loading
                  setTimeout(executeSearch, 500);
                } else {
                  // Wait for load completion
                  window.addEventListener('DOMContentLoaded', () => setTimeout(executeSearch, 500));
                  // Backup timeout in case DOMContentLoaded event doesn't fire
                  setTimeout(executeSearch, 3000);
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

          // Add error notification function for when original text is not found
          function showErrorNotification() {
            // Check if error notification already exists
            if (document.querySelector('.privacy-error-notification')) {
              return;
            }
            
            // Create error notification element
            const errorNotification = document.createElement('div');
            errorNotification.className = 'privacy-error-notification';
            errorNotification.textContent = 'Cannot find original text';
            
            // Style the notification
            Object.assign(errorNotification.style, {
              position: 'fixed',
              top: '70px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#d32f2f',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '4px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              zIndex: 100000,
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: '0',
              transition: 'opacity 0.3s ease'
            });
            
            // Add to the document
            document.body.appendChild(errorNotification);
            
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
              errorNotification.style.animation = 'blink-error 1s ease-in-out infinite';
              
              // Hide notification after 10 seconds
              setTimeout(() => {
                errorNotification.style.opacity = '0';
                setTimeout(() => {
                  if (errorNotification.parentNode) {
                    errorNotification.parentNode.removeChild(errorNotification);
                  }
                }, 300);
              }, 10000);
            }, 300);
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
