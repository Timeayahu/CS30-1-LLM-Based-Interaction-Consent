// Content Script: Extract privacy policy text from the webpage and send to background

let floatingIcon = null;
let currentHoveredLink = null;
let hideIconTimer = null;
let isEnabled = true;
let isIconLocked = false;
let lastIconPosition = null;
let positionUpdateTimer = null;

// Get the extension state when initialized
chrome.storage.local.get(['isEnabled'], (result) => {
  isEnabled = result.isEnabled;
});

// Create floating icon element
function createFloatingIcon() {
  const icon = document.createElement('div');
  icon.className = 'privacy-summary-icon';
  Object.assign(icon.style, {
    position: 'fixed',
    width: '32px',
    height: '32px',
    backgroundColor: '#1976d2',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    cursor: 'pointer',
    zIndex: 99997,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    fontSize: '16px',
    userSelect: 'none',
    opacity: '0',
    transform: 'scale(0.8)',
    transition: 'all 0.2s ease-in-out',
    pointerEvents: 'none'
  });
  icon.innerHTML = '📝';
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'privacy-summary-tooltip';
  Object.assign(tooltip.style, {
    position: 'absolute',
    backgroundColor: '#fff',
    color: '#333',
    padding: '10px 15px',
    borderRadius: '8px',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.2s ease-in-out',
    zIndex: 99998,
    top: '-45px',
    left: '50%',
    transform: 'translateX(-50%)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    border: '1px solid rgba(0,0,0,0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '500'
  });
  tooltip.textContent = 'Use LLM to summarize the privacy policy';
  
  // Add tooltip arrow
  const arrow = document.createElement('div');
  Object.assign(arrow.style, {
    position: 'absolute',
    bottom: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '0',
    height: '0',
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '8px solid #fff',
    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))'
  });
  tooltip.appendChild(arrow);
  
  // Add tooltip to icon
  icon.appendChild(tooltip);
  
  // Add hover effect
  icon.addEventListener('mouseover', () => {
    icon.style.transform = 'scale(1.1)';
    icon.style.backgroundColor = '#1565c0';
    // Show tooltip
    tooltip.style.opacity = '1';
    // When the mouse moves over the icon, clear the hide timer
    if (hideIconTimer) {
      clearTimeout(hideIconTimer);
      hideIconTimer = null;
    }
  });
  icon.addEventListener('mouseout', () => {
    icon.style.transform = 'scale(1)';
    icon.style.backgroundColor = '#1976d2';
    // Hide tooltip
    tooltip.style.opacity = '0';
    // Setting a delay to hide when the mouse moves away from the icon
    hideIconTimer = setTimeout(() => {
      if (floatingIcon) {
        floatingIcon.style.opacity = '0';
        floatingIcon.style.pointerEvents = 'none';
      }
    }, 300);
  });
  
  return icon;
}

// Position the floating icon next to the link
function positionIcon(icon, link) {
  // If the icon is locked, do not update the position
  if (isIconLocked) return;
  
  const rect = link.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Default position (bottom right)
  let left = rect.right - 32; // Icon width is 32px
  let top = rect.bottom + 5;  // 5px below the link bottom
  
  // If there is not enough space on the right, place it on the left
  if (left + 32 > viewportWidth - 10) {
    left = rect.left - 32;
  }
  
  // If there is not enough space on the left, place it on the right
  if (left < 10) {
    left = rect.right + 5;
  }
  
  // If there is not enough space on the bottom, place it above the link
  if (top + 32 > viewportHeight - 10) {
    top = rect.top - 37; // 32px icon height + 5px spacing
  }
  
  // If there is not enough space on the top, place it inside the link bottom right
  if (top < 10) {
    top = rect.bottom - 32;
    left = rect.right - 32;
  }
  
  // Check if the new position is too far from the last position
  if (lastIconPosition) {
    const distance = Math.sqrt(
      Math.pow(left - lastIconPosition.left, 2) + 
      Math.pow(top - lastIconPosition.top, 2)
    );
    
    // If the position change is too large, use throttling to update
    if (distance > 50) {
      if (positionUpdateTimer) {
        clearTimeout(positionUpdateTimer);
      }
      positionUpdateTimer = setTimeout(() => {
        icon.style.left = `${left}px`;
        icon.style.top = `${top}px`;
        lastIconPosition = { left, top };
      }, 100);
      return;
    }
  }
  
  icon.style.left = `${left}px`;
  icon.style.top = `${top}px`;
  lastIconPosition = { left, top };
}

// Handle mouse enter on links
function handleLinkHover(e) {
  if (!isEnabled) return;
  
  const link = e.target;
  if (link.href && /privacy|policy|legal|privacy-policy/i.test(link.href)) {
    if (!floatingIcon) {
      floatingIcon = createFloatingIcon();
      document.body.appendChild(floatingIcon);
      
      // Add click handler to the icon
      floatingIcon.onclick = () => {
        // Add click feedback
        floatingIcon.style.transform = 'scale(0.95)';
        setTimeout(() => {
          floatingIcon.style.transform = 'scale(1)';
        }, 100);
        
        // Send message to background script to handle summarization
        chrome.runtime.sendMessage({
          action: "summarizePolicy",
          url: currentHoveredLink
        });
      };
      
      // Add: Lock icon position when mouse enters icon
      floatingIcon.addEventListener('mouseenter', () => {
        isIconLocked = true;
      });
      
      // Add: Unlock icon position when mouse leaves icon
      floatingIcon.addEventListener('mouseleave', () => {
        isIconLocked = false;
        // Reset position update timer
        if (positionUpdateTimer) {
          clearTimeout(positionUpdateTimer);
          positionUpdateTimer = null;
        }
      });
    }
    currentHoveredLink = link.href;
    positionIcon(floatingIcon, link);
    floatingIcon.style.opacity = '1';
    floatingIcon.style.pointerEvents = 'auto';
  }
}

// Handle mouse leave
function handleLinkLeave(e) {
  if (floatingIcon) {
    // Clear any existing timer
    if (hideIconTimer) {
      clearTimeout(hideIconTimer);
    }
    
    // Get the link element's position information
    const link = e.target;
    const linkRect = link.getBoundingClientRect();
    
    // Set a delay to check if the mouse really left the link area
    hideIconTimer = setTimeout(() => {
      // Get the current mouse position
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // Check if the mouse is in the link area
      const isOverLink = mouseX >= linkRect.left && 
                        mouseX <= linkRect.right && 
                        mouseY >= linkRect.top && 
                        mouseY <= linkRect.bottom;
      
      // If the mouse is not in the link area and the icon is not locked, hide the icon
      if (!isOverLink && !isIconLocked) {
        floatingIcon.style.opacity = '0';
        floatingIcon.style.pointerEvents = 'none';
      }
    }, 300);
  }
}

// Add event listeners to all links
function setupLinkListeners() {
  document.addEventListener('mouseover', (e) => {
    if (e.target.tagName === 'A') {
      handleLinkHover(e);
    }
  });
  
  document.addEventListener('mouseout', (e) => {
    if (e.target.tagName === 'A') {
      handleLinkLeave(e);
    }
  });
}

// Initialize
setupLinkListeners();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleEnabled") {
    isEnabled = message.isEnabled;
    // If the extension is disabled, hide the floating icon
    if (!isEnabled && floatingIcon) {
      floatingIcon.style.display = 'none';
    }
  } else if (message.action === "showSummary") {
    const { isLoading, summary, error } = message;
    if (isLoading) {
      showOrUpdatePopup(true, "Summarizing, please wait...", false);
    } else {
      if (error) {
        showOrUpdatePopup(false, error, true);
      } else {
        showOrUpdatePopup(false, summary || "(No summary)", false);
      }
    }
  }
});

let popupContainer = null; // For storing created popup DOM

function showOrUpdatePopup(isLoading, text, isError) {
  // If there is already a popup and transitioning from loading to summary state
  if (popupContainer && isLoading === false && popupContainer.isLoading === true) {
    // Mark current popup as not loading
    popupContainer.isLoading = false;
    
    // Add fade-out class
    popupContainer.container.classList.add('fade-out');
    popupContainer.overlay.classList.add('fade-out');
    
    // Wait for fade-out animation to complete before creating new popup
    setTimeout(() => {
      // Remove old popup
      popupContainer.container.remove();
      popupContainer.overlay.remove();
      
      // Create new popup
      popupContainer = createPopup();
      popupContainer.isLoading = false;
      
      // Update new popup content
      updatePopup(popupContainer, isLoading, text, isError);
    }, 300);
  } else {
    // If there is no popup, create one
    if (!popupContainer) {
      popupContainer = createPopup();
      popupContainer.isLoading = isLoading;
    }
    // Update popup content
    updatePopup(popupContainer, isLoading, text, isError);
  }
}

/**
 * Create popup DOM: overlay + container
 */
function createPopup() {
  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'summary-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Darker background color
    backdropFilter: 'blur(3px)',  // Add blur effect
    zIndex: 99998,
    opacity: '0',
    transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
  });

  // Container
  const container = document.createElement('div');
  container.id = 'summary-popup';
  Object.assign(container.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -48%)',
    zIndex: 99999,
    width: '520px',  // Slightly wider
    maxWidth: '90%',
    maxHeight: '85%',
    overflowY: 'auto',
    borderRadius: '12px',  // Larger border radius
    backgroundColor: '#fff',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',  // Deeper shadow
    border: '1px solid rgba(0, 0, 0, 0.1)',
    padding: '20px',  // Larger padding
    boxSizing: 'border-box',
    opacity: '0',
    transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    color: '#333',  // Darker text color
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    // Custom scrollbar styling
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(25, 118, 210, 0.3) transparent'
  });
  
  // Add custom scrollbar styles for WebKit browsers
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    #summary-popup::-webkit-scrollbar {
      width: 8px;
    }
    
    #summary-popup::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 4px;
    }
    
    #summary-popup::-webkit-scrollbar-thumb {
      background-color: rgba(25, 118, 210, 0.3);
      border-radius: 4px;
      transition: background-color 0.3s ease;
    }
    
    #summary-popup::-webkit-scrollbar-thumb:hover {
      background-color: rgba(25, 118, 210, 0.5);
    }
    
    /* Hide scrollbar when not in use */
    #summary-popup {
      scrollbar-gutter: stable;
    }
    
    #summary-popup:not(:hover)::-webkit-scrollbar-thumb {
      background-color: transparent;
    }
    
    #summary-popup:not(:hover) {
      scrollbar-color: transparent transparent;
    }
    
    /* 添加内容淡入动画 */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .summary-content {
      animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      opacity: 0;
    }
    
    .summary-content:nth-child(1) { animation-delay: 0.1s; }
    .summary-content:nth-child(2) { animation-delay: 0.2s; }
    .summary-content:nth-child(3) { animation-delay: 0.3s; }
    .summary-content:nth-child(4) { animation-delay: 0.4s; }
    .summary-content:nth-child(5) { animation-delay: 0.5s; }
    
    /* 添加弹出动画 */
    @keyframes popIn {
      0% {
        opacity: 0;
        transform: translate(-50%, -40%) scale(0.95);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
    
    /* 添加关闭动画 - 向下移动版本 */
    @keyframes popOut {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -40%) scale(0.95);
      }
    }
    
    #summary-popup {
      animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    
    #summary-popup.closing {
      animation: popOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    
    /* 添加遮罩淡入动画 */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    #summary-overlay {
      animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    
    #summary-overlay.closing {
      animation: fadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  `;
  document.head.appendChild(styleTag);
  
  // Insert overlay + container into the document
  document.body.appendChild(overlay);
  document.body.appendChild(container);

  // 不再需要手动设置opacity，因为使用了CSS动画
  // 返回 { overlay, container } 用于后续更新
  return { overlay, container };
}

/**
 * Update popup content
 */
function updatePopup(popup, isLoading, text, isError) {
  const { overlay, container } = popup;

  // Clear all child nodes
  container.innerHTML = "";

  // Title
  const title = document.createElement('h2');
  if (isLoading) {
    title.innerText = "Summarizing, please wait...";
  } else {
    title.innerText = isError ? "Error" : "Privacy Policy Summary";
  }
  Object.assign(title.style, {
    marginTop: '0',
    marginBottom: '1.5em',
    fontSize: '1.5rem',
    color: '#1976d2',
    textAlign: 'center',
    fontWeight: '600',
    position: 'relative',
    paddingBottom: '10px'
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
    backgroundColor: '#1976d2',
    borderRadius: '3px'
  });
  title.appendChild(titleUnderline);
  
  container.appendChild(title);

  if (isLoading) {
    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '40px',
      height: '40px',
      border: '4px solid rgba(25, 118, 210, 0.1)',
      borderTopColor: '#1976d2',
      borderRadius: '50%',
      margin: '0 auto 1.5em',
      animation: 'spin 1s linear infinite'
    });
    container.appendChild(spinner);

    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    container.appendChild(styleTag);
  } else if (isError) {
    const contentDiv = document.createElement('div');
    contentDiv.innerText = text;
    Object.assign(contentDiv.style, {
      fontSize: '1rem',
      lineHeight: '1.6',
      marginBottom: '16px',
      whiteSpace: 'pre-wrap',
      textAlign: 'left',
      color: '#e53935',
      padding: '15px',
      backgroundColor: 'rgba(229, 57, 53, 0.1)',
      borderRadius: '8px',
      border: '1px solid rgba(229, 57, 53, 0.2)'
    });
    container.appendChild(contentDiv);
  } else {
    try {
      const summary = JSON.parse(text);
      
      // Store original URL for later use
      const originalUrl = currentHoveredLink;

      // Create category container
      const categories = [
        { title: "What personal information will be collected?", data: summary.collected_info },
        { title: "What will the personal information be used for?", data: summary.data_usage },
        { title: "Who else will your personal information be shared with?", data: summary.data_sharing }
      ];

      categories.forEach((category, index) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'summary-content';
        Object.assign(categoryDiv.style, {
          marginBottom: '25px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          opacity: '0',
          transform: 'translateY(20px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          transitionDelay: `${index * 0.1}s`
        });

        const categoryTitle = document.createElement('h3');
        categoryTitle.innerText = category.title;
        Object.assign(categoryTitle.style, {
          margin: '0 0 15px 0',
          color: '#1976d2',
          fontSize: '1.2rem',
          fontWeight: '600',
          position: 'relative',
          paddingBottom: '8px'
        });
        
        // Add category title underline
        const categoryUnderline = document.createElement('div');
        Object.assign(categoryUnderline.style, {
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '40px',
          height: '2px',
          backgroundColor: '#1976d2',
          borderRadius: '2px'
        });
        categoryTitle.appendChild(categoryUnderline);
        
        categoryDiv.appendChild(categoryTitle);

        // Create bubble layout for personal information collection
        if (category.title === "What personal information will be collected?" || category.title === "What will the personal information be used for?" || category.title === "Who else will your personal information be shared with?" ){
          // Create bubble container
          const bubbleContainer = document.createElement('div');
          Object.assign(bubbleContainer.style, {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'flex-start',
            marginBottom: '15px'
          });
          
          // Create summary container (initially hidden)
          const summaryContainer = document.createElement('div');
          Object.assign(summaryContainer.style, {
            width: '100%',
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '18px', 
            marginTop: '15px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            display: 'none',
            boxSizing: 'border-box',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.05)',
            transition: 'all 0.3s ease'
          });
          
          // Create bubble for each item
          category.data.forEach((item, itemIndex) => {
            const bubble = document.createElement('div');
            Object.assign(bubble.style, {
              background: 'linear-gradient(135deg, #1976d2, #2196f3)',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              boxShadow: '0 3px 8px rgba(33, 150, 243, 0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
              opacity: '0',
              transform: 'scale(0.9)',
              animation: `fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
              animationDelay: `${0.3 + itemIndex * 0.05}s`
            });
            
            bubble.innerText = item.keyword;
            
            // Add hover effect
            bubble.addEventListener('mouseover', () => {
              bubble.style.transform = 'translateY(-3px)';
              bubble.style.boxShadow = '0 5px 12px rgba(33, 150, 243, 0.4)';
              bubble.style.background = 'linear-gradient(135deg, #1565c0, #1e88e5)';
            });
            
            bubble.addEventListener('mouseout', () => {
              bubble.style.transform = 'translateY(0)';
              bubble.style.boxShadow = '0 3px 8px rgba(33, 150, 243, 0.3)';
              bubble.style.background = 'linear-gradient(135deg, #1976d2, #2196f3)';
            });
            
            // Click bubble to show summary
            bubble.addEventListener('click', () => {
              // If there is already a summary displayed, fade out the current summary first
              if (summaryContainer.style.display === 'block') {
                summaryContainer.style.opacity = '0';
                summaryContainer.style.transform = 'translateY(10px)';
                
                // Wait for fade-out animation to complete before updating content
                setTimeout(() => {
                  updateSummaryContent();
                }, 300);
              } else {
                // Directly show new summary
                updateSummaryContent();
              }
              
              function updateSummaryContent() {
                // Clear summary container
                summaryContainer.innerHTML = '';
                
                // Create summary title
                const summaryTitle = document.createElement('h4');
                summaryTitle.innerText = item.keyword;
                Object.assign(summaryTitle.style, {
                  margin: '0 0 12px 0',
                  color: '#1976d2',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  opacity: '0',
                  transform: 'translateY(10px)',
                  transition: 'opacity 0.3s ease, transform 0.3s ease'
                });
                summaryContainer.appendChild(summaryTitle);
                
                // Create summary content
                const summaryContent = document.createElement('div');
                summaryContent.innerText = item.summary;
                Object.assign(summaryContent.style, {
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  marginBottom: '15px',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  color: '#444',
                  opacity: '0',
                  transform: 'translateY(10px)',
                  transition: 'opacity 0.3s ease, transform 0.3s ease',
                  transitionDelay: '0.1s'
                });
                summaryContainer.appendChild(summaryContent);
                
                // Create original text link
                const contextLink = document.createElement('a');
                contextLink.innerText = "View Original Text";
                contextLink.href = "#";
                Object.assign(contextLink.style, {
                  color: '#1976d2',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  display: 'inline-block',
                  padding: '6px 12px',  
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                  opacity: '0',
                  transform: 'translateY(10px)',
                  transition: 'opacity 0.3s ease, transform 0.3s ease, background-color 0.2s',
                  transitionDelay: '0.2s'
                });
                
                // Add hover effect
                contextLink.addEventListener('mouseover', () => {
                  contextLink.style.backgroundColor = 'rgba(25, 118, 210, 0.2)';
                });
                
                contextLink.addEventListener('mouseout', () => {
                  contextLink.style.backgroundColor = 'rgba(25, 118, 210, 0.1)';
                });
                
                // Handle click to view original text
                contextLink.onclick = (e) => {
                  e.preventDefault();
                  const searchText = item.context;
                  
                  // Get the current tab ID
                  chrome.runtime.sendMessage({ action: "getCurrentTabId" }, (response) => {
                    const sourceTabId = response.tabId;
                    
                    // Store original URL and search text
                    chrome.storage.local.set({
                      originalTextHighlight: {
                        text: searchText,
                        sourceUrl: originalUrl,
                        summaryData: text,
                        sourceTabId: sourceTabId  // Store the source tab ID
                      }
                    }, () => {
                      // Open original privacy policy URL in a new tab
                      chrome.runtime.sendMessage({
                        action: "openOriginalText",
                        url: originalUrl
                      });
                    });
                  });
                };
                
                summaryContainer.appendChild(contextLink);
                
                // Show summary container with animation
                summaryContainer.style.display = 'block';
                summaryContainer.style.opacity = '0';
                summaryContainer.style.transform = 'translateY(10px)';
                
                // Use requestAnimationFrame to ensure DOM updates before applying animation
                requestAnimationFrame(() => {
                  summaryContainer.style.opacity = '1';
                  summaryContainer.style.transform = 'translateY(0)';
                  
                  // Delay showing content elements to create a cascading effect
                  setTimeout(() => {
                    summaryTitle.style.opacity = '1';
                    summaryTitle.style.transform = 'translateY(0)';
                  }, 50);
                  
                  setTimeout(() => {
                    summaryContent.style.opacity = '1';
                    summaryContent.style.transform = 'translateY(0)';
                  }, 150);
                  
                  setTimeout(() => {
                    contextLink.style.opacity = '1';
                    contextLink.style.transform = 'translateY(0)';
                  }, 250);
                });
              }
            });
            
            bubbleContainer.appendChild(bubble);
          });
          
          categoryDiv.appendChild(bubbleContainer);
          categoryDiv.appendChild(summaryContainer);
        } else {
          // Other categories keep the original collapsed bar display
          category.data.forEach((item, itemIndex) => {
            const itemDiv = document.createElement('div');
            Object.assign(itemDiv.style, {
              backgroundColor: '#fff',
              margin: '12px 0',
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.05)', 
              transition: 'box-shadow 0.3s ease',
              opacity: '0',
              transform: 'translateY(10px)',
              animation: `fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
              animationDelay: `${0.3 + itemIndex * 0.05}s`
            });
            
            // Add hover effect
            itemDiv.addEventListener('mouseover', () => {
              itemDiv.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
            });
            
            itemDiv.addEventListener('mouseout', () => {
              itemDiv.style.boxShadow = '0 3px 10px rgba(0,0,0,0.05)';
            });

            // Create header container for keyword
            const headerContainer = document.createElement('div');
            Object.assign(headerContainer.style, {
              display: 'flex',
              alignItems: 'center',
              padding: '12px 15px',
              cursor: 'pointer',
              userSelect: 'none',
              borderBottom: '1px solid transparent',
              borderRadius: '10px 10px 0 0',
              transition: 'background-color 0.2s'
            });
            
            // Add hover effect
            headerContainer.addEventListener('mouseover', () => {
              headerContainer.style.backgroundColor = 'rgba(25, 118, 210, 0.05)';
            });
            
            headerContainer.addEventListener('mouseout', () => {
              headerContainer.style.backgroundColor = 'transparent';
            });

            // Add expand/collapse arrow
            const arrow = document.createElement('span');
            arrow.innerHTML = '▶';
            Object.assign(arrow.style, {
              marginRight: '10px',
              transition: 'transform 0.3s ease',
              display: 'inline-block',
              fontSize: '0.8rem',
              color: '#1976d2'
            });

            // Keyword text
            const keyword = document.createElement('div');
            keyword.innerText = item.keyword;
            Object.assign(keyword.style, {
              fontWeight: '600',
              color: '#1976d2',
              flex: '1',
              fontSize: '1rem'
            });

            headerContainer.appendChild(arrow);
            headerContainer.appendChild(keyword);
            itemDiv.appendChild(headerContainer);

            // Create content container
            const contentContainer = document.createElement('div');
            Object.assign(contentContainer.style, {
              maxHeight: '0',
              overflow: 'hidden',
              transition: 'max-height 0.3s ease-out, padding 0.3s ease-out',
              padding: '0 15px',
              backgroundColor: '#fafafa',
              borderRadius: '0 0 8px 8px'
            });

            // Summary
            const summary = document.createElement('div');
            summary.innerText = item.summary;
            Object.assign(summary.style, {
              fontSize: '0.9rem',
              marginBottom: '8px',
              lineHeight: '1.5',
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            });

            // Original text link
            const contextLink = document.createElement('a');
            contextLink.innerText = "View Original Text";
            contextLink.href = "#";
            Object.assign(contextLink.style, {
              color: '#1976d2',
              textDecoration: 'none',
              fontSize: '0.9rem',
              display: 'inline-block',
              marginBottom: '10px',
              padding: '6px 12px', 
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            });
            
            // Add hover effect
            contextLink.addEventListener('mouseover', () => {
              contextLink.style.backgroundColor = 'rgba(25, 118, 210, 0.2)';
            });
            
            contextLink.addEventListener('mouseout', () => {
              contextLink.style.backgroundColor = 'rgba(25, 118, 210, 0.1)';
            });

            // Handle click to view original text
            contextLink.onclick = (e) => {
              e.preventDefault();
              const searchText = item.context;
              
              // Get the current tab ID
              chrome.runtime.sendMessage({ action: "getCurrentTabId" }, (response) => {
                const sourceTabId = response.tabId;
                
                // Store original URL and search text
                chrome.storage.local.set({
                  originalTextHighlight: {
                    text: searchText,
                    sourceUrl: originalUrl,
                    summaryData: text,
                    sourceTabId: sourceTabId  // Store the source tab ID
                  }
                }, () => {
                  // Open original privacy policy URL in a new tab
                  chrome.runtime.sendMessage({
                    action: "openOriginalText",
                    url: originalUrl
                  });
                });
              });
            };

            contentContainer.appendChild(summary);
            contentContainer.appendChild(contextLink);
            itemDiv.appendChild(contentContainer);

            // Add click expand/collapse functionality
            let isExpanded = false;
            headerContainer.onclick = () => {
              isExpanded = !isExpanded;
              arrow.style.transform = isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
              contentContainer.style.maxHeight = isExpanded ? `${contentContainer.scrollHeight}px` : '0';
              contentContainer.style.padding = isExpanded ? '10px' : '0 10px';
              headerContainer.style.borderBottom = isExpanded ? '1px solid #e0e0e0' : '1px solid transparent';
            };

            categoryDiv.appendChild(itemDiv);
          });
        }

        container.appendChild(categoryDiv);
      });
    } catch (e) {
      const errorDiv = document.createElement('div');
      errorDiv.innerText = "Error parsing data: " + e.message;
      container.appendChild(errorDiv);
    }
  }

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerText = "Close";
  Object.assign(closeBtn.style, {
    cursor: 'pointer',
    padding: '8px 16px',
    backgroundColor: isError ? '#e53935' : '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.9rem',
    display: 'block',
    margin: '16px auto 0',
    opacity: '0',
    transform: 'translateY(10px)',
    animation: 'fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
    animationDelay: '0.6s'
  });
  
  closeBtn.addEventListener('mouseover', () => {
    closeBtn.style.opacity = '0.8';
  });
  closeBtn.addEventListener('mouseout', () => {
    closeBtn.style.opacity = '1';
  });
  
  closeBtn.onclick = () => {
    // Add closing class, trigger CSS animation
    container.classList.add('closing');
    overlay.classList.add('closing');
    
    setTimeout(() => {
      container.remove();
      overlay.remove();
      popupContainer = null;
      // Clear all highlights
      const highlights = document.querySelectorAll('.privacy-highlight');
      highlights.forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
      });
    }, 400);
  };
  
  container.appendChild(closeBtn);
}

// Add CSS styles
const styleTag = document.createElement('style');
styleTag.textContent = `
  /* Add fade-out animation */
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  .fade-out {
    animation: fadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
  }
`;
document.head.appendChild(styleTag);
