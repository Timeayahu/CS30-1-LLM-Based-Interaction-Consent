// Content Script: Extract privacy policy text from the webpage and send to background

let floatingIcon = null;
let currentHoveredLink = null;
let hideIconTimer = null;
let isEnabled = true;
let isIconLocked = false;
let lastIconPosition = null;
let positionUpdateTimer = null;
let currentExpandedSummary = null;

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
            
            // 根据重要性级别确定气泡颜色
            let bubbleColor = '';
            let bubbleShadow = '';
            
            // 检查是否存在importance属性，并设置相应的颜色
            if (item.importance !== undefined) {
              // 重要性分级：5-非常重要(红色)、4-重要(橙色)、3-中等(黄色)、2-较低(浅绿)、1-低(绿色)、0-未知(灰色)
              switch(item.importance) {
                case 5: // 非常重要 - 红色
                  bubbleColor = 'linear-gradient(135deg, #d32f2f, #f44336)';
                  bubbleShadow = '0 3px 8px rgba(244, 67, 54, 0.3)';
                  break;
                case 4: // 重要 - 橙色
                  bubbleColor = 'linear-gradient(135deg, #e64a19, #ff5722)';
                  bubbleShadow = '0 3px 8px rgba(255, 87, 34, 0.3)';
                  break;
                case 3: // 中等 - 黄色
                  bubbleColor = 'linear-gradient(135deg, #ffa000, #ffc107)';
                  bubbleShadow = '0 3px 8px rgba(255, 193, 7, 0.3)';
                  break;
                case 2: // 较低 - 浅绿色
                  bubbleColor = 'linear-gradient(135deg, #7cb342, #8bc34a)';
                  bubbleShadow = '0 3px 8px rgba(139, 195, 74, 0.3)';
                  break;
                case 1: // 低 - 绿色
                  bubbleColor = 'linear-gradient(135deg, #388e3c, #4caf50)';
                  bubbleShadow = '0 3px 8px rgba(76, 175, 80, 0.3)';
                  break;
                case 0: // 未知 - 灰色
                default:
                  bubbleColor = 'linear-gradient(135deg, #757575, #9e9e9e)';
                  bubbleShadow = '0 3px 8px rgba(158, 158, 158, 0.3)';
                  break;
              }
            } else {
              // 默认颜色 - 蓝色
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
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s, background 0.3s',
              opacity: '0',
              transform: 'translateY(20px)',
              willChange: 'transform',
              animationFillMode: 'forwards',
              animationName: 'bubbleIn',
              animationDuration: '0.5s',
              animationDelay: `${0.3 + itemIndex * 0.05}s`,
              animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            });
            
            bubble.innerText = item.keyword;
            
            // 添加关键帧动画
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
            
            // 监听动画结束，移除动画属性以便悬停效果可以正常工作
            bubble.addEventListener('animationend', function() {
              this.style.opacity = '1';
              this.style.transform = 'translateY(0)';
              this.style.animationName = '';
            });
            
            // 根据重要性级别调整鼠标悬停效果
            bubble.addEventListener('mouseover', function() {
              // 确保没有动画进行中
              this.style.animationName = '';
              this.style.transform = 'translateY(-5px) scale(1.03)';
              
              // 根据原始颜色类型增强阴影效果和稍微调暗颜色
              if (item.importance !== undefined) {
                switch(item.importance) {
                  case 5: // 非常重要 - 红色
                    this.style.boxShadow = '0 5px 12px rgba(244, 67, 54, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #c62828, #e53935)';
                    break;
                  case 4: // 重要 - 橙色
                    this.style.boxShadow = '0 5px 12px rgba(255, 87, 34, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #d84315, #f4511e)';
                    break;
                  case 3: // 中等 - 黄色
                    this.style.boxShadow = '0 5px 12px rgba(255, 193, 7, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #ff8f00, #ffb300)';
                    break;
                  case 2: // 较低 - 浅绿色
                    this.style.boxShadow = '0 5px 12px rgba(139, 195, 74, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #689f38, #7cb342)';
                    break;
                  case 1: // 低 - 绿色
                    this.style.boxShadow = '0 5px 12px rgba(76, 175, 80, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #2e7d32, #388e3c)';
                    break;
                  case 0: // 未知 - 灰色
                  default:
                    this.style.boxShadow = '0 5px 12px rgba(158, 158, 158, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #616161, #757575)';
                    break;
                }
              } else {
                // 默认蓝色悬停效果
                this.style.boxShadow = '0 5px 12px rgba(33, 150, 243, 0.4)';
                this.style.background = 'linear-gradient(135deg, #1565c0, #1e88e5)';
              }
            });
            
            bubble.addEventListener('mouseout', function() {
              // 恢复到初始状态
              this.style.animationName = '';
              this.style.transform = 'translateY(0) scale(1)';
              this.style.boxShadow = bubbleShadow;
              this.style.background = bubbleColor;
            });
            
            // Click bubble to show summary
            bubble.addEventListener('click', () => {
              // 如果已有展开的弹出框，先关闭它
              if (currentExpandedSummary) {
                // 获取当前弹出框的关闭按钮并触发点击事件
                const closeBtn = currentExpandedSummary.querySelector('div[role="button"], div.close-btn');
                if (closeBtn) {
                  closeBtn.click();
                } else {
                  // 如果找不到关闭按钮，直接移除当前弹出框
                  currentExpandedSummary.remove();
                  
                  // 重置跟踪变量
                  currentExpandedSummary = null;
                }
                
                // 给一点时间让前一个弹出框关闭动画完成
                setTimeout(() => {
                  showExpandedSummary();
                }, 300);
                return;
              }
              
              // 没有已展开的弹出框，直接创建新的
              showExpandedSummary();
              
              // 展示展开的摘要
              function showExpandedSummary() {
                // 获取当前气泡的位置和尺寸
                const bubbleRect = bubble.getBoundingClientRect();
                const categoryRect = categoryDiv.getBoundingClientRect();
                
                // 计算气泡在类别容器内的相对位置
                const relativeLeft = bubbleRect.left - categoryRect.left;
                const relativeTop = bubbleRect.top - categoryRect.top;
                
                // 创建展开的摘要框
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
                
                // 将展开的摘要框添加到气泡容器中
                bubbleContainer.appendChild(expandedSummary);
                
                // 设置全局变量跟踪当前展开的弹出框
                currentExpandedSummary = expandedSummary;
                
                // 隐藏原始气泡
                bubble.style.opacity = '0';
                
                // 计算展开后的尺寸
                const expandedWidth = categoryDiv.clientWidth - 30;
                
                // 创建临时内容元素以计算所需高度
                const tempContent = document.createElement('div');
                tempContent.style.position = 'absolute';
                tempContent.style.visibility = 'hidden';
                tempContent.style.width = `${expandedWidth - 40}px`;
                tempContent.style.padding = '20px';
                tempContent.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
                tempContent.style.boxSizing = 'border-box';
                
                // 添加标题和内容
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
                
                // 添加关闭按钮占位
                const tempCloseBtn = document.createElement('div');
                tempCloseBtn.style.height = '24px';
                tempCloseBtn.style.marginBottom = '10px';
                
                // 添加所有元素到临时容器
                tempContent.appendChild(tempCloseBtn);
                tempContent.appendChild(tempTitle);
                tempContent.appendChild(tempText);
                tempContent.appendChild(tempLink);
                document.body.appendChild(tempContent);
                
                // 更精确地计算内容所需高度
                const titleHeight = tempTitle.offsetHeight;
                const textHeight = tempText.offsetHeight;
                const linkHeight = tempLink.offsetHeight;
                const closeBtnHeight = tempCloseBtn.offsetHeight;
                const totalPadding = 40; // 上下各20px的padding
                const margins = 15 + 10 + 10; // 标题下方12px + 文本下方15px + 链接下方10px的间距
                
                // 精确计算所需总高度
                const exactContentHeight = titleHeight + textHeight + linkHeight + closeBtnHeight + margins + totalPadding;
                document.body.removeChild(tempContent);
                
                // 设置最小和最大高度限制
                const minHeight = 170; // 基本显示所需的最小高度
                const maxHeight = Math.min(500, window.innerHeight * 0.7); // 最大高度限制
                
                // 根据内容长度确定最终高度，添加5px缓冲区确保内容完全显示
                const dynamicHeight = Math.max(minHeight, Math.min(exactContentHeight + 5, maxHeight));
                
                // 记录类别容器的原始高度和样式
                const originalHeight = categoryDiv.style.height;
                const originalMinHeight = categoryDiv.style.minHeight;
                
                // 设置展开动画
                setTimeout(() => {
                  // 计算展开后的位置，确保不会超出容器边界
                  let finalLeft = relativeLeft;
                  
                  // 如果气泡不在最左边，调整位置以避免超出右边界
                  if (relativeLeft + expandedWidth > categoryDiv.clientWidth - 15) {
                    // 将展开框向左移动，使其右边缘与容器右边缘对齐（留出15px边距）
                    finalLeft = categoryDiv.clientWidth - expandedWidth - 15;
                  }
                  
                  // 展开摘要框
                  expandedSummary.style.width = `${expandedWidth}px`;
                  expandedSummary.style.height = `${dynamicHeight}px`;
                  expandedSummary.style.left = `${finalLeft}px`;
                  expandedSummary.style.borderRadius = '12px';
                  expandedSummary.style.padding = '20px';
                  expandedSummary.style.alignItems = 'flex-start';
                  expandedSummary.style.justifyContent = 'flex-start';
                  expandedSummary.style.overflow = 'auto';
                  
                  // 获取气泡的颜色，用于边框
                  const bubbleColor = bubble.style.background;
                  let borderColor = '';
                  
                  // 提取渐变颜色的第二个颜色值用于边框
                  if (bubbleColor.includes('linear-gradient')) {
                    const colorMatch = bubbleColor.match(/,\s*([^)]+)\)/);
                    if (colorMatch && colorMatch[1]) {
                      borderColor = colorMatch[1].trim();
                    } else {
                      borderColor = '#1976d2'; // 默认蓝色
                    }
                  } else {
                    borderColor = bubbleColor;
                  }
                  
                  // 设置背景为白色，添加与重要性相关的边框颜色
                  expandedSummary.style.background = '#fff';
                  expandedSummary.style.border = `2px solid ${borderColor}`;
                  expandedSummary.style.color = '#333';
                  expandedSummary.style.boxShadow = `0 10px 30px rgba(0, 0, 0, 0.2)`;
                  
                  // 计算展开后摘要框的底部位置（相对于类别容器）
                  const summaryBottom = relativeTop + dynamicHeight + 20; // 加上底部边距
                  
                  // 检查是否会超出类别容器的底部
                  if (summaryBottom > categoryDiv.clientHeight) {
                    // 计算需要额外增加的高度
                    const extraHeight = summaryBottom - categoryDiv.clientHeight + 20; // 额外边距
                    
                    // 设置类别容器的新高度
                    categoryDiv.style.transition = 'height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    categoryDiv.style.height = 'auto';
                    categoryDiv.style.minHeight = `${categoryDiv.clientHeight + extraHeight}px`;
                  }
                  
                  // 添加关闭按钮
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
                    color: borderColor, // 使用与边框相同的颜色
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
                  
                  // 添加关闭功能
                  closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // 收起摘要框
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
                    
                    // 恢复类别容器的原始高度和样式
                    categoryDiv.style.transition = 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1), min-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                    categoryDiv.style.height = originalHeight;
                    categoryDiv.style.minHeight = originalMinHeight;
                    
                    // 显示原始气泡
                    bubble.style.opacity = '1';
                    
                    // 移除展开的摘要框并清除引用
                    setTimeout(() => {
                      expandedSummary.remove();
                      if (currentExpandedSummary === expandedSummary) {
                        currentExpandedSummary = null;
                      }
                    }, 500);
                  });
                  
                  expandedSummary.appendChild(closeBtn);
                  
                  // 添加摘要内容
                  const summaryContent = document.createElement('div');
                  Object.assign(summaryContent.style, {
                    width: '100%',
                    height: '100%',
                    overflow: 'auto',
                    paddingRight: '10px',
                    textAlign: 'left' // 确保内容靠左排列
                  });
                  
                  // 创建摘要标题
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
                  
                  // 添加标题下划线，与摘要页面风格统一
                  const titleUnderline = document.createElement('div');
                  Object.assign(titleUnderline.style, {
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    width: '40px',
                    height: '2px',
                    backgroundColor: borderColor, // 使用与边框相同的颜色
                    borderRadius: '2px'
                  });
                  summaryTitle.appendChild(titleUnderline);
                  
                  summaryContent.appendChild(summaryTitle);
                  
                  // 创建摘要内容
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
                    fontWeight: '300' // 设置为细字体
                  });
                  summaryContent.appendChild(summaryText);
                  
                  // 创建原始文本链接
                  const contextLink = document.createElement('a');
                  contextLink.innerText = "View Original Text";
                  contextLink.href = "#";
                  Object.assign(contextLink.style, {
                    color: borderColor, // 使用与边框相同的颜色
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    display: 'inline-block',
                    padding: '6px 12px',  
                    margin: '0 0 10px 0', // 确保底部有足够的间距
                    backgroundColor: `rgba(${hexToRgb(borderColor)}, 0.1)`,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    transition: 'background-color 0.2s',
                    opacity: '0',
                    transform: 'translateY(10px)',
                    transition: 'opacity 0.3s ease, transform 0.3s ease, background-color 0.2s',
                    transitionDelay: '0.2s'
                  });
                  
                  // 添加悬停效果
                  contextLink.addEventListener('mouseover', () => {
                    contextLink.style.backgroundColor = `rgba(${hexToRgb(borderColor)}, 0.2)`;
                  });
                  
                  contextLink.addEventListener('mouseout', () => {
                    contextLink.style.backgroundColor = `rgba(${hexToRgb(borderColor)}, 0.1)`;
                  });
                  
                  // 处理点击查看原始文本
                  contextLink.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const searchText = item.context;
                    
                    // 获取当前标签页ID
                    chrome.runtime.sendMessage({ action: "getCurrentTabId" }, (response) => {
                      const sourceTabId = response.tabId;
                      
                      // 存储原始URL和搜索文本
                      chrome.storage.local.set({
                        originalTextHighlight: {
                          text: searchText,
                          sourceUrl: originalUrl,
                          summaryData: text,
                          sourceTabId: sourceTabId
                        }
                      }, () => {
                        // 在新标签页中打开原始隐私政策URL
                        chrome.runtime.sendMessage({
                          action: "openOriginalText",
                          url: originalUrl
                        });
                      });
                    });
                  };
                  
                  summaryContent.appendChild(contextLink);
                  expandedSummary.appendChild(summaryContent);
                  
                  // 使用requestAnimationFrame确保DOM更新后再应用动画
                  requestAnimationFrame(() => {
                    // 延迟显示内容元素以创建级联效果
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

// 辅助函数：将十六进制颜色转换为RGB
function hexToRgb(hex) {
  // 如果是简写形式，展开
  if (hex.startsWith('#')) {
    hex = hex.substring(1);
  }
  
  // 标准6位十六进制
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  // 简写3位十六进制
  else if (hex.length === 3) {
    const r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    const g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    const b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    return `${r}, ${g}, ${b}`;
  }
  
  // 默认返回蓝色
  return '25, 118, 210';
}
