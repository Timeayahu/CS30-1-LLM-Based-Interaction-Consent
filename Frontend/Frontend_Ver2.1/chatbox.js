// Chatbox functionality for Privacy Policy Summarizer

// Global variables
let chatPopup = null;

/**
 * Create chat window
 * @param {DOMRect} buttonRect - Position information of the clicked button
 */
function createChatWindow(buttonRect) {
  // Check if chat window already exists
  if (chatPopup && chatPopup.container && document.body.contains(chatPopup.container)) {
    // If exists, show and return
    chatPopup.container.style.opacity = '1';
    chatPopup.container.style.transform = 'scale(1)';
    const summaryPopup = document.getElementById('summary-popup');
    if (summaryPopup) {
      const summaryRect = summaryPopup.getBoundingClientRect();
      chatPopup.container.style.left = `${summaryRect.right + 25}px`;
    }
    return chatPopup;
  }
  
  // Get summary popup position
  const summaryPopup = document.getElementById('summary-popup');
  if (!summaryPopup) return null;
  
  const summaryRect = summaryPopup.getBoundingClientRect();
  
  // Create chat container
  const chatContainer = document.createElement('div');
  chatContainer.id = 'privacy-chat-window';
  
  // Set initial styles - starting from button position
  const initialStyles = {
    position: 'fixed',
    top: buttonRect ? `${buttonRect.top}px` : `${summaryRect.top}px`,
    left: buttonRect ? `${buttonRect.left}px` : `${summaryRect.left}px`,
    transform: 'scale(0.1)',
    transformOrigin: 'top left',
    zIndex: 99999,
    width: '420px',
    height: `${Math.min(summaryRect.height * 0.92, 550)}px`,
    maxHeight: '75vh',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    opacity: '0',
    transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  };
  
  Object.assign(chatContainer.style, initialStyles);
  
  // Create chat header
  const chatHeader = document.createElement('div');
  Object.assign(chatHeader.style, {
    padding: '15px 20px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    background: 'transparent',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    color: '#333'
  });
  
  // Title - using same style as summary page
  const chatTitle = document.createElement('h2');
  chatTitle.innerText = 'AI Chatbox';
  Object.assign(chatTitle.style, {
    marginTop: '0',
    marginBottom: '0.8em',
    fontSize: '1.5rem',
    background: 'linear-gradient(to right, #1565c0, #1976d2, #2196f3)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textAlign: 'center',
    fontWeight: '600',
    position: 'relative',
    paddingBottom: '10px',
    letterSpacing: '-0.02em',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  });
  
  // Add title underline - same as summary page
  const titleUnderline = document.createElement('div');
  Object.assign(titleUnderline.style, {
    position: 'absolute',
    bottom: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60px',
    height: '3px',
    background: 'linear-gradient(to right, #1565c0, #1976d2, #2196f3)',
    borderRadius: '3px'
  });
  chatTitle.appendChild(titleUnderline);
  
  // Close button container
  const buttonContainer = document.createElement('div');
  Object.assign(buttonContainer.style, {
    position: 'absolute',
    top: '15px',
    right: '15px',
    zIndex: 1
  });
  
  // Close button
  const closeButton = document.createElement('div');
  Object.assign(closeButton.style, {
    cursor: 'pointer',
    fontSize: '20px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: 'rgba(0, 0, 0, 0.05)',
    transition: 'background 0.3s ease'
  });
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('mouseover', () => {
    closeButton.style.background = 'rgba(0, 0, 0, 0.1)';
  });
  closeButton.addEventListener('mouseout', () => {
    closeButton.style.background = 'rgba(0, 0, 0, 0.05)';
  });
  closeButton.addEventListener('click', closeChatWindow);
  
  buttonContainer.appendChild(closeButton);
  chatHeader.appendChild(chatTitle);
  chatHeader.appendChild(buttonContainer);
  
  // Create chat messages area
  const chatMessages = document.createElement('div');
  chatMessages.className = 'chat-messages';
  Object.assign(chatMessages.style, {
    flex: '1',
    overflowY: 'auto',
    padding: '10px 15px 15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    // Custom scrollbar style - same as summary box
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(25, 118, 210, 0.3) transparent'
  });
  
  // Add Webkit browser scrollbar styles
  const scrollbarStyle = document.createElement('style');
  scrollbarStyle.textContent = `
    .chat-messages::-webkit-scrollbar {
      width: 8px;
    }
    
    .chat-messages::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 4px;
    }
    
    .chat-messages::-webkit-scrollbar-thumb {
      background-color: rgba(25, 118, 210, 0.3);
      border-radius: 4px;
      transition: background-color 0.3s ease;
    }
    
    .chat-messages::-webkit-scrollbar-thumb:hover {
      background-color: rgba(25, 118, 210, 0.5);
    }
    
    .chat-messages:not(:hover)::-webkit-scrollbar-thumb {
      background-color: transparent;
    }
    
    .chat-messages:not(:hover) {
      scrollbar-color: transparent transparent;
    }
  `;
  document.head.appendChild(scrollbarStyle);
  
  // Create input area
  const chatInputArea = document.createElement('div');
  Object.assign(chatInputArea.style, {
    padding: '15px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end'
  });
  
  // Use textarea instead of input
  const chatInput = document.createElement('textarea');
  chatInput.placeholder = 'Ask a question...';
  chatInput.rows = 1;
  Object.assign(chatInput.style, {
    flex: '1',
    padding: '10px 15px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '20px',
    outline: 'none',
    fontSize: '14px',
    resize: 'none',
    overflow: 'hidden',
    minHeight: '40px',
    maxHeight: '150px',
    lineHeight: '1.5',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  });
  
  // Function to auto-adjust height
  function adjustHeight() {
    // Reset height for recalculation
    chatInput.style.height = 'auto';
    
    // Set height to fit content
    const newHeight = Math.min(chatInput.scrollHeight, 150);
    chatInput.style.height = `${newHeight}px`;
    
    // Adjust send button position
    sendButton.style.alignSelf = newHeight <= 40 ? 'center' : 'flex-end';
  }
  
  // Listen for input events
  chatInput.addEventListener('input', adjustHeight);
  
  // Handle key events - Enter to send, Shift+Enter for new line
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  // Input box focus effects
  chatInput.addEventListener('focus', () => {
    chatInput.style.borderColor = '#1976d2';
    chatInput.style.boxShadow = '0 0 0 2px rgba(25, 118, 210, 0.2)';
  });
  
  chatInput.addEventListener('blur', () => {
    chatInput.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    chatInput.style.boxShadow = 'none';
  });
  
  const sendButton = document.createElement('button');
  Object.assign(sendButton.style, {
    background: 'linear-gradient(to right, #1976d2, #2196f3)',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    alignSelf: 'center',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });
  sendButton.innerText = 'Send';
  
  // Send button hover effects
  sendButton.addEventListener('mouseover', () => {
    sendButton.style.background = 'linear-gradient(to right, #1565c0, #1976d2)';
    sendButton.style.transform = 'scale(1.05)';
  });
  
  sendButton.addEventListener('mouseout', () => {
    sendButton.style.background = 'linear-gradient(to right, #1976d2, #2196f3)';
    sendButton.style.transform = 'scale(1)';
  });
  
  // Add send button click event
  sendButton.addEventListener('click', sendChatMessage);
  
  chatInputArea.appendChild(chatInput);
  chatInputArea.appendChild(sendButton);
  
  // Assemble chat window
  chatContainer.appendChild(chatHeader);
  chatContainer.appendChild(chatMessages);
  chatContainer.appendChild(chatInputArea);
  document.body.appendChild(chatContainer);
  
  // Initial welcome message
  setTimeout(() => {
    addChatMessage('Welcome to the AI Chatbox for privacy policy. How can I help you? 😊', 'assistant');
  }, 500);
  
  // Store chat window object
  chatPopup = {
    container: chatContainer,
    messages: chatMessages,
    input: chatInput,
    sendButton: sendButton
  };
  
  // Animation to show chat window
  setTimeout(() => {
    // Set final position and size
    Object.assign(chatContainer.style, {
      opacity: '1',
      top: `${summaryRect.top}px`,
      left: `${summaryRect.right + 25}px`,
      transform: 'scale(1)'
    });
  }, 50);
  
  // Add window size change listener to ensure chat window syncs with summary window
  window.addEventListener('resize', syncChatPosition);
  
  return chatPopup;
}

/**
 * Open chat window
 * @param {DOMRect} buttonRect - Position information of the clicked button
 */
function openChatWindow(buttonRect) {
  createChatWindow(buttonRect);
}

/**
 * Close chat window
 */
function closeChatWindow() {
  if (chatPopup && chatPopup.container) {
    const summaryPopup = document.getElementById('summary-popup');
    if (summaryPopup) {
      // Find chat button
      const chatButton = summaryPopup.querySelector('.privacy-chat-button');
      if (chatButton) {
        // Get button position
        const buttonRect = chatButton.getBoundingClientRect();
        
        // Set animation back to button position
        chatPopup.container.style.opacity = '0';
        chatPopup.container.style.top = `${buttonRect.top}px`;
        chatPopup.container.style.left = `${buttonRect.left}px`;
        chatPopup.container.style.transform = 'scale(0.1)';
        chatPopup.container.style.transformOrigin = 'top left';
      } else {
        // If button not found, go back to summary position
        const summaryRect = summaryPopup.getBoundingClientRect();
        chatPopup.container.style.opacity = '0';
        chatPopup.container.style.left = `${summaryRect.left}px`;
        chatPopup.container.style.transform = 'scale(0.8)';
      }
    } else {
      // If summary page is closed, fade out
      chatPopup.container.style.opacity = '0';
    }
    
    // Remove window size change listener
    window.removeEventListener('resize', syncChatPosition);
    
    setTimeout(() => {
      if (chatPopup.container && chatPopup.container.parentNode) {
        chatPopup.container.parentNode.removeChild(chatPopup.container);
        chatPopup = null;
      }
    }, 500);
  }
}

/**
 * Sync chat window position with summary window
 */
function syncChatPosition() {
  if (!chatPopup || !chatPopup.container) return;
  
  const summaryPopup = document.getElementById('summary-popup');
  if (!summaryPopup) return;
  
  const summaryRect = summaryPopup.getBoundingClientRect();
  
  // Update chat window position and size
  Object.assign(chatPopup.container.style, {
    top: `${summaryRect.top}px`,
    left: `${summaryRect.right + 25}px`,
    height: `${Math.min(summaryRect.height * 0.92, 550)}px`
  });
}

/**
 * Add chat message
 */
function addChatMessage(text, sender) {
  if (!chatPopup || !chatPopup.messages) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}`;
  
  // Set basic styles
  Object.assign(messageDiv.style, {
    maxWidth: '80%',
    padding: '10px 15px',
    borderRadius: '15px',
    marginBottom: '8px',
    fontSize: '14px',
    lineHeight: '1.4',
    wordBreak: 'break-word',
    alignSelf: sender === 'user' ? 'flex-end' : 'flex-start',
    background: sender === 'user' 
      ? 'linear-gradient(135deg, #1976d2, #2196f3)' 
      : '#f0f0f0',
    color: sender === 'user' ? 'white' : '#333',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    // Initial animation state
    opacity: '0',
    transform: sender === 'user' ? 'translateX(20px) scale(0.8)' : 'translateX(-20px) scale(0.8)',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
  });
  
  messageDiv.innerText = text;
  chatPopup.messages.appendChild(messageDiv);
  
  // Auto scroll to bottom
  chatPopup.messages.scrollTop = chatPopup.messages.scrollHeight;
  
  // Trigger animation effect
  setTimeout(() => {
    messageDiv.style.opacity = '1';
    messageDiv.style.transform = 'translateX(0) scale(1)';
  }, 10);
  
  return messageDiv;
}

/**
 * Send chat message
 */
function sendChatMessage() {
  if (!chatPopup || !chatPopup.input) return;
  
  const userInput = chatPopup.input.value.trim();
  if (!userInput) return;
  
  // Add user message
  addChatMessage(userInput, 'user');
  
  // Clear input box
  chatPopup.input.value = '';
  
  // Reset input box height
  chatPopup.input.style.height = '40px';
  
  // Restore send button position
  if (chatPopup.sendButton) {
    chatPopup.sendButton.style.alignSelf = 'center';
  }
  
  // Show loading status (with delay for animation effect)
  setTimeout(() => {
    const loadingMsg = addChatMessage('Thinking...', 'assistant');
    
    // Get policy ID to be dialoged
    chrome.storage.local.get(['currentPolicyId'], (result) => {
      const policyId = result.currentPolicyId || '';
      
      // Send message to backend
      fetch('http://localhost:5000/api/general-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          policy_id: policyId,
          user_question: userInput
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server response error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Remove loading message (with animation)
        if (loadingMsg && loadingMsg.parentNode) {
          loadingMsg.style.opacity = '0';
          loadingMsg.style.transform = 'translateX(-20px) scale(0.8)';
          
          setTimeout(() => {
            if (loadingMsg.parentNode) {
              loadingMsg.parentNode.removeChild(loadingMsg);
            }
            
            // Show response
            if (data.success && data.response) {
              let responseText = '';
              
              // If response is object, get answer field from response
              if (typeof data.response === 'object') {
                if (data.response.answer) {
                  // Use answer field directly
                  responseText = data.response.answer;
                } else if (data.response.text) {
                  // Compatible with old version possible text field
                  responseText = data.response.text;
                } else {
                  // If no recognized field, use entire response
                  responseText = JSON.stringify(data.response);
                }
              } else {
                responseText = data.response;
              }
              
              // Add assistant reply
              addChatMessage(responseText, 'assistant');
            } else {
              // Handle error
              addChatMessage('Sorry, I couldn\'t get a response. ' + (data.error || ''), 'assistant');
            }
          }, 300);
        }
      })
      .catch(error => {
        // Remove loading message (with animation)
        if (loadingMsg && loadingMsg.parentNode) {
          loadingMsg.style.opacity = '0';
          loadingMsg.style.transform = 'translateX(-20px) scale(0.8)';
          
          setTimeout(() => {
            if (loadingMsg.parentNode) {
              loadingMsg.parentNode.removeChild(loadingMsg);
            }
            
            // Show error message
            addChatMessage(`Error: ${error.message}`, 'assistant');
          }, 300);
        }
      });
    });
  }, 300);
}

/**
 * Open chat window with auto query
 * @param {DOMRect} buttonRect - Position information of the clicked button
 * @param {Object} bubbleData - Data of the bubble (keyword, category, etc.)
 */
function openChatWindowWithAutoQuery(buttonRect, bubbleData) {
  // Create chat window if not exists
  const chatWindow = createChatWindow(buttonRect);
  
  if (chatWindow) {
    // Wait for the chat window to be fully displayed
    setTimeout(() => {
      // Create auto query message
      const autoMessage = `Detail Explanation: ${bubbleData.keyword}`;
      
      // Add user message
      addChatMessage(autoMessage, 'user');
      
      // Show loading status
      const loadingMsg = addChatMessage('Thinking...', 'assistant');
      
      // Get current privacy policy ID
      chrome.storage.local.get(['currentPolicyId'], (result) => {
        const policyId = result.currentPolicyId || '';
        
        // Send request to /api/chat instead of /api/general-chat
        fetch('http://localhost:5000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            policy_id: policyId,
            category_name: bubbleData.category || '',
            bubble_summary: bubbleData.summary || '',
            user_question: autoMessage
          })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Server response error: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          // Remove loading message (with animation)
          if (loadingMsg && loadingMsg.parentNode) {
            loadingMsg.style.opacity = '0';
            loadingMsg.style.transform = 'translateX(-20px) scale(0.8)';
            
            setTimeout(() => {
              if (loadingMsg.parentNode) {
                loadingMsg.parentNode.removeChild(loadingMsg);
              }
              
              // Show response
              if (data.success && data.response) {
                let responseText = '';
                
                // If response is object, get answer field from response
                if (typeof data.response === 'object') {
                  if (data.response.answer) {
                    // Use answer field directly
                    responseText = data.response.answer;
                  } else if (data.response.text) {
                    // Compatible with old version possible text field
                    responseText = data.response.text;
                  } else {
                    // If no recognized field, use entire response
                    responseText = JSON.stringify(data.response);
                  }
                } else {
                  responseText = data.response;
                }
                
                // Add assistant reply
                addChatMessage(responseText, 'assistant');
              } else {
                // Handle error
                addChatMessage('Sorry, I couldn\'t get a response. ' + (data.error || ''), 'assistant');
              }
            }, 300);
          }
        })
        .catch(error => {
          // Remove loading message (with animation)
          if (loadingMsg && loadingMsg.parentNode) {
            loadingMsg.style.opacity = '0';
            loadingMsg.style.transform = 'translateX(-20px) scale(0.8)';
            
            setTimeout(() => {
              if (loadingMsg.parentNode) {
                loadingMsg.parentNode.removeChild(loadingMsg);
              }
              
              // Show error message
              addChatMessage(`Error: ${error.message}`, 'assistant');
            }, 300);
          }
        });
      });
    }, 500); // Give enough time for chat window to open and initialize
  }
}

// Export interface
window.privacyChatbox = {
  openChatWindow,
  closeChatWindow,
  addChatMessage,
  sendChatMessage,
  syncChatPosition,
  openChatWindowWithAutoQuery
}; 