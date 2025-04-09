// Content Script: Extract privacy policy text from the webpage and send to background

let floatingIcon = null;
let currentHoveredLink = null;
let hideIconTimer = null;
let isEnabled = true; 

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
    width: '24px',
    height: '24px',
    backgroundColor: '#1976d2',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    cursor: 'pointer',
    zIndex: 99997,
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    fontSize: '14px',
    userSelect: 'none'
  });
  icon.innerHTML = '📝';
  
  // Add hover effect
  icon.addEventListener('mouseover', () => {
    icon.style.transform = 'scale(1.1)';
    // When the mouse moves over the icon, clear the hide timer
    if (hideIconTimer) {
      clearTimeout(hideIconTimer);
      hideIconTimer = null;
    }
  });
  icon.addEventListener('mouseout', () => {
    icon.style.transform = 'scale(1)';
    // Setting a delay to hide when the mouse moves away from the icon
    hideIconTimer = setTimeout(() => {
      if (floatingIcon) {
        floatingIcon.style.display = 'none';
      }
    }, 500);
  });
  
  return icon;
}

// Position the floating icon next to the link
function positionIcon(icon, link) {
  const rect = link.getBoundingClientRect();
  icon.style.left = `${rect.right + 5}px`;
  icon.style.top = `${rect.top}px`;
}

// Handle mouse enter on links
function handleLinkHover(e) {
  if (!isEnabled) return;  // If the extension is disabled, return directly
  
  const link = e.target;
  if (link.href && /privacy|policy|legal|privacy-policy/i.test(link.href)) {
    if (!floatingIcon) {
      floatingIcon = createFloatingIcon();
      document.body.appendChild(floatingIcon);
      
      // Add click handler to the icon
      floatingIcon.onclick = () => {
        // Send message to background script to handle summarization
        chrome.runtime.sendMessage({
          action: "summarizePolicy",
          url: currentHoveredLink
        });
      };
    }
    currentHoveredLink = link.href;
    positionIcon(floatingIcon, link);
    floatingIcon.style.display = 'flex';
  }
}

// Handle mouse leave
function handleLinkLeave(e) {
  if (floatingIcon) {
    // Clear any existing timer
    if (hideIconTimer) {
      clearTimeout(hideIconTimer);
    }
    
    // Set a new delay timer for hiding
    hideIconTimer = setTimeout(() => {
      const iconRect = floatingIcon.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      if (mouseX < iconRect.left || mouseX > iconRect.right || 
          mouseY < iconRect.top || mouseY > iconRect.bottom) {
        floatingIcon.style.display = 'none';
      }
    }, 500);  // 500ms latency
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
  // If there is no popup, create one
  if (!popupContainer) {
    popupContainer = createPopup();
  }
  // Update popup content
  updatePopup(popupContainer, isLoading, text, isError);
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
    transition: 'opacity 0.3s ease'
  });

  // Container
  const container = document.createElement('div');
  container.id = 'summary-popup';
  Object.assign(container.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
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
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    color: '#333',  // Darker text color
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'  // Modern font stack
  });
  
  // Insert overlay + container into the document
  document.body.appendChild(overlay);
  document.body.appendChild(container);

  // Use requestAnimationFrame for fade-in effect
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    container.style.opacity = '1';
  });

  // Return { overlay, container } for later updates
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
      
      // Store the original URL for later use
      const originalUrl = currentHoveredLink;

      // Create category containers
      const categories = [
        { title: "Personal Information Collected", data: summary.collected_info },
        { title: "Data Usage Methods", data: summary.data_usage },
        { title: "Data Sharing Entities", data: summary.data_sharing }
      ];

      categories.forEach(category => {
        const categoryDiv = document.createElement('div');
        Object.assign(categoryDiv.style, {
          marginBottom: '25px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
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

        // Create bubble layout for Personal Information Collected
        if (category.title === "Personal Information Collected" || category.title === "Data Usage Methods" || category.title === "Data Sharing Entities" || category.title === "Data Sharing Entities") {
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
            border: '1px solid rgba(0,0,0,0.05)'
          });
          
          // Create bubbles for each item
          category.data.forEach(item => {
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
              transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s'
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
              // Clear summary container
              summaryContainer.innerHTML = '';
              
              // Create summary title
              const summaryTitle = document.createElement('h4');
              summaryTitle.innerText = item.keyword;
              Object.assign(summaryTitle.style, {
                margin: '0 0 12px 0',
                color: '#1976d2',
                fontSize: '1.1rem',
                fontWeight: '600'
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
                color: '#444'
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
                
                // Store original URL and search text
                chrome.storage.local.set({
                  originalTextHighlight: {
                    text: searchText,
                    sourceUrl: originalUrl,
                    summaryData: text
                  }
                }, () => {
                  // Open original privacy policy URL in a new tab
                  chrome.runtime.sendMessage({
                    action: "openOriginalText",
                    url: originalUrl
                  });
                });
              };
              
              summaryContainer.appendChild(contextLink);
              
              // Show summary container
              summaryContainer.style.display = 'block';
            });
            
            bubbleContainer.appendChild(bubble);
          });
          
          categoryDiv.appendChild(bubbleContainer);
          categoryDiv.appendChild(summaryContainer);
        } else {
          // Other categories keep the original collapsed bar display
          category.data.forEach(item => {
            const itemDiv = document.createElement('div');
            Object.assign(itemDiv.style, {
              backgroundColor: '#fff',
              margin: '12px 0',
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.05)', 
              transition: 'box-shadow 0.3s ease' 
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
              
              // Store the original URL and search text in storage
              chrome.storage.local.set({
                originalTextHighlight: {
                  text: searchText,
                  sourceUrl: originalUrl,
                  summaryData: text
                }
              }, () => {
                // Open the original privacy policy URL in a new tab
                chrome.runtime.sendMessage({
                  action: "openOriginalText",
                  url: originalUrl
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
    margin: '16px auto 0'
  });
  
  closeBtn.addEventListener('mouseover', () => {
    closeBtn.style.opacity = '0.8';
  });
  closeBtn.addEventListener('mouseout', () => {
    closeBtn.style.opacity = '1';
  });
  
  closeBtn.onclick = () => {
    container.style.opacity = '0';
    overlay.style.opacity = '0';
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
    }, 300);
  };
  
  container.appendChild(closeBtn);
}
