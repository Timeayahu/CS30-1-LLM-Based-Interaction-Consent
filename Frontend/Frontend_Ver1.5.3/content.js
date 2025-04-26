// Content Script: Extract privacy policy text from the webpage and send to background

let floatingIcon = null;
let currentHoveredLink = null;
let hideIconTimer = null;
let isEnabled = true;
let isIconLocked = false;
let lastIconPosition = null;
let positionUpdateTimer = null;
let currentExpandedSummary = null;
let isRequestCancelled = false;

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
    background: 'linear-gradient(135deg, #1976d2, #2196f3)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    cursor: 'pointer',
    zIndex: 99997,
    boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
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
    background: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
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
    border: '1px solid rgba(25, 118, 210, 0.1)',
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
    icon.style.background = 'linear-gradient(135deg, #1565c0, #1976d2)';
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
    icon.style.background = 'linear-gradient(135deg, #1976d2, #2196f3)';
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
  let left = rect.right - 32;
  let top = rect.bottom + 5; 
  
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
  if (link.href && /privacy|policy|privacy-policy/i.test(link.href)) {
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
        if (hideIconTimer) {
          clearTimeout(hideIconTimer);
          hideIconTimer = null;
        }
      });
      
      // Add: Unlock icon position when mouse leaves icon
      floatingIcon.addEventListener('mouseleave', (event) => {
        setTimeout(() => {
          const iconRect = floatingIcon.getBoundingClientRect();
          const mouseX = event.clientX;
          const mouseY = event.clientY;
          
          const isOverIcon = mouseX >= iconRect.left && 
                          mouseX <= iconRect.right && 
                          mouseY >= iconRect.top && 
                          mouseY <= iconRect.bottom;
                          
          if (!isOverIcon) {
            isIconLocked = false;
            // Reset position update timer
            if (positionUpdateTimer) {
              clearTimeout(positionUpdateTimer);
              positionUpdateTimer = null;
            }
            
            // Delayed hide icon if mouse is not over the link
            if (currentHoveredLink) {
              const linkElements = document.querySelectorAll('a');
              let isOverAnyLink = false;
              
              for (const linkEl of linkElements) {
                if (linkEl.href === currentHoveredLink) {
                  const linkRect = linkEl.getBoundingClientRect();
                  if (mouseX >= linkRect.left && 
                      mouseX <= linkRect.right && 
                      mouseY >= linkRect.top && 
                      mouseY <= linkRect.bottom) {
                    isOverAnyLink = true;
                    break;
                  }
                }
              }
              
              if (!isOverAnyLink) {
                hideIconTimer = setTimeout(() => {
                  floatingIcon.style.opacity = '0';
                  floatingIcon.style.pointerEvents = 'none';
                }, 300);
              }
            }
          }
        }, 50);
      });
    }
    currentHoveredLink = link.href;
    positionIcon(floatingIcon, link);
    floatingIcon.style.opacity = '1';
    floatingIcon.style.pointerEvents = 'auto';
    
    if (hideIconTimer) {
      clearTimeout(hideIconTimer);
      hideIconTimer = null;
    }
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
    
    // Get the floating icon's position information
    const iconRect = floatingIcon.getBoundingClientRect();
    
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
      
      // Check if the mouse is over the icon
      const isOverIcon = mouseX >= iconRect.left && 
                        mouseX <= iconRect.right && 
                        mouseY >= iconRect.top && 
                        mouseY <= iconRect.bottom;
      
      // If the mouse is not in the link area or icon area and the icon is not locked, hide the icon
      if (!isOverLink && !isOverIcon && !isIconLocked) {
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
    
    // If the request has been cancelled and this is the result of a load completion, ignore
    if (isRequestCancelled && !isLoading) {
      return;
    }
    
    if (isLoading) {
      isRequestCancelled = false; // Reset cancellation state for new load
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
    background: 'radial-gradient(circle at center, rgba(25, 118, 210, 0.3), rgba(0, 0, 0, 0.5))',
    backdropFilter: 'blur(5px)',
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
    width: '520px',
    maxWidth: '90%',
    maxHeight: '85%',
    overflowY: 'auto',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    padding: '20px',
    boxSizing: 'border-box',
    opacity: '0',
    transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    color: '#333',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    // Custom scrollbar styling
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(25, 118, 210, 0.3) transparent'
  });
  
  // Insert overlay + container into the document
  document.body.appendChild(overlay);
  document.body.appendChild(container);

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
      
      // Add importance level color legend
      const colorLegend = document.createElement('div');
      Object.assign(colorLegend.style, {
        marginBottom: '25px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #f1f7fe, #f8f9fa)',
        padding: '18px',
        boxShadow: '0 2px 10px rgba(25, 118, 210, 0.1)',
        position: 'relative',
        border: '1px solid rgba(25, 118, 210, 0.08)',
        transition: 'all 0.3s ease',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: '0.9rem'
      });
      
      const legendTitle = document.createElement('div');
      legendTitle.innerText = "Privacy Importance Level Legend";
      Object.assign(legendTitle.style, {
        marginTop: '0',
        marginBottom: '15px',
        fontSize: '1.1rem',
        fontWeight: '600',
        position: 'relative',
        paddingBottom: '8px',
        background: 'linear-gradient(to right, #1976d2, #2196f3)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block'
      });
      
      // Add title underline
      const legendUnderline = document.createElement('div');
      Object.assign(legendUnderline.style, {
        position: 'absolute',
        bottom: '0',
        left: '0',
        width: '40px',
        height: '3px',
        background: 'linear-gradient(to right, #1976d2, #2196f3)',
        borderRadius: '3px'
      });
      legendTitle.appendChild(legendUnderline);
      
      colorLegend.appendChild(legendTitle);
      
      // Create gradient color bar container
      const gradientBarContainer = document.createElement('div');
      Object.assign(gradientBarContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      });
      
      // Define importance colors
      const importanceColors = [
        { level: 5, color: '#b71c1c', gradient: 'linear-gradient(135deg, #b71c1c, #d32f2f)' },  // Very Important - Red
        { level: 4, color: '#e64a19', gradient: 'linear-gradient(135deg, #e64a19, #ff5722)' },  // Important - Orange
        { level: 3, color: '#ffa000', gradient: 'linear-gradient(135deg, #ffa000, #ffc107)' },  // Medium - Yellow
        { level: 2, color: '#7cb342', gradient: 'linear-gradient(135deg, #7cb342, #8bc34a)' },  // Low - Light Green
        { level: 1, color: '#388e3c', gradient: 'linear-gradient(135deg, #388e3c, #4caf50)' }   // Very Low - Green
      ];
      
      // Filter status variable
      let currentFilter = null;
      
      // Create filter status indicator
      const filterStatusContainer = document.createElement('div');
      Object.assign(filterStatusContainer.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '10px',
        padding: '6px',
        borderRadius: '4px',
        backgroundColor: 'rgba(25, 118, 210, 0.05)',
        opacity: '0',
        height: '0',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      });
      
      const filterStatusText = document.createElement('div');
      filterStatusText.innerText = 'No filter';
      Object.assign(filterStatusText.style, {
        fontSize: '0.9rem',
        fontWeight: '500'
      });
      
      const clearFilterBtn = document.createElement('button');
      clearFilterBtn.innerText = 'Clear Filter';
      Object.assign(clearFilterBtn.style, {
        border: 'none',
        background: 'rgba(25, 118, 210, 0.1)',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.8rem',
        cursor: 'pointer',
        transition: 'background 0.2s'
      });
      
      clearFilterBtn.addEventListener('mouseover', () => {
        clearFilterBtn.style.background = 'rgba(25, 118, 210, 0.2)';
      });
      
      clearFilterBtn.addEventListener('mouseout', () => {
        clearFilterBtn.style.background = 'rgba(25, 118, 210, 0.1)';
      });
      
      filterStatusContainer.appendChild(filterStatusText);
      filterStatusContainer.appendChild(clearFilterBtn);
      
      // Function to show filter status
      function showFilterStatus(level) {
        if (level === null) {
          filterStatusText.innerText = 'No filter';
          filterStatusContainer.style.opacity = '0';
          filterStatusContainer.style.height = '0';
          filterStatusContainer.style.padding = '0 6px';
          filterStatusContainer.style.marginTop = '0';
        } else {
          // Get the color of the current filter level
          const colorInfo = importanceColors.find(item => item.level === level);
          const levelColorMap = {
            5: 'Most Important (Red)',
            4: 'Important (Orange)',
            3: 'Medium (Yellow)',
            2: 'Low (Light Green)',
            1: 'Very Low (Green)'
          };
          
          filterStatusText.innerText = `Current Filter: ${levelColorMap[level] || `Level ${level}`}`;
          filterStatusText.style.color = colorInfo ? colorInfo.color : '#333';
          
          filterStatusContainer.style.opacity = '1';
          filterStatusContainer.style.height = 'auto';
          filterStatusContainer.style.padding = '6px';
          filterStatusContainer.style.marginTop = '10px';
          
          if (colorInfo) {
            filterStatusContainer.style.borderLeft = `3px solid ${colorInfo.color}`;
          }
        }
      }
      
      // Track current filtering operation
      let currentFilterOperation = 0;
      
      // Function to apply filter
      function applyFilter(level) {
        const allCategoryDivs = document.querySelectorAll('.summary-content');
        
        // Increment filter operation counter to track the latest operation
        currentFilterOperation++;
        const thisFilterOperation = currentFilterOperation;
        
        // Check if filter animations styles exist
        if (!document.querySelector('style#filter-animations')) {
          const styleSheet = document.createElement('style');
          styleSheet.id = 'filter-animations';
          styleSheet.textContent = `
            @keyframes bubbleFilterOut {
              0% { opacity: 1; transform: translateY(0) scale(1); }
              100% { opacity: 0; transform: translateY(20px) scale(0.8); }
            }
            
            @keyframes bubbleFilterIn {
              0% { opacity: 0; transform: translateY(20px) scale(0.8); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }

            @keyframes containerHeightAdjust {
              0% { height: var(--start-height); }
              100% { height: var(--end-height); }
            }
          `;
          document.head.appendChild(styleSheet);
        }
        
        // Step 1: Apply fade-out animation to ALL visible bubbles
        let totalBubbles = 0;
        const allBubbles = [];
        const bubblesToShow = []; // Track bubbles that will be shown after animation
        
        allCategoryDivs.forEach(categoryDiv => {
          const bubbles = categoryDiv.querySelectorAll('div[style*="border-radius: 25px"]');
          
          bubbles.forEach(bubble => {
            // Get importance level
            let bubbleLevel = parseInt(bubble.dataset.importance);
            
            // Record if this bubble should be shown in the next phase
            if (level === null || bubbleLevel === level) {
              bubblesToShow.push(bubble);
            }
            
            // Only animate bubbles that are currently visible
            if (bubble.style.display !== 'none' && bubble.style.opacity !== '0') {
              allBubbles.push(bubble);
              totalBubbles++;
              
              const shouldShowInNextPhase = bubblesToShow.includes(bubble);
              
              if (!shouldShowInNextPhase) {
                // Cancel any ongoing animations first
                bubble.style.animationName = '';
                bubble.style.transition = '';
                
                // Set animation properties for fade out
                bubble.style.animationName = 'bubbleFilterOut';
                bubble.style.animationDuration = '0.4s';
                bubble.style.animationTimingFunction = 'cubic-bezier(0.4, 0, 0.2, 1)';
                bubble.style.animationFillMode = 'forwards';
                // Use a smaller random delay to make the animation look more natural
                // but ensure all bubbles start fading out quickly
                bubble.style.animationDelay = `${Math.random() * 0.15}s`;
                
                // Listen for animation end to ensure display:none is set
                const animEndHandler = () => {
                  if (thisFilterOperation === currentFilterOperation) {
                    bubble.style.display = 'none';
                  }
                  bubble.removeEventListener('animationend', animEndHandler);
                };
                bubble.addEventListener('animationend', animEndHandler);
              }
            } else if (bubblesToShow.includes(bubble)) {
              // If bubble is already hidden but should be shown in next phase
              bubble.style.display = 'none';
              bubble.style.opacity = '0';
            }
          });
        });
        
        // Step 2: After all are hidden, show only the filtered ones
        const showFilteredBubbles = () => {
          // Only proceed if this is still the current filter operation
          if (currentFilterOperation !== thisFilterOperation) {
            return; // A newer filter operation has started
          }
          
          // Create a mapping of bubble visibility for each category container
          const categoryVisibleBubbles = new Map();
          
          allCategoryDivs.forEach(categoryDiv => {
            const bubbles = categoryDiv.querySelectorAll('div[style*="border-radius: 25px"]');
            const visibleCount = Array.from(bubbles).filter(bubble => 
              bubblesToShow.includes(bubble)).length;
            categoryVisibleBubbles.set(categoryDiv, visibleCount);
          });

          // Adjust the height of each category container
          allCategoryDivs.forEach(categoryDiv => {
            const visibleCount = categoryVisibleBubbles.get(categoryDiv);
            const bubbleContainer = categoryDiv.querySelector('div[style*="display: flex"][style*="flex-wrap: wrap"]');
            
            if (bubbleContainer) {
              // Store the current height as the starting height
              const currentHeight = categoryDiv.offsetHeight;
              categoryDiv.style.setProperty('--start-height', `${currentHeight}px`);
              
              // Apply a temporary fixed height to the container for the subsequent animation
              categoryDiv.style.height = `${currentHeight}px`;
              categoryDiv.style.minHeight = 'auto';
              categoryDiv.style.transition = 'none';

              // Calculate the required height after showing the bubbles
              setTimeout(() => {
                // First, arrange to show the bubbles
                bubblesToShow.forEach((bubble, index) => {
                  if (bubble.closest('.summary-content') === categoryDiv) {
                    // Check if the current bubble is already visible and does not need fade-in animation
                    const isAlreadyVisible = bubble.style.display !== 'none' && 
                                           bubble.style.opacity !== '0' && 
                                           !bubble.style.animationName;
                    
                    if (!isAlreadyVisible) {
                      // Clear any existing animations before showing the bubble
                      bubble.style.animationName = '';
                      bubble.style.transition = '';
                      
                      // Set to visible but transparent, ready for animation
                      bubble.style.display = '';
                      bubble.style.opacity = '0';
                      
                      // To avoid flickering, use requestAnimationFrame to ensure DOM updates
                      requestAnimationFrame(() => {
                        if (currentFilterOperation !== thisFilterOperation) return;
                        
                        // Apply fade-in animation
                        bubble.style.animationName = 'bubbleFilterIn';
                        bubble.style.animationDuration = '0.5s';
                        bubble.style.animationTimingFunction = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
                        bubble.style.animationFillMode = 'forwards';
                        bubble.style.animationDelay = `${index * 0.05}s`;
                        
                        const animInEndHandler = () => {
                          bubble.style.opacity = '1';
                          // Ensure the transition property is retained
                          bubble.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s, background 0.3s, opacity 0.3s';
                          bubble.removeEventListener('animationend', animInEndHandler);
                        };
                        bubble.addEventListener('animationend', animInEndHandler);
                      });
                    } else {
                      // The bubble is already visible, ensure it has the correct styles
                      bubble.style.opacity = '1';
                      bubble.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s, background 0.3s, opacity 0.3s';
                    }
                  }
                });
                
                // Calculate the new height of the container
                setTimeout(() => {
                  if (currentFilterOperation !== thisFilterOperation) return;
                  
                  // If there are bubbles, calculate the new height based on the bubbles
                  if (visibleCount > 0) {
                    // After showing all bubbles, calculate the container content height
                    const titleHeight = categoryDiv.querySelector('h3').offsetHeight;
                    const paddingTop = 18; // 根据categoryDiv的padding
                    const paddingBottom = 18;
                    const marginBottom = 15; // bubbleContainer的margin-bottom
                    
                    // Ensure accurate container content height
                    const bubbleContainerHeight = bubbleContainer.scrollHeight;
                    const requiredHeight = titleHeight + bubbleContainerHeight + paddingTop + paddingBottom + marginBottom;
                    
                    // Set the target height
                    categoryDiv.style.setProperty('--end-height', `${requiredHeight}px`);
                    
                    // Apply height animation
                    categoryDiv.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    categoryDiv.style.height = `${requiredHeight}px`;
                  } else {
                    // If there are no bubbles to display, set the minimum height
                    const minHeight = 100; // Minimum height, including the title
                    categoryDiv.style.setProperty('--end-height', `${minHeight}px`);
                    categoryDiv.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    categoryDiv.style.height = `${minHeight}px`;
                  }
                }, 100);
              }, 0);
            }
          });
        };
        
        // Use setTimeout for the second phase - make it slightly longer to ensure all fade-out animations complete
        setTimeout(showFilteredBubbles, 500);
      }
      
      // Function to reset all bubble animation states
      function resetBubbleAnimations() {
        const allBubbles = document.querySelectorAll('div[style*="border-radius: 25px"]');
        allBubbles.forEach(bubble => {
          bubble.style.animationName = '';
          
          if (!bubble.style.transition || bubble.style.transition === '') {
            bubble.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s, background 0.3s, opacity 0.3s';
          }
        });
      }
      
      // Clear filter button click event
      clearFilterBtn.addEventListener('click', () => {
        // First, increment the operation count to ensure any ongoing filter operations are cancelled
        currentFilterOperation++;
        
        currentFilter = null;
        
        // Reset all selected states
        const allSegments = segmentedBar.querySelectorAll('div');
        allSegments.forEach(segment => {
          segment.style.transform = 'scaleY(1)';
          segment.style.opacity = '1';
        });
        
        const allNumbers = numbersContainer.querySelectorAll('div');
        allNumbers.forEach(number => {
          number.style.transform = 'scale(1)';
          number.style.fontWeight = '600';
          number.style.boxShadow = `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px ${number.style.color}30`;
          number.style.opacity = '1';
        });
        
        applyFilter(null);
        showFilterStatus(null);
      });
      
      // Create segmented color bar
      const segmentedBar = document.createElement('div');
      Object.assign(segmentedBar.style, {
        display: 'flex',
        width: '100%',
        height: '25px',
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer'
      });
      
      // Create segments
      importanceColors.forEach(item => {
        const segment = document.createElement('div');
        Object.assign(segment.style, {
          flex: '1',
          background: item.gradient,
          transition: 'all 0.3s ease'
        });
        
        // Add data attribute to store importance level
        segment.dataset.level = item.level;
        
        // Add hover effect
        segment.addEventListener('mouseover', () => {
          if (currentFilter !== item.level) {
            segment.style.transform = 'scaleY(1.1)';
          }
        });
        
        segment.addEventListener('mouseout', () => {
          if (currentFilter !== item.level) {
            segment.style.transform = 'scaleY(1)';
          }
        });
        
        // Add click filter functionality
        segment.addEventListener('click', () => {
          // Reset all bubble animation states
          resetBubbleAnimations();
          
          // If the current level is already selected, clear the filter
          if (currentFilter === item.level) {
            currentFilter = null;
            segment.style.transform = 'scaleY(1)';
            
            // Reset other color segment styles
            const allSegments = segmentedBar.querySelectorAll('div');
            allSegments.forEach(otherSegment => {
              otherSegment.style.opacity = '1';
            });
            
            // Reset all number label styles
            const allNumbers = numbersContainer.querySelectorAll('div');
            allNumbers.forEach(number => {
              number.style.transform = 'scale(1)';
              number.style.fontWeight = '600';
            });
            
            applyFilter(null);
            showFilterStatus(null);
          } else {
            // Set the current filter level
            currentFilter = item.level;
            
            // Update color segment styles
            const allSegments = segmentedBar.querySelectorAll('div');
            allSegments.forEach(otherSegment => {
              if (parseInt(otherSegment.dataset.level) === item.level) {
                otherSegment.style.transform = 'scaleY(1.2)';
                otherSegment.style.opacity = '1';
              } else {
                otherSegment.style.transform = 'scaleY(1)';
                otherSegment.style.opacity = '0.5';
              }
            });
            
            // Update number label styles
            const allNumbers = numbersContainer.querySelectorAll('div');
            allNumbers.forEach(number => {
              if (parseInt(number.innerText) === item.level) {
                number.style.transform = 'scale(1.3)';
                number.style.fontWeight = '700';
                number.style.boxShadow = `0 3px 8px rgba(0,0,0,0.15), 0 0 0 2px ${item.color}70`;
              } else {
                number.style.transform = 'scale(0.9)';
                number.style.fontWeight = '400';
                number.style.opacity = '0.6';
              }
            });
            
            applyFilter(item.level);
            showFilterStatus(item.level);
          }
        });
        
        segmentedBar.appendChild(segment);
      });
      
      // Create number labels container
      const numbersContainer = document.createElement('div');
      Object.assign(numbersContainer.style, {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        padding: '0 2%' // Add some padding to align with segments
      });
      
      // Create number labels
      importanceColors.forEach(item => {
        const numberLabel = document.createElement('div');
        numberLabel.innerText = item.level;
        Object.assign(numberLabel.style, {
          fontWeight: '600',
          fontSize: '0.9rem',
          color: item.color,
          textAlign: 'center',
          width: '20px',
          height: '20px',
          lineHeight: '20px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.7)',
          boxShadow: `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px ${item.color}30`,
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        });
        
        // Add data attribute to store importance level
        numberLabel.dataset.level = item.level;
        
        // Add hover effect
        numberLabel.addEventListener('mouseover', () => {
          if (currentFilter !== item.level) {
            numberLabel.style.transform = 'scale(1.15)';
            numberLabel.style.boxShadow = `0 2px 5px rgba(0,0,0,0.15), 0 0 0 2px ${item.color}50`;
            numberLabel.style.background = 'rgba(255, 255, 255, 0.9)';
          }
        });
        
        numberLabel.addEventListener('mouseout', () => {
          if (currentFilter !== item.level) {
            numberLabel.style.transform = 'scale(1)';
            numberLabel.style.boxShadow = `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px ${item.color}30`;
            numberLabel.style.background = 'rgba(255, 255, 255, 0.7)';
          }
        });
        
        // Click filter functionality
        numberLabel.addEventListener('click', () => {
          // Reset all bubble animation states
          resetBubbleAnimations();
          
          // If the current level is already selected, clear the filter
          if (currentFilter === item.level) {
            currentFilter = null;
            numberLabel.style.transform = 'scale(1)';
            numberLabel.style.fontWeight = '600';
            numberLabel.style.boxShadow = `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px ${item.color}30`;
            
            // Reset color segment styles
            const allSegments = segmentedBar.querySelectorAll('div');
            allSegments.forEach(segment => {
              segment.style.transform = 'scaleY(1)';
              segment.style.opacity = '1';
            });
            
            // Reset other number label styles
            const allNumbers = numbersContainer.querySelectorAll('div');
            allNumbers.forEach(number => {
              if (number !== numberLabel) {
                number.style.transform = 'scale(1)';
                number.style.fontWeight = '600';
                number.style.opacity = '1';
              }
            });
            
            applyFilter(null);
            showFilterStatus(null);
          } else {
            // Set the current filter level
            currentFilter = item.level;
            
            // Update number label styles
            const allNumbers = numbersContainer.querySelectorAll('div');
            allNumbers.forEach(number => {
              if (parseInt(number.innerText) === item.level) {
                number.style.transform = 'scale(1.3)';
                number.style.fontWeight = '700';
                number.style.boxShadow = `0 3px 8px rgba(0,0,0,0.15), 0 0 0 2px ${item.color}70`;
                number.style.opacity = '1';
              } else {
                number.style.transform = 'scale(0.9)';
                number.style.fontWeight = '400';
                number.style.opacity = '0.6';
              }
            });
            
            // Update color segment styles
            const allSegments = segmentedBar.querySelectorAll('div');
            allSegments.forEach(segment => {
              if (parseInt(segment.dataset.level) === item.level) {
                segment.style.transform = 'scaleY(1.2)';
                segment.style.opacity = '1';
              } else {
                segment.style.transform = 'scaleY(1)';
                segment.style.opacity = '0.5';
              }
            });
            
            applyFilter(item.level);
            showFilterStatus(item.level);
          }
        });
        
        numbersContainer.appendChild(numberLabel);
      });
      
      // Add text labels container
      const textLabelsContainer = document.createElement('div');
      Object.assign(textLabelsContainer.style, {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: '5px'
      });
      
      // Add left label (Most Important)
      const leftLabel = document.createElement('div');
      leftLabel.innerText = "Most Important";
      Object.assign(leftLabel.style, {
        fontWeight: '500',
        fontSize: '0.85rem',
        color: '#b71c1c'
      });
      
      // Add right label (Least Important)
      const rightLabel = document.createElement('div');
      rightLabel.innerText = "Least Important";
      Object.assign(rightLabel.style, {
        fontWeight: '500',
        fontSize: '0.85rem',
        color: '#388e3c'
      });
      
      textLabelsContainer.appendChild(leftLabel);
      textLabelsContainer.appendChild(rightLabel);
      
      gradientBarContainer.appendChild(segmentedBar);
      gradientBarContainer.appendChild(numbersContainer);
      gradientBarContainer.appendChild(textLabelsContainer);
      gradientBarContainer.appendChild(filterStatusContainer);
      colorLegend.appendChild(gradientBarContainer);
      
      container.appendChild(colorLegend);
      
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
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #f1f7fe, #f8f9fa)',
          padding: '18px',
          boxShadow: '0 2px 10px rgba(25, 118, 210, 0.1)',
          position: 'relative',
          border: '1px solid rgba(25, 118, 210, 0.08)',
          transition: 'all 0.3s ease'
        });

        const categoryTitle = document.createElement('h3');
        categoryTitle.innerText = category.title;
        Object.assign(categoryTitle.style, {
          marginTop: '0',
          marginBottom: '15px',
          color: '#1976d2',
          fontSize: '1.1rem',
          fontWeight: '600',
          position: 'relative',
          paddingBottom: '8px',
          background: 'linear-gradient(to right, #1976d2, #2196f3)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'inline-block'
        });
        
        // Add category title underline
        const categoryUnderline = document.createElement('div');
        Object.assign(categoryUnderline.style, {
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '40px',
          height: '3px',
          background: 'linear-gradient(to right, #1976d2, #2196f3)',
          borderRadius: '3px'
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
          
          // Create bubble for each item
          category.data.forEach((item, itemIndex) => {
            const bubble = document.createElement('div');
            
            // Determine bubble color based on importance level
            let bubbleColor = '';
            let bubbleShadow = '';
            
            // Check if importance attribute exists and set corresponding color
            if (item.importance !== undefined) {
              // Importance levels: 5-Very Important(Red), 4-Important(Orange), 3-Medium(Yellow), 2-Low(Light Green), 1-Very Low(Green), 0-Unknown(Gray)
              switch(item.importance) {
                case 5: // Very Important - Red
                  bubbleColor = 'linear-gradient(135deg, #b71c1c, #d32f2f)';
                  bubbleShadow = '0 3px 8px rgba(183, 28, 28, 0.4)';
                  break;
                case 4: // Important - Orange
                  bubbleColor = 'linear-gradient(135deg, #e64a19, #ff5722)';
                  bubbleShadow = '0 3px 8px rgba(255, 87, 34, 0.3)';
                  break;
                case 3: // Medium - Yellow
                  bubbleColor = 'linear-gradient(135deg, #ffa000, #ffc107)';
                  bubbleShadow = '0 3px 8px rgba(255, 193, 7, 0.3)';
                  break;
                case 2: // Low - Light Green
                  bubbleColor = 'linear-gradient(135deg, #7cb342, #8bc34a)';
                  bubbleShadow = '0 3px 8px rgba(139, 195, 74, 0.3)';
                  break;
                case 1: // Very Low - Green
                  bubbleColor = 'linear-gradient(135deg, #388e3c, #4caf50)';
                  bubbleShadow = '0 3px 8px rgba(76, 175, 80, 0.3)';
                  break;
                case 0: // Unknown - Gray
                default:
                  bubbleColor = 'linear-gradient(135deg, #757575, #9e9e9e)';
                  bubbleShadow = '0 3px 8px rgba(158, 158, 158, 0.3)';
                  break;
              }
            } else {
              // Default color - Blue
              bubbleColor = 'linear-gradient(135deg, #1976d2, #2196f3)';
              bubbleShadow = '0 3px 8px rgba(33, 150, 243, 0.3)';
            }
            
            Object.assign(bubble.style, {
              background: bubbleColor,
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600',
              boxShadow: bubbleShadow,
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s, background 0.3s, opacity 0.3s',
              opacity: '0',
              transform: 'translateY(20px)',
              willChange: 'transform, opacity, box-shadow',
              animationFillMode: 'forwards',
              animationName: 'bubbleIn',
              animationDuration: '0.5s',
              animationDelay: `${0.3 + itemIndex * 0.05}s`,
              animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            });
            
            // Add custom data attribute to store importance level for filtering
            bubble.dataset.importance = item.importance !== undefined ? item.importance : '';
            
            bubble.innerText = item.keyword;
            
            // Add keyframe animation
            if (!document.querySelector('style#bubble-animations')) {
              const styleSheet = document.createElement('style');
              styleSheet.id = 'bubble-animations';
              styleSheet.textContent = `
                @keyframes bubbleIn {
                  from { opacity: 0; transform: translateY(20px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `;
              document.head.appendChild(styleSheet);
            }
            
            // Listen for animation end, remove animation properties to allow hover effect
            bubble.addEventListener('animationend', function() {
              this.style.opacity = '1';
              this.style.transform = 'translateY(0)';
              this.style.animationName = '';
              this.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s, background 0.3s, opacity 0.3s';
            });
            
            // Adjust mouse hover effect based on importance level
            bubble.addEventListener('mouseover', function() {
              this.style.transform = 'translateY(-5px) scale(1.03)';
              
              // Enhance shadow effect and slightly darken color based on original color type
              if (item.importance !== undefined) {
                switch(item.importance) {
                  case 5: // Very Important - Red
                    this.style.boxShadow = '0 5px 12px rgba(183, 28, 28, 0.5)';
                    this.style.background = 'linear-gradient(135deg, #96140e, #b71c1c)';
                    break;
                  case 4: // Important - Orange
                    this.style.boxShadow = '0 5px 12px rgba(255, 87, 34, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #d84315, #f4511e)';
                    break;
                  case 3: // Medium - Yellow
                    this.style.boxShadow = '0 5px 12px rgba(255, 193, 7, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #ff8f00, #ffb300)';
                    break;
                  case 2: // Low - Light Green
                    this.style.boxShadow = '0 5px 12px rgba(139, 195, 74, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #689f38, #7cb342)';
                    break;
                  case 1: // Very Low - Green
                    this.style.boxShadow = '0 5px 12px rgba(76, 175, 80, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #2e7d32, #388e3c)';
                    break;
                  case 0: // Unknown - Gray
                  default:
                    this.style.boxShadow = '0 5px 12px rgba(158, 158, 158, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #616161, #757575)';
                    break;
                }
              } else {
                // Default blue hover effect
                this.style.boxShadow = '0 5px 12px rgba(33, 150, 243, 0.4)';
                this.style.background = 'linear-gradient(135deg, #1565c0, #1e88e5)';
              }
            });
            
            bubble.addEventListener('mouseout', function() {
              this.style.transform = 'translateY(0) scale(1)';
              this.style.boxShadow = bubbleShadow;
              this.style.background = bubbleColor;
            });
            
            // Click bubble to show summary
            bubble.addEventListener('click', () => {
              // If there is an expanded popup, close it first
              if (currentExpandedSummary) {
                // Get the close button of current popup and trigger click event
                const closeBtn = currentExpandedSummary.querySelector('div[role="button"], div.close-btn');
                if (closeBtn) {
                  closeBtn.click();
                } else {
                  // If close button not found, directly remove current popup
                  currentExpandedSummary.remove();
                  
                  // Reset tracking variable
                  currentExpandedSummary = null;
                }
                
                // Give some time for previous popup closing animation to complete
                setTimeout(() => {
                  showExpandedSummary();
                }, 300);
                return;
              }
              
              // No expanded popup, create new one directly
              showExpandedSummary();
              
              // Show expanded summary
              function showExpandedSummary() {
                // Get current bubble position and size
                const bubbleRect = bubble.getBoundingClientRect();
                const categoryRect = categoryDiv.getBoundingClientRect();
                
                // Calculate bubble position relative to category container
                const relativeLeft = bubbleRect.left - categoryRect.left;
                const relativeTop = bubbleRect.top - categoryRect.top;
                
                // Create expanded summary box
                const expandedSummary = document.createElement('div');
                expandedSummary.className = 'expanded-summary';
                Object.assign(expandedSummary.style, {
                  position: 'absolute',
                  left: `${relativeLeft}px`,
                  top: `${relativeTop}px`,
                  width: `${bubbleRect.width}px`,
                  height: `${bubbleRect.height}px`,
                  background: 'linear-gradient(135deg, #ffffff, #f8faff)',
                  color: '#333',
                  borderRadius: '12px',
                  padding: '20px',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  boxShadow: '0 10px 30px rgba(25, 118, 210, 0.15)',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  cursor: 'pointer',
                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transformOrigin: 'center center',
                  overflow: 'auto',
                  border: '1px solid rgba(25, 118, 210, 0.08)',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                });
                
                // Add expanded summary box to bubble container
                bubbleContainer.appendChild(expandedSummary);
                
                // Set global variable to track current expanded popup
                currentExpandedSummary = expandedSummary;
                
                // Hide original bubble
                bubble.style.opacity = '0';
                
                // Calculate expanded size
                const expandedWidth = categoryDiv.clientWidth - 30;
                
                // Create temporary content element to calculate required height
                const tempContent = document.createElement('div');
                tempContent.style.position = 'absolute';
                tempContent.style.visibility = 'hidden';
                tempContent.style.width = `${expandedWidth - 40}px`;
                tempContent.style.padding = '20px';
                tempContent.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
                tempContent.style.boxSizing = 'border-box';
                
                // Add title and content
                const tempTitle = document.createElement('h4');
                tempTitle.innerText = item.keyword;
                tempTitle.style.margin = '0 0 12px 0';
                tempTitle.style.fontSize = '1.1rem';
                tempTitle.style.fontWeight = '600';
                tempTitle.style.position = 'relative';
                tempTitle.style.paddingBottom = '8px';
                tempTitle.style.letterSpacing = '-0.02em';
                
                const tempUnderline = document.createElement('div');
                tempUnderline.style.position = 'absolute';
                tempUnderline.style.bottom = '0';
                tempUnderline.style.left = '0';
                tempUnderline.style.width = '40px';
                tempUnderline.style.height = '2px';
                tempTitle.appendChild(tempUnderline);
                
                const tempText = document.createElement('div');
                tempText.innerText = item.summary;
                tempText.style.lineHeight = '1.6';
                tempText.style.marginBottom = '15px';
                tempText.style.fontSize = '0.95rem';
                tempText.style.fontWeight = '300';
                tempText.style.wordBreak = 'break-word';
                tempText.style.overflowWrap = 'break-word';
                
                const tempLink = document.createElement('a');
                tempLink.innerText = "View Original Text";
                tempLink.style.display = 'inline-block';
                tempLink.style.padding = '6px 12px';
                tempLink.style.marginBottom = '10px';
                tempLink.style.fontSize = '0.9rem';
                tempLink.style.border = '1px solid #ccc';
                
                // Add close button placeholder
                const tempCloseBtn = document.createElement('div');
                tempCloseBtn.style.height = '24px';
                tempCloseBtn.style.marginBottom = '10px';
                
                // Add all elements to temporary container
                tempContent.appendChild(tempCloseBtn);
                tempContent.appendChild(tempTitle);
                tempContent.appendChild(tempText);
                tempContent.appendChild(tempLink);
                document.body.appendChild(tempContent);
                
                // Calculate content height more precisely
                const titleHeight = tempTitle.offsetHeight;
                const textHeight = tempText.offsetHeight;
                const linkHeight = tempLink.offsetHeight;
                const closeBtnHeight = tempCloseBtn.offsetHeight;
                const totalPadding = 40; // 20px padding for top and bottom each
                const margins = 15 + 10 + 10; // Margins: 12px below title + 15px below text + 10px below link
                
                // Calculate exact required height
                const exactContentHeight = titleHeight + textHeight + linkHeight + closeBtnHeight + margins + totalPadding;
                document.body.removeChild(tempContent);
                
                // Set minimum and maximum height limits
                const minHeight = 170; // Basic minimum height required for display
                const maxHeight = Math.min(500, window.innerHeight * 0.7); // Maximum height limit
                
                // Determine final height based on content length, add 5px buffer to ensure content is fully displayed
                const dynamicHeight = Math.max(minHeight, Math.min(exactContentHeight + 5, maxHeight));
                
                // Record original height and style of category container
                const originalHeight = categoryDiv.clientHeight; // 使用实际高度值而不是style.height
                const originalMinHeight = categoryDiv.style.minHeight;
                const originalHeightBeforeExpand = categoryDiv.offsetHeight; // 添加一个备用测量
                
                // Set expansion animation
                setTimeout(() => {
                  // Calculate expanded position to ensure it doesn't exceed container boundaries
                  let finalLeft = relativeLeft;
                  
                  // If bubble is not at leftmost position, adjust position to avoid right boundary overflow
                  if (relativeLeft + expandedWidth > categoryDiv.clientWidth - 15) {
                    // Move expanded box left to align its right edge with container right edge (15px margin)
                    finalLeft = categoryDiv.clientWidth - expandedWidth - 15;
                  }
                  
                  expandedSummary.style.zIndex = '20';
                  
                  expandedSummary.style.width = `${expandedWidth}px`;
                  expandedSummary.style.height = `${dynamicHeight}px`;
                  expandedSummary.style.left = `${finalLeft}px`;
                  expandedSummary.style.borderRadius = '12px';
                  expandedSummary.style.padding = '20px';
                  expandedSummary.style.alignItems = 'flex-start';
                  expandedSummary.style.justifyContent = 'flex-start';
                  expandedSummary.style.overflow = 'auto';
                  
                  // Get bubble color for border
                  const bubbleColor = bubble.style.background;
                  let borderColor = '';
                  
                  // Extract second color value from gradient for border
                  if (bubbleColor.includes('linear-gradient')) {
                    const colorMatch = bubbleColor.match(/,\s*([^)]+)\)/);
                    if (colorMatch && colorMatch[1]) {
                      borderColor = colorMatch[1].trim();
                    } else {
                      borderColor = '#1976d2'; // Default blue
                    }
                  } else {
                    borderColor = bubbleColor;
                  }
                  
                  // Set white background and add border color based on importance
                  expandedSummary.style.background = '#fff';
                  expandedSummary.style.border = `2px solid ${borderColor}`;
                  expandedSummary.style.color = '#333';
                  expandedSummary.style.boxShadow = `0 10px 30px rgba(0, 0, 0, 0.2)`;
                  
                  // Calculate bottom position of expanded summary box (relative to category container)
                  const summaryBottom = relativeTop + dynamicHeight + 20; // Add bottom margin
                  
                  // Check if it will exceed category container bottom
                  if (summaryBottom > categoryDiv.clientHeight) {
                    // Calculate additional height needed
                    const extraHeight = summaryBottom - categoryDiv.clientHeight + 20; // Extra margin
                    
                    const currentHeight = categoryDiv.offsetHeight;
                    
                    // 1. First set overflow style to visible to ensure content is not clipped
                    categoryDiv.style.overflow = 'visible';
                    
                    // 2. Create a simple transition
                    categoryDiv.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    
                    // 3. Directly set height, let browser handle transition
                    categoryDiv.style.height = `${currentHeight + extraHeight}px`;
                    
                    // 4. Ensure minimum height is also set to prevent shrinkage
                    categoryDiv.style.minHeight = `${currentHeight}px`;
                    
                    // 5. Clean up styles after transition
                    setTimeout(() => {
                      categoryDiv.style.transition = '';
                    }, 600);
                  }
                  
                  // Add close button
                  const closeBtn = document.createElement('div');
                  closeBtn.innerHTML = '×';
                  closeBtn.className = 'close-btn';
                  closeBtn.setAttribute('role', 'button');
                  closeBtn.setAttribute('aria-label', 'Close');
                  Object.assign(closeBtn.style, {
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    color: borderColor, // Use same color as border
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    zIndex: 11,
                    fontWeight: 'bold'
                  });
                  
                  closeBtn.addEventListener('mouseover', () => {
                    closeBtn.style.backgroundColor = 'rgba(25, 118, 210, 0.2)';
                  });
                  
                  closeBtn.addEventListener('mouseout', () => {
                    closeBtn.style.backgroundColor = 'rgba(25, 118, 210, 0.1)';
                  });
                  
                  // Add close functionality
                  closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // 1. First ensure content is visible
                    categoryDiv.style.overflow = 'visible';
                    
                    // 2. Set bubble collapsing animation
                    expandedSummary.classList.add('collapsing');
                    expandedSummary.style.width = `${bubbleRect.width}px`;
                    expandedSummary.style.height = `${bubbleRect.height}px`;
                    expandedSummary.style.left = `${relativeLeft}px`;
                    expandedSummary.style.borderRadius = '25px';
                    expandedSummary.style.padding = '10px 18px';
                    expandedSummary.style.alignItems = 'center';
                    expandedSummary.style.justifyContent = 'center';
                    expandedSummary.style.overflow = 'hidden';
                    expandedSummary.style.opacity = '0';
                    expandedSummary.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    
                    // 3. Show original bubble
                    bubble.style.opacity = '1';
                    bubble.style.transition = 'opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s, background 0.3s';
                    
                    // 4. Set transition effect
                    categoryDiv.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    
                    // 5. Use recorded numeric height, ensure valid value
                    if (originalHeight && originalHeight > 0) {
                      categoryDiv.style.height = `${originalHeight}px`;
                    } else if (originalHeightBeforeExpand && originalHeightBeforeExpand > 0) {
                      categoryDiv.style.height = `${originalHeightBeforeExpand}px`;
                    } else {
                      // If there is no valid original height, use the natural height of the content
                      categoryDiv.style.height = 'auto';
                    }
                    
                    // Restore original minimum height
                    categoryDiv.style.minHeight = originalMinHeight || 'auto';
                    
                    // 6. Clean up all styles after transition and remove expanded summary box
                    setTimeout(() => {
                      categoryDiv.style.transition = '';
                      categoryDiv.style.overflow = '';
                      
                      bubble.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s, background 0.3s, opacity 0.3s';
                      
                      expandedSummary.remove();
                      if (currentExpandedSummary === expandedSummary) {
                        currentExpandedSummary = null;
                      }
                    }, 600);
                  });
                  
                  expandedSummary.appendChild(closeBtn);
                  
                  // Add summary content
                  const summaryContent = document.createElement('div');
                  Object.assign(summaryContent.style, {
                    width: '100%',
                    height: '100%',
                    overflow: 'auto',
                    paddingRight: '10px',
                    textAlign: 'left'
                  });
                  
                  // Create summary title
                  const summaryTitle = document.createElement('h4');
                  summaryTitle.innerText = item.keyword;
                  Object.assign(summaryTitle.style, {
                    margin: '0 0 12px 0',
                    color: borderColor,
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    opacity: '0',
                    transform: 'translateY(10px)',
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                    position: 'relative',
                    paddingBottom: '8px',
                    letterSpacing: '-0.02em',
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  });
                  
                  // Add title underline to match summary page style
                  const titleUnderline = document.createElement('div');
                  Object.assign(titleUnderline.style, {
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    width: '40px',
                    height: '2px',
                    backgroundColor: borderColor,
                    borderRadius: '2px'
                  });
                  summaryTitle.appendChild(titleUnderline);
                  
                  summaryContent.appendChild(summaryTitle);
                  
                  // Create summary content
                  const summaryText = document.createElement('div');
                  summaryText.innerText = item.summary;
                  Object.assign(summaryText.style, {
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    marginBottom: '15px',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    color: '#333',
                    opacity: '0',
                    transform: 'translateY(10px)',
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                    transitionDelay: '0.1s',
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    fontWeight: '300'
                  });
                  summaryContent.appendChild(summaryText);
                  
                  // Create original text link
                  const contextLink = document.createElement('a');
                  contextLink.innerText = "View Original Text";
                  contextLink.href = "#";
                  Object.assign(contextLink.style, {
                    color: borderColor,
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    display: 'inline-block',
                    padding: '6px 12px',  
                    margin: '0 0 10px 0',
                    backgroundColor: `rgba(${hexToRgb(borderColor)}, 0.1)`,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    transition: 'background-color 0.2s',
                    opacity: '0',
                    transform: 'translateY(10px)',
                    transition: 'opacity 0.3s ease, transform 0.3s ease, background-color 0.2s',
                    transitionDelay: '0.2s'
                  });
                  
                  // Add hover effect
                  contextLink.addEventListener('mouseover', () => {
                    contextLink.style.backgroundColor = `rgba(${hexToRgb(borderColor)}, 0.2)`;
                  });
                  
                  contextLink.addEventListener('mouseout', () => {
                    contextLink.style.backgroundColor = `rgba(${hexToRgb(borderColor)}, 0.1)`;
                  });
                  
                  // Handle click to view original text
                  contextLink.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const searchText = item.context;
                    
                    // Get current tab ID
                    chrome.runtime.sendMessage({ action: "getCurrentTabId" }, (response) => {
                      const sourceTabId = response.tabId;
                      
                      // Store original URL and search text
                      chrome.storage.local.set({
                        originalTextHighlight: {
                          text: searchText,
                          sourceUrl: originalUrl,
                          summaryData: text,
                          sourceTabId: sourceTabId
                        }
                      }, () => {
                        // Open original privacy policy URL in new tab
                        chrome.runtime.sendMessage({
                          action: "openOriginalText",
                          url: originalUrl
                        });
                      });
                    });
                  };
                  
                  summaryContent.appendChild(contextLink);
                  expandedSummary.appendChild(summaryContent);
                  
                  // Use requestAnimationFrame to ensure DOM updates before applying animation
                  requestAnimationFrame(() => {
                    // Delay showing content elements to create cascade effect
                    setTimeout(() => {
                      summaryTitle.style.opacity = '1';
                      summaryTitle.style.transform = 'translateY(0)';
                    }, 50);
                    
                    setTimeout(() => {
                      summaryText.style.opacity = '1';
                      summaryText.style.transform = 'translateY(0)';
                    }, 150);
                    
                    setTimeout(() => {
                      contextLink.style.opacity = '1';
                      contextLink.style.transform = 'translateY(0)';
                    }, 250);
                  });
                }, 50);
              }
            });
            
            bubbleContainer.appendChild(bubble);
          });
          
          categoryDiv.appendChild(bubbleContainer);
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
    // If currently loading, send cancellation request to backend
    if (isLoading) {
      chrome.runtime.sendMessage({
        action: "cancelSummary"
      });
      
      isRequestCancelled = true;
    }

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

// Helper function: Convert hex color to RGB
function hexToRgb(hex) {
  // If in shorthand form, expand
  if (hex.startsWith('#')) {
    hex = hex.substring(1);
  }
  
  // Standard 6-digit hexadecimal
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  // Shorthand 3-digit hexadecimal
  else if (hex.length === 3) {
    const r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    const g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    const b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    return `${r}, ${g}, ${b}`;
  }
  
  // Default return blue
  return '25, 118, 210';
}

// Add global mouse move listener to ensure mouse position information is always available
let currentMouseX = 0;
let currentMouseY = 0;
document.addEventListener('mousemove', (event) => {
  currentMouseX = event.clientX;
  currentMouseY = event.clientY;
  
  // If the icon exists and is visible, check if the mouse is over the icon
  if (floatingIcon && floatingIcon.style.opacity === '1') {
    const iconRect = floatingIcon.getBoundingClientRect();
    
    // Check if the mouse is over the icon
    const isOverIcon = currentMouseX >= iconRect.left && 
                      currentMouseX <= iconRect.right && 
                      currentMouseY >= iconRect.top && 
                      currentMouseY <= iconRect.bottom;
    
    // If the mouse is over the icon, ensure the icon is locked
    if (isOverIcon) {
      isIconLocked = true;
      
      // Clear any timers that might cause the icon to disappear
      if (hideIconTimer) {
        clearTimeout(hideIconTimer);
        hideIconTimer = null;
      }
    }
  }
});
