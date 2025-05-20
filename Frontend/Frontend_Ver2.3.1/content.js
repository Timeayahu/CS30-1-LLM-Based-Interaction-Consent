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
let isSummaryAnimating = false;
let linkDetectionCache = new Map();
const MAX_CACHE_SIZE = 200;

// Add DOM observer to monitor dynamically added links
let mutationObserver = null;

// Initialize DOM observer
function initMutationObserver() {
  // If there is already an observer, stop it first
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
  
  // Create a new observer instance
  mutationObserver = new MutationObserver((mutations) => {
    // Check if any new elements have been added
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Handle new nodes
        for (const node of mutation.addedNodes) {
          // Check if the node is an element
          if (node.nodeType === Node.ELEMENT_NODE) {
            // If it's a link element, check directly
            if (node.tagName === 'A') {
              handlePotentialPrivacyLink(node);
            }
            
            // Check links in child elements
            const links = node.querySelectorAll('a');
            for (const link of links) {
              handlePotentialPrivacyLink(link);
            }
          }
        }
      }
    }
  });
  
  // Configure observer
  const config = { 
    childList: true, 
    subtree: true 
  };
  
  // Start observing the document
  mutationObserver.observe(document.body, config);
}

// Handle potential privacy links
function handlePotentialPrivacyLink(link) {
  if (!link || !link.href) return;
  
  // Add mouse over and leave events
  link.addEventListener('mouseover', handleLinkHover);
  link.addEventListener('mouseout', handleLinkLeave);
  
  // If link is already being hovered, check immediately
  if (document.activeElement === link || link.matches(':hover')) {
    handleLinkHover({ target: link });
  }
}

// Define a variable to track if interval is set
let cacheCleaningInterval = null;

// Initialize
function init() {
  // Setup link listeners if not already set up
  setupLinkListeners();
  
  // Set up cache cleaning interval only if not already set
  if (!cacheCleaningInterval) {
    cacheCleaningInterval = setInterval(() => {
      if (linkDetectionCache.size > MAX_CACHE_SIZE / 2) {
        linkDetectionCache.clear();
      }
    }, 30 * 60 * 1000); // Clean cache every 30 minutes
  }
  
  // Initialize DOM observer
  initMutationObserver();
  
  // Immediately scan all links on the page
  console.log("Scanning all links for privacy policies");
  const links = document.querySelectorAll('a[href]');
  
  // Track how many links were detected
  let detectCount = 0;
  
  // Process links immediately in batches to prevent UI blocking
  const processLinksInBatches = (links, startIndex, batchSize) => {
    const endIndex = Math.min(startIndex + batchSize, links.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const link = links[i];
      if (isPossiblePrivacyPolicyLink(link)) {
        handlePotentialPrivacyLink(link);
        detectCount++;
      }
    }
    
    // If more links to process, schedule next batch
    if (endIndex < links.length) {
      setTimeout(() => {
        processLinksInBatches(links, endIndex, batchSize);
      }, 0);
    } else {
      console.log(`Finished scanning links, found ${detectCount} privacy policy links`);
    }
  };
  
  // Start processing in batches of 100 links
  processLinksInBatches(links, 0, 100);
}

// Check if extension is enabled and initialize
chrome.storage.local.get(['isEnabled'], (result) => {
  isEnabled = result.isEnabled !== false; // Default to true if not set
  
  if (isEnabled) {
    // Initialize everything
    init();
    console.log("Privacy Policy Assistant initialized");
  } else {
    console.log("Privacy Policy Assistant is disabled");
  }
});

// Extension state is already initialized above

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
    transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out, background 0.2s ease-in-out',
    pointerEvents: 'none',
    willChange: 'transform, opacity', // Optimize for animation performance
    textAlign: 'center',
    lineHeight: '32px' // Ensures emoji is vertically centered
  });
  
  // Use a span for icon content to prevent positioning issues
  const iconContent = document.createElement('span');
  iconContent.textContent = '📝';
  iconContent.style.display = 'inline-block';
  iconContent.style.lineHeight = '1';
  
  // Clear existing content and add the span
  icon.innerHTML = '';
  icon.appendChild(iconContent);
  
  // Create tooltip container for proper positioning
  const tooltipContainer = document.createElement('div');
  Object.assign(tooltipContainer.style, {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none'
  });
  
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
    fontWeight: '500',
    willChange: 'opacity' // Optimize for animation
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
  
  // Add tooltip to container, then container to icon
  tooltipContainer.appendChild(tooltip);
  icon.appendChild(tooltipContainer);
  
  // Add hover effect
  icon.addEventListener('mouseover', () => {
    icon.style.transform = 'scale(1.1)';
    icon.style.background = 'linear-gradient(135deg, #1565c0, #1976d2)';
    // Show tooltip
    tooltip.style.opacity = '1';
    // Clear hide timer when mouse is over icon
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
    // Set delay to hide icon when mouse leaves
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
  // Do not update position if icon is locked
  if (isIconLocked) return;
  
  const rect = link.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Default position (bottom right)
  let left = rect.right - 32;
  let top = rect.bottom + 5; 
  
  // Place on left if not enough space on right
  if (left + 32 > viewportWidth - 10) {
    left = rect.left - 32;
  }
  
  // Place on right if not enough space on left
  if (left < 10) {
    left = rect.right + 5;
  }
  
  // Place above link if not enough space below
  if (top + 32 > viewportHeight - 10) {
    top = rect.top - 37; // 32px icon height + 5px spacing
  }
  
  // Place inside link bottom right if not enough space above
  if (top < 10) {
    top = rect.bottom - 32;
    left = rect.right - 32;
  }
  
  // Clear any existing position update timer
  if (positionUpdateTimer) {
    clearTimeout(positionUpdateTimer);
    positionUpdateTimer = null;
  }
  
  // Force immediate position update for better responsiveness
  icon.style.left = `${left}px`;
  icon.style.top = `${top}px`;
  lastIconPosition = { left, top };
}

// Handle mouse enter on links
function handleLinkHover(e) {
  if (!isEnabled) return;
  
  const link = e.target;
  
  // Only process relevant links to improve performance
  if (isPossiblePrivacyPolicyLink(link)) {
    // Check if icon needs to be created or reset
    if (!floatingIcon) {
      console.log("Creating new floating icon");
      floatingIcon = createFloatingIcon();
      document.body.appendChild(floatingIcon);
      
      // Apply immediate styling to ensure proper appearance
      // Make sure transform is properly reset when created
      setTimeout(() => {
        floatingIcon.style.transform = 'scale(0.8)';
        void floatingIcon.offsetWidth; // Force reflow
      }, 0);
      
      // Add click handler, integrate with login functionality
      floatingIcon.onclick = () => {
        // Add click feedback
        floatingIcon.style.transform = 'scale(0.95)';
        setTimeout(() => {
          floatingIcon.style.transform = 'scale(1)';
        }, 100);
        
        // Check login status
        if (window.privacyAuth && typeof window.privacyAuth.handleIconClick === 'function') {
          window.privacyAuth.handleIconClick();
        } else {
          // If auth.js not loaded or initialized, use original logic
          chrome.runtime.sendMessage({
            action: "summarizePolicy", 
            url: currentHoveredLink
          });
        }
        
        // Hide icon
        floatingIcon.style.opacity = '0';
        floatingIcon.style.pointerEvents = 'none';
      };
      
      // Lock icon position when mouse enters icon
      floatingIcon.addEventListener('mouseenter', () => {
        isIconLocked = true;
        if (hideIconTimer) {
          clearTimeout(hideIconTimer);
          hideIconTimer = null;
        }
        
        // Ensure transform is correctly applied on hover
        floatingIcon.style.transform = 'scale(1.1)';
        floatingIcon.style.background = 'linear-gradient(135deg, #1565c0, #1976d2)';
      });
      
      // Modified mouseleave handler with improved unlocking logic
      floatingIcon.addEventListener('mouseleave', (event) => {
        setTimeout(() => {
          const iconRect = floatingIcon.getBoundingClientRect();
          const isStillOverIcon = 
            currentMouseX >= iconRect.left && 
            currentMouseX <= iconRect.right && 
            currentMouseY >= iconRect.top && 
            currentMouseY <= iconRect.bottom;
          
          // Only unlock if mouse has truly left the icon
          if (!isStillOverIcon) {
            isIconLocked = false;
            
            // Reset transform when mouse leaves
            floatingIcon.style.transform = 'scale(1)';
            floatingIcon.style.background = 'linear-gradient(135deg, #1976d2, #2196f3)';
            
            // Reset position update timer
            if (positionUpdateTimer) {
              clearTimeout(positionUpdateTimer);
              positionUpdateTimer = null;
            }
            
            // Check if mouse is over any relevant link
            const elementsUnderMouse = document.elementsFromPoint(currentMouseX, currentMouseY);
            const hoveredPrivacyLink = elementsUnderMouse.find(el => 
              el.tagName === 'A' && isPossiblePrivacyPolicyLink(el)
            );
            
            if (hoveredPrivacyLink) {
              // If hovering a new privacy link, update position immediately
              currentHoveredLink = hoveredPrivacyLink.href;
              positionIcon(floatingIcon, hoveredPrivacyLink);
            } else {
              // If not over any privacy link, hide the icon with delay
              hideIconTimer = setTimeout(() => {
                floatingIcon.style.opacity = '0';
                floatingIcon.style.pointerEvents = 'none';
                floatingIcon.style.transform = 'scale(0.8)'; // Return to initial scale
              }, 150);
            }
          }
        }, 30);
      });
    } else if (floatingIcon.style.display === 'none') {
      // If icon exists but is hidden, make sure it's reset properly
      console.log("Resetting existing floating icon");
      floatingIcon.style.display = '';
      floatingIcon.style.transform = 'scale(0.8)';
      floatingIcon.style.background = 'linear-gradient(135deg, #1976d2, #2196f3)';
      void floatingIcon.offsetWidth; // Force reflow
    }
    
    currentHoveredLink = link.href;
    positionIcon(floatingIcon, link);
    
    // Use requestAnimationFrame for smoother transition
    requestAnimationFrame(() => {
      floatingIcon.style.opacity = '1';
      floatingIcon.style.pointerEvents = 'auto';
      floatingIcon.style.transform = 'scale(1)';  // Ensure proper scale when visible
    });
    
    if (hideIconTimer) {
      clearTimeout(hideIconTimer);
      hideIconTimer = null;
    }
  }
}

// Check if a link could be a privacy policy link
function isPossiblePrivacyPolicyLink(link) {
  if (!link || !link.href) return false;
  
  // Use cached result if available
  if (linkDetectionCache.has(link.href)) {
    return linkDetectionCache.get(link.href);
  }
  
  // If cache is too large, clear the oldest 20% entries
  if (linkDetectionCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = [...linkDetectionCache.keys()].slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
    keysToDelete.forEach(key => linkDetectionCache.delete(key));
  }
  
  // Perform actual detection logic
  const result = checkLinkForPrivacyPolicy(link);
  
  // Cache the result
  linkDetectionCache.set(link.href, result);
  
  return result;
}

// Actual link detection logic
function checkLinkForPrivacyPolicy(link) {
  // REDESIGNED DETECTION LOGIC - More strict matching for privacy policy links
  
  // Core privacy keywords - Direct and specific matches only
  const corePrivacyKeywords = /privacy(\s|-|_)policy|隐私(\s|-|_)政策|プライバシー(\s|-|_)ポリシー|개인정보(\s|-|_)처리방침|datenschutzerklärung|política(\s|-|_)de(\s|-|_)privacidad/i;
  
  // Secondary privacy keywords - Less precise but still directly related
  const secondaryPrivacyKeywords = /privacy|隐私|プライバシー|개인정보|datenschutz|privacidad/i;
  
  // Terms/policy keywords that require additional context validation
  const termsKeywords = /terms|policy|政策|条款|利用規約|이용약관/i;
  
  // Common privacy policy link text patterns - used for text-only checks
  const commonPrivacyLinkTexts = [
    /privacy(\s|-|_)policy/i,
    /隐私(\s|-|_)政策/i,
    /プライバシー(\s|-|_)ポリシー/i,
    /개인정보(\s|-|_)처리방침/i,
    /datenschutzerklärung/i,
    /política(\s|-|_)de(\s|-|_)privacidad/i
  ];
  
  // Quick check stages - first perform fastest checks
  
  // 1. Check URL for core privacy policy keywords (high confidence match)
  if (corePrivacyKeywords.test(link.href)) {
    return true;
  }
  
  // 2. Check link text for core privacy policy keywords
  if (link.textContent && corePrivacyKeywords.test(link.textContent.trim())) {
    return true;
  }
  
  // 3. Check link title attribute for core privacy policy keywords
  if (link.title && corePrivacyKeywords.test(link.title)) {
    return true;
  }
  
  // 4. Check specific company privacy policy URL patterns (direct matches)
  const knownPatterns = [
    /microsoft\.com.*privacy/i,
    /google\.com.*privacy/i,
    /apple\.com.*privacy/i,
    /facebook\.com.*privacy/i,
    /meta\.com.*privacy/i,
    /amazon\.com.*privacy/i,
    /twitter\.com.*privacy/i,
    /instagram\.com.*privacy/i,
    /netflix\.com.*privacy/i,
    /youtube\.com.*privacy/i,
    /linkedin\.com.*privacy/i,
    /tiktok\.com.*privacy/i,
    /x\.com.*privacy/i,
    /privacypolicy\./i,
    /privacy-policy\./i,
    /\/privacy-policy/i,
    /\/privacy\/policy/i,
    /\/privacypolicy/i,
    /\/privacy_policy/i
  ];
  
  for (const pattern of knownPatterns) {
    if (pattern.test(link.href)) {
      return true;
    }
  }
  
  // Special case handlers for major Chinese platforms
  const chinesePatterns = [
    /alibaba\.com.*rule/i,
    /rulechannel\.alibaba\.com/i,
    /taobao\.com.*rule/i,
    /baidu\.com.*privacy/i,
    /tencent\.com.*privacy/i,
    /qq\.com.*privacy/i,
    /weixin\.com.*privacy/i,
    /wechat\.com.*privacy/i,
    /jd\.com.*privacy/i,
    /sina\.com.*privacy/i,
    /weibo\.com.*privacy/i,
    /xiaomi\.com.*privacy/i,
    /huawei\.com.*privacy/i
  ];
  
  for (const pattern of chinesePatterns) {
    if (pattern.test(link.href)) {
      return true;
    }
  }
  
  // Secondary checks - only proceed if URL or text contains privacy keyword
  if (secondaryPrivacyKeywords.test(link.href) || 
      (link.textContent && secondaryPrivacyKeywords.test(link.textContent.trim()))) {
    
    // 5. Check if link has specific attributes that suggest it's a privacy policy
    if (link.getAttribute('aria-label') && corePrivacyKeywords.test(link.getAttribute('aria-label'))) {
      return true;
    }
    
    // 6. Check parent element's aria label (for wrapped links)
    if (link.parentElement && 
        link.parentElement.getAttribute('aria-label') && 
        corePrivacyKeywords.test(link.parentElement.getAttribute('aria-label'))) {
      return true;
    }
    
    // 7. Check alt text of images inside the link
    const images = link.querySelectorAll('img');
    for (const img of images) {
      if (img.alt && corePrivacyKeywords.test(img.alt)) {
        return true;
      }
    }
    
    // 8. Additional context check for shorter links in footer sections
    if (isLinkInFooter(link) && 
        link.textContent && 
        link.textContent.trim().length < 30 &&
        secondaryPrivacyKeywords.test(link.textContent.trim())) {
      
      const siblings = getSiblingLinkTexts(link, 3);
      const hasSiblingTerms = siblings.some(text => 
        /terms|conditions|legal|copyright|contact|cookies|隐私|条款|版权|联系/i.test(text)
      );
      
      if (hasSiblingTerms) {
        return true;
      }
    }
  }
  
  // Lower confidence checks - only for terms/policy keywords in specific contexts
  if (termsKeywords.test(link.href) || 
      (link.textContent && termsKeywords.test(link.textContent.trim()))) {
    
    // Only consider terms/policy keywords in footer areas
    if (isLinkInFooter(link)) {
      const siblings = getSiblingLinkTexts(link, 5);
      
      // Only trigger if there are clear privacy-related siblings
      const hasPrivacySiblings = siblings.some(text => 
        secondaryPrivacyKeywords.test(text)
      );
      
      if (hasPrivacySiblings) {
        return true;
      }
    }
  }
  
  // Reduced support for complex URL encoded cases - only check for direct privacy terms
  try {
    const decodedUrl = decodeURIComponent(link.href);
    if (decodedUrl !== link.href && corePrivacyKeywords.test(decodedUrl)) {
      return true;
    }
  } catch (e) {
    // Decoding failed, ignore
  }
  
  return false;
}

// Get text of surrounding sibling link nodes
function getSiblingLinkTexts(link, count) {
  const result = [];
  
  // Try to get all links from parent element
  const parent = link.parentElement;
  if (!parent) return result;
  
  // Get all sibling links
  const siblings = parent.querySelectorAll('a');
  
  for (const sibling of siblings) {
    if (sibling !== link && sibling.textContent) {
      result.push(sibling.textContent.trim());
      if (result.length >= count) break;
    }
  }
  
  // If not enough sibling links, try to get links from parent's siblings
  if (result.length < count && parent.parentElement) {
    const parentSiblings = parent.parentElement.children;
    for (const parentSibling of parentSiblings) {
      if (parentSibling !== parent) {
        const links = parentSibling.querySelectorAll('a');
        for (const siblingLink of links) {
          if (siblingLink.textContent) {
            result.push(siblingLink.textContent.trim());
            if (result.length >= count) break;
          }
        }
      }
      if (result.length >= count) break;
    }
  }
  
  return result;
}

// Check if link is in footer area
function isLinkInFooter(link) {
  let current = link;
  
  // Look up 5 levels to find footer element
  for (let i = 0; i < 5; i++) {
    if (!current.parentElement) break;
    current = current.parentElement;
    
    // Check if element or its ID/class name contains footer-related terms
    const tagName = current.tagName.toLowerCase();
    const classNames = current.className ? current.className.toLowerCase() : '';
    const id = current.id ? current.id.toLowerCase() : '';
    
    if (
      tagName === 'footer' || 
      classNames.includes('footer') || 
      id.includes('footer') ||
      classNames.includes('bottom') ||
      id.includes('bottom') ||
      classNames.includes('ft') ||
      id.includes('ft')
    ) {
      return true;
    }
  }
  
  // Check position - if within 20% of the bottom of the page, it's likely a footer
  const rect = link.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight
  );
  
  const scrollPosition = window.scrollY || window.pageYOffset;
  const elementPosition = rect.top + scrollPosition;
  
  // If link is at the bottom 20% of the page
  if (elementPosition > documentHeight * 0.8) {
    return true;
  }
  
  return false;
}

// Handle mouse leave from links
function handleLinkLeave(e) {
  if (floatingIcon) {
    // Clear existing timer
    if (hideIconTimer) {
      clearTimeout(hideIconTimer);
    }
    
    // Get link and icon position information
    const link = e.target;
    const linkRect = link.getBoundingClientRect();
    
    // Store mouseout event coordinates for accurate position testing
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Check if icon exists and is visible before accessing its properties
    if (!floatingIcon || window.getComputedStyle(floatingIcon).opacity === '0') {
      return;
    }
    
    const iconRect = floatingIcon.getBoundingClientRect();
    
    // Set a short delay to check if mouse is over icon or another link
    hideIconTimer = setTimeout(() => {
      // Get current mouse position (may have changed since timeout was set)
      const currentX = currentMouseX || mouseX;
      const currentY = currentMouseY || mouseY;
      
      // Check if mouse is over icon
      const isOverIcon = currentX >= iconRect.left && 
                      currentX <= iconRect.right && 
                      currentY >= iconRect.top && 
                      currentY <= iconRect.bottom;
      
      // Don't hide if mouse is over icon or icon is locked
      if (isOverIcon || isIconLocked) {
        return;
      }
      
      // Check if mouse is over any relevant link
      const elementsUnderMouse = document.elementsFromPoint(currentX, currentY);
      const hoveredPrivacyLink = elementsUnderMouse.find(el => 
        el.tagName === 'A' && isPossiblePrivacyPolicyLink(el)
      );
      
      if (hoveredPrivacyLink) {
        // If hovering a new privacy link, update position immediately
        currentHoveredLink = hoveredPrivacyLink.href;
        positionIcon(floatingIcon, hoveredPrivacyLink);
      } else {
        // If not over any privacy link or icon, hide the icon
        floatingIcon.style.opacity = '0';
        floatingIcon.style.pointerEvents = 'none';
        
        // Reset lock status and last position when hiding
        isIconLocked = false;
        lastIconPosition = null;
        
        // Clear any pending position updates
        if (positionUpdateTimer) {
          clearTimeout(positionUpdateTimer);
          positionUpdateTimer = null;
        }
      }
    }, 100); // Reduced delay for faster response
  }
}

// Track if event listeners have been set up
let linkListenersInitialized = false;

// Add event listeners to all links
function setupLinkListeners() {
  // Avoid setting up the same listeners multiple times
  if (linkListenersInitialized) {
    console.log("Link listeners already set up, skipping");
    return;
  }
  
  console.log("Setting up link event listeners");
  
  // Add mouseover event listener
  document.addEventListener('mouseover', (e) => {
    if (e.target.tagName === 'A') {
      handleLinkHover(e);
    }
  });
  
  // Add mouseout event listener
  document.addEventListener('mouseout', (e) => {
    if (e.target.tagName === 'A') {
      handleLinkLeave(e);
    }
  });
  
  // Mark as initialized
  linkListenersInitialized = true;
}

// This initial setupLinkListeners will be called as part of init() function

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleEnabled") {
    isEnabled = message.isEnabled;
    // Hide floating icon if extension is disabled
    if (!isEnabled && floatingIcon) {
      floatingIcon.style.display = 'none';
    } else if (isEnabled) {
      // Re-initialize when extension is enabled again
      console.log("Extension re-enabled, scanning page for privacy links");
      
      // If floating icon exists, remove it completely to avoid style issues
      if (floatingIcon) {
        console.log("Removing existing floating icon to rebuild it fresh");
        floatingIcon.remove();
        floatingIcon = null;
        
        // Also reset related states
        isIconLocked = false;
        lastIconPosition = null;
        currentHoveredLink = null;
        
        if (hideIconTimer) {
          clearTimeout(hideIconTimer);
          hideIconTimer = null;
        }
        
        if (positionUpdateTimer) {
          clearTimeout(positionUpdateTimer);
          positionUpdateTimer = null;
        }
      }
      
      // Reset cache to force fresh detection
      linkDetectionCache.clear();
      
      // Reset any existing observer
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      
      // Reinitialize detection immediately
      init(); // Call main init function to set up everything from scratch
      
      // Additional check for currently hovered links
      setTimeout(() => {
        // Look for any link that might be currently hovered
        const hoveredElements = document.querySelectorAll(':hover');
        
        // Check if any of the hovered elements are links
        for (const element of hoveredElements) {
          if (element.tagName === 'A' && element.href && isPossiblePrivacyPolicyLink(element)) {
            console.log("Found hovered privacy link, showing icon");
            handleLinkHover({ target: element });
            break;
          }
        }
      }, 300);
    }
  } else if (message.action === "showSummary") {
    const { isLoading, summary, error } = message;
    
    // Ignore completed request if it was cancelled
    if (isRequestCancelled && !isLoading) {
      return;
    }
    
    if (isLoading) {
      isRequestCancelled = false;
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

let popupContainer = null;

function showOrUpdatePopup(isLoading, text, isError) {
  // Login check - if we have auth.js integration, use its check
  if (window.privacyAuth && !isLoading) {
    chrome.storage.local.get(['isLoggedIn'], (result) => {
      if (!result.isLoggedIn) {
        // If not logged in, show login page
        window.privacyAuth.showAuthPopup();
        return;
      } else {
        // If logged in, continue with original logic
        continueShowPopup();
      }
    });
  } else {
    // If auth.js is not loaded or initializing, continue with original logic
    continueShowPopup();
  }
  
  function continueShowPopup() {
    // Handle transition from loading to summary state
    if (popupContainer && isLoading === false && popupContainer.isLoading === true) {
      // Mark current popup as not loading
      popupContainer.isLoading = false;
      
      // Add fade-out animation
      popupContainer.container.classList.add('fade-out');
      popupContainer.overlay.classList.add('fade-out');
      
      // Wait for fade-out before creating new popup
      setTimeout(() => {
        // Remove old popup
        popupContainer.container.remove();
        popupContainer.overlay.remove();
        
        // Create new popup
        popupContainer = createPopup();
        popupContainer.isLoading = false;
        
        // Update new popup content
        updatePopup(popupContainer, isLoading, text, isError);
        
        // If not loading and no error, add profile button to summary page
        if (!isLoading && !isError && window.privacyAuth && typeof window.privacyAuth.addProfileButtonToSummary === 'function') {
          setTimeout(() => {
            console.log('Adding profile button after content loaded');
            window.privacyAuth.addProfileButtonToSummary();
          }, 100);
        }
      }, 300);
    } else {
      // Create new popup if none exists
      if (!popupContainer) {
        popupContainer = createPopup();
        popupContainer.isLoading = isLoading;
      }
      // Update popup content
      updatePopup(popupContainer, isLoading, text, isError);
      
      // If not loading and no error, add profile button to summary page
      // If not loading and no error, add profile button to summary page
      if (!isLoading && !isError && window.privacyAuth && typeof window.privacyAuth.addProfileButtonToSummary === 'function') {
        setTimeout(() => {
          console.log('Adding profile button after content loaded');
          window.privacyAuth.addProfileButtonToSummary();
        }, 100);
      }
    }
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
    // Custom scrollbar styling - updated for embedded scrollbar
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(25, 118, 210, 0.3) transparent',
    // Add padding-right to prevent content shift when scrollbar appears
    paddingRight: '20px',
    // Add overflow-y: overlay for modern browsers to embed scrollbar
    overflowY: 'overlay'
  });
  
  // Insert overlay + container into the document
  document.body.appendChild(overlay);
  document.body.appendChild(container);

  // Add scroll handling
  let scrollTimer;
  container.addEventListener('scroll', function() {
    // Add scrolling class
    this.classList.add('scrolling');
    
    // Clear previous timer
    if (scrollTimer) {
      clearTimeout(scrollTimer);
    }
    
    // Set timer to remove class after 1 second of no scrolling
    scrollTimer = setTimeout(() => {
      this.classList.remove('scrolling');
    }, 1000);
  });

  return { overlay, container };
}

/**
 * Update popup content
 */
function updatePopup(popup, isLoading, text, isError) {
  const { overlay, container } = popup;

  // Clear all child nodes
  container.innerHTML = "";

  // Title container for centered title
  const titleContainer = document.createElement('div');
  Object.assign(titleContainer.style, {
    textAlign: 'center',
    width: '100%',
    marginBottom: '1.5em'
  });

  // Title
  const title = document.createElement('h2');
  if (isLoading) {
    title.innerText = "Summarizing, please wait...";
  } else {
    title.innerText = isError ? "Error" : "Privacy Policy Summary";
  }
  Object.assign(title.style, {
    marginTop: '0',
    marginBottom: '0',
    fontSize: '1.5rem',
    background: 'linear-gradient(to right, #1565c0, #1976d2, #2196f3)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textAlign: 'center',
    fontWeight: '600',
    position: 'relative',
    paddingBottom: '10px',
    letterSpacing: '-0.02em',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: 'inline-block'
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
  
  titleContainer.appendChild(title);
  container.appendChild(titleContainer);

  if (!isLoading && !isError) {
    // Check if chat feature is visible
    chrome.storage.local.get(['isAdmin'], async (result) => {
      // Admin users can always see the chat button
      if (result.isAdmin) {
        addChatButton();
        return;
      }
      
      try {
        // For regular users, check visibility settings
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/get_visibility?feature=extension`);
        const data = await response.json();
        
        if (data.visible) {
          // If visible, show button
          addChatButton();
        }
      } catch (error) {
        console.error('Error checking chat visibility:', error);
        // Default to not showing if error occurs
      }
    });
    
    // Function to add chat button
    function addChatButton() {
      const chatButtonContainer = document.createElement('div');
      Object.assign(chatButtonContainer.style, {
        position: 'absolute',
        top: '25px',
        right: '25px',
        zIndex: 99999
      });
      
      // Add chat icon button
      const chatButton = document.createElement('div');
      chatButton.className = 'privacy-chat-button';
      Object.assign(chatButton.style, {
        width: '36px',
        height: '36px',
        cursor: 'pointer',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1976d2, #2196f3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      });
      
      // Modern chat icon
      const chatIcon = document.createElement('div');
      Object.assign(chatIcon.style, {
        width: '18px',
        height: '18px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'translateY(-1px)'
      });
      
      chatIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#ffffff">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h2v3c0 .55.45 1 1 1c.25 0 .5-.1.7-.29l3.7-3.71H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9H8c-.55 0-1-.45-1-1s.45-1 1-1h4c.55 0 1 .45 1 1s-.45 1-1 1zm4-4H8c-.55 0-1-.45-1-1s.45-1 1-1h8c.55 0 1 .45 1 1s-.45 1-1 1z"/>
        </svg>
      `;
      
      chatButton.appendChild(chatIcon);
      
      // Add chat button hover effects
      chatButton.addEventListener('mouseover', () => {
        chatButton.style.transform = 'scale(1.1) rotate(5deg)';
        chatButton.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
      });
      
      chatButton.addEventListener('mouseout', () => {
        chatButton.style.transform = 'scale(1) rotate(0deg)';
        chatButton.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
      });
      
      // Add chat button click event using chatbox.js function
      chatButton.addEventListener('click', function(e) {
        // Record button position for animation
        const buttonRect = chatButton.getBoundingClientRect();
        window.privacyChatbox.openChatWindow(buttonRect);
      });
      
      // Add tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'chat-button-tooltip';
      Object.assign(tooltip.style, {
        position: 'absolute',
        background: 'white',
        color: '#333',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'opacity 0.2s ease-in-out',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        zIndex: '99999',
        right: '42px',
        top: '8px'
      });
      tooltip.textContent = 'Open Chat';
      
      // Add tooltip arrow
      const arrow = document.createElement('div');
      Object.assign(arrow.style, {
        position: 'absolute',
        top: '50%',
        right: '-4px',
        transform: 'translateY(-50%)',
        width: '0',
        height: '0',
        borderTop: '4px solid transparent',
        borderBottom: '4px solid transparent',
        borderLeft: '4px solid white'
      });
      tooltip.appendChild(arrow);
      
      // Show/hide tooltip on hover
      chatButton.addEventListener('mouseover', () => {
        tooltip.style.opacity = '1';
      });
      
      
      chatButton.addEventListener('mouseout', () => {
        tooltip.style.opacity = '0';
      });
      
      chatButtonContainer.appendChild(chatButton);
      chatButtonContainer.appendChild(tooltip);
      
      container.appendChild(chatButtonContainer);
    }
    
    // Directly add profile button - new code
    // Check if user is logged in
    chrome.storage.local.get(['isLoggedIn'], (result) => {
      if (result.isLoggedIn && window.privacyAuth) {
        // Add delay to ensure DOM is ready
        setTimeout(() => {
          console.log('Adding profile button together with chat button (direct addition)');
          window.privacyAuth.addProfileButtonToSummary();
        }, 50);
      }
    });
  }

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
      
      // Add instruction text
      const instructionText = document.createElement('div');
      instructionText.innerText = "Hint: You can click on any color or number to filter bubbles by importance level!";
      Object.assign(instructionText.style, {
        fontSize: '0.85rem',
        color: '#555',
        marginBottom: '15px',
        lineHeight: '1.4',
        fontStyle: 'italic',
        padding: '8px 12px',
        backgroundColor: 'rgba(25, 118, 210, 0.05)',
        borderRadius: '4px',
        border: '1px dashed rgba(25, 118, 210, 0.2)'
      });
      colorLegend.appendChild(instructionText);
      
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
        { level: 4, color: '#f57c00', gradient: 'linear-gradient(135deg, #f57c00, #fb8c00)' },  // Important - Light Orange (was #e64a19)
        { level: 3, color: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107, #ffeb3b)' },  // Medium - Lighter Yellow (was #ffa000)
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
        marginTop: '0',
        padding: '0',
        borderRadius: '4px',
        backgroundColor: 'rgba(25, 118, 210, 0.05)',
        opacity: '0',
        height: '0',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        borderLeft: 'none'
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
          filterStatusContainer.style.padding = '0';
          filterStatusContainer.style.marginTop = '0';
          filterStatusContainer.style.borderLeft = 'none';
          filterStatusContainer.style.overflow = 'hidden';
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
          filterStatusContainer.style.overflow = 'visible';
          
          if (colorInfo) {
            filterStatusContainer.style.borderLeft = `3px solid ${colorInfo.color}`;
          }
        }
      }
      
      // Track current filtering operation and animation state
      let currentFilterOperation = 0;
      let animationLocks = new Map();
      
      // Clear all animation locks and transition effects
      function clearAnimationState() {
        // Clear all animation locks
        animationLocks = new Map();
        
        // Reset transition styles for all containers
        document.querySelectorAll('.summary-content').forEach(container => {
          container.style.transition = '';
          container.style.height = '';
        });
        
        // Reset bubble animation states
        document.querySelectorAll('.summary-content div[style*="border-radius: 25px"]').forEach(bubble => {
          bubble.style.animationName = '';
          bubble.style.animationDelay = '';
          bubble.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s, background 0.3s, opacity 0.3s';
          bubble.style.opacity = bubble.style.display === 'none' ? '0' : '1';
        });
      }
      
      // Function to apply filter
      function applyFilter(level) {
        // Increment operation counter to track latest operation
        currentFilterOperation++;
        const thisFilterOperation = currentFilterOperation;
        
        // Clear all animation states first
        clearAnimationState();
        
        const allCategoryDivs = document.querySelectorAll('.summary-content');
        
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
          `;
          document.head.appendChild(styleSheet);
        }
        
        // Create list of bubbles to show
        const bubblesToShow = [];
        
        // Find all bubbles that should be shown
        allCategoryDivs.forEach(categoryDiv => {
          const bubbles = categoryDiv.querySelectorAll('div[style*="border-radius: 25px"]');
          
          bubbles.forEach(bubble => {
            // Get importance level
            let bubbleLevel = parseInt(bubble.dataset.importance);
            
            // Record bubbles that meet the condition
            if (level === null || bubbleLevel === level) {
              bubblesToShow.push(bubble);
            }
          });
        });
        
        // Hide all bubbles first
        allCategoryDivs.forEach(categoryDiv => {
          const bubbles = categoryDiv.querySelectorAll('div[style*="border-radius: 25px"]');
          
          bubbles.forEach(bubble => {
            // Clear possible animation states
            bubble.style.animationName = '';
            bubble.style.transition = '';
            
            if (!bubblesToShow.includes(bubble)) {
              // Directly hide bubbles that should not be shown
              bubble.style.display = 'none';
              bubble.style.opacity = '0';
            } else {
              // Prepare bubbles to be shown
              bubble.style.display = '';
              bubble.style.opacity = '0';
            }
          });
        });
        
        // Set animation locks for each container
        allCategoryDivs.forEach(categoryDiv => {
          animationLocks.set(categoryDiv, true);
        });
        
        // Use requestAnimationFrame to ensure DOM updates are processed after rendering
        requestAnimationFrame(() => {
          if (currentFilterOperation !== thisFilterOperation) return;
          
          // Process bubbles and adjust container height
          allCategoryDivs.forEach(categoryDiv => {
            const bubbleContainer = categoryDiv.querySelector('div[style*="display: flex"][style*="flex-wrap: wrap"]');
            if (!bubbleContainer) return;
            
            // Calculate number of visible bubbles in the container
            const visibleBubbles = Array.from(bubbleContainer.querySelectorAll('div[style*="border-radius: 25px"]'))
              .filter(bubble => bubblesToShow.includes(bubble));
            
            // Show bubbles and set animation
            visibleBubbles.forEach((bubble, index) => {
              bubble.style.display = '';
              
              // Set fade-in animation
              bubble.style.animationName = 'bubbleFilterIn';
              bubble.style.animationDuration = '0.5s';
              bubble.style.animationTimingFunction = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
              bubble.style.animationFillMode = 'forwards';
              bubble.style.animationDelay = `${index * 0.05}s`;
              
              // Cleanup after animation ends
              const animEndHandler = () => {
                if (currentFilterOperation === thisFilterOperation) {
                  bubble.style.opacity = '1';
                  bubble.style.transform = 'translateY(0) scale(1)';
                  bubble.style.animationName = '';
                  bubble.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s, background 0.3s, opacity 0.3s';
                }
                bubble.removeEventListener('animationend', animEndHandler);
              };
              bubble.addEventListener('animationend', animEndHandler);
            });
            
            // Adjust container height
            setTimeout(() => {
              if (currentFilterOperation !== thisFilterOperation) return;
              
              // If there are visible bubbles, adjust container height
              if (visibleBubbles.length > 0) {
                const titleHeight = categoryDiv.querySelector('h3').offsetHeight || 0;
                const paddingTop = 18;
                const paddingBottom = 18;
                const marginBottom = 15;
                
                // Ensure accurate calculation of container content height
                const bubbleContainerHeight = bubbleContainer.scrollHeight || 0;
                const requiredHeight = titleHeight + bubbleContainerHeight + paddingTop + paddingBottom + marginBottom;
                
                // Get current height as starting point
                const currentHeight = categoryDiv.getBoundingClientRect().height || 100;
                
                // Use two-step animation to ensure smooth transition
                categoryDiv.style.overflow = 'visible';
                categoryDiv.style.transition = 'none';
                categoryDiv.style.height = `${currentHeight}px`;
                
                // Force repaint
                void categoryDiv.offsetHeight;
                
                // Apply height change
                categoryDiv.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                categoryDiv.style.height = `${requiredHeight}px`;
              } else {
                // If no visible bubbles, set minimum height
                const minHeight = 100;
                categoryDiv.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                categoryDiv.style.height = `${minHeight}px`;
              }
              
              // Unlock after animation completes
              setTimeout(() => {
                if (currentFilterOperation === thisFilterOperation) {
                  animationLocks.set(categoryDiv, false);
                  
                  // Check if all animations are complete
                  let allCompleted = true;
                  animationLocks.forEach((locked) => {
                    if (locked) allCompleted = false;
                  });
                  
                  // If all animations are complete, reset overall state
                  if (allCompleted) {
                    // Reset transition styles but keep height
                    categoryDiv.style.transition = '';
                  }
                }
              }, 650);
            }, 250);
          });
        });
      }
      
      // Function to reset all bubble animation states - simplified version, mainly using clearAnimationState
      function resetBubbleAnimations() {
        clearAnimationState();
      }
      
      // Clear filter button click event
      clearFilterBtn.addEventListener('click', () => {
        currentFilter = null;
        
        // Close the currently expanded summary box
        if (currentExpandedSummary) {
          const closeBtn = currentExpandedSummary.querySelector('div[role="button"], div.close-btn');
          if (closeBtn) {
            closeBtn.click();
          } else {
            currentExpandedSummary.classList.add('collapsing');
            setTimeout(() => {
              currentExpandedSummary.remove();
              currentExpandedSummary = null;
            }, 300);
          }
        }
        
        // Reset all selected states
        const allSegments = segmentedBar.querySelectorAll('div');
        allSegments.forEach(segment => {
          segment.style.transform = 'scaleY(1) translateY(0)';
          segment.style.opacity = '1';
          segment.style.boxShadow = 'none';
          segment.style.zIndex = '1';
        });
        
        const allNumbers = numbersContainer.querySelectorAll('div');
        allNumbers.forEach(number => {
          number.style.transform = 'scale(1)';
          number.style.fontWeight = '600';
          number.style.boxShadow = `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px ${
            importanceColors.find(ic => ic.level === parseInt(number.innerText))?.color || '#333'
          }30`;
          number.style.opacity = '1';
          number.style.background = 'rgba(255, 255, 255, 0.7)';
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
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        gap: '2px',
        padding: '2px',
        background: 'rgba(0,0,0,0.05)',
        boxSizing: 'border-box'
      });
      
      // Create segments
      importanceColors.forEach(item => {
        const segment = document.createElement('div');
        Object.assign(segment.style, {
          flex: '1',
          background: item.gradient,
          transition: 'all 0.3s ease',
          position: 'relative',
          boxShadow: 'none',
          zIndex: '1',
          borderRadius: '4px'
        });
        
        // Add data attribute to store importance level
        segment.dataset.level = item.level;
        
        // Add hover effect
        segment.addEventListener('mouseover', () => {
          if (currentFilter !== item.level) {
            segment.style.transform = 'scaleY(1.1) translateY(-2px)';
            segment.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.2)';
            segment.style.zIndex = '2';
          }
        });
        
        segment.addEventListener('mouseout', () => {
          if (currentFilter !== item.level) {
            segment.style.transform = 'scaleY(1) translateY(0)';
            segment.style.boxShadow = 'none';
            segment.style.zIndex = '1';
          }
        });
        
        // Add click filter functionality
        segment.addEventListener('click', () => {
          // Reset all bubble animation states
          resetBubbleAnimations();
          
          // Close the currently expanded summary box
          if (currentExpandedSummary) {
            const closeBtn = currentExpandedSummary.querySelector('div[role="button"], div.close-btn');
            if (closeBtn) {
              closeBtn.click();
            } else {
              currentExpandedSummary.classList.add('collapsing');
              setTimeout(() => {
                currentExpandedSummary.remove();
                currentExpandedSummary = null;
              }, 300);
            }
          }

          // If the current level is already selected, clear the filter
          if (currentFilter === item.level) {
            currentFilter = null;
            segment.style.transform = 'scaleY(1) translateY(0)';
            segment.style.boxShadow = 'none';
            segment.style.zIndex = '1';
            
            // Reset other color segment styles
            const allSegments = segmentedBar.querySelectorAll('div');
            allSegments.forEach(otherSegment => {
              otherSegment.style.opacity = '1';
              otherSegment.style.boxShadow = 'none';
              otherSegment.style.zIndex = '1';
              otherSegment.style.transform = 'scaleY(1) translateY(0)';
            });
            
            // Reset number label styles
            const allNumbers = numbersContainer.querySelectorAll('div');
            allNumbers.forEach(number => {
              number.style.transform = 'scale(1)';
              number.style.fontWeight = '600';
              number.style.boxShadow = `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px ${
                importanceColors.find(ic => ic.level === parseInt(number.innerText))?.color || '#333'
              }30`;
              number.style.opacity = '1';
              number.style.background = 'rgba(255, 255, 255, 0.7)';
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
                otherSegment.style.transform = 'scaleY(1.2) translateY(-2px)';
                otherSegment.style.opacity = '1';
                otherSegment.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.25)';
                otherSegment.style.zIndex = '2';
              } else {
                otherSegment.style.transform = 'scaleY(1) translateY(0)';
                otherSegment.style.opacity = '0.5';
                otherSegment.style.boxShadow = 'none';
                otherSegment.style.zIndex = '1';
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
        padding: '0 2%'
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
          
          // Close the currently expanded summary box
          if (currentExpandedSummary) {
            const closeBtn = currentExpandedSummary.querySelector('div[role="button"], div.close-btn');
            if (closeBtn) {
              closeBtn.click();
            } else {
              currentExpandedSummary.classList.add('collapsing');
              setTimeout(() => {
                currentExpandedSummary.remove();
                currentExpandedSummary = null;
              }, 300);
            }
          }

          // If the current level is already selected, clear the filter
          if (currentFilter === item.level) {
            currentFilter = null;
            numberLabel.style.transform = 'scale(1)';
            numberLabel.style.fontWeight = '600';
            numberLabel.style.boxShadow = `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px ${item.color}30`;
            numberLabel.style.background = 'rgba(255, 255, 255, 0.7)';
            
            // Reset color segment styles
            const allSegments = segmentedBar.querySelectorAll('div');
            allSegments.forEach(otherSegment => {
              otherSegment.style.opacity = '1';
              otherSegment.style.boxShadow = 'none';
              otherSegment.style.zIndex = '1';
              otherSegment.style.transform = 'scaleY(1) translateY(0)';
            });
            
            // Reset number label styles
            const allNumbers = numbersContainer.querySelectorAll('div');
            allNumbers.forEach(number => {
              number.style.transform = 'scale(1)';
              number.style.fontWeight = '600';
              number.style.boxShadow = `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px ${
                importanceColors.find(ic => ic.level === parseInt(number.innerText))?.color || '#333'
              }30`;
              number.style.opacity = '1';
              number.style.background = 'rgba(255, 255, 255, 0.7)';
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
            allSegments.forEach(otherSegment => {
              if (parseInt(otherSegment.dataset.level) === item.level) {
                otherSegment.style.transform = 'scaleY(1.2) translateY(-2px)';
                otherSegment.style.opacity = '1';
                otherSegment.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.25)';
                otherSegment.style.zIndex = '2';
              } else {
                otherSegment.style.transform = 'scaleY(1) translateY(0)';
                otherSegment.style.opacity = '0.5';
                otherSegment.style.boxShadow = 'none';
                otherSegment.style.zIndex = '1';
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
        { title: "Who will have access to your personal information?", data: summary.data_sharing },
        // { title: "User Access/Edit/Deletion", data: summary.user_access_edit_deletion },
        // { title: "Data Retention", data: summary.data_retention },
        // { title: "Data Security", data: summary.data_security },
        // { title: "International & Specific Audiences", data: summary.international_specific_audiences },
        // { title: "User Choice & Control", data: summary.user_choice_control },
        // { title: "Introduction", data: summary.introductory_generic },
        // { title: "Privacy Contact Information", data: summary.privacy_contact_information }
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
        if (category.title === "What personal information will be collected?" || category.title === "What will the personal information be used for?" || category.title === "Who will have access to your personal information?" ){
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
                case 4: // Important - Light Orange
                  bubbleColor = 'linear-gradient(135deg, #f57c00, #fb8c00)';
                  bubbleShadow = '0 3px 8px rgba(245, 124, 0, 0.3)';
                  break;
                case 3: // Medium - Lighter Yellow
                  bubbleColor = 'linear-gradient(135deg, #ffc107, #ffeb3b)';
                  bubbleShadow = '0 3px 8px rgba(255, 235, 59, 0.3)';
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
            
            // Determine text color based on bubble color for better contrast
            let textColor = '#fff'; // Default white text for most bubbles
            if (item.importance === 3) { // Only for yellow bubbles
              textColor = '#212121'; // Dark gray text for better visibility on yellow
            }
            
            Object.assign(bubble.style, {
              background: bubbleColor,
              color: textColor, // Set dynamic text color
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
                  case 4: // Important - Light Orange
                    this.style.boxShadow = '0 5px 12px rgba(245, 124, 0, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #ef6c00, #f57c00)';
                    break;
                  case 3: // Medium - Lighter Yellow
                    this.style.boxShadow = '0 5px 12px rgba(255, 235, 59, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #ffd54f, #ffc107)';
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
              // If the summary is currently animating, ignore click
              if (isSummaryAnimating) {
                return;
              }
              
              // If there is an expanded popup, close it first
              if (currentExpandedSummary) {
                // Set animation lock
                isSummaryAnimating = true;
                
                // Get the close button of current popup and trigger click event
                const closeBtn = currentExpandedSummary.querySelector('div[role="button"], div.close-btn');
                if (closeBtn) {
                  closeBtn.click();
                } else {
                  // If close button not found, directly remove current popup
                  currentExpandedSummary.remove();
                  
                  // Reset tracking variable
                  currentExpandedSummary = null;
                  
                  // Reset animation lock
                  isSummaryAnimating = false;
                }
                
                // Give some time for previous popup closing animation to complete
                setTimeout(() => {
                  // Reset animation lock
                  isSummaryAnimating = false;
                  showExpandedSummary();
                }, 600); // Wait for closing animation to complete
                return;
              }
              
              
              // No expanded popup, create new one directly
              showExpandedSummary();
              
              // Show expanded summary
              function showExpandedSummary() {
                // Set animation lock
                isSummaryAnimating = true;
                
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
                
                // Create a more reliable temporary measurement element
                const tempMeasure = document.createElement('div');
                Object.assign(tempMeasure.style, {
                  position: 'absolute',
                  visibility: 'hidden',
                  width: `${expandedWidth - 40}px`, // subtract padding
                  padding: '20px',
                  boxSizing: 'border-box',
                  left: '-9999px',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  overflow: 'hidden'
                });
                document.body.appendChild(tempMeasure);
                
                // Copy summary content to measurement element
                tempMeasure.innerHTML = `
                  <h4 style="margin: 0 0 12px 0; font-size: 1.1rem; font-weight: 600; position: relative; padding-bottom: 8px; letter-spacing: -0.02em;">${item.keyword}</h4>
                  <div style="line-height: 1.6; margin-bottom: 15px; font-size: 0.95rem; font-weight: 300; word-break: break-word; overflow-wrap: break-word;">${item.summary}</div>
                  <a style="display: inline-block; padding: 6px 12px; margin-bottom: 10px; font-size: 0.9rem; border: 1px solid #ccc;">View Original Text</a>
                  <a style="display: inline-block; padding: 6px 12px; margin-bottom: 10px; margin-left: 10px; font-size: 0.9rem; border: 1px solid #ccc;">Detail Explanation</a>
                `;
                
                // Measure height
                const measuredHeight = tempMeasure.scrollHeight;
                document.body.removeChild(tempMeasure);
                                
                // Use more accurate height calculation
                const minHeight = 170;
                const maxHeight = Math.min(500, window.innerHeight * 0.7);
                const dynamicHeight = Math.max(minHeight, Math.min(measuredHeight + 40, maxHeight));
                
                // Record original height and style of category container
                const originalHeight = categoryDiv.clientHeight;
                const originalMinHeight = categoryDiv.style.minHeight;
                const originalHeightBeforeExpand = categoryDiv.offsetHeight;
                
                // Set expansion animation
                setTimeout(() => {
                  // Calculate expanded position to ensure it doesn't exceed container boundaries
                  let finalLeft = relativeLeft;
                  
                  // If bubble is not at leftmost position, adjust position to avoid right boundary overflow
                  if (relativeLeft + expandedWidth > categoryDiv.clientWidth - 15) {
                    // Move expanded box left to align its right edge with container right edge (15px margin)
                    finalLeft = categoryDiv.clientWidth - expandedWidth - 15;
                  }
                  
                  // Add safety check to ensure no negative position
                  finalLeft = Math.max(finalLeft, 10);
                  
                  // Additional check to ensure summary box doesn't exceed right boundary
                  const safeWidth = Math.min(expandedWidth, categoryDiv.clientWidth - 30);
                  
                  expandedSummary.style.zIndex = '20';
                  
                  expandedSummary.style.width = `${safeWidth}px`;
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
                      borderColor = '#1976d2';
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
                  const summaryBottom = relativeTop + dynamicHeight + 20;
                  
                  // Check if it will exceed category container bottom
                  if (summaryBottom > categoryDiv.clientHeight) {
                    // Calculate additional height needed
                    const extraHeight = summaryBottom - categoryDiv.clientHeight + 20;
                    const currentHeight = categoryDiv.getBoundingClientRect().height;
                    
                    const applyContainerExpansion = () => {
                      categoryDiv.style.overflow = 'visible';
                      categoryDiv.style.transition = 'none';
                      
                      categoryDiv.style.height = `${currentHeight}px`;
                      categoryDiv.style.minHeight = `${currentHeight}px`;
                      
                      void categoryDiv.offsetHeight;
                      
                      requestAnimationFrame(() => {
                        categoryDiv.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                        
                        void categoryDiv.offsetHeight;
                        
                        categoryDiv.style.height = `${currentHeight + extraHeight}px`;
                        
                        setTimeout(() => {
                          categoryDiv.style.transition = '';
                        }, 650);
                      });
                    };
                    
                    applyContainerExpansion();
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
                    lineHeight: '22px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    color: borderColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    zIndex: '11',
                    textAlign: 'center'
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
                    
                    // Set animation lock
                    isSummaryAnimating = true;
                    
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
                    
                    if (originalHeight && originalHeight > 0) {
                      const allBubbles = bubbleContainer.querySelectorAll('.bubble');
                      let maxBubbleBottom = 0;
                      
                      allBubbles.forEach(b => {
                        if (window.getComputedStyle(b).display !== 'none') {
                          const bubbleRect = b.getBoundingClientRect();
                          const bubbleBottom = bubbleRect.top - categoryRect.top + bubbleRect.height + 20;
                          maxBubbleBottom = Math.max(maxBubbleBottom, bubbleBottom);
                        }
                      });
                      
                      // Ensure the height is enough to contain all visible bubbles, and add extra safety margin
                      const minRequiredHeight = maxBubbleBottom > 0 ? maxBubbleBottom + 30 : originalHeight;
                      
                      // Solve the problem of continuous clicking: detect if it is already in the closing process, delay setting the height
                      if (expandedSummary.classList.contains('collapsing')) {
                        setTimeout(() => {
                          categoryDiv.style.height = `${Math.max(originalHeight, minRequiredHeight)}px`;
                          // Force recalculate layout again to ensure the height is correctly applied
                          void categoryDiv.offsetHeight;
                        }, 100);
                      } else {
                        categoryDiv.style.height = `${Math.max(originalHeight, minRequiredHeight)}px`;
                      }
                    } else if (originalHeightBeforeExpand && originalHeightBeforeExpand > 0) {
                      // Ensure enough height
                      categoryDiv.style.height = `${originalHeightBeforeExpand}px`;
                    } else {
                      // If there is no valid original height, use the natural height of the content
                      categoryDiv.style.height = 'auto';
                    }
                    
                    // Restore original minimum height
                    categoryDiv.style.minHeight = originalMinHeight || 'auto';
                    
                    // 6. Clean up all styles after transition and remove expanded summary box
                    setTimeout(() => {
                      try {
                        // Get all visible bubbles with a more reliable method
                        let allBubbles = Array.from(bubbleContainer.querySelectorAll('div[style*="border-radius: 25px"]'));
                        
                        // If no elements are found, try using other selectors
                        if (allBubbles.length === 0) {
                          allBubbles = Array.from(bubbleContainer.querySelectorAll('div')).filter(el => {
                            const style = window.getComputedStyle(el);
                            return style.borderRadius.includes('px') && parseFloat(style.borderRadius) > 10;
                          });
                        }
                        
                        // Filter visible bubbles
                        const visibleBubbles = allBubbles.filter(b => {
                          const style = window.getComputedStyle(b);
                          return style.display !== 'none' && 
                                 parseFloat(style.opacity) > 0 && 
                                 b !== expandedSummary;
                        });
                                     
                        if (visibleBubbles.length > 0) {
                          // Find the position of the lowest bubble
                          let maxBottom = 0;
                          const categoryRect = categoryDiv.getBoundingClientRect();
                          
                          visibleBubbles.forEach(bubble => {
                            const rect = bubble.getBoundingClientRect();
                            // Calculate bottom position relative to the container
                            const bubbleBottom = rect.bottom - categoryRect.top;
                            maxBottom = Math.max(maxBottom, bubbleBottom);
                          });
                          
                          // Extra margin to ensure all bubbles are fully visible
                          const extraBottomMargin = 20; // Set to a value similar to title and container margins
                          const reasonableHeight = maxBottom + extraBottomMargin;
                          
                          // Set a reasonable height, ensuring a minimum value
                          categoryDiv.style.height = `${Math.max(reasonableHeight, 120)}px`;
                        } else {
                          // If no visible bubbles, restore original height or set minimum height
                          categoryDiv.style.height = originalHeight ? `${originalHeight}px` : 'auto';
                          categoryDiv.style.minHeight = originalMinHeight || 'auto';
                        }
                      } catch (err) {
                        console.log('Error calculating container height:', err);
                        // Fall back to safe default values
                        categoryDiv.style.height = 'auto';
                        categoryDiv.style.minHeight = '120px';
                      }
                      
                      categoryDiv.style.transition = '';
                      categoryDiv.style.overflow = '';
                      
                      bubble.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s, background 0.3s, opacity 0.3s';
                      
                      expandedSummary.remove();
                      if (currentExpandedSummary === expandedSummary) {
                        currentExpandedSummary = null;
                      }
                      
                      // Release animation lock
                      isSummaryAnimating = false;
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
                    transitionDelay: '0.25s'
                  });
                  
                  // Add hover effect
                  contextLink.addEventListener('mouseover', () => {
                    contextLink.style.backgroundColor = `rgba(${hexToRgb(borderColor)}, 0.2)`;
                  });
                  
                  contextLink.addEventListener('mouseout', () => {
                    contextLink.style.backgroundColor = `rgba(${hexToRgb(borderColor)}, 0.1)`;
                  });
                  
                  // Add Detail Explanation button
                  const detailExplanationBtn = document.createElement('a');
                  detailExplanationBtn.href = "#";
                  
                  // Create a container to hold icon and text
                  const btnContent = document.createElement('div');
                  Object.assign(btnContent.style, {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    minHeight: '20px',
                    lineHeight: '1.2'
                  });
                  
                  // Add chat icon
                  const chatIcon = document.createElement('span');
                  chatIcon.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; display: inline-block; position: relative; top: -1px;">
                      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                    </svg>
                  `;
                  
                  // Add text
                  const btnText = document.createElement('span');
                  btnText.innerText = "Detail Explanation";
                  Object.assign(btnText.style, {
                    display: 'inline-block',
                    verticalAlign: 'middle'
                  });
                  
                  // Assemble button content
                  btnContent.appendChild(chatIcon);
                  btnContent.appendChild(btnText);
                  detailExplanationBtn.appendChild(btnContent);
                  
                  // Apply styles
                  Object.assign(detailExplanationBtn.style, {
                    color: borderColor,
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    display: 'inline-block',
                    padding: '6px 12px',  
                    margin: '0 0 10px 0',
                    marginLeft: '10px', 
                    backgroundColor: `rgba(${hexToRgb(borderColor)}, 0.1)`,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    transition: 'background-color 0.2s',
                    opacity: '0',
                    transform: 'translateY(10px)',
                    transition: 'opacity 0.3s ease, transform 0.3s ease, background-color 0.2s',
                    transitionDelay: '0.25s'
                  });
                  
                  // Add hover effect
                  detailExplanationBtn.addEventListener('mouseover', () => {
                    detailExplanationBtn.style.backgroundColor = `rgba(${hexToRgb(borderColor)}, 0.2)`;
                  });
                  
                  // Add mouseout event to reset background color
                  detailExplanationBtn.addEventListener('mouseout', () => {
                    detailExplanationBtn.style.backgroundColor = `rgba(${hexToRgb(borderColor)}, 0.1)`;
                  });
                  
                  // Click Detail Explanation button
                  detailExplanationBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Record button position for animation
                    const buttonRect = detailExplanationBtn.getBoundingClientRect();
                    
                    // Prepare bubble data for chat window
                    const bubbleData = {
                      keyword: item.keyword,
                      summary: item.summary,
                      category: category.title
                    };
                    
                    // Call chat window with auto query
                    window.privacyChatbox.openChatWindowWithAutoQuery(buttonRect, bubbleData, detailExplanationBtn);
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
                  
                  summaryContent.appendChild(contextLink);
                  summaryContent.appendChild(detailExplanationBtn);
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
                    
                    // Detail Explanation button independent animation, delay longer, for cascade effect
                    setTimeout(() => {
                      detailExplanationBtn.style.opacity = '1';
                      detailExplanationBtn.style.transform = 'translateY(0)';
                      
                      // Release animation lock after animation completes
                      isSummaryAnimating = false;
                    }, 400);
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

            // Add Detail Explanation button
            const detailExplanationBtn = document.createElement('a');
            detailExplanationBtn.href = "#";
            
            // Create a container to hold icon and text
            const btnContent = document.createElement('div');
            Object.assign(btnContent.style, {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              minHeight: '20px',
              lineHeight: '1.2'
            });
            
            // Add chat icon
            const chatIcon = document.createElement('span');
            chatIcon.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; display: inline-block; position: relative; top: -1px;">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
            `;
            
            // Add text
            const btnText = document.createElement('span');
            btnText.innerText = "Detail Explanation";
            Object.assign(btnText.style, {
              display: 'inline-block',
              verticalAlign: 'middle'
            });
            
            // Assemble button content
            btnContent.appendChild(chatIcon);
            btnContent.appendChild(btnText);
            detailExplanationBtn.appendChild(btnContent);
            
            Object.assign(detailExplanationBtn.style, {
              color: '#1976d2',
              textDecoration: 'none',
              fontSize: '0.9rem',
              display: 'inline-block',
              marginBottom: '10px',
              marginLeft: '10px',
              padding: '6px 12px', 
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              borderRadius: '4px',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(25, 118, 210, 0.3)',
              opacity: '0',
              transform: 'translateY(5px)'
            });
            
            // Add hover effect
            detailExplanationBtn.addEventListener('mouseover', () => {
              detailExplanationBtn.style.backgroundColor = `rgba(${hexToRgb(borderColor)}, 0.2)`;
            });
            
            // Add mouseout event to reset background color
            detailExplanationBtn.addEventListener('mouseout', () => {
              detailExplanationBtn.style.backgroundColor = `rgba(${hexToRgb(borderColor)}, 0.1)`;
            });
            
            // Click Detail Explanation button
            detailExplanationBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              // Record button position for animation
              const buttonRect = detailExplanationBtn.getBoundingClientRect();
              
              // Prepare bubble data for chat window
              const bubbleData = {
                keyword: item.keyword,
                summary: item.summary,
                category: category.title
              };
              
              // Call chat window with auto query
              window.privacyChatbox.openChatWindowWithAutoQuery(buttonRect, bubbleData, detailExplanationBtn);
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
                    sourceTabId: sourceTabId
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
            contentContainer.appendChild(detailExplanationBtn);
            itemDiv.appendChild(contentContainer);

            // Add click expand/collapse functionality
            let isExpanded = false;
            headerContainer.onclick = () => {
              isExpanded = !isExpanded;
              arrow.style.transform = isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
              contentContainer.style.maxHeight = isExpanded ? `${contentContainer.scrollHeight}px` : '0';
              contentContainer.style.padding = isExpanded ? '10px' : '0 10px';
              headerContainer.style.borderBottom = isExpanded ? '1px solid #e0e0e0' : '1px solid transparent';
              
              // Show or hide Detail Explanation button with animation when content expanded
              if (isExpanded) {
                // Delay showing Detail Explanation button for cascade effect
                setTimeout(() => {
                  detailExplanationBtn.style.opacity = '1';
                  detailExplanationBtn.style.transform = 'translateY(0)';
                }, 150);
              } else {
                // Immediately hide Detail Explanation button
                detailExplanationBtn.style.opacity = '0';
                detailExplanationBtn.style.transform = 'translateY(5px)';
              }
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
    padding: '10px 20px',
    background: 'linear-gradient(to right, #1976d2, #2196f3)',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    display: 'block',
    margin: '16px auto 0',
    opacity: '0',
    transform: 'translateY(10px)',
    animation: 'fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
    animationDelay: '0.6s',
    transition: 'all 0.3s ease',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });
  
  closeBtn.addEventListener('mouseover', () => {
    closeBtn.style.background = 'linear-gradient(to right, #1565c0, #1976d2)';
    closeBtn.style.transform = 'translateY(10px) scale(1.05)';
  });
  
  closeBtn.addEventListener('mouseout', () => {
    closeBtn.style.background = 'linear-gradient(to right, #1976d2, #2196f3)';
    closeBtn.style.transform = 'translateY(10px) scale(1)';
  });
  
  closeBtn.onclick = () => {
    // If currently loading, send cancellation request to backend
    if (isLoading) {
      chrome.runtime.sendMessage({
        action: "cancelSummary"
      });
      
      isRequestCancelled = true;
    }

    // Close chat window if it's open
    if (window.privacyChatbox && typeof window.privacyChatbox.closeChatWindow === 'function') {
      window.privacyChatbox.closeChatWindow();
    }

    // Close profile popup if it's open
    if (window.privacyAuth && typeof window.privacyAuth.closeProfilePopup === 'function') {
      window.privacyAuth.closeProfilePopup();
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

// Enhanced mouse tracking for better responsiveness
let lastMouseMoveTime = 0;
let lastTrackedLink = null;

document.addEventListener('mousemove', (event) => {
  const now = Date.now();
  
  // Always update current mouse position for accuracy
  currentMouseX = event.clientX;
  currentMouseY = event.clientY;
  lastMouseMoveTime = now;
  
  // If the icon exists, is visible, and not locked, check for links under mouse
  if (floatingIcon && 
      window.getComputedStyle(floatingIcon).opacity === '1' && 
      !isIconLocked) {
    
    // Check if mouse is directly over the icon
    const iconRect = floatingIcon.getBoundingClientRect();
    const isOverIcon = currentMouseX >= iconRect.left && 
                    currentMouseX <= iconRect.right && 
                    currentMouseY >= iconRect.top && 
                    currentMouseY <= iconRect.bottom;
    
    if (isOverIcon) {
      // Lock icon when mouse is over it
      isIconLocked = true;
      
      // Clear any timers that might cause the icon to disappear
      if (hideIconTimer) {
        clearTimeout(hideIconTimer);
        hideIconTimer = null;
      }
    } else {
      // Check for links under the mouse - optimize by limiting checks
      // Only check max every 32ms (about 30fps) when icon is visible but not locked
      if (now - lastMouseMoveTime > 32 || !lastTrackedLink) {
        const elementsUnderMouse = document.elementsFromPoint(currentMouseX, currentMouseY);
        const hoveredPrivacyLink = elementsUnderMouse.find(el => 
          el.tagName === 'A' && isPossiblePrivacyPolicyLink(el)
        );
        
        // If mouse is over a new privacy link, update icon position
        if (hoveredPrivacyLink && hoveredPrivacyLink !== lastTrackedLink) {
          lastTrackedLink = hoveredPrivacyLink;
          currentHoveredLink = hoveredPrivacyLink.href;
          positionIcon(floatingIcon, hoveredPrivacyLink);
        } else if (!hoveredPrivacyLink && lastTrackedLink) {
          // If moved from link to non-link area
          lastTrackedLink = null;
          
          // Don't immediately hide, let handleLinkLeave manage this
          // to avoid flickering during rapid mouse movements
        }
      }
    }
  }
});

// Add a cleanup function to prevent icon from getting stuck
function cleanupFloatingIcon() {
  // Reset icon state every 30 seconds if it's not being interacted with
  setInterval(() => {
    if (floatingIcon) {
      // Check if mouse is actually over the icon
      const iconRect = floatingIcon.getBoundingClientRect();
      const isActuallyOverIcon = 
        currentMouseX >= iconRect.left && 
        currentMouseX <= iconRect.right && 
        currentMouseY >= iconRect.top && 
        currentMouseY <= iconRect.bottom;
      
      // If icon is visible but mouse isn't over it and no recent interaction
      if (window.getComputedStyle(floatingIcon).opacity === '1' && 
          !isActuallyOverIcon && 
          Date.now() - lastMouseMoveTime > 1000) {
        
        // Force reset of the icon state
        isIconLocked = false;
        floatingIcon.style.opacity = '0';
        floatingIcon.style.pointerEvents = 'none';
        
        // Clear any pending timers
        if (hideIconTimer) {
          clearTimeout(hideIconTimer);
          hideIconTimer = null;
        }
        
        if (positionUpdateTimer) {
          clearTimeout(positionUpdateTimer);
          positionUpdateTimer = null;
        }
      }
    }
  }, 30000);
}

// Initialize cleanup function
cleanupFloatingIcon();

// Chrome extension message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showSummary") {
    // When summary is displayed, save current policy ID for chat functionality
    if (message.summary && !message.isLoading && !message.error) {
      try {
        const summary = typeof message.summary === 'string'
          ? JSON.parse(message.summary)
          : message.summary;
        
        if (summary && message.policy_id) {
          chrome.storage.local.set({ currentPolicyId: message.policy_id });
        }
      } catch (e) {
        console.error("Failed to parse summary:", e);
      }
    }
  }
});

// Add this code to ensure the overridden showOrUpdatePopup no longer uses the original function
if (window.privacyChatbox && typeof window.privacyChatbox.syncChatPosition === 'function') {
  const originalShowOrUpdatePopupRef = showOrUpdatePopup;
  showOrUpdatePopup = function(isLoading, text, isError) {
    originalShowOrUpdatePopupRef(isLoading, text, isError);
    
    // If chat window is open, sync its position
    setTimeout(window.privacyChatbox.syncChatPosition, 100);
  };
}

// Load auth.js script
function loadAuthScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('auth.js');
  script.onload = function() {
    // Initialize after script is loaded
    if (window.privacyAuth && typeof window.privacyAuth.initAuth === 'function') {
      window.privacyAuth.initAuth();
      window.privacyAuth.interceptShowSummary();
    }
  };
  document.head.appendChild(script);
}

// Check if extension is enabled on page load
chrome.storage.local.get(['isEnabled'], (result) => {
  isEnabled = result.isEnabled !== false; // Default to true if not set
  
  if (isEnabled) {
    // Initialize everything
    init();
    console.log("Privacy Policy Assistant initialized");
  } else {
    console.log("Privacy Policy Assistant is disabled");
  }
});

// Initialize and load auth.js
loadAuthScript();

