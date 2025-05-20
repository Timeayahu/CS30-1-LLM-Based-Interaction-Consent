// content.js
// Content Script: Extract privacy policy text from the webpage and send to background

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showSummary") {
    const { isLoading, summary, error } = message;
    if (isLoading) {
      // 显示/更新 "Summarizing, please wait..."
      showOrUpdatePopup(true, "Summarizing, please wait...", false);
    } else {
      // 显示/更新 最终结果 (summary or error)
      if (error) {
        showOrUpdatePopup(false, error, true);
      } else {
        showOrUpdatePopup(false, summary || "(No summary)", false);
      }
    }
  }
});

let popupContainer = null; // 用于存储已创建的弹窗DOM

function showOrUpdatePopup(isLoading, text, isError) {
  // 如果还没有弹窗，就创建
  if (!popupContainer) {
    popupContainer = createPopup();
  }
  // 更新弹窗内容
  updatePopup(popupContainer, isLoading, text, isError);
}

/**
 * 第一次创建弹窗DOM：遮罩层 + 容器
 */
function createPopup() {
  // 遮罩
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

  // 容器
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
  
  // 将 overlay + container 插入
  document.body.appendChild(overlay);
  document.body.appendChild(container);

  // 用 requestAnimationFrame 做淡入效果
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    container.style.opacity = '1';
  });

  // 返回 { overlay, container } 方便后续更新
  return { overlay, container };
}

/**
 * 更新弹窗内容
 */
function updatePopup(popup, isLoading, text, isError) {
  const { overlay, container } = popup;

  // 先清空 container 里所有子节点
  container.innerHTML = "";

  // 标题
  const title = document.createElement('h2');
  if (isLoading) {
    title.innerText = "Please wait";
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

  // 内容
  const contentDiv = document.createElement('div');
  contentDiv.innerText = text;
  Object.assign(contentDiv.style, {
    fontSize: '1rem',
    lineHeight: '1.5',
    marginBottom: '16px',
    whiteSpace: 'pre-wrap',
    textAlign: 'left'
  });
  container.appendChild(contentDiv);

  if (isLoading) {
    // 如果是等待中状态，可以放一个简单的小旋转动画或进度条
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

    // 内联 keyframes
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    container.appendChild(styleTag);

  } else {
    // 如果不是等待中，就显示一个关闭按钮
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
      margin: '0 auto'
    });
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.opacity = '0.8';
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.opacity = '1';
    });
    closeBtn.onclick = () => {
      // 淡出
      container.style.opacity = '0';
      overlay.style.opacity = '0';
      setTimeout(() => {
        container.remove();
        overlay.remove();
        popupContainer = null; // 重置，表示已关闭
      }, 300);
    };
    container.appendChild(closeBtn);
  }
}
