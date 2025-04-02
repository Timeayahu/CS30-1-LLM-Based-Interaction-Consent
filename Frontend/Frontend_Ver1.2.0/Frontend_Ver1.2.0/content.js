// content.js
// Content Script: Extract privacy policy text from the webpage and send to background

let floatingIcon = null;
let currentHoveredLink = null;
let hideIconTimer = null;  // Timer for tracking delayed hiding
let isEnabled = true;  // Extension state

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
    }, 500);  // 500ms latency
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
        // 添加调试日志
        console.log('点击了浮动图标，准备发送消息', currentHoveredLink);
        
        // Send message to background script to handle summarization
        chrome.runtime.sendMessage({
          action: "summarizePolicy",
          url: currentHoveredLink
        }, response => {
          // 记录发送消息的响应
          console.log('发送summarizePolicy消息的响应:', response);
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
  console.log('content.js收到消息:', message);
  
  if (message.action === "toggleEnabled") {
    isEnabled = message.isEnabled;
    // If the extension is disabled, hide the floating icon
    if (!isEnabled && floatingIcon) {
      floatingIcon.style.display = 'none';
    }
  } else if (message.action === "showSummary") {
    const { isLoading, summary, error } = message;
    console.log('显示摘要:', { isLoading, summary, error });
    
    if (isLoading) {
      showOrUpdatePopup(true, "Summarizing, please wait...", false);
    } else {
      if (error) {
        console.error('显示错误:', error);
        showOrUpdatePopup(false, error, true);
      } else {
        console.log('显示摘要内容类型:', typeof summary, summary);
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    width: '480px',
    maxWidth: '80%',
    maxHeight: '80%',
    overflowY: 'auto',
    borderRadius: '8px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
    border: '1px solid #ccc',
    padding: '16px',
    boxSizing: 'border-box',
    opacity: '0',
    transition: 'opacity 0.3s ease',
    color: '#000'
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
  console.log('更新弹窗:', { isLoading, isError, textType: typeof text });
  if (text) {
    console.log('弹窗文本预览:', typeof text === 'string' ? text.substring(0, 100) : JSON.stringify(text).substring(0, 100));
  }
  
  const { overlay, container } = popup;

  // Clear all child nodes
  container.innerHTML = "";

  // Title
  const title = document.createElement('h2');
  if (isLoading) {
    title.innerText = "Summarizing, please wait...";
  } else {
    title.innerText = isError ? "Error" : "Summary";
  }
  Object.assign(title.style, {
    marginTop: '0',
    marginBottom: '1em',
    fontSize: '1.2rem',
    color: '#000',
    textAlign: 'center'
  });
  container.appendChild(title);

  if (isLoading) {
    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '24px',
      height: '24px',
      border: '3px solid #ccc',
      borderTopColor: '#1976d2',
      borderRadius: '50%',
      margin: '0 auto 1em',
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
      lineHeight: '1.5',
      marginBottom: '16px',
      whiteSpace: 'pre-wrap',
      textAlign: 'left',
      color: '#e53935'
    });
    container.appendChild(contentDiv);
  } else {
    try {
      // 直接使用接收到的summary，不再尝试解析JSON
      const summaryData = text;
      
      // 检查是否为字符串"(No summary)"
      if (summaryData === "(No summary)") {
        const noDataDiv = document.createElement('div');
        noDataDiv.innerText = "No summary data available for this privacy policy.";
        Object.assign(noDataDiv.style, {
          fontSize: '1rem',
          lineHeight: '1.5',
          margin: '16px 0',
          textAlign: 'center',
          color: '#666'
        });
        container.appendChild(noDataDiv);
        return;
      }
      
      // 确保summaryData是对象
      let summary;
      if (typeof summaryData === 'string') {
        try {
          summary = JSON.parse(summaryData);
        } catch (parseErr) {
          throw new Error(`Unable to parse summary data: ${parseErr.message}`);
        }
      } else {
        summary = summaryData;
      }
      
      // Store the original URL for later use
      const originalUrl = currentHoveredLink;

      // Create category containers
      const categories = [];
      
      // 检查数据格式并适配
      if (summary.global_result) {
        // 这是当前后端返回的格式
        const globalInfo = summary.global_result;
        
        // 添加全局结果作为单独类别
        categories.push({
          title: "隐私政策摘要",
          data: [{
            keyword: "摘要信息",
            summary: globalInfo,
            context: "隐私政策全文"
          }]
        });
      } else if (summary.collected_info) {
        // 这是预期的格式，保持原有处理逻辑
        categories.push(
          { title: "Personal Information Collected", data: summary.collected_info },
          { title: "Data Usage Methods", data: summary.data_usage },
          { title: "Data Sharing Entities", data: summary.data_sharing }
        );
      } else {
        // 未知格式，作为纯文本显示
        categories.push({
          title: "隐私政策信息",
          data: [{
            keyword: "原始数据",
            summary: JSON.stringify(summary, null, 2),
            context: "完整数据"
          }]
        });
      }

      categories.forEach(category => {
        const categoryDiv = document.createElement('div');
        Object.assign(categoryDiv.style, {
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        });

        const categoryTitle = document.createElement('h3');
        categoryTitle.innerText = category.title;
        Object.assign(categoryTitle.style, {
          margin: '0 0 15px 0',
          color: '#1976d2',
          fontSize: '1.1rem'
        });
        categoryDiv.appendChild(categoryTitle);

        category.data.forEach(item => {
          const itemDiv = document.createElement('div');
          Object.assign(itemDiv.style, {
            backgroundColor: '#fff',
            margin: '10px 0',
            borderRadius: '4px',
            border: '1px solid #e0e0e0'
          });

          // Create header container for keyword
          const headerContainer = document.createElement('div');
          Object.assign(headerContainer.style, {
            display: 'flex',
            alignItems: 'center',
            padding: '10px',
            cursor: 'pointer',
            userSelect: 'none',
            borderBottom: '1px solid transparent'
          });

          // Add expand/collapse arrow
          const arrow = document.createElement('span');
          arrow.innerHTML = '▶';
          Object.assign(arrow.style, {
            marginRight: '8px',
            transition: 'transform 0.3s ease',
            display: 'inline-block',
            fontSize: '0.8rem',
            color: '#666'
          });

          // Keyword text
          const keyword = document.createElement('div');
          keyword.innerText = item.keyword;
          Object.assign(keyword.style, {
            fontWeight: 'bold',
            color: '#1976d2',
            flex: '1'
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
            padding: '0 10px',
            backgroundColor: '#fafafa'
          });

          // Summary
          const summary = document.createElement('div');
          summary.innerText = item.summary;
          Object.assign(summary.style, {
            fontSize: '0.9rem',
            marginBottom: '8px',
            lineHeight: '1.4'
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
            marginBottom: '10px'
          });

          // Handle click to view original text
          contextLink.onclick = (e) => {
            e.preventDefault();
            const searchText = item.context;
            
            // Store the original URL and search text in storage
            chrome.storage.local.set({
              originalTextHighlight: {
                text: searchText,
                sourceUrl: originalUrl,  // Use the stored original URL
                summaryData: text
              }
            }, () => {
              // Open the original privacy policy URL in a new tab
              chrome.runtime.sendMessage({
                action: "openOriginalText",
                url: originalUrl  // Use the stored original URL
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
