// chatbox.js: Chatbox functionality for Privacy Policy Summarizer

let chatPopup = null;
let isProcessingDetailExplanation = false;
let currentSessionId = null;
const MAX_CHAT_HEIGHT = '75vh';
const MIN_CHAT_HEIGHT = 300;
const CHAT_WIDTH = 420;

/**
 * Create chat window
 * @param {DOMRect} buttonRect - Position information of the clicked button
 */
function createChatWindow(buttonRect) {
  // Check if chat window already exists
  if (chatPopup && chatPopup.container && document.body.contains(chatPopup.container)) {
    chatPopup.container.style.opacity = '1';
    chatPopup.container.style.transform = 'scale(1)';
    const summaryPopup = document.getElementById('summary-popup');
    if (summaryPopup) {
      const summaryRect = summaryPopup.getBoundingClientRect();
      chatPopup.container.style.left = `${summaryRect.right + 25}px`;
    }
    return chatPopup;
  }
  
  currentSessionId = null;
  
  // Get summary popup position
  const summaryPopup = document.getElementById('summary-popup');
  if (!summaryPopup) return null;
  
  const summaryRect = summaryPopup.getBoundingClientRect();
  
  // Create chat container
  const chatContainer = document.createElement('div');
  chatContainer.id = 'privacy-chat-window';
  
  // Set initial styles - starting animation based on origin
  let originX, originY;
  let initialTransformOrigin;
  
  if (buttonRect) {
    originX = buttonRect.left;
    originY = buttonRect.top;
    initialTransformOrigin = 'top left';
  } else {
    const chatButton = summaryPopup.querySelector('.privacy-chat-button');
    if (chatButton) {
      const chatButtonRect = chatButton.getBoundingClientRect();
      originX = chatButtonRect.left;
      originY = chatButtonRect.top;
      initialTransformOrigin = 'top right';
    } else {
      originX = summaryRect.right - 15 - 36;
      originY = summaryRect.top + 15;
      initialTransformOrigin = 'top right';
    }
  }
  
  // Calculate initial height
  const initialHeight = Math.min(summaryRect.height * 0.92, 450);
  
  const initialStyles = {
    position: 'fixed',
    top: `${originY}px`,
    left: `${originX}px`,
    transform: 'scale(0.1)',
    transformOrigin: initialTransformOrigin,
    zIndex: 99999,
    width: `${CHAT_WIDTH}px`,
    height: `${initialHeight}px`,
    minHeight: `${MIN_CHAT_HEIGHT}px`, 
    maxHeight: MAX_CHAT_HEIGHT,
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    opacity: '0',
    transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.3s ease', // Add height transition effect
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
  
  // Title
  const chatTitle = document.createElement('h2');
  chatTitle.innerText = 'AI Chatbox';
  Object.assign(chatTitle.style, {
    marginTop: '0',
    marginBottom: '0.8em',
    fontSize: '22px',
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
  
  // Add title underline
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
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(25, 118, 210, 0.3) transparent'
  });
  
  // Add chat styles including scrollbar and message formatting
  const chatStyles = document.createElement('style');
  chatStyles.textContent = `
    /* Scrollbar styles */
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
    
    /* Message formatting styles */
    .chat-message {
      max-width: 80%;
      white-space: pre-line;
      line-height: 1.5;
      word-break: break-word;
    }
    
    .chat-message p {
      margin: 0 0 8px 0;
    }
    
    .chat-message:last-child p:last-child {
      margin-bottom: 0;
    }
    
    .chat-message ul, .chat-message ol {
      margin-top: 4px;
      margin-bottom: 8px;
      padding-left: 20px;
    }
    
    .chat-message code {
      background-color: rgba(0, 0, 0, 0.05);
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.9em;
    }
  `;
  document.head.appendChild(chatStyles);
  
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
    chatInput.style.height = 'auto';
    
    const newHeight = Math.min(chatInput.scrollHeight, 150);
    chatInput.style.height = `${newHeight}px`;
    
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
    sendButton: sendButton,
    originRect: buttonRect
  };
  
  // Animation to show chat window
  setTimeout(() => {
    chatPopup.animationStartTime = Date.now();
    
    const finalTop = Math.max(summaryRect.top, 20);
    
    Object.assign(chatContainer.style, {
      opacity: '1',
      top: `${finalTop}px`,
      left: `${summaryRect.right + 25}px`,
      transform: 'scale(1)',
      transformOrigin: 'top left'
    });
  }, 50);
  
  window.addEventListener('resize', syncChatPosition);
  
  return chatPopup;
}

/**
 * Open chat window
 * @param {DOMRect} buttonRect - Position information of the clicked button
 */
function openChatWindow(buttonRect) {
  // If chat window already exists, reposition it
  if (chatPopup && chatPopup.container && document.body.contains(chatPopup.container)) {
    // Get summary window position
    const summaryPopup = document.getElementById('summary-popup');
    if (summaryPopup) {
      const summaryRect = summaryPopup.getBoundingClientRect();
      // Update chat window position
      chatPopup.container.style.opacity = '1';
      chatPopup.container.style.transform = 'scale(1)';
      chatPopup.container.style.left = `${summaryRect.right + 25}px`;
      chatPopup.container.style.top = `${summaryRect.top}px`;
    }
    return;
  }
  
  createChatWindow(buttonRect);
}

/**
 * Close chat window
 */
function closeChatWindow() {
  if (chatPopup && chatPopup.container) {
    // Add closing animation - simple scale and fade out, similar to profile page
    chatPopup.container.style.opacity = '0';
    chatPopup.container.style.transform = 'scale(0.1)';
    
    // Remove window size change listener
    window.removeEventListener('resize', syncChatPosition);
    
    // Close the session if we have a session ID
    if (currentSessionId) {
      fetch(`${API_CONFIG.BASE_URL}/api/sessions/${currentSessionId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      .then(response => response.json())
      .then(data => {
        console.log('Session closed:', data);
        currentSessionId = null;
      })
      .catch(error => {
        console.error('Error closing session:', error);
      });
    }
    
    // Remove popup after animation
    setTimeout(() => {
      if (chatPopup && chatPopup.container && chatPopup.container.parentNode) {
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
  });
  
  // Adjust chat window height
  adjustChatWindowHeight();
  
  // Update chat button position (if page was scrolled)
  const chatButton = summaryPopup.querySelector('.privacy-chat-button');
  if (chatButton && chatButton.parentNode) {
  }
}

/**
 * Add chat message
 * @param {string} text - Message text
 * @param {string} sender - Message sender (user/assistant)
 * @return {HTMLElement} - The message element
 */
function addChatMessage(text, sender) {
  if (!chatPopup || !chatPopup.messages) return null;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}`;
  
  // Set basic styles with enhanced animation
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
      : (sender === 'assistant' ? '#f0f0f0' : 'rgba(255, 152, 0, 0.08)'),
    color: sender === 'user' ? 'white' : '#333',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    opacity: '0',
    transform: sender === 'user' ? 'translateX(20px) scale(0.8)' : 'translateX(-20px) scale(0.8)',
    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    whiteSpace: 'pre-line'
  });
  
  // Add typing animation if it's the assistant's "Thinking..." message
  if (sender === 'assistant' && text === 'Thinking...') {
    const typingContainer = document.createElement('div');
    Object.assign(typingContainer.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    });
    
    const thinkingText = document.createElement('span');
    thinkingText.innerText = 'Thinking';
    
    const dotsContainer = document.createElement('span');
    
    // Dots animation
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.innerText = '.';
      Object.assign(dot.style, {
        opacity: 0.3,
        animation: `pulseDot 1.5s infinite ${i * 0.2}s`,
        display: 'inline-block'
      });
      dotsContainer.appendChild(dot);
    }
    
    // Add keyframes for dots animation if not already exists
    if (!document.querySelector('#dot-animation-style')) {
      const dotStyle = document.createElement('style');
      dotStyle.id = 'dot-animation-style';
      dotStyle.textContent = `
        @keyframes pulseDot {
          0% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.3; transform: scale(1); }
        }
      `;
      document.head.appendChild(dotStyle);
    }
    
    typingContainer.appendChild(thinkingText);
    typingContainer.appendChild(dotsContainer);
    messageDiv.appendChild(typingContainer);
  } else {
    messageDiv.textContent = text;
  }
  
  chatPopup.messages.appendChild(messageDiv);
  
  // Auto scroll to bottom with animation
  const currentScrollTop = chatPopup.messages.scrollTop;
  const targetScrollTop = chatPopup.messages.scrollHeight - chatPopup.messages.clientHeight;
  
  if (targetScrollTop > currentScrollTop) {
    const startTime = Date.now();
    const duration = 300; // ms
    
    const scrollAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutCubic = progress => 1 - Math.pow(1 - progress, 3);
      const easedProgress = easeOutCubic(progress);
      
      const newScrollTop = currentScrollTop + (targetScrollTop - currentScrollTop) * easedProgress;
      chatPopup.messages.scrollTop = newScrollTop;
      
      if (progress < 1) {
        requestAnimationFrame(scrollAnimation);
      }
    };
    
    requestAnimationFrame(scrollAnimation);
  }
  
  setTimeout(() => {
    messageDiv.style.opacity = '1';
    messageDiv.style.transform = 'translateX(0) scale(1)';
    
    setTimeout(() => {
      adjustChatWindowHeight();
    }, 100);
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
      
      // Prepare request data, add session ID if available
      const requestData = {
        policy_id: policyId,
        user_question: userInput
      };
      
      // If session ID exists, add it to the request
      if (currentSessionId) {
        requestData.session_id = currentSessionId;
      }
      
      // Send message to backend api/general-chat
      fetch(`${API_CONFIG.BASE_URL}/api/general-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server response error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Save session ID returned from backend
        if (data.session_id) {
          currentSessionId = data.session_id;
        }
        
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
              // Check if response is an array (multiple responses)
              if (Array.isArray(data.response)) {
                // Handle multiple responses
                data.response.forEach((responseItem, index) => {
                  // Add slight delay between multiple messages for better UX
                  setTimeout(() => {
                    let responseText = '';
                    
                    // Extract text from response item
                    if (typeof responseItem === 'object') {
                      if (responseItem.answer) {
                        responseText = responseItem.answer;
                      } else if (responseItem.text) {
                        responseText = responseItem.text;
                      } else {
                        responseText = JSON.stringify(responseItem);
                      }
                    } else if (typeof responseItem === 'string') {
                      responseText = responseItem;
                    }
                    
                    // Normalize line breaks to ensure consistent formatting
                    responseText = normalizeLineBreaks(responseText);
                    
                    // Add each response as a separate message
                    const assistantMessage = addChatMessage(responseText, 'assistant');
                    
                    // Apply highlighting to each message
                    if (assistantMessage) {
                      setTimeout(() => {
                        highlightImportantContent(assistantMessage);
                      }, 500);
                    }
                  }, index * 500);
                });
              } else {
                // Original single response handling
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
                
                // Normalize line breaks to ensure consistent formatting
                responseText = normalizeLineBreaks(responseText);
                
                // Add assistant reply with improved animation
                const assistantMessage = addChatMessage(responseText, 'assistant');
                
                // Highlight important parts in the response
                if (assistantMessage) {
                  // Delay highlighting to ensure smooth animation
                  setTimeout(() => {
                    highlightImportantContent(assistantMessage);
                  }, 500);
                }
              }
            } else {
              addChatMessage('Sorry, I couldn\'t get a response. ' + (data.error || ''), 'assistant');
            }
          }, 300);
        }
      })
      .catch(error => {
        if (loadingMsg && loadingMsg.parentNode) {
          loadingMsg.style.opacity = '0';
          loadingMsg.style.transform = 'translateX(-20px) scale(0.8)';
          
          setTimeout(() => {
            if (loadingMsg.parentNode) {
              loadingMsg.parentNode.removeChild(loadingMsg);
            }
            
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
 * @param {HTMLElement} buttonElement - Reference to the button element that was clicked
 */
function openChatWindowWithAutoQuery(buttonRect, bubbleData, buttonElement) {
  // If already processing a request, return immediately
  if (isProcessingDetailExplanation) {
    console.log('A Detail Explanation request is already being processed, please wait...');
    return;
  }
  
  // Set global flag indicating we're processing a request
  isProcessingDetailExplanation = true;
  
  // If button element is provided, disable it to prevent duplicate clicks
  if (buttonElement) {
    // Save original styles
    const originalStyles = {
      backgroundColor: buttonElement.style.backgroundColor,
      opacity: buttonElement.style.opacity,
      cursor: buttonElement.style.cursor,
      pointerEvents: buttonElement.style.pointerEvents
    };
    
    // Save to button property
    buttonElement._originalStyles = originalStyles;
    
    // Modify button style to disabled state
    buttonElement.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    buttonElement.style.opacity = '0.6';
    buttonElement.style.cursor = 'not-allowed';
    buttonElement.style.pointerEvents = 'none';
  }
  
  // Create chat window if not exists
  const chatWindow = createChatWindow(buttonRect);
  
  if (chatWindow) {
    // Use a slightly longer delay to ensure smoother animation when opening from Detail Explanation button
    const animDelay = buttonRect ? 700 : 500;
    
    // Wait for the chat window to be fully displayed
    setTimeout(() => {
      // Create auto query message
      const autoMessage = `Detail Explanation: ${bubbleData.keyword}`;
      
      // Add user message with improved animation for auto-query
      const userMessage = addChatMessage(autoMessage, 'user');
      if (userMessage) {
        // Add a special class to identify this as auto-query
        userMessage.classList.add('auto-query');
        // Set default styles first to ensure animation works properly
        Object.assign(userMessage.style, {
          opacity: '0',
          transform: 'translateX(20px) scale(0.8)'
        });
        
        // Use requestAnimationFrame for smoother animation
        requestAnimationFrame(() => {
          userMessage.style.opacity = '1';
          userMessage.style.transform = 'translateX(0) scale(1)';
        });
      }
      
      // Show loading status with a slight delay to create sequence effect
      setTimeout(() => {
        const loadingMsg = addChatMessage('Thinking...', 'assistant');
        
        // Get current privacy policy ID
        chrome.storage.local.get(['currentPolicyId'], (result) => {
          const policyId = result.currentPolicyId || '';
          
          // Prepare request data, add session ID if available
          const requestData = {
            policy_id: policyId,
            category_name: bubbleData.category || '',
            bubble_summary: bubbleData.summary || '',
            user_question: autoMessage
          };
          
          // If session ID exists, add it to the request
          if (currentSessionId) {
            requestData.session_id = currentSessionId;
          }
          
          // Send request to /api/chat
          fetch(`${API_CONFIG.BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Server response error: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            // Save session ID returned from backend
            if (data.session_id) {
              currentSessionId = data.session_id;
            }
            
            // Reset processing state
            isProcessingDetailExplanation = false;
            
            // Restore button state
            if (buttonElement && buttonElement._originalStyles) {
              // Restore all original styles
              buttonElement.style.backgroundColor = buttonElement._originalStyles.backgroundColor || '';
              buttonElement.style.opacity = buttonElement._originalStyles.opacity || '1';
              buttonElement.style.cursor = buttonElement._originalStyles.cursor || 'pointer';
              buttonElement.style.pointerEvents = buttonElement._originalStyles.pointerEvents || 'auto';
              
              // Clear saved styles
              delete buttonElement._originalStyles;
            }
            
            // Remove loading message with smoother animation
            if (loadingMsg && loadingMsg.parentNode) {
              loadingMsg.style.opacity = '0';
              loadingMsg.style.transform = 'translateX(-20px) scale(0.8)';
              
              setTimeout(() => {
                if (loadingMsg.parentNode) {
                  loadingMsg.parentNode.removeChild(loadingMsg);
                }
                
                // Show response
                if (data.success && data.response) {
                  // Check if response is an array (multiple responses)
                  if (Array.isArray(data.response)) {
                    // Handle multiple responses
                    data.response.forEach((responseItem, index) => {
                      // Add slight delay between multiple messages for better UX
                      setTimeout(() => {
                        let responseText = '';
                        
                        // Extract text from response item
                        if (typeof responseItem === 'object') {
                          if (responseItem.answer) {
                            responseText = responseItem.answer;
                          } else if (responseItem.text) {
                            responseText = responseItem.text;
                          } else {
                            responseText = JSON.stringify(responseItem);
                          }
                        } else if (typeof responseItem === 'string') {
                          responseText = responseItem;
                        }
                        
                        // Normalize line breaks to ensure consistent formatting
                        responseText = normalizeLineBreaks(responseText);
                        
                        // Add each response as a separate message
                        const assistantMessage = addChatMessage(responseText, 'assistant');
                        
                        // Apply highlighting to each message
                        if (assistantMessage) {
                          setTimeout(() => {
                            highlightImportantContent(assistantMessage);
                          }, 500);
                        }
                      }, index * 500);
                    });
                  } else {
                    // Original single response handling
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
                    
                    // Normalize line breaks to ensure consistent formatting
                    responseText = normalizeLineBreaks(responseText);
                    
                    // Add assistant reply with improved animation
                    const assistantMessage = addChatMessage(responseText, 'assistant');
                    
                    // Highlight important parts in the response
                    if (assistantMessage) {
                      setTimeout(() => {
                        highlightImportantContent(assistantMessage);
                      }, 500);
                    }
                  }
                } else {
                  addChatMessage('Sorry, I couldn\'t get a response. ' + (data.error || ''), 'assistant');
                }
              }, 300);
            }
          })
          .catch(error => {
            // Reset processing state
            isProcessingDetailExplanation = false;
            
            // Restore button state
            if (buttonElement && buttonElement._originalStyles) {
              // Restore all original styles
              buttonElement.style.backgroundColor = buttonElement._originalStyles.backgroundColor || '';
              buttonElement.style.opacity = buttonElement._originalStyles.opacity || '1';
              buttonElement.style.cursor = buttonElement._originalStyles.cursor || 'pointer';
              buttonElement.style.pointerEvents = buttonElement._originalStyles.pointerEvents || 'auto';
              
              // Clear saved styles
              delete buttonElement._originalStyles;
            }
            
            // Remove loading message with smoother animation
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
      }, 200);
    }, animDelay);
  }
}

/**
 * Adjust chat window height based on chat content
 */
function adjustChatWindowHeight() {
  if (!chatPopup || !chatPopup.container || !chatPopup.messages) return;
  
  // Get current viewport height
  const viewportHeight = window.innerHeight;
  // Calculate maximum height (in pixels)
  const maxHeightPx = Math.floor(viewportHeight * 0.75); // 75vh
  
  // Get heights of header and input areas
  const headerHeight = chatPopup.container.querySelector('div').offsetHeight;
  const inputAreaHeight = chatPopup.container.lastElementChild.offsetHeight;
  
  // Calculate ideal height for message area
  const messagesContentHeight = chatPopup.messages.scrollHeight;
  // Calculate ideal total height for chat window (including header and input area)
  const idealTotalHeight = messagesContentHeight + headerHeight + inputAreaHeight;
  
  // Calculate suitable height, not exceeding maximum height
  const suitableHeight = Math.min(idealTotalHeight, maxHeightPx);
  // Not less than minimum height
  const finalHeight = Math.max(suitableHeight, MIN_CHAT_HEIGHT);
  
  // Apply new height, add transition effect for smooth change
  chatPopup.container.style.height = `${finalHeight}px`;
  
  // Ensure message area scrolls to bottom
  setTimeout(() => {
    chatPopup.messages.scrollTop = chatPopup.messages.scrollHeight - chatPopup.messages.clientHeight;
  }, 50);
}

// Add window resize listener
window.addEventListener('resize', () => {
  // Delay execution to avoid frequent adjustments
  if (chatPopup && typeof chatPopup === 'object') {
    if (chatPopup.resizeTimeout) {
      clearTimeout(chatPopup.resizeTimeout);
    }
    
    try {
      chatPopup.resizeTimeout = setTimeout(() => {
        adjustChatWindowHeight();
        syncChatPosition();
      }, 100);
    } catch (e) {
      console.error('Error setting resizeTimeout:', e);
    }
  }
});

/**
 * Highlight important content in message
 * @param {HTMLElement} messageElement - The message element to highlight
 */
function highlightImportantContent(messageElement) {
  if (!messageElement) return;
  
  // Get the original text with preserved line breaks
  const originalText = messageElement.textContent;
  
  // Check if the message contains code blocks or structured content
  if (/```|\n\s{2,}|\n\t+|Source excerpt:/i.test(originalText)) {
    return;
  }
  
  // Split text by lines first to preserve line breaks
  const lines = originalText.split(/\n/);
  
  // Clear current text
  messageElement.textContent = '';
  
  // Process each line separately to preserve line breaks
  lines.forEach((line, lineIndex) => {
    // Only process non-empty lines
    if (line.trim()) {
      // Skip highlighting for lines that look like code or structured data
      if (/^\s{2,}|^\t+|\s{2,}\S+\s{2,}|\|\s+\|/.test(line)) {
        // Add the line as-is without highlighting
        const plainSpan = document.createElement('span');
        plainSpan.textContent = line;
        messageElement.appendChild(plainSpan);
      } else {
        // Split line into sentences
        const sentences = line.split(/(?<=[.!?])\s+/);
        
        // Process each sentence in the line
        sentences.forEach((sentence, sentenceIndex) => {
          const sentenceSpan = document.createElement('span');
          
          // Add space after sentence if not last sentence in line
          const needsSpace = sentenceIndex < sentences.length - 1;
          sentenceSpan.textContent = sentence + (needsSpace ? ' ' : '');
          
          // Determine if sentence is important based on keywords
          const isImportant = /important|critical|must|always|never|careful|warning|caution|attention/i.test(sentence);
          
          if (isImportant) {
            Object.assign(sentenceSpan.style, {
              fontWeight: '500',
              background: 'rgba(25, 118, 210, 0.07)',
              padding: '2px 4px',
              borderRadius: '4px',
              margin: '0 -2px'
            });
          }
          
          messageElement.appendChild(sentenceSpan);
        });
      }
    }
    
    if (lineIndex < lines.length - 1) {
      messageElement.appendChild(document.createElement('br'));
    }
  });
}

/**
 * Normalize line breaks in text to ensure consistent formatting
 * @param {string} text - The text to normalize
 * @return {string} - Normalized text with consistent line breaks
 */
function normalizeLineBreaks(text) {
  if (!text) return '';
  
  // First replace all variants of line breaks with standard \n
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Detect if text contains code blocks (starting with spaces/tabs or containing programming tokens)
  const hasCodeBlock = /\n(\s{2,}|\t+)[a-zA-Z0-9_.]+|[\{\}\[\]<>;=]/m.test(normalized);
  if (hasCodeBlock) {
    // For texts with code blocks, be more conservative with formatting
    // Just ensure there's proper paragraph separation
    normalized = normalized.replace(/\n{3,}/g, '\n\n');
    return normalized;
  }
  
  // Common patterns that should start on a new line
  const patterns = [
    'Source excerpt:',
    'Example:',
    'Note:',
    'Warning:',
    'Important:',
    'References:',
    'Disclaimer:',
    'Summary:',
    'Conclusion:',
    'In conclusion,',
    'For example:',
    'Additionally:',
    'Furthermore:',
    'In summary:',
    'Context:',
    'Original text:'
  ];
  
  // Create a regex pattern from the patterns array
  const patternRegex = patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  
  // Ensure patterns start on a new line if preceded by punctuation + space
  normalized = normalized.replace(new RegExp(`([.:!?])\\s+(${patternRegex})`, 'g'), '$1\n\n$2');
  
  // Ensure patterns start on a new line even if they appear at the beginning of a normal paragraph
  normalized = normalized.replace(new RegExp(`(^|\\n)([^\\n]+?)\\s+(${patternRegex})`, 'g'), '$1$2\n\n$3');
  
  // Ensure proper spacing after these patterns
  normalized = normalized.replace(new RegExp(`(${patternRegex})(\\s*)(\\S)`, 'g'), '$1$2\n$3');
  
  // Handle list items - make sure there's a line break before each list item
  normalized = normalized.replace(/(\n|^)([^\n]*?\n)(\d+\.\s+|\*\s+|\-\s+)/g, '$1$2\n$3');
  
  // Ensure there's only one blank line between paragraphs
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  
  return normalized;
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