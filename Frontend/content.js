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
      if (mutation.type === 'childList' && mutation.addedNodes && mutation.addedNodes.length > 0) {
        // Convert NodeList to Array to ensure iterability across all browsers
        const addedNodesArray = Array.from(mutation.addedNodes);
        
        // Handle new nodes
        for (const node of addedNodesArray) {
          try {
            // Check if the node is an element
            if (node && node.nodeType === Node.ELEMENT_NODE) {
              // Enhanced detection for various element types, not just anchor tags
              if (isPossiblePrivacyPolicyElement(node)) {
                handlePotentialPrivacyLink(node);
              }
              
              // Check child elements for potential privacy links (enhanced)
              scanElementForPrivacyLinks(node);
            }
          } catch (error) {
            // Silently handle any errors to prevent console spam
            console.debug('Privacy extension: Error processing added node:', error);
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
  
  // Start observing the document with error handling
  try {
    mutationObserver.observe(document.body, config);
  } catch (error) {
    console.warn('Privacy extension: Failed to start MutationObserver:', error);
  }
}

// Enhanced function to scan an element and its children for privacy links
function scanElementForPrivacyLinks(element) {
  try {
    // Ensure element exists and has querySelectorAll method
    if (!element || typeof element.querySelectorAll !== 'function') {
      return;
    }
    
    // Check various element types that could be privacy links
    const potentialElements = element.querySelectorAll('a, span, div, p, button, li, td, th');
    
    for (const el of potentialElements) {
      try {
        if (isPossiblePrivacyPolicyElement(el)) {
          handlePotentialPrivacyLink(el);
        }
      } catch (error) {
        // Silently handle errors for individual elements
        console.debug('Privacy extension: Error processing potential element:', error);
      }
    }
  } catch (error) {
    // Handle any errors in the scanning process
    console.debug('Privacy extension: Error scanning element for privacy links:', error);
  }
}

// Handle potential privacy links - Enhanced to support non-anchor elements
function handlePotentialPrivacyLink(element) {
  try {
    if (!element) return;
    
    // Enhanced link detection - support both anchor tags and clickable elements
    if (isPossiblePrivacyPolicyElement(element)) {
      // Add mouse over and leave events
      element.addEventListener('mouseover', handleLinkHover);
      element.addEventListener('mouseout', handleLinkLeave);
      
      // If element is already being hovered, check immediately
      if (document.activeElement === element || element.matches(':hover')) {
        handleLinkHover({ target: element });
      }
    }
  } catch (error) {
    // Silently handle errors to prevent console spam
    console.debug('Privacy extension: Error handling potential privacy link:', error);
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
  
  // Enhanced immediate scan for all types of privacy policy elements
  console.log("Scanning all elements for privacy policies (enhanced detection)");
  
  // Get all potentially clickable elements, not just anchor tags
  const allElements = document.querySelectorAll('a[href], span, div, p, button, li, td, th');
  
  // Track how many elements were detected
  let detectCount = 0;
  
  // Process elements immediately in batches to prevent UI blocking
  const processElementsInBatches = (elements, startIndex, batchSize) => {
    const endIndex = Math.min(startIndex + batchSize, elements.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const element = elements[i];
      if (isPossiblePrivacyPolicyElement(element)) {
        handlePotentialPrivacyLink(element);
        detectCount++;
      }
    }
    
    // If more elements to process, schedule next batch
    if (endIndex < elements.length) {
      setTimeout(() => {
        processElementsInBatches(elements, endIndex, batchSize);
      }, 0);
    } else {
      console.log(`Finished enhanced scanning, found ${detectCount} privacy policy elements`);
    }
  };
  
  // Start processing in batches of 100 elements
  processElementsInBatches(allElements, 0, 100);
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
    willChange: 'transform, opacity',
    textAlign: 'center',
    lineHeight: '32px'
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
    willChange: 'opacity'
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

// Enhanced Handle mouse enter on links and clickable elements
function handleLinkHover(e) {
  try {
    if (!isEnabled || !e || !e.target) return;
    
    const element = e.target;
    
    // Get the URL for this element
    const elementUrl = getElementUrl(element);
    if (!elementUrl) return;
    
    // Only process relevant elements to improve performance
    if (isPossiblePrivacyPolicyElement(element)) {
      // Check if icon needs to be created or reset
      if (!floatingIcon) {
        console.log("Creating new floating icon for element:", element.tagName);
        floatingIcon = createFloatingIcon();
        document.body.appendChild(floatingIcon);
        
        // Apply immediate styling to ensure proper appearance
        // Make sure transform is properly reset when created
        setTimeout(() => {
          floatingIcon.style.transform = 'scale(0.8)';
          void floatingIcon.offsetWidth;
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
                  floatingIcon.style.transform = 'scale(0.8)';
                }, 150);
              }
            }
          }, 30);
        });
      } else if (floatingIcon.style.display === 'none') {
        // If icon exists but is hidden, make sure it's reset properly
        console.log("Resetting existing floating icon for element:", element.tagName);
        floatingIcon.style.display = '';
        floatingIcon.style.transform = 'scale(0.8)';
        floatingIcon.style.background = 'linear-gradient(135deg, #1976d2, #2196f3)';
        void floatingIcon.offsetWidth;
      }
      
      currentHoveredLink = elementUrl;
      positionIcon(floatingIcon, element);
      
      // Use requestAnimationFrame for smoother transition
      requestAnimationFrame(() => {
        floatingIcon.style.opacity = '1';
        floatingIcon.style.pointerEvents = 'auto';
        floatingIcon.style.transform = 'scale(1)';
      });
      
      if (hideIconTimer) {
        clearTimeout(hideIconTimer);
        hideIconTimer = null;
      }
    }
  } catch (error) {
    // Silently handle any errors to prevent console spam
    console.debug('Privacy extension: Error handling link hover:', error);
  }
}

// Check if a link could be a privacy policy link
function isPossiblePrivacyPolicyLink(link) {
  if (!link || !link.href) return false;
  
  // Quick exclusion for obvious Terms of Service links
  const termsPattern = /terms|conditions|nutzungsbedingungen|利用規約|사용약관|使用条款/i;
  if (link.textContent && 
      termsPattern.test(link.textContent.trim()) && 
      !/privacy|隐私|プライバシー|개인정보|datenschutz|privacidad/i.test(link.textContent.trim())) {
    
    // Exception for JB HiFi special handling
    if (link.href && (
        link.href.includes('support.jbhifi.com.au') || 
        (link.href.includes('jbhifi.com') && link.href.includes('privacy'))
    )) {
      // Do not exclude potential JB HiFi privacy policy links
    } else {
      return false;
    }
  }
  
  // Generate cache key for this element
  const cacheKey = generateCacheKey(link);
  
  // Use cached result if available
  if (linkDetectionCache.has(cacheKey)) {
    return linkDetectionCache.get(cacheKey);
  }
  
  // If cache is too large, clear the oldest 20% entries
  if (linkDetectionCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = [...linkDetectionCache.keys()].slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
    keysToDelete.forEach(key => linkDetectionCache.delete(key));
  }
  
  // Perform actual detection logic
  const result = checkLinkForPrivacyPolicy(link);
  
  // Cache the result
  linkDetectionCache.set(cacheKey, result);
  
  return result;
}

// Generate cache key for both anchor and non-anchor elements
function generateCacheKey(element) {
  // For anchor tags, use href as primary key
  if (element.tagName === 'A' && element.href) {
    return `link_${element.href}`;
  }
  
  // For non-anchor elements, create composite key
  const textContent = element.textContent ? element.textContent.trim().substring(0, 50) : '';
  const tagName = element.tagName.toLowerCase();
  const className = element.className || '';
  const id = element.id || '';
  
  // Create a hash-like key for non-anchor elements
  return `element_${tagName}_${textContent}_${className}_${id}`;
}

// Actual link detection logic
function checkLinkForPrivacyPolicy(link) {
  // REDESIGNED DETECTION LOGIC - Stricter matching criteria: must satisfy both link text and URL conditions
  
  // Core privacy policy keywords - Direct and exact matching
  const corePrivacyKeywords = /privacy(\s|-|_)policy|隐私(\s|-|_)政策|プライバシー(\s|-|_)ポリシー|개인정보(\s|-|_)처리방침|datenschutzerklärung|política(\s|-|_)de(\s|-|_)privacidad/i;
  
  // Secondary privacy keywords - Less precise but directly related
  const secondaryPrivacyKeywords = /privacy|隐私|プライバシー|개인정보|datenschutz|privacidad/i;
  
  // Terms of service exclusion pattern - Used to exclude terms links that contain "policy"
  const termsExclusionPattern = /terms(\s|-|_)of(\s|-|_)service|terms(\s|-|_)and(\s|-|_)conditions|terms(\s|-|_)of(\s|-|_)use|使用条款|利用規約|이용약관|nutzungsbedingungen|términos(\s|-|_)de(\s|-|_)servicio/i;
  
  // Common privacy policy link text patterns - Used for text-only checks
  const commonPrivacyLinkTexts = [
    /privacy(\s|-|_)policy/i,
    /隐私(\s|-|_)政策/i,
    /プライバシー(\s|-|_)ポリシー/i,
    /개인정보(\s|-|_)처리방침/i,
    /datenschutzerklärung/i,
    /política(\s|-|_)de(\s|-|_)privacidad/i
  ];
  
  // Exclude terms of service links
  if (link.href && termsExclusionPattern.test(link.href)) {
    return false;
  }
  
  if (link.textContent && termsExclusionPattern.test(link.textContent.trim())) {
    return false;
  }
  
  // Special website handling - Special case processing for specific sites remains unchanged
  
  // Special handling - JB HiFi
  if ((link.href.includes('jbhifi.com') || link.href.includes('support.jbhifi.com.au')) && 
      (link.href.includes('Privacy-policy') || 
       link.href.includes('360052938974') ||
       (link.textContent && link.textContent.toLowerCase().includes('privacy')))) {
    return true;
  }
  
  // Special check for JB HiFi specific URL format
  if (link.href.includes('support.jbhifi.com.au/hc/en-au/articles/360052938974')) {
    return true;
  }
  
  // Special handling - Microsoft fwlink URLs
  if (/go\.microsoft\.com\/fwlink/i.test(link.href)) {
          // Handle specific known Microsoft privacy policy redirect
    if (/LinkId=521839/i.test(link.href)) {
      return true;
    }
    
    // If link text suggests privacy and URL contains privacy
    if (link.textContent && 
        secondaryPrivacyKeywords.test(link.textContent.trim()) &&
        /privacy/i.test(link.href)) {
      return true;
    }
  }
  
  // Core logic: Link text must contain privacy keywords AND URL must contain privacy or policy keywords
  
  // 1. Check if link text contains privacy keywords (either complete or partial)
  const privacyKeywords = [
    'privacy',
    '隐私',
    'プライバシー',
    '개인정보',
    'datenschutz',
    'privacidad'
  ];
  
  // 2. Check if URL contains privacy or policy keywords
  const urlKeywords = [
    'privacy',
    'policy',
    'privacidad',
    'datenschutz',
    '隐私',
    'プライバシー',
    '政策',
    'ポリシー',
    '개인정보',
    '처리방침'
  ];
  
  const hasPrivacyText = link.textContent && 
    privacyKeywords.some(keyword => 
      link.textContent.trim().toLowerCase().includes(keyword.toLowerCase()));
  
  const hasPrivacyUrl = link.href && 
    urlKeywords.some(keyword => 
      link.href.toLowerCase().includes(keyword.toLowerCase()));
  
  // Only return true if both text contains privacy keyword AND URL contains privacy/policy keyword
  if (hasPrivacyText && hasPrivacyUrl) {
    return true;
  }
  
  // Handle URL encoded cases - Try to decode URL first to check for keywords
  try {
    if (hasPrivacyText && link.href) {
      const decodedUrl = decodeURIComponent(link.href);
      if (decodedUrl !== link.href) {
        // Check if decoded URL contains any privacy/policy keywords
        const hasPrivacyInDecodedUrl = urlKeywords.some(keyword => 
          decodedUrl.toLowerCase().includes(keyword.toLowerCase()));
          
        if (hasPrivacyInDecodedUrl) {
          return true;
        }
      }
    }
  } catch (e) {
    // Decoding failed, ignore
  }
  
  // Additional check for title attribute - If text has privacy keyword and title has privacy keyword
  if (hasPrivacyText && link.title) {
    const hasTitlePrivacy = privacyKeywords.some(keyword => 
      link.title.toLowerCase().includes(keyword.toLowerCase()));
      
    if (hasTitlePrivacy) {
      // Double-check URL contains privacy or policy
      if (hasPrivacyUrl) {
        return true;
      }
    }
  }
  
  // Final result: If none of the above conditions are met, return false
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
  
  // Exclude terms-related link text, focus only on privacy-related text
  for (const sibling of siblings) {
    if (sibling !== link && sibling.textContent) {
      const siblingText = sibling.textContent.trim();
      // Filter out terms/conditions/service-related link text
      if (!/\bterms\b|\bconditions\b|\bservice\b|\bagreement\b/i.test(siblingText)) {
        result.push(siblingText);
        if (result.length >= count) break;
      }
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
                         const siblingText = siblingLink.textContent.trim();
            // Filter out terms/conditions/service-related link text
            if (!/\bterms\b|\bconditions\b|\bservice\b|\bagreement\b/i.test(siblingText)) {
              result.push(siblingText);
              if (result.length >= count) break;
            }
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

// Handle mouse leave from links (enhanced version defined later with support for all element types)

// Track if event listeners have been set up
let linkListenersInitialized = false;

// Add event listeners to all links
function setupLinkListeners() {
  // Avoid setting up the same listeners multiple times
  if (linkListenersInitialized) {
    console.log("Link listeners already set up, skipping");
    return;
  }
  
  console.log("Setting up enhanced link event listeners for multiple element types");
  
  // Enhanced mouseover event listener for multiple element types
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    
    // Check anchor tags (original logic)
    if (target.tagName === 'A') {
      handleLinkHover(e);
      return;
    }
    
    // Check other potentially clickable elements
    const clickableElements = ['SPAN', 'DIV', 'P', 'BUTTON', 'LI', 'TD', 'TH'];
    if (clickableElements.includes(target.tagName)) {
      // Only proceed if element passes enhanced privacy link detection
      if (isPossiblePrivacyPolicyElement(target)) {
        handleLinkHover(e);
      }
    }
  });
  
  // Enhanced mouseout event listener for multiple element types
  document.addEventListener('mouseout', (e) => {
    const target = e.target;
    
    // Check anchor tags (original logic)
    if (target.tagName === 'A') {
      handleLinkLeave(e);
      return;
    }
    
    // Check other potentially clickable elements
    const clickableElements = ['SPAN', 'DIV', 'P', 'BUTTON', 'LI', 'TD', 'TH'];
    if (clickableElements.includes(target.tagName)) {
      // Only proceed if element was detected as privacy link
      if (isPossiblePrivacyPolicyElement(target)) {
        handleLinkLeave(e);
      }
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
      init();
      
      // Additional check for currently hovered links
      setTimeout(() => {
        // Look for any element that might be currently hovered (enhanced detection)
        const hoveredElements = document.querySelectorAll(':hover');
        
        // Check if any of the hovered elements are privacy elements (enhanced detection)
        for (const element of hoveredElements) {
          // Use enhanced detection that supports all element types
          if (isPossiblePrivacyPolicyElement(element)) {
            console.log("Found hovered privacy element, showing icon");
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
  } else if (message.action === "getContextMenuTarget") {
    // Handle context menu target request - return URL of element under mouse
    console.log("Received context menu target request");
    
    try {
      let targetUrl = null;
      
      // Check if we have a tracked element under mouse
      if (lastElementUnderMouse) {
        targetUrl = getElementUrl(lastElementUnderMouse);
        console.log("Found tracked element under mouse:", targetUrl);
      }
      
      // If no tracked element, try to find one at current mouse position
      if (!targetUrl && currentMouseX && currentMouseY) {
        const elementsAtMouse = document.elementsFromPoint(currentMouseX, currentMouseY);
        const privacyElement = elementsAtMouse.find(el => isPossiblePrivacyPolicyElement(el));
        
        if (privacyElement) {
          targetUrl = getElementUrl(privacyElement);
          console.log("Found privacy element at mouse position:", targetUrl);
        }
      }
      
      // Send response back to background script
      sendResponse({
        url: targetUrl,
        found: !!targetUrl
      });
    } catch (error) {
      console.error("Error getting context menu target:", error);
      sendResponse({
        url: null,
        found: false,
        error: error.message
      });
    }
    
    return true; // Keep message channel open for async response
  } else if (message.action === "checkCurrentPageForPrivacy") {
    // Handle request to check if current page is privacy-related
    console.log("Received request to check current page for privacy content");
    
    try {
      const currentUrl = window.location.href;
      const currentTitle = document.title;
      const isPrivacyPage = isCurrentPagePrivacyRelated();
      
      // Also check page content for privacy indicators
      const hasPrivacyContent = checkPageContentForPrivacy();
      
      console.log("Current page privacy check:", {
        url: currentUrl,
        title: currentTitle,
        isPrivacyPage: isPrivacyPage,
        hasPrivacyContent: hasPrivacyContent
      });
      
      sendResponse({
        url: currentUrl,
        title: currentTitle,
        isPrivacyPage: isPrivacyPage || hasPrivacyContent,
        hasPrivacyContent: hasPrivacyContent
      });
    } catch (error) {
      console.error("Error checking current page for privacy:", error);
      sendResponse({
        url: window.location.href,
        isPrivacyPage: false,
        error: error.message
      });
    }
    
    return true; // Keep message channel open for async response
  }
});

// Helper function to check page content for privacy indicators
function checkPageContentForPrivacy() {
  try {
    // Check page title and main headings
    const title = document.title.toLowerCase();
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent.toLowerCase());
    const allHeadingText = headings.join(' ');
    
    // Privacy-related keywords
    const privacyKeywords = [
      'privacy policy', 'privacy statement', 'privacy notice',
      'data protection', 'personal information', 'data collection',
      '隐私政策', '隐私条款', '个人信息', 'プライバシーポリシー',
      '개인정보처리방침', 'datenschutzerklärung', 'política de privacidad'
    ];
    
    // Check title
    const titleHasPrivacy = privacyKeywords.some(keyword => title.includes(keyword));
    
    // Check headings
    const headingsHavePrivacy = privacyKeywords.some(keyword => allHeadingText.includes(keyword));
    
    // Check for privacy-related sections or containers
    const privacyContainers = document.querySelectorAll(
      '[class*="privacy"], [id*="privacy"], [class*="policy"], [id*="policy"]'
    );
    
    // Check main content area for privacy keywords
    const mainContent = document.querySelector('main, article, .content, #content, .main') || document.body;
    const contentText = mainContent.textContent.toLowerCase();
    const contentHasPrivacy = privacyKeywords.some(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = contentText.match(regex);
      return matches && matches.length >= 3; // Require multiple mentions
    });
    
    console.log("Privacy content check results:", {
      titleHasPrivacy,
      headingsHavePrivacy,
      privacyContainers: privacyContainers.length,
      contentHasPrivacy
    });
    
    return titleHasPrivacy || headingsHavePrivacy || privacyContainers.length > 0 || contentHasPrivacy;
  } catch (error) {
    console.error("Error checking page content for privacy:", error);
    return false;
  }
}

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
    fontSize: '24px',
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
      fontSize: '15px',
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
        fontSize: '14px'
      });
      
      const legendTitle = document.createElement('div');
      legendTitle.innerText = "Privacy Importance Level Legend";
      Object.assign(legendTitle.style, {
        marginTop: '0',
        marginBottom: '15px',
        fontSize: '18px',
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
        fontSize: '13px',
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
        { level: 4, color: '#f57c00', gradient: 'linear-gradient(135deg, #f57c00, #fb8c00)' },  // Important - Orange
        { level: 3, color: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107, #ffeb3b)' },  // Medium - Yellow
        { level: 2, color: '#7cb342', gradient: 'linear-gradient(135deg, #7cb342, #8bc34a)' },  // Low - Light Green
        { level: 1, color: '#388e3c', gradient: 'linear-gradient(135deg, #388e3c, #4caf50)' }   // Very Low - Green
      ];
      
      // Filter status variable - 改为数组支持多筛选
      let currentFilters = [];
      
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
        fontSize: '14px',
        fontWeight: '500'
      });
      
      const clearFilterBtn = document.createElement('button');
      clearFilterBtn.innerText = 'Clear Filter';
      Object.assign(clearFilterBtn.style, {
        border: 'none',
        background: 'rgba(25, 118, 210, 0.1)',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
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
      
      // Function to show filter status - Modified to support multiple filters and colored text
      function showFilterStatus(filters) {
        if (!filters || filters.length === 0) {
          filterStatusText.innerText = 'No filter';
          filterStatusText.style.color = '#1976d2'; // Default blue color
          filterStatusContainer.style.opacity = '0';
          filterStatusContainer.style.height = '0';
          filterStatusContainer.style.padding = '0';
          filterStatusContainer.style.marginTop = '0';
          filterStatusContainer.style.borderLeft = 'none';
          filterStatusContainer.style.overflow = 'hidden';
        } else {
          // Build multi-filter display text with colors
          const levelColorMap = {
            5: { name: 'Most Important', color: '#b71c1c' },
            4: { name: 'Important', color: '#f57c00' },
            3: { name: 'Medium', color: '#ffc107' },
            2: { name: 'Low', color: '#7cb342' },
            1: { name: 'Very Low', color: '#388e3c' }
          };
          
          // Clear existing content
          filterStatusText.innerHTML = '';
          
          // Create base text
          const baseText = document.createElement('span');
          baseText.style.color = '#1976d2'; // Blue color for base text
          baseText.innerText = filters.length === 1 ? 'Current Filter: ' : 'Current Filters: ';
          filterStatusText.appendChild(baseText);
          
          // Add colored filter names
          filters.forEach((level, index) => {
            const levelInfo = levelColorMap[level];
            if (levelInfo) {
              const levelSpan = document.createElement('span');
              levelSpan.style.color = levelInfo.color;
              levelSpan.style.fontWeight = '600';
              levelSpan.innerText = levelInfo.name;
              filterStatusText.appendChild(levelSpan);
              
              // Add separator if not last item
              if (index < filters.length - 1) {
                const separator = document.createElement('span');
                separator.style.color = '#1976d2';
                separator.innerText = ', ';
                filterStatusText.appendChild(separator);
              }
            }
          });
          
          filterStatusContainer.style.opacity = '1';
          filterStatusContainer.style.height = 'auto';
          filterStatusContainer.style.padding = '6px';
          filterStatusContainer.style.marginTop = '10px';
          filterStatusContainer.style.overflow = 'visible';
          filterStatusContainer.style.borderLeft = `3px solid #1976d2`;
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
        
        // Clear all empty container notices
        document.querySelectorAll('.empty-filter-notice').forEach(notice => {
          notice.remove();
        });
      }
      
      // Function to apply filter - support multiple selection
      function applyFilter(filters) {
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
            
            .empty-filter-notice {
              padding: 15px;
              text-align: center;
              color: #666;
              font-style: italic;
              background: rgba(0, 0, 0, 0.02);
              border-radius: 8px;
              margin: 10px 0;
              border: 1px dashed rgba(0, 0, 0, 0.1);
              animation: fadeInNotice 0.5s ease-in-out forwards;
              position: relative;
            }
            
            @keyframes fadeInNotice {
              0% { opacity: 0; transform: translateY(10px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            
            /* Multiple filter selection visual effects */
            .selected {
              position: relative;
            }
            
            /* Remove checkmark styles - user finds them ugly */
            /*
            .selected::after {
              content: '✓';
              position: absolute;
              top: -4px;
              right: -4px;
              width: 16px;
              height: 16px;
              background: #4caf50;
              color: white;
              border-radius: 50%;
              font-size: 10px;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: center;
              animation: checkmarkAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
              box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
              z-index: 10;
            }
            
            @keyframes checkmarkAppear {
              0% { 
                opacity: 0; 
                transform: scale(0) rotate(-180deg); 
              }
              100% { 
                opacity: 1; 
                transform: scale(1) rotate(0deg); 
              }
            }
            */
            
            /* Special border effect for selected color segments */
            .selected.color-segment {
              border: 2px solid rgba(255, 255, 255, 0.8);
              box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.5), 0 4px 10px rgba(0, 0, 0, 0.25) !important;
            }
            
            /* Pulse effect for selected numbers */
            .selected.number-label {
              animation: selectedPulse 2s ease-in-out infinite;
            }
            
            @keyframes selectedPulse {
              0%, 100% { 
                box-shadow: 0 3px 8px rgba(0,0,0,0.15), 0 0 0 2px currentColor;
              }
              50% { 
                box-shadow: 0 3px 12px rgba(0,0,0,0.2), 0 0 0 3px currentColor;
              }
            }
            
            /* Improved empty notice styles */
            .empty-filter-notice::before {
              content: '';
              position: absolute;
              top: -1px;
              left: -1px;
              right: -1px;
              bottom: -1px;
              background: linear-gradient(45deg, rgba(25, 118, 210, 0.1), rgba(33, 150, 243, 0.1));
              border-radius: 8px;
              z-index: -1;
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
            
            // Record bubbles that meet the condition - Modified for multiple filter logic
            if (!filters || filters.length === 0 || filters.includes(bubbleLevel)) {
              bubblesToShow.push(bubble);
            }
          });
        });
        
        // Hide all bubbles first and add empty notices where needed
        allCategoryDivs.forEach(categoryDiv => {
          const bubbles = categoryDiv.querySelectorAll('div[style*="border-radius: 25px"]');
          const bubbleContainer = categoryDiv.querySelector('div[style*="display: flex"][style*="flex-wrap: wrap"]');
          
          // Check if this category has bubbles that match the filter criteria
          const visibleBubblesInCategory = Array.from(bubbles).filter(bubble => bubblesToShow.includes(bubble));
          
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
          
          // If no bubbles in this category after filtering, add explanation text
          if (bubbleContainer && visibleBubblesInCategory.length === 0 && filters && filters.length > 0) {
            // Clear existing notice
            const existingNotice = categoryDiv.querySelector('.empty-filter-notice');
            if (existingNotice) {
              existingNotice.remove();
            }
            
            // Create empty filter notice
            const emptyNotice = document.createElement('div');
            emptyNotice.className = 'empty-filter-notice';
            emptyNotice.innerHTML = `
              <div style="font-size: 14px; margin-bottom: 5px;">📭 No items match current filter</div>
              <div style="font-size: 12px; color: #888;">Try selecting different importance levels or clear the filter to see all items.</div>
            `;
            
            // Insert after bubble container
            bubbleContainer.insertAdjacentElement('afterend', emptyNotice);
          }
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
              
              // If there are visible bubbles or empty notice, adjust container height
              const emptyNotice = categoryDiv.querySelector('.empty-filter-notice');
              const hasContent = visibleBubbles.length > 0 || emptyNotice;
              
              if (hasContent) {
                const titleHeight = categoryDiv.querySelector('h3').offsetHeight || 0;
                const paddingTop = 18;
                const paddingBottom = 18;
                const marginBottom = 15;
                
                // Ensure accurate calculation of container content height
                const bubbleContainerHeight = bubbleContainer.scrollHeight || 0;
                const emptyNoticeHeight = emptyNotice ? emptyNotice.offsetHeight + 20 : 0;
                const requiredHeight = titleHeight + bubbleContainerHeight + emptyNoticeHeight + paddingTop + paddingBottom + marginBottom;
                
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
                // If no visible bubbles and no notice, set minimum height
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
      
      // Clear filter button click event - Modified to support multiple filters
      clearFilterBtn.addEventListener('click', () => {
        currentFilters = [];
        
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
          segment.classList.remove('selected');
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
          number.classList.remove('selected');
        });
        
        applyFilter([]);
        showFilterStatus([]);
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
        
        // Add CSS classes for styling
        segment.className = 'color-segment';
        
        // Add data attribute to store importance level
        segment.dataset.level = item.level;
        
        // Add hover effect
        segment.addEventListener('mouseover', () => {
          if (!currentFilters.includes(item.level)) {
            segment.style.transform = 'scaleY(1.1)';
            segment.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.2)';
            segment.style.zIndex = '2';
          }
        });
        
        segment.addEventListener('mouseout', () => {
          if (!currentFilters.includes(item.level)) {
            segment.style.transform = 'scaleY(1) translateY(0)';
            segment.style.boxShadow = 'none';
            segment.style.zIndex = '1';
          }
        });
        
        // Add click filter functionality - Modified to support multiple selection
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

          // Toggle filter state (multiple selection support)
          const levelIndex = currentFilters.indexOf(item.level);
          
          if (levelIndex > -1) {
            // If current level is already selected, remove it
            currentFilters.splice(levelIndex, 1);
            
            // Update UI state to unselected
            segment.style.transform = 'scaleY(1) translateY(0)';
            segment.style.boxShadow = 'none';
            segment.style.zIndex = '1';
            segment.style.opacity = '1';
            segment.classList.remove('selected');
            
            // Update corresponding number state
            const correspondingNumber = Array.from(numbersContainer.children).find(
              num => parseInt(num.innerText) === item.level
            );
            if (correspondingNumber) {
              correspondingNumber.style.transform = 'scale(1)';
              correspondingNumber.style.fontWeight = '600';
              correspondingNumber.style.boxShadow = `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px ${item.color}30`;
              correspondingNumber.style.opacity = '1';
              correspondingNumber.style.background = 'rgba(255, 255, 255, 0.7)';
              correspondingNumber.classList.remove('selected');
            }
          } else {
            // If current level is not selected, add it
            currentFilters.push(item.level);
            
            // Check if all 5 levels are selected - auto clear filter
            if (currentFilters.length === 5) {
              console.log('All 5 levels selected, auto-clearing filters');
              // Clear all filters
              currentFilters = [];
              
              // Reset all UI states
              const allSegments = segmentedBar.querySelectorAll('div');
              allSegments.forEach(seg => {
                seg.style.transform = 'scaleY(1) translateY(0)';
                seg.style.opacity = '1';
                seg.style.boxShadow = 'none';
                seg.style.zIndex = '1';
                seg.classList.remove('selected');
              });
              
              const allNumbers = numbersContainer.querySelectorAll('div');
              allNumbers.forEach(number => {
                number.style.transform = 'scale(1)';
                number.style.fontWeight = '600';
                const numberLevel = parseInt(number.innerText);
                const numberColor = importanceColors.find(ic => ic.level === numberLevel)?.color || '#333';
                number.style.boxShadow = `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px ${numberColor}30`;
                number.style.opacity = '1';
                number.style.background = 'rgba(255, 255, 255, 0.7)';
                number.classList.remove('selected');
              });
              
              applyFilter([]);
              showFilterStatus([]);
              return;
            }
            
            // Update UI state to selected
            segment.style.transform = 'scaleY(1.2)';
            segment.style.opacity = '1';
            segment.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.25)';
            segment.style.zIndex = '10';
            segment.classList.add('selected');
            segment.classList.add('color-segment');
            
            // Update corresponding number state
            const correspondingNumber = Array.from(numbersContainer.children).find(
              num => parseInt(num.innerText) === item.level
            );
            if (correspondingNumber) {
              correspondingNumber.style.transform = 'scale(1.3)';
              correspondingNumber.style.fontWeight = '700';
              correspondingNumber.style.boxShadow = `0 3px 8px rgba(0,0,0,0.15), 0 0 0 2px ${item.color}70`;
              correspondingNumber.style.opacity = '1';
              correspondingNumber.classList.add('selected');
              correspondingNumber.classList.add('number-label');
            }
          }
          
          // Update appearance of unselected items
          const allNumbers = numbersContainer.querySelectorAll('div');
          allNumbers.forEach(number => {
            const numberLevel = parseInt(number.innerText);
            if (!currentFilters.includes(numberLevel) && !number.classList.contains('selected')) {
              if (currentFilters.length > 0) {
                // When filtering, unselected items become semi-transparent
                number.style.opacity = '0.4';
                number.style.transform = 'scale(0.9)';
                number.style.fontWeight = '400';
              } else {
                // When no filter, all items display normally
                number.style.opacity = '1';
                number.style.transform = 'scale(1)';
                number.style.fontWeight = '600';
              }
            }
          });
          
          // Update appearance of unselected color segments
          const allSegments = segmentedBar.querySelectorAll('div');
          allSegments.forEach(segment => {
            const segmentLevel = parseInt(segment.dataset.level);
            if (!currentFilters.includes(segmentLevel) && !segment.classList.contains('selected')) {
              if (currentFilters.length > 0) {
                // When filtering, unselected items become semi-transparent
                segment.style.opacity = '0.3';
              } else {
                // When no filter, all items display normally
                segment.style.opacity = '1';
              }
            }
          });
          
          applyFilter(currentFilters);
          showFilterStatus(currentFilters);
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
          fontSize: '14px', // Fixed font size in pixels
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
        
        // Add CSS classes for styling
        numberLabel.className = 'number-label';
        
        // Add data attribute to store importance level
        numberLabel.dataset.level = item.level;
        
        // Add hover effect
        numberLabel.addEventListener('mouseover', () => {
          if (!currentFilters.includes(item.level)) {
            numberLabel.style.transform = 'scale(1.15)';
            numberLabel.style.boxShadow = `0 2px 5px rgba(0,0,0,0.15), 0 0 0 2px ${item.color}50`;
            numberLabel.style.background = 'rgba(255, 255, 255, 0.9)';
          }
        });
        
        numberLabel.addEventListener('mouseout', () => {
          if (!currentFilters.includes(item.level)) {
            numberLabel.style.transform = 'scale(1)';
            numberLabel.style.boxShadow = `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px ${item.color}30`;
            numberLabel.style.background = 'rgba(255, 255, 255, 0.7)';
          }
        });
        
        // Click filter functionality - support multiple selection
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

          // Toggle filter state (multiple selection support)
          const levelIndex = currentFilters.indexOf(item.level);
          
          if (levelIndex > -1) {
            // If current level is already selected, remove it
            currentFilters.splice(levelIndex, 1);
            
            // Update UI state to unselected
            numberLabel.style.transform = 'scale(1)';
            numberLabel.style.fontWeight = '600';
            numberLabel.style.boxShadow = `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px ${item.color}30`;
            numberLabel.style.background = 'rgba(255, 255, 255, 0.7)';
            numberLabel.style.opacity = '1';
            numberLabel.classList.remove('selected');
            
            // Update corresponding color block state
            const correspondingSegment = Array.from(segmentedBar.children).find(
              seg => parseInt(seg.dataset.level) === item.level
            );
            if (correspondingSegment) {
              correspondingSegment.style.transform = 'scaleY(1) translateY(0)';
              correspondingSegment.style.boxShadow = 'none';
              correspondingSegment.style.zIndex = '1';
              correspondingSegment.style.opacity = '1';
              correspondingSegment.classList.remove('selected');
            }
          } else {
            // If current level is not selected, add it
            currentFilters.push(item.level);
            
            // Update UI state to selected
            numberLabel.style.transform = 'scale(1.3)';
            numberLabel.style.fontWeight = '700';
            numberLabel.style.boxShadow = `0 3px 8px rgba(0,0,0,0.15), 0 0 0 2px ${item.color}70`;
            numberLabel.style.opacity = '1';
            numberLabel.classList.add('selected');
            numberLabel.classList.add('number-label');
            
            // Update corresponding color block state
            const correspondingSegment = Array.from(segmentedBar.children).find(
              seg => parseInt(seg.dataset.level) === item.level
            );
            if (correspondingSegment) {
              correspondingSegment.style.transform = 'scaleY(1.2)';
              correspondingSegment.style.opacity = '1';
              correspondingSegment.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.25)';
              correspondingSegment.style.zIndex = '10';
              correspondingSegment.classList.add('selected');
              correspondingSegment.classList.add('color-segment');
            }
          }
          
          // Update appearance of unselected items
          const allNumbers = numbersContainer.querySelectorAll('div');
          allNumbers.forEach(number => {
            const numberLevel = parseInt(number.innerText);
            if (!currentFilters.includes(numberLevel) && !number.classList.contains('selected')) {
              if (currentFilters.length > 0) {
                // When filtering, unselected items become semi-transparent
                number.style.opacity = '0.4';
                number.style.transform = 'scale(0.9)';
                number.style.fontWeight = '400';
              } else {
                // When no filter, all items display normally
                number.style.opacity = '1';
                number.style.transform = 'scale(1)';
                number.style.fontWeight = '600';
              }
            }
          });
          
          // Update appearance of unselected color blocks
          const allSegments = segmentedBar.querySelectorAll('div');
          allSegments.forEach(segment => {
            const segmentLevel = parseInt(segment.dataset.level);
            if (!currentFilters.includes(segmentLevel) && !segment.classList.contains('selected')) {
              if (currentFilters.length > 0) {
                // When filtering, unselected items become semi-transparent
                segment.style.opacity = '0.3';
              } else {
                // When no filter, all items display normally
                segment.style.opacity = '1';
              }
            }
          });
          
          applyFilter(currentFilters);
          showFilterStatus(currentFilters);
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
        fontSize: '13px', // Fixed font size in pixels
        color: '#b71c1c'
      });
      
      // Add right label (Least Important)
      const rightLabel = document.createElement('div');
      rightLabel.innerText = "Least Important";
      Object.assign(rightLabel.style, {
        fontWeight: '500',
        fontSize: '13px', // Fixed font size in pixels
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
          fontSize: '18px',
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
                case 4: // Important - Orange
                  bubbleColor = 'linear-gradient(135deg, #f57c00, #fb8c00)';
                  bubbleShadow = '0 3px 8px rgba(245, 124, 0, 0.3)';
                  break;
                case 3: // Medium - Yellow
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
              textColor = '#212121';
            }
            
            Object.assign(bubble.style, {
              background: bubbleColor,
              color: textColor,
              padding: '10px 18px',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '14px',
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
                    this.style.boxShadow = '0 5px 12px rgba(245, 124, 0, 0.4)';
                    this.style.background = 'linear-gradient(135deg, #ef6c00, #f57c00)';
                    break;
                  case 3: // Medium - Yellow
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
                
                // Get container dimensions for boundary checking
                const containerWidth = categoryDiv.clientWidth;
                const containerHeight = categoryDiv.clientHeight;
                
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
                  fontSize: '15px',
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
                  // Define safety margins
                  const horizontalMargin = 15;
                  const verticalMargin = 15;
                  
                  // Calculate maximum allowed dimensions
                  const maxWidth = containerWidth - (2 * horizontalMargin);
                  const maxHeight = 500; // Maximum height for summary box
                  
                  // Calculate safe dimensions
                  const safeWidth = Math.min(expandedWidth, maxWidth);
                  const safeHeight = Math.min(dynamicHeight, maxHeight);
                  
                  // Calculate optimal position to keep within container boundaries
                  // Start with original position
                  let finalLeft = relativeLeft;
                  let finalTop = relativeTop;
                  
                  // Adjust horizontal position if it would overflow container
                  if (finalLeft + safeWidth > containerWidth - horizontalMargin) {
                    // Align right edge with container boundary
                    finalLeft = containerWidth - safeWidth - horizontalMargin;
                  }
                  
                  // Ensure left position is not negative
                  finalLeft = Math.max(finalLeft, horizontalMargin);
                  
                  // Adjust vertical position if needed
                  // If the expanded height would go beyond container bottom
                  if (finalTop + safeHeight > containerHeight - verticalMargin) {
                    // Try to position above the bubble if there's space
                    if (finalTop > safeHeight + verticalMargin) {
                      // Position above the bubble
                      finalTop = finalTop - safeHeight + bubbleRect.height;
                    } else {
                      // Not enough space above, keep at current position but adjust container height later
                    }
                  }
                  
                  expandedSummary.style.zIndex = '20';
                  
                  expandedSummary.style.width = `${safeWidth}px`;
                  expandedSummary.style.height = `${safeHeight}px`;
                  expandedSummary.style.left = `${finalLeft}px`;
                  expandedSummary.style.top = `${finalTop}px`;
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
                  const summaryBottom = finalTop + safeHeight + 20;
                  
                  // Check if it will exceed category container bottom
                  if (summaryBottom > containerHeight) {
                    // Calculate additional height needed with a bit of extra padding
                    const extraHeight = summaryBottom - containerHeight + 30;
                    const currentHeight = categoryDiv.getBoundingClientRect().height;
                    
                    // Improved container expansion function
                    const applyContainerExpansion = () => {
                      // Make container expandable
                      categoryDiv.style.overflow = 'visible';
                      categoryDiv.style.transition = 'none';
                      
                      // Save current dimensions
                      categoryDiv.style.height = `${currentHeight}px`;
                      categoryDiv.style.minHeight = `${currentHeight}px`;
                      
                      // Force reflow
                      void categoryDiv.offsetHeight;
                      
                      // Schedule animation in next frame for smoother transition
                      requestAnimationFrame(() => {
                        // Set transition for smooth expansion
                        categoryDiv.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                        
                        // Force reflow again to ensure transition applies
                        void categoryDiv.offsetHeight;
                        
                        // Set new height
                        const newHeight = currentHeight + extraHeight;
                        categoryDiv.style.height = `${newHeight}px`;
                        
                        // Log resize for debugging
                        console.log(`Expanding container from ${currentHeight}px to ${newHeight}px to fit summary`);
                        
                        // Reset transition after animation completes
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
                    
                    // Store the bubble's original position, which we'll return to
                    const bubblePosition = {
                      left: relativeLeft,
                      top: relativeTop,
                      width: bubbleRect.width,
                      height: bubbleRect.height
                    };
                    
                    // 1. First ensure content is visible
                    categoryDiv.style.overflow = 'visible';
                    
                    // 2. Set bubble collapsing animation
                    expandedSummary.classList.add('collapsing');
                    expandedSummary.style.width = `${bubblePosition.width}px`;
                    expandedSummary.style.height = `${bubblePosition.height}px`;
                    expandedSummary.style.left = `${bubblePosition.left}px`;
                    expandedSummary.style.top = `${bubblePosition.top}px`;
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
                    
                    // 4. Set transition effect for smooth height changes
                    categoryDiv.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    
                    // 5. Combine original height and detection mechanism to ensure container doesn't grow too tall
                    if (originalHeight && originalHeight > 0) {
                      // Set to original height first
                      if (expandedSummary.classList.contains('collapsing')) {
                        setTimeout(() => {
                          categoryDiv.style.height = `${originalHeight}px`;
                          // Force layout recalculation
                          void categoryDiv.offsetHeight;
                          
                          // After setting original height, trigger an additional check to prevent accumulative growth
                          setTimeout(() => {
                            // Detect all visible bubbles
                            const visibleBubbles = Array.from(bubbleContainer.querySelectorAll('div[style*="border-radius: 25px"]'))
                              .filter(b => {
                                return b !== expandedSummary && 
                                      window.getComputedStyle(b).display !== 'none' && 
                                      parseFloat(window.getComputedStyle(b).opacity) > 0;
                              });
                            
                            if (visibleBubbles.length > 0) {
                              // Calculate actual height needed for all bubbles plus title
                              const categoryRect = categoryDiv.getBoundingClientRect();
                              const titleHeight = categoryDiv.querySelector('h3')?.offsetHeight || 30;
                              const paddingTop = 18;
                              const paddingBottom = 18;
                              
                              let maxBubbleBottom = 0;
                              visibleBubbles.forEach(b => {
                                const bubbleRect = b.getBoundingClientRect();
                                const bubbleBottom = bubbleRect.bottom - categoryRect.top + 20;
                                maxBubbleBottom = Math.max(maxBubbleBottom, bubbleBottom);
                              });
                              
                              // Calculate actual required height
                              const neededHeight = Math.max(
                                titleHeight + paddingTop + paddingBottom,
                                maxBubbleBottom
                              );
                              
                              // Choose smaller height to prevent accumulative growth
                              const adjustedHeight = Math.min(neededHeight, originalHeight);
                              
                              // If adjusted height differs from original height by over 20%, use adjusted height
                              if (Math.abs(adjustedHeight - originalHeight) > originalHeight * 0.2) {
                                categoryDiv.style.height = `${adjustedHeight}px`;
                              }
                            }
                          }, 300);
                        }, 100);
                      } else {
                        categoryDiv.style.height = `${originalHeight}px`;
                      }
                    } else if (originalHeightBeforeExpand && originalHeightBeforeExpand > 0) {
                      // Use height from before expansion
                      categoryDiv.style.height = `${originalHeightBeforeExpand}px`;
                    } else {
                      // Only use detection mechanism when original height isn't available
                      
                      // Detect all visible bubbles
                      const visibleBubbles = Array.from(bubbleContainer.querySelectorAll('div[style*="border-radius: 25px"]'))
                        .filter(b => {
                          return b !== expandedSummary && 
                                 window.getComputedStyle(b).display !== 'none' && 
                                 parseFloat(window.getComputedStyle(b).opacity) > 0;
                        });
                      
                      if (visibleBubbles.length > 0) {
                        const categoryRect = categoryDiv.getBoundingClientRect();
                        let maxBottom = 0;
                        
                        visibleBubbles.forEach(bubble => {
                          const rect = bubble.getBoundingClientRect();
                          const bubbleBottom = rect.bottom - categoryRect.top;
                          maxBottom = Math.max(maxBottom, bubbleBottom);
                        });
                        
                        const extraBottomMargin = 20;
                        const reasonableHeight = maxBottom + extraBottomMargin;
                        
                        categoryDiv.style.height = `${Math.max(reasonableHeight, 120)}px`;
                      } else {
                        categoryDiv.style.height = 'auto';
                        categoryDiv.style.minHeight = '120px';
                      }
                    }
                    
                    // Restore original minimum height
                    categoryDiv.style.minHeight = originalMinHeight || 'auto';
                    
                    // 6. Clean up all styles after transition and remove expanded summary box
                    setTimeout(() => {
                      try {
                          if (originalHeight && originalHeight > 0) {
                            // Step 1: Get all currently visible bubbles
                            let allBubbles = Array.from(bubbleContainer.querySelectorAll('div[style*="border-radius: 25px"]'))
                              .filter(b => {
                                return b !== expandedSummary && 
                                       window.getComputedStyle(b).display !== 'none' && 
                                       parseFloat(window.getComputedStyle(b).opacity) > 0;
                              });
                            
                            if (allBubbles.length === 0) {
                              allBubbles = Array.from(bubbleContainer.querySelectorAll('div')).filter(el => {
                                const style = window.getComputedStyle(el);
                                return el !== expandedSummary && 
                                       style.borderRadius && 
                                       parseFloat(style.borderRadius) > 10 && 
                                       style.display !== 'none' && 
                                       parseFloat(style.opacity) > 0;
                              });
                            }
                            
                            // Step 2: Calculate actual required height
                            if (allBubbles.length > 0) {
                              const categoryRect = categoryDiv.getBoundingClientRect();
                              let maxBottom = 0;
                              
                              allBubbles.forEach(bubble => {
                                const rect = bubble.getBoundingClientRect();
                                const bubbleBottom = rect.bottom - categoryRect.top;
                                maxBottom = Math.max(maxBottom, bubbleBottom);
                              });
                              
                              const titleHeight = categoryDiv.querySelector('h3')?.offsetHeight || 30;
                              const paddingTop = 18;
                              const paddingBottom = 18;
                              const extraBottomMargin = 20;
                              
                              // Calculate minimum required height
                              const reasonableHeight = Math.max(
                                maxBottom + extraBottomMargin, 
                                titleHeight + paddingTop + paddingBottom + 20
                              );
                              
                              // Determine final height - prevent growth beyond original height
                              const finalHeight = Math.min(
                                reasonableHeight,
                                Math.max(originalHeight, 120) // Keep minimum height of 120px
                              );
                              
                              categoryDiv.style.height = `${finalHeight}px`;
                            } else {
                              // When no bubbles, use original height with safety limit
                              categoryDiv.style.height = `${Math.min(originalHeight, 180)}px`;
                            }
                          } else if (originalHeightBeforeExpand && originalHeightBeforeExpand > 0) {
                            // Use pre-expansion height with maximum limit
                            const safeHeight = Math.min(originalHeightBeforeExpand, 200);
                            categoryDiv.style.height = `${safeHeight}px`;
                          } else {
                            // Fallback to detection mechanism
                            let allBubbles = Array.from(bubbleContainer.querySelectorAll('div[style*="border-radius: 25px"]'))
                              .filter(b => b !== expandedSummary);
                            
                            if (allBubbles.length === 0) {
                              allBubbles = Array.from(bubbleContainer.querySelectorAll('div')).filter(el => {
                                const style = window.getComputedStyle(el);
                                return el !== expandedSummary && 
                                       style.borderRadius && 
                                       parseFloat(style.borderRadius) > 10;
                              });
                            }
                            
                            const visibleBubbles = allBubbles.filter(b => {
                              const style = window.getComputedStyle(b);
                              return style.display !== 'none' && 
                                     parseFloat(style.opacity) > 0;
                            });
                                         
                            if (visibleBubbles.length > 0) {
                              let maxBottom = 0;
                              const categoryRect = categoryDiv.getBoundingClientRect();
                              
                              visibleBubbles.forEach(bubble => {
                                const rect = bubble.getBoundingClientRect();
                                const bubbleBottom = rect.bottom - categoryRect.top;
                                maxBottom = Math.max(maxBottom, bubbleBottom);
                              });
                              
                              const extraBottomMargin = 20;
                              const reasonableHeight = Math.min(maxBottom + extraBottomMargin, 200); // Set safety limit
                              
                              categoryDiv.style.height = `${Math.max(reasonableHeight, 120)}px`;
                            } else {
                              // Default safe height when no bubbles found
                              categoryDiv.style.height = '120px';
                              categoryDiv.style.minHeight = '120px';
                            }
                          }
                        } catch (err) {
                          // Use safe values when error occurs
                          categoryDiv.style.height = '120px';
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
                    fontSize: '16px', // Fixed font size in pixels
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
                    fontSize: '14px',
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
                    fontSize: '14px',
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
                    transitionDelay: '0.25s',
                    height: '32px',
                    lineHeight: '20px',
                    boxSizing: 'border-box',
                    verticalAlign: 'top',
                    minWidth: 'auto',
                    border: '1px solid rgba(25, 118, 210, 0.3)'
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
                    height: '100%',
                    lineHeight: '1',
                    margin: '0',
                    padding: '0'
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
                    verticalAlign: 'middle',
                    lineHeight: '1'
                  });
                  
                  // Assemble button content
                  btnContent.appendChild(chatIcon);
                  btnContent.appendChild(btnText);
                  detailExplanationBtn.appendChild(btnContent);
                  
                  // Apply styles
                  Object.assign(detailExplanationBtn.style, {
                    color: borderColor,
                    textDecoration: 'none',
                    fontSize: '14px',
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
                    transitionDelay: '0.25s',
                    height: '32px',
                    lineHeight: '20px',
                    boxSizing: 'border-box',
                    verticalAlign: 'top',
                    minWidth: 'auto',
                    border: '1px solid rgba(25, 118, 210, 0.3)'
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
                    
                    // Get the policyId of the current page URL
                    const currentUrl = window.location.href;
                    const urlPolicyKey = `policyId_${currentUrl}`;
                    
                    chrome.storage.local.get([urlPolicyKey], (result) => {
                      const pagePolicyId = result[urlPolicyKey];
                      
                      // Ensure the policyId of the current page is the latest
                      if (pagePolicyId) {
                        chrome.storage.local.set({ currentPolicyId: pagePolicyId });
                      }
                      
                      // Prepare bubble data for chat window
                      const bubbleData = {
                        keyword: item.keyword,
                        summary: item.summary,
                        category: category.title,
                        policy_id: pagePolicyId
                      };
                      
                      // Call chat window with auto query
                      window.privacyChatbox.openChatWindowWithAutoQuery(buttonRect, bubbleData, detailExplanationBtn);
                    });
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
              fontSize: '12px',
              color: '#1976d2'
            });

            // Keyword text
            const keyword = document.createElement('div');
            keyword.innerText = item.keyword;
            Object.assign(keyword.style, {
              fontWeight: '600',
              color: '#1976d2',
              flex: '1',
              fontSize: '15px'
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
              fontSize: '14px',
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
              fontSize: '14px',
              display: 'inline-block',
              marginBottom: '10px',
              padding: '6px 12px', 
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
              height: '32px',
              lineHeight: '20px',
              boxSizing: 'border-box',
              verticalAlign: 'top',
              minWidth: 'auto',
              border: '1px solid rgba(25, 118, 210, 0.3)'
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
              height: '100%',
              lineHeight: '1',
              margin: '0',
              padding: '0'
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
              verticalAlign: 'middle',
              lineHeight: '1'
            });
            
            // Assemble button content
            btnContent.appendChild(chatIcon);
            btnContent.appendChild(btnText);
            detailExplanationBtn.appendChild(btnContent);
            
            Object.assign(detailExplanationBtn.style, {
              color: '#1976d2',
              textDecoration: 'none',
              fontSize: '14px',
              display: 'inline-block',
              marginBottom: '10px',
              marginLeft: '10px',
              padding: '6px 12px', 
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              borderRadius: '4px',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(25, 118, 210, 0.3)',
              opacity: '0',
              transform: 'translateY(5px)',
              height: '32px',
              lineHeight: '20px',
              boxSizing: 'border-box',
              verticalAlign: 'top',
              minWidth: 'auto'
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
              
              // Get the policyId of the current page
              const currentUrl = window.location.href;
              const urlPolicyKey = `policyId_${currentUrl}`;
              
              chrome.storage.local.get([urlPolicyKey], (result) => {
                const pagePolicyId = result[urlPolicyKey];
                
                // Ensure the policyId of the current page is the latest
                if (pagePolicyId) {
                  chrome.storage.local.set({ currentPolicyId: pagePolicyId });
                }
                
                // Prepare bubble data for chat window
                const bubbleData = {
                  keyword: item.keyword,
                  summary: item.summary,
                  category: category.title,
                  policy_id: pagePolicyId
                };
                
                // Call chat window with auto query
                window.privacyChatbox.openChatWindowWithAutoQuery(buttonRect, bubbleData, detailExplanationBtn);
              });
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
    
    // Reset floating icon state
    if (floatingIcon) {
      isIconLocked = false;
      if (hideIconTimer) {
        clearTimeout(hideIconTimer);
        hideIconTimer = null;
      }
      floatingIcon.style.opacity = '0';
      floatingIcon.style.pointerEvents = 'none';
      floatingIcon.style.transform = 'scale(0.8)';
      lastIconPosition = null;
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

// Global variable to track the last element under mouse for context menu
let lastElementUnderMouse = null;

// Enhanced mouse tracking for better responsiveness - Updated for all element types
let lastMouseMoveTime = 0;
let lastTrackedElement = null;

document.addEventListener('mousemove', (event) => {
  const now = Date.now();
  
  // Always update current mouse position for accuracy
  currentMouseX = event.clientX;
  currentMouseY = event.clientY;
  lastMouseMoveTime = now;
  
  // Track element under mouse for context menu functionality
  const elementsUnderMouse = document.elementsFromPoint(currentMouseX, currentMouseY);
  const privacyElementUnderMouse = elementsUnderMouse.find(el => 
    isPossiblePrivacyPolicyElement(el)
  );
  
  // Update last element under mouse for context menu
  lastElementUnderMouse = privacyElementUnderMouse;
  
  // Check if summary popup exists
  const isSummaryShowing = document.getElementById('summary-popup') !== null;
  
  // Ensure icon state is correct if summary is closed
  if (!isSummaryShowing && isIconLocked) {
    // Verify if mouse is actually over the icon
    if (floatingIcon) {
      const iconRect = floatingIcon.getBoundingClientRect();
      const isReallyOverIcon = 
        currentMouseX >= iconRect.left && 
        currentMouseX <= iconRect.right && 
        currentMouseY >= iconRect.top && 
        currentMouseY <= iconRect.bottom;
      
      // Unlock if mouse is not over the icon
      if (!isReallyOverIcon) {
        isIconLocked = false;
      }
    }
  }
  
  // If the icon exists, is visible, and not locked, check for elements under mouse
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
      // Check for privacy elements under the mouse
      if (now - lastMouseMoveTime > 32 || !lastTrackedElement) {
        const elementsUnderMouse = document.elementsFromPoint(currentMouseX, currentMouseY);
        const hoveredPrivacyElement = elementsUnderMouse.find(el => 
          isPossiblePrivacyPolicyElement(el)
        );
        
        // If mouse is over a new privacy element, update icon position
        if (hoveredPrivacyElement && hoveredPrivacyElement !== lastTrackedElement) {
          lastTrackedElement = hoveredPrivacyElement;
          const elementUrl = getElementUrl(hoveredPrivacyElement);
          if (elementUrl) {
            currentHoveredLink = elementUrl;
            positionIcon(floatingIcon, hoveredPrivacyElement);
          }
        } else if (!hoveredPrivacyElement && lastTrackedElement) {
          // If moved from element to non-element area
          lastTrackedElement = null;
          
          // Start hiding icon when mouse leaves element and is not over icon
          if (!isOverIcon && !hideIconTimer) {
            hideIconTimer = setTimeout(() => {
              floatingIcon.style.opacity = '0';
              floatingIcon.style.pointerEvents = 'none';
              floatingIcon.style.transform = 'scale(0.8)';
            }, 150);
          }
        }
      }
    }
  }
});

// Handle mouse leave from elements (enhanced for all element types)
function handleLinkLeave(e) {
  if (floatingIcon) {
    // Clear existing timer
    if (hideIconTimer) {
      clearTimeout(hideIconTimer);
    }
    
    // Get element and icon position information
    const element = e.target;
    const elementRect = element.getBoundingClientRect();
    
    // Store mouseout event coordinates for accurate position testing
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Check if icon exists and is visible before accessing its properties
    if (!floatingIcon || window.getComputedStyle(floatingIcon).opacity === '0') {
      return;
    }
    
    const iconRect = floatingIcon.getBoundingClientRect();
    
    // Set a short delay to check if mouse is over icon or another element
    hideIconTimer = setTimeout(() => {
      // Get current mouse position (may have changed since timeout was set)
      const currentX = currentMouseX || mouseX;
      const currentY = currentMouseY || mouseY;
      
      // Check if mouse is over icon
      const isOverIcon = currentX >= iconRect.left && 
                      currentX <= iconRect.right && 
                      currentY >= iconRect.top && 
                      currentY <= iconRect.bottom;
      
      // Check if summary popup is currently displayed
      const isSummaryShowing = document.getElementById('summary-popup') !== null;
      
      // Reset icon lock status if the summary is closed
      if (!isSummaryShowing) {
        isIconLocked = isOverIcon;
      }
      
      // Don't hide if mouse is over icon or icon is locked
      if (isOverIcon || isIconLocked) {
        return;
      }
      
      // Check if mouse is over any relevant element
      const elementsUnderMouse = document.elementsFromPoint(currentX, currentY);
      const hoveredPrivacyElement = elementsUnderMouse.find(el => 
        isPossiblePrivacyPolicyElement(el)
      );
      
      if (hoveredPrivacyElement) {
        // If hovering a new privacy element, update position immediately
        const elementUrl = getElementUrl(hoveredPrivacyElement);
        if (elementUrl) {
          currentHoveredLink = elementUrl;
          positionIcon(floatingIcon, hoveredPrivacyElement);
        }
      } else {
        // If not over any privacy element or icon, hide the icon
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
    }, 100);
  }
}

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
          // Store with URL prefix to make it unique for current page
          const currentUrl = window.location.href;
          const urlPolicyKey = `policyId_${currentUrl}`;
          // Save global currentPolicyId for compatibility
          chrome.storage.local.set({ 
            currentPolicyId: message.policy_id,
            [urlPolicyKey]: message.policy_id
          });
        }
      } catch (e) {
        console.error("Failed to parse summary:", e);
      }
    }
  } else if (message.action === "getContextMenuTarget") {
    // Handle context menu target request - return URL of element under mouse
    console.log("Received context menu target request");
    
    try {
      let targetUrl = null;
      
      // Check if we have a tracked element under mouse
      if (lastElementUnderMouse) {
        targetUrl = getElementUrl(lastElementUnderMouse);
        console.log("Found tracked element under mouse:", targetUrl);
      }
      
      // If no tracked element, try to find one at current mouse position
      if (!targetUrl && currentMouseX && currentMouseY) {
        const elementsAtMouse = document.elementsFromPoint(currentMouseX, currentMouseY);
        const privacyElement = elementsAtMouse.find(el => isPossiblePrivacyPolicyElement(el));
        
        if (privacyElement) {
          targetUrl = getElementUrl(privacyElement);
          console.log("Found privacy element at mouse position:", targetUrl);
        }
      }
      
      // Send response back to background script
      sendResponse({
        url: targetUrl,
        found: !!targetUrl
      });
    } catch (error) {
      console.error("Error getting context menu target:", error);
      sendResponse({
        url: null,
        found: false,
        error: error.message
      });
    }
    
    return true;
  } else if (message.action === "checkCurrentPageForPrivacy") {
    // Handle request to check if current page is privacy-related
    console.log("Received request to check current page for privacy content");
    
    try {
      const currentUrl = window.location.href;
      const currentTitle = document.title;
      const isPrivacyPage = isCurrentPagePrivacyRelated();
      
      // Also check page content for privacy indicators
      const hasPrivacyContent = checkPageContentForPrivacy();
      
      console.log("Current page privacy check:", {
        url: currentUrl,
        title: currentTitle,
        isPrivacyPage: isPrivacyPage,
        hasPrivacyContent: hasPrivacyContent
      });
      
      sendResponse({
        url: currentUrl,
        title: currentTitle,
        isPrivacyPage: isPrivacyPage || hasPrivacyContent,
        hasPrivacyContent: hasPrivacyContent
      });
    } catch (error) {
      console.error("Error checking current page for privacy:", error);
      sendResponse({
        url: window.location.href,
        isPrivacyPage: false,
        error: error.message
      });
    }
    
    return true;
  }
});

// Helper function to check page content for privacy indicators
function checkPageContentForPrivacy() {
  try {
    // Check page title and main headings
    const title = document.title.toLowerCase();
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent.toLowerCase());
    const allHeadingText = headings.join(' ');
    
    // Privacy-related keywords
    const privacyKeywords = [
      'privacy policy', 'privacy statement', 'privacy notice',
      'data protection', 'personal information', 'data collection',
      '隐私政策', '隐私条款', '个人信息', 'プライバシーポリシー',
      '개인정보처리방침', 'datenschutzerklärung', 'política de privacidad'
    ];
    
    // Check title
    const titleHasPrivacy = privacyKeywords.some(keyword => title.includes(keyword));
    
    // Check headings
    const headingsHavePrivacy = privacyKeywords.some(keyword => allHeadingText.includes(keyword));
    
    // Check for privacy-related sections or containers
    const privacyContainers = document.querySelectorAll(
      '[class*="privacy"], [id*="privacy"], [class*="policy"], [id*="policy"]'
    );
    
    // Check main content area for privacy keywords
    const mainContent = document.querySelector('main, article, .content, #content, .main') || document.body;
    const contentText = mainContent.textContent.toLowerCase();
    const contentHasPrivacy = privacyKeywords.some(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = contentText.match(regex);
      return matches && matches.length >= 3; // Require multiple mentions
    });
    
    console.log("Privacy content check results:", {
      titleHasPrivacy,
      headingsHavePrivacy,
      privacyContainers: privacyContainers.length,
      contentHasPrivacy
    });
    
    return titleHasPrivacy || headingsHavePrivacy || privacyContainers.length > 0 || contentHasPrivacy;
  } catch (error) {
    console.error("Error checking page content for privacy:", error);
    return false;
  }
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

// Enhanced function to check if an element could be a privacy policy link (not just anchor tags)
function isPossiblePrivacyPolicyElement(element) {
  try {
    if (!element) return false;
    
    // Check for traditional anchor tags with href
    if (element.tagName === 'A' && element.href) {
      return isPossiblePrivacyPolicyLink(element);
    }
    
    // Enhanced detection for non-anchor elements that might be clickable privacy links
    return isClickablePrivacyElement(element);
  } catch (error) {
    // Return false if any error occurs during detection
    console.debug('Privacy extension: Error checking privacy policy element:', error);
    return false;
  }
}

// New function to detect clickable elements that might be privacy policy links
function isClickablePrivacyElement(element) {
  try {
    // Skip if element is not interactive or visible
    if (!element || !element.textContent) return false;
    
    const tagName = element.tagName.toLowerCase();
    const textContent = element.textContent.trim();
    const computedStyle = window.getComputedStyle(element);
    
    // Skip if text is too short or element is not visible
    if (textContent.length < 3 || 
        computedStyle.display === 'none' || 
        computedStyle.visibility === 'hidden' || 
        element.offsetHeight === 0) {
      return false;
    }
    
    // Check for privacy-related text content first
    const hasPrivacyText = checkPrivacyRelatedText(textContent);
    if (!hasPrivacyText) return false;
    
    // Check if element appears to be clickable
    const isClickable = checkIfElementIsClickable(element, computedStyle);
    if (!isClickable) return false;
    
    // Additional validation for non-anchor elements
    return validatePrivacyElement(element, textContent);
  } catch (error) {
    // Return false if any error occurs during detection
    console.debug('Privacy extension: Error checking clickable privacy element:', error);
    return false;
  }
}

// Helper function to check for privacy-related text content
function checkPrivacyRelatedText(text) {
  const privacyKeywords = [
    // English
    /privacy(\s|-|_)policy/i,
    /privacy(\s|-|_)statement/i,
    /privacy(\s|-|_)notice/i,
    /privacy/i,
    // Chinese
    /隐私(\s|-|_)政策/i,
    /隐私(\s|-|_)条款/i,
    /隐私/i,
    // Japanese
    /プライバシー(\s|-|_)ポリシー/i,
    /プライバシー/i,
    // Korean
    /개인정보(\s|-|_)처리방침/i,
    /개인정보/i,
    // German
    /datenschutzerklärung/i,
    /datenschutz/i,
    // Spanish
    /política(\s|-|_)de(\s|-|_)privacidad/i,
    /privacidad/i
  ];
  
  // Check if text contains any privacy-related keywords
  return privacyKeywords.some(pattern => pattern.test(text));
}

// Helper function to check if element appears clickable
function checkIfElementIsClickable(element, computedStyle) {
  // Check cursor style
  const hasCursorPointer = computedStyle.cursor === 'pointer';
  
  // Check for click event listeners (approximate detection)
  const hasClickHandler = hasEventListeners(element);
  
  // Check for role attributes that indicate interactivity
  const interactiveRoles = ['button', 'link', 'menuitem', 'tab'];
  const hasInteractiveRole = interactiveRoles.includes(element.getAttribute('role'));
  
  // Check for ARIA attributes that suggest interactivity
  const hasAriaPressed = element.hasAttribute('aria-pressed');
  const hasAriaExpanded = element.hasAttribute('aria-expanded');
  const hasTabIndex = element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';
  
  // Check for common clickable element tags
  const clickableTags = ['button', 'span', 'div', 'p', 'li', 'td', 'th'];
  const isClickableTag = clickableTags.includes(element.tagName.toLowerCase());
  
  // Check for CSS classes that suggest clickability
  const clickableClasses = /\b(btn|button|link|clickable|pointer|nav|menu|item)\b/i;
  const hasClickableClass = clickableClasses.test(element.className);
  
  // Element is considered clickable if it has multiple indicators
  const clickabilityScore = [
    hasCursorPointer,
    hasClickHandler,
    hasInteractiveRole,
    hasAriaPressed,
    hasAriaExpanded,
    hasTabIndex,
    isClickableTag && hasClickableClass
  ].filter(Boolean).length;
  
  return clickabilityScore >= 2 || hasCursorPointer;
}

// Helper function to detect event listeners (approximate)
function hasEventListeners(element) {
  // Check for common event handler attributes
  const eventHandlers = ['onclick', 'onmousedown', 'onmouseup'];
  const hasAttributeHandler = eventHandlers.some(handler => element.hasAttribute(handler));
  
  // Check for framework-specific attributes that might indicate click handlers
  const frameworkAttributes = [
    'ng-click',      // AngularJS
    '@click',        // Vue.js
    'v-on:click',    // Vue.js
    '(click)',       // Angular
    'data-toggle',   // Bootstrap
    'data-target',   // Bootstrap
    'data-bs-toggle', // Bootstrap 5
    'data-action'    // Generic data action
  ];
  const hasFrameworkHandler = frameworkAttributes.some(attr => element.hasAttribute(attr));
  
  return hasAttributeHandler || hasFrameworkHandler;
}

// Helper function to validate privacy element with additional checks
function validatePrivacyElement(element, textContent) {
  // Exclude elements that are clearly not links
  const excludePatterns = [
    /terms(\s|-|_)of(\s|-|_)service/i,
    /terms(\s|-|_)and(\s|-|_)conditions/i,
    /terms(\s|-|_)of(\s|-|_)use/i,
    /cookie(\s|-|_)settings/i,
    /cookie(\s|-|_)preferences/i
  ];
  
  // Don't show icon for terms of service unless it also mentions privacy
  for (const pattern of excludePatterns) {
    if (pattern.test(textContent) && !/privacy|隐私|プライバシー|개인정보|datenschutz|privacidad/i.test(textContent)) {
      return false;
    }
  }
  
  // Check parent elements for additional context
  const parentContext = getParentContext(element);
  if (parentContext && /privacy|隐私|プライバシー|개인정보|datenschutz|privacidad/i.test(parentContext)) {
    return true;
  }
  
  // Check if element is in a navigation context (footer, nav, menu)
  const isInNavContext = isInNavigationContext(element);
  
  // Element should be in navigation context for non-anchor privacy links
  return isInNavContext;
}

// Helper function to get parent context for better detection
function getParentContext(element, levelsUp = 3) {
  let context = '';
  let current = element.parentElement;
  let levels = 0;
  
  while (current && levels < levelsUp) {
    // Get text content from parent
    const parentText = current.textContent || '';
    
    // Get relevant attributes
    const className = current.className || '';
    const id = current.id || '';
    const title = current.title || '';
    
    context += ` ${parentText} ${className} ${id} ${title}`;
    
    current = current.parentElement;
    levels++;
  }
  
  return context.trim();
}

// Helper function to check if element is in navigation context
function isInNavigationContext(element) {
  let current = element;
  const maxLevels = 5;
  let levels = 0;
  
  while (current && levels < maxLevels) {
    const tagName = current.tagName ? current.tagName.toLowerCase() : '';
    const className = current.className ? current.className.toLowerCase() : '';
    const id = current.id ? current.id.toLowerCase() : '';
    
    // Check for navigation-related tags
    if (['nav', 'footer', 'header', 'menu', 'ul', 'ol'].includes(tagName)) {
      return true;
    }
    
    // Check for navigation-related classes or IDs
    const navPatterns = [
      'nav', 'navigation', 'menu', 'footer', 'header', 
      'links', 'link-list', 'site-links', 'bottom',
      'legal', 'policy', 'compliance'
    ];
    
    if (navPatterns.some(pattern => 
        className.includes(pattern) || id.includes(pattern))) {
      return true;
    }
    
    current = current.parentElement;
    levels++;
  }
  
  return false;
}

// Helper function to get URL from various element types
function getElementUrl(element) {
  try {
    if (!element) return null;
    
    // For anchor tags, use href
    if (element.tagName === 'A' && element.href) {
      return element.href;
    }
    
    // For other elements, check for data attributes that might contain URLs
    const urlAttributes = [
      'data-href',
      'data-url', 
      'data-link',
      'data-target-url',
      'data-privacy-url'
    ];
    
    for (const attr of urlAttributes) {
      const url = element.getAttribute(attr);
      if (url) {
        return url.startsWith('http') ? url : window.location.origin + url;
      }
    }
    
    // Check parent elements for URL information
    let current = element.parentElement;
    let levels = 0;
    while (current && levels < 3) {
      if (current.tagName === 'A' && current.href) {
        return current.href;
      }
      
      for (const attr of urlAttributes) {
        const url = current.getAttribute(attr);
        if (url) {
          return url.startsWith('http') ? url : window.location.origin + url;
        }
      }
      
      current = current.parentElement;
      levels++;
    }
    
    // If no explicit URL found, try to determine from context or use current page URL
    // This is a fallback for JavaScript-driven navigation
    const textContent = element.textContent.trim().toLowerCase();
    if (textContent.includes('privacy')) {
      // Try to find privacy policy URL in common locations
      const commonPrivacyUrls = findCommonPrivacyUrls();
      if (commonPrivacyUrls.length > 0) {
        return commonPrivacyUrls[0];
      }
      
      // Fallback to current page if it seems to be privacy-related
      if (isCurrentPagePrivacyRelated()) {
        return window.location.href;
      }
    }
    
    return null;
  } catch (error) {
    // Return null if any error occurs during URL extraction
    console.debug('Privacy extension: Error getting element URL:', error);
    return null;
  }
}

// Helper function to find common privacy policy URLs on the current site
function findCommonPrivacyUrls() {
  const commonPrivacyPaths = [
    '/privacy',
    '/privacy-policy', 
    '/privacy_policy',
    '/privacypolicy',
    '/legal/privacy',
    '/about/privacy',
    '/privacy-statement',
    '/privacy-notice'
  ];
  
  const baseUrl = window.location.origin;
  const foundUrls = [];
  
  // Check if any of these URLs exist as links on the current page
  for (const path of commonPrivacyPaths) {
    const fullUrl = baseUrl + path;
    const linkExists = document.querySelector(`a[href="${fullUrl}"], a[href="${path}"]`);
    if (linkExists) {
      foundUrls.push(fullUrl);
    }
  }
  
  return foundUrls;
}

// Helper function to check if current page is privacy-related
function isCurrentPagePrivacyRelated() {
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  
  const privacyIndicators = [
    'privacy', 'privacidad', 'datenschutz', 
    '隐私', 'プライバシー', '개인정보'
  ];
  
  return privacyIndicators.some(indicator => 
    url.includes(indicator) || title.includes(indicator));
}

