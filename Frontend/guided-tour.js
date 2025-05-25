// Privacy Policy Assistant - Guided Tour System
// Interactive tutorial with bubble tooltips, automated demonstrations and step navigation

class GuidedTour {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.overlay = null;
    this.bubble = null;
    this.isFirstInstall = false;
    this.demoElements = {};
    this.isOperationInProgress = false;
    this.currentOperation = null;
    this.resizeListener = null;
    this.loginRequired = false;
    this.realFloatingIcon = null;
    this.isLoggedIn = false;
    this.steps = [];
    this.tourPaused = false;
    this.spotlightOverlays = [];
    
    // Steps for logged-in users
    this.loggedInSteps = [
      {
        title: "Welcome to Privacy Policy Assistant!",
        content: "Let's take a quick tour to show you how to use this powerful tool that helps you understand privacy policies.",
        target: null,
        position: "center",
        autoAction: null,
        duration: 3000
      },
      {
        title: "Extension Icon",
        content: "This is your Privacy Policy Assistant extension icon. Let me show you how to access the settings by clicking it.",
        target: () => this.findExtensionPopup(),
        position: "left",
        autoAction: () => this.simulateExtensionClick(),
        duration: 5000
      },
      {
        title: "Finding Privacy Links",
        content: "When you hover over privacy policy links on any website, our blue icon will appear next to them.",
        target: () => this.findPrivacyLink(),
        position: "auto",
        autoAction: () => this.simulatePrivacyLinkHover(),
        duration: 5000
      },
      {
        title: "Click to Analyze",
        content: "Now click the blue floating icon 📝 to start analyzing the privacy policy. The AI will read and summarize it for you.",
        target: () => this.findFloatingIcon(),
        position: "top",
        autoAction: () => this.simulateIconClick(),
        duration: 4000
      },
      {
        title: "Summary Bubbles",
        content: "The summary appears as colored bubbles. Each color represents the importance level - red for critical, orange for important, yellow for medium, light green for low and green for very low.",
        target: () => this.findSummaryContainer(),
        position: "left",
        autoAction: null,
        duration: 5000
      },
      {
        title: "Expand for Details",
        content: "Click on any bubble to expand it to see a brief summary. At the bottom, you can click on ‘View Original Text’ to find the original text, or click on Detail Explanation to bring up a chatbox that explains the bubble in detail!",
        target: () => this.findSummaryItem(),
        position: "right",
        autoAction: () => this.demonstrateBubbleExpansion(),
        duration: 4000
      },
      {
        title: "Filter Options",
        content: "Use these filter buttons to show only the information you care about. You can filter by importance levels.",
        target: () => this.findFilterButtons(),
        position: "left",
        autoAction: () => this.demonstrateFiltering(),
        duration: 4000
      },
      {
        title: "Chat Feature",
        content: "Use the chat button to ask specific questions about the privacy policy. The AI will provide personalized answers.",
        target: () => this.findChatButton(),
        position: "left",
        autoAction: () => this.demonstrateChat(),
        duration: 4000,
        skipCondition: () => this.shouldSkipChatStep()
      },
      {
        title: "User Profile",
        content: "Access your profile here to manage your account settings.",
        target: () => this.findProfileButton(),
        position: "left",
        autoAction: () => this.demonstrateProfile(),
        duration: 3000
      },
      {
        title: "Tour Complete!",
        content: "You're all set! Start exploring privacy policies with confidence. You can restart this tour anytime from the extension menu.",
        target: null,
        position: "center",
        autoAction: null,
        duration: 4000
      }
    ];
    
    // Steps for logged-out users
    this.loggedOutSteps = [
      {
        title: "Welcome to Privacy Policy Assistant!",
        content: "Let's take a quick tour to show you how to use this powerful tool that helps you understand privacy policies.",
        target: null,
        position: "center",
        autoAction: null,
        duration: 3000
      },
      {
        title: "Extension Icon",
        content: "This is your Privacy Policy Assistant extension icon. Let me show you how to access the settings by clicking it.",
        target: () => this.findExtensionPopup(),
        position: "left",
        autoAction: () => this.simulateExtensionClick(),
        duration: 5000
      },
      {
        title: "Finding Privacy Links",
        content: "When you hover over privacy policy links on any website, our blue icon will appear next to them.",
        target: () => this.findPrivacyLink(),
        position: "auto",
        autoAction: () => this.simulatePrivacyLinkHover(),
        duration: 5000
      },
      {
        title: "Login Required",
        content: "To analyze privacy policies, you need to be logged in. Click the blue floating icon 📝 to start the login process.",
        target: () => this.findFloatingIcon(),
        position: "top",
        autoAction: () => this.highlightLoginPage(),
        duration: 4000
      },
      {
        title: "Login or Register",
        content: "Choose 'Login' if you have an account, or 'Register' to create a new one. After registration and login, we'll continue the tour with analysis features.",
        target: () => this.findLoginPage(),
        position: "left",
        autoAction: null,
        duration: 5000,
        pauseForLogin: true
      },
      {
        title: "Summary Bubbles",
        content: "Now that you're logged in, let's continue! The summary appears as colored bubbles. Each color represents the importance level - red for critical, orange for important, yellow for moderate, and green for minor.",
        target: () => this.findSummaryContainer(),
        position: "left",
        autoAction: null,
        duration: 5000
      },
      {
        title: "Expand for Details",
        content: "Click any bubble to expand it and see detailed explanations with references to the original text.",
        target: () => this.findSummaryItem(),
        position: "right",
        autoAction: () => this.demonstrateBubbleExpansion(),
        duration: 4000
      },
      {
        title: "Filter Options",
        content: "Use these filter buttons to show only the information you care about. You can filter by importance levels.",
        target: () => this.findFilterButtons(),
        position: "left",
        autoAction: () => this.demonstrateFiltering(),
        duration: 4000
      },
      {
        title: "Chat Feature",
        content: "Use the chat button to ask specific questions about the privacy policy. The AI will provide personalized answers.",
        target: () => this.findChatButton(),
        position: "left",
        autoAction: () => this.demonstrateChat(),
        duration: 4000,
        skipCondition: () => this.shouldSkipChatStep()
      },
      {
        title: "User Profile",
        content: "Access your profile here to view your analysis history and manage your account settings.",
        target: () => this.findProfileButton(),
        position: "left",
        autoAction: () => this.demonstrateProfile(),
        duration: 3000
      },
      {
        title: "Tour Complete!",
        content: "You're all set! Start exploring privacy policies with confidence. You can restart this tour anytime from the extension menu.",
        target: null,
        position: "center",
        autoAction: null,
        duration: 4000
      }
    ];
  }

  // Check if this is the first time the extension is installed
  checkFirstInstall() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['hasSeenTour'], (result) => {
        this.isFirstInstall = !result.hasSeenTour;
        resolve(this.isFirstInstall);
      });
    });
  }

  // Mark tour as seen
  markTourAsSeen() {
    chrome.storage.local.set({ hasSeenTour: true });
  }

  // Check login status
  async checkLoginStatus() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['isLoggedIn'], (result) => {
        resolve(result.isLoggedIn || false);
      });
    });
  }

  // Start the guided tour
  async startTour() {
    if (this.isActive) return;
    
    // First check login status to determine which tour to show
    this.isLoggedIn = await this.checkLoginStatus();
    
    // Set appropriate steps based on login status
    if (this.isLoggedIn) {
      this.steps = [...this.loggedInSteps];
      console.log('Starting tour for logged-in user');
    } else {
      this.steps = [...this.loggedOutSteps];
      console.log('Starting tour for logged-out user');
    }
    
    // Reset tour state
    this.resetStepsToOriginal();
    
    // Close any existing summary popup before starting
    const existingSummary = document.querySelector('#summary-popup');
    if (existingSummary) {
      const closeBtn = existingSummary.querySelector('button');
      if (closeBtn && (closeBtn.textContent === 'Close' || closeBtn.textContent === '✕')) {
        closeBtn.click();
        // Wait for close animation
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    this.isActive = true;
    this.currentStep = 0;
    this.isOperationInProgress = false;
    this.loginRequired = false;
    this.tourPaused = false;
    
    // Create overlay and bubble elements
    this.createOverlay();
    this.createBubble();
    
    // Add window resize listener
    this.addResizeListener();
    
    // Add error detection
    this.addErrorDetection();
    
    // Show first step - delay to ensure proper centering
    setTimeout(() => {
      this.showStep(0);
    }, 100);
    
    // Mark tour as seen if this was first install
    if (this.isFirstInstall) {
      this.markTourAsSeen();
    }
  }

  // Reset all steps to their original configuration
  resetStepsToOriginal() {
    if (this.loginRequired && this.steps.length > 10) {
      this.steps = this.steps.filter((step, index) => {
        return !this.loginSteps.some(loginStep => loginStep.title === step.title);
      });
    }
    
    // Reset login flag
    this.loginRequired = false;
  }

  // Add universal dynamic monitoring for all steps
  addResizeListener() {
    this.resizeListener = () => {
      if (this.isActive && this.bubble) {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          this.updateCurrentStepPositioning();
        }, 50);
      }
    };
    
    window.addEventListener('resize', this.resizeListener);
    window.addEventListener('scroll', this.resizeListener);
  }

  // Universal step positioning update system
  updateCurrentStepPositioning() {
    const step = this.steps[this.currentStep];
    if (!step) return;

    let targetElement = null;
    let position = step.position;
    let needsSpotlightUpdate = true;

    // Get current target based on step and operation state
    switch (step.title) {
      case "Extension Icon":
        if (this.currentOperation === 'extensionClick') {
          // Look for the extension popup
          const extensionPopup = this.findExtensionPopup();
          if (extensionPopup) {
            targetElement = extensionPopup;
            position = 'left';
          } else {
            targetElement = step.target ? step.target() : null;
          }
        } else {
          targetElement = step.target ? step.target() : null;
        }
        break;
      case "Login Required":
        if (this.currentOperation === 'loginPageHighlight') {
          const loginInterface = document.querySelector('#login-form') ||
                                document.querySelector('.login-container') ||
                                document.querySelector('.auth-container') ||
                                document.querySelector('[class*="login"][class*="modal"]') ||
                                document.querySelector('[class*="auth"][class*="modal"]') ||
                                document.querySelector('[id*="login"][id*="modal"]') ||
                                document.querySelector('form[action*="login"]') ||
                                document.querySelector('div[class*="signin"]') ||
                                document.querySelector('div[class*="authentication"]');
          
          if (loginInterface) {
            targetElement = loginInterface;
            position = 'left';
          } else {
            targetElement = step.target ? step.target() : null;
          }
        } else {
          targetElement = step.target ? step.target() : null;
        }
        break;
      case "Login or Register":
        targetElement = this.findLoginPage();
        position = 'left';
        break;
      case "Click to Analyze":
        if (this.currentOperation === 'iconClick') {
          targetElement = document.querySelector('#summary-popup');
          position = 'left';
        } else {
          targetElement = step.target ? step.target() : null;
          if (!targetElement) {
            const privacyLink = this.findPrivacyLink();
            if (privacyLink) {
              this.createSoftSpotlight(privacyLink);
              targetElement = this.findFloatingIcon();
              position = 'top';
              needsSpotlightUpdate = false;
            }
          }
        }
        break;

      case "Expand for Details":
        if (this.currentOperation === 'bubbleExpansion') {
          targetElement = document.querySelector('.expanded-summary') ||
                         document.querySelector('[class*="expanded"]') ||
                         document.querySelector('[id*="detail"]');
          position = 'right';
        } else {
          targetElement = step.target ? step.target() : null;
        }
        break;

      case "Filter Options":
        if (this.currentOperation === 'filtering') {
          const summaryContainer = this.findFilteredContainer();
          if (summaryContainer) {
            targetElement = summaryContainer;
            position = 'left';
          } else {
            targetElement = document.querySelector('[class*="no-result"], [class*="empty"], .summary-content');
            position = 'left';
          }
        } else {
          targetElement = step.target ? step.target() : null;
        }
        break;

      case "Chat Feature":
        if (this.currentOperation === 'chat') {
          targetElement = document.querySelector('#chat-window') || 
                         document.querySelector('.chat-container') ||
                         document.querySelector('.chat-popup') ||
                         document.querySelector('[class*="chat"][class*="window"]') ||
                         document.querySelector('[class*="chat"][class*="popup"]') ||
                         document.querySelector('[class*="chat"][class*="modal"]') ||
                         document.querySelector('[id*="chat"][id*="window"]') ||
                         document.querySelector('[id*="chat"][id*="popup"]');
          position = 'left';
        } else {
          targetElement = step.target ? step.target() : null;
        }
        break;

      case "User Profile":
        if (this.currentOperation === 'profile') {
          targetElement = document.querySelector('#profile-popup') || 
                         document.querySelector('.profile-container') ||
                         document.querySelector('.privacy-profile-popup') ||
                         document.querySelector('.profile-popup') ||
                         document.querySelector('.profile-modal') ||
                         document.querySelector('[class*="profile"][class*="popup"]') ||
                         document.querySelector('[class*="profile"][class*="modal"]') ||
                         document.querySelector('[class*="profile"][class*="window"]') ||
                         document.querySelector('[id*="profile"][id*="popup"]');
          position = 'right';
        } else {
          targetElement = step.target ? step.target() : null;
        }
        break;

      default:
        targetElement = step.target ? step.target() : null;
        break;
    }

    // Update spotlight and bubble if target found
    if (targetElement && targetElement.isConnected) {
      if (needsSpotlightUpdate) {
        this.createSoftSpotlight(targetElement);
      }
      
      // Create temporary step configuration for the positioning call
      const tempStepConfig = {
        position: position,
        title: step.title
      };
      
      // Force a small delay to ensure spotlight is applied before bubble positioning
      requestAnimationFrame(() => {
        this.positionBubble(tempStepConfig, targetElement);
      });
    } else if (step.position === 'center') {
      this.positionBubble(step);
    } else {
      this.updateStepPositioning(step);
    }
  }

  // Remove resize listener
  removeResizeListener() {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      window.removeEventListener('scroll', this.resizeListener);
      this.resizeListener = null;
    }
    
    // Clear any pending resize timeouts
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
  }

  // Check if chat step should be skipped
  async shouldSkipChatStep() {
    try {
      const adminResult = await new Promise(resolve => {
        chrome.storage.local.get(['isAdmin'], result => resolve(result));
      });
      
      if (adminResult.isAdmin) return false;
      
      // Check visibility settings for regular users
      const API_CONFIG = { BASE_URL: 'https://usyd-cs30-1-llm-based-consent-reader.com' };
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/get_visibility?feature=extension`);
      const data = await response.json();
      
      return !data.visible;
    } catch (error) {
      console.error('Error checking chat visibility:', error);
      return false;
    }
  }

  // Create simple dark background overlay (no spotlight)
  createOverlay() {
    this.removeSpotlightOverlays();
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'guided-tour-overlay';
    
    this.overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.35) !important;
      z-index: 10000000 !important;
      pointer-events: none !important;
      opacity: 1 !important;
      display: block !important;
      visibility: visible !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      transform: none !important;
      transition: none !important;
      animation: none !important;
      filter: none !important;
      backdrop-filter: none !important;
    `;
    
    document.body.appendChild(this.overlay);
  }

  // Create the instruction bubble with arrow
  createBubble() {
    this.bubble = document.createElement('div');
    this.bubble.className = 'guided-tour-bubble';
    this.bubble.style.cssText = `
      position: fixed;
      max-width: 350px;
      background: linear-gradient(135deg, #ffffff, #f8f9fa);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      z-index: 10000001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.3s ease-in-out;
      border: 1px solid rgba(25, 118, 210, 0.2);
      pointer-events: auto;
    `;
    
    document.body.appendChild(this.bubble);
  }

  // Add arrow to bubble pointing to target
  addArrowToBubble(direction) {
    // Remove existing arrow
    const existingArrow = this.bubble.querySelector('.tour-arrow');
    if (existingArrow) {
      existingArrow.remove();
    }

    const arrow = document.createElement('div');
    arrow.className = 'tour-arrow';
    arrow.style.position = 'absolute';
    arrow.style.width = '0';
    arrow.style.height = '0';
    arrow.style.zIndex = '10000002';
    
    switch (direction) {
      case 'top':
        arrow.style.bottom = '-10px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.borderLeft = '10px solid transparent';
        arrow.style.borderRight = '10px solid transparent';
        arrow.style.borderTop = '10px solid #ffffff';
        arrow.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))';
        break;
      case 'bottom':
        arrow.style.top = '-10px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.borderLeft = '10px solid transparent';
        arrow.style.borderRight = '10px solid transparent';
        arrow.style.borderBottom = '10px solid #ffffff';
        arrow.style.filter = 'drop-shadow(0 -2px 4px rgba(0,0,0,0.1))';
        break;
      case 'left':
        arrow.style.right = '-10px';
        arrow.style.top = '50%';
        arrow.style.transform = 'translateY(-50%)';
        arrow.style.borderTop = '10px solid transparent';
        arrow.style.borderBottom = '10px solid transparent';
        arrow.style.borderLeft = '10px solid #ffffff';
        arrow.style.filter = 'drop-shadow(2px 0 4px rgba(0,0,0,0.1))';
        break;
      case 'right':
        arrow.style.left = '-10px';
        arrow.style.top = '50%';
        arrow.style.transform = 'translateY(-50%)';
        arrow.style.borderTop = '10px solid transparent';
        arrow.style.borderBottom = '10px solid transparent';
        arrow.style.borderRight = '10px solid #ffffff';
        arrow.style.filter = 'drop-shadow(-2px 0 4px rgba(0,0,0,0.1))';
        break;
    }
    
    this.bubble.appendChild(arrow);
  }

  // Show a specific step with login check for step 4
  async showStep(stepIndex) {
    if (stepIndex >= this.steps.length) {
      this.endTour();
      return;
    }

    const step = this.steps[stepIndex];
    
    // Clear any demonstration styles from previous steps
    this.clearDemonstrationStyles();
    
    // Handle pause for login step
    if (step.pauseForLogin) {
      this.pauseTourForLogin();
      return;
    }
    
    // Check skip condition
    if (step.skipCondition && await step.skipCondition()) {
      if (stepIndex < this.steps.length - 1) {
        this.showStep(stepIndex + 1);
      } else {
        this.endTour();
      }
      return;
    }

    this.currentStep = stepIndex;
    this.isOperationInProgress = false;
    
    // Clear any previous operation
    this.currentOperation = null;
    
    // Special handling for last step - completely clear spotlight
    if (step.title === "Tour Complete!") {
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
        el.style.removeProperty('box-shadow');
        el.style.removeProperty('position');
        el.style.removeProperty('z-index');
      });
      
      this.removeSpotlightOverlays();
      if (!this.overlay) {
        this.createOverlay();
      }
    }
    
    // Update bubble content
    this.updateBubbleContent(step);
    
    // Position bubble with delay for center positioning
    if (step.position === 'center') {
      setTimeout(() => {
        this.updateCurrentStepPositioning();
      }, 50);
    } else {
      if (step.title === "Click to Analyze") {
        const privacyLink = this.findPrivacyLink();
        if (privacyLink) {
          this.createSoftSpotlight(privacyLink);
        }
        setTimeout(() => {
          this.updateCurrentStepPositioning();
        }, 100);
      } else {
        setTimeout(() => {
          this.updateCurrentStepPositioning();
        }, 50);
      }
    }
    
    // Perform auto action if specified
    if (step.autoAction) {
      this.isOperationInProgress = true;
      this.disableNavigation();
      
      setTimeout(() => {
        step.autoAction().then(() => {
          this.isOperationInProgress = false;
          this.enableNavigation();
          
          if (stepIndex === 3 || (this.loginRequired && step.title === "Click to Analyze")) {
            this.waitForSummaryAndUpdateSpotlight();
          }
        }).catch(() => {
          this.isOperationInProgress = false;
          this.enableNavigation();
        });
      }, 1000);
    }
  }

  // Wait for summary popup and update spotlight - improved version with error handling
  waitForSummaryAndUpdateSpotlight() {
    let attempts = 0;
    const maxAttempts = 30;
    const timeoutDuration = 15000;
    
    const overallTimeout = setTimeout(() => {
      this.isOperationInProgress = false;
      this.enableNavigation();
    }, timeoutDuration);
    
    const checkSummary = () => {
      try {
        const summaryPopup = document.querySelector('#summary-popup');
        const errorPopup = document.querySelector('[class*="error"], [id*="error"], .alert, .warning');
        
        if (errorPopup && attempts < 5) {
          clearTimeout(overallTimeout);
          this.handleError(errorPopup);
          return;
        }
        
        if (summaryPopup && attempts < maxAttempts) {
          const hasContent = summaryPopup.querySelector('.summary-content, [class*="bubble"], [class*="summary"]');
          const isLoading = summaryPopup.querySelector('[class*="loading"], [class*="spinner"], .loader');
          
          if (hasContent && !isLoading) {
            clearTimeout(overallTimeout);
            setTimeout(() => {
              this.createSoftSpotlight(summaryPopup);
              const tempStepConfig = {
                position: 'left',
                title: "Click to Analyze"
              };
              this.positionBubble(tempStepConfig, summaryPopup);
              
            }, 500);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkSummary, 500);
          } else {
            clearTimeout(overallTimeout);
            this.isOperationInProgress = false;
            this.enableNavigation();
          }
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkSummary, 500);
        } else {
          clearTimeout(overallTimeout);
          this.isOperationInProgress = false;
          this.enableNavigation();
        }
      } catch (error) {
        console.error('Error in waitForSummaryAndUpdateSpotlight:', error);
        clearTimeout(overallTimeout);
        this.isOperationInProgress = false;
        this.enableNavigation();
      }
    };
    
    checkSummary();
  }

  
  startSummaryPopupMonitoring(summaryPopup) {
    console.log('Summary popup monitoring handled by universal system');
  }

  stopSummaryPopupMonitoring() {
  }

  startExpandedSummaryMonitoring(expandedSummary) {
    console.log('Expanded summary monitoring handled by universal system');
  }

  stopExpandedSummaryMonitoring() {
  }

  startChatWindowMonitoring(chatWindow) {
    console.log('Chat window monitoring handled by universal system');
  }

  stopChatWindowMonitoring() {
  }

  startProfilePopupMonitoring(profilePopup) {
    console.log('Profile popup monitoring handled by universal system');
  }

  stopProfilePopupMonitoring() {
  }

  // Disable navigation buttons during operations
  disableNavigation() {
    const nextBtn = document.getElementById('tour-next');
    const skipBtn = document.getElementById('tour-skip');
    const closeBtn = document.getElementById('tour-close');
    
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.style.opacity = '0.5';
      nextBtn.style.cursor = 'not-allowed';
    }
    
    if (skipBtn) {
      skipBtn.disabled = true;
      skipBtn.style.opacity = '0.5';
      skipBtn.style.cursor = 'not-allowed';
    }
    
    if (closeBtn) {
      closeBtn.disabled = true;
      closeBtn.style.opacity = '0.5';
      closeBtn.style.cursor = 'not-allowed';
    }
  }

  // Enable navigation buttons after operations
  enableNavigation() {
    const nextBtn = document.getElementById('tour-next');
    const skipBtn = document.getElementById('tour-skip');
    const closeBtn = document.getElementById('tour-close');
    
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.style.opacity = '1';
      nextBtn.style.cursor = 'pointer';
    }
    
    if (skipBtn) {
      skipBtn.disabled = false;
      skipBtn.style.opacity = '1';
      skipBtn.style.cursor = 'pointer';
    }
    
    if (closeBtn) {
      closeBtn.disabled = false;
      closeBtn.style.opacity = '1';
      closeBtn.style.cursor = 'pointer';
    }
  }

  // Update bubble content
  updateBubbleContent(step) {
    const progressBar = this.createProgressBar();
    const navigationButtons = this.createNavigationButtons();
    
    this.bubble.innerHTML = `
      ${progressBar}
      <div style="margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px 0; color: #1976d2; font-size: 1.2rem; font-weight: 600;">
          ${step.title}
        </h3>
        <p style="margin: 0; color: #333; line-height: 1.5; font-size: 0.95rem;">
          ${step.content}
        </p>
      </div>
      ${navigationButtons}
    `;
    
    // Add event listeners to navigation buttons
    this.attachNavigationEvents();
    
    // Fade in bubble
    requestAnimationFrame(() => {
      this.bubble.style.opacity = '1';
      this.bubble.style.transform = 'scale(1)';
    });
  }

  // Create progress bar
  createProgressBar() {
    const progress = ((this.currentStep + 1) / this.steps.length) * 100;
    return `
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 0.8rem; color: #666; font-weight: 500;">Step ${this.currentStep + 1} of ${this.steps.length}</span>
          <button id="tour-close" style="background: none; border: none; color: #999; font-size: 16px; cursor: pointer; padding: 0;">✕</button>
        </div>
        <div style="width: 100%; height: 4px; background-color: #e0e0e0; border-radius: 2px; overflow: hidden;">
          <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, #1976d2, #2196f3); transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  }

  // Create navigation buttons
  createNavigationButtons() {
    const isLast = this.currentStep === this.steps.length - 1;
    const isDisabled = this.isOperationInProgress;
    
    // Button styles based on disabled state
    const getButtonStyle = (isMainButton = false) => {
      const baseColor = isMainButton ? '#1976d2' : '#666';
      const disabledColor = '#999';
      const backgroundColor = isMainButton 
        ? (isDisabled ? '#f0f0f0' : 'linear-gradient(135deg, #1976d2, #2196f3)')
        : 'transparent';
      const borderColor = isDisabled ? '#ddd' : (isMainButton ? baseColor : '#ddd');
      const textColor = isDisabled ? disabledColor : (isMainButton ? 'white' : baseColor);
      const cursor = isDisabled ? 'not-allowed' : 'pointer';
      const opacity = isDisabled ? '0.5' : '1';
      
      return `
        padding: 8px 16px;
        background: ${backgroundColor};
        border: 1px solid ${borderColor};
        border-radius: 6px;
        color: ${textColor};
        cursor: ${cursor};
        font-size: 0.9rem;
        font-weight: ${isMainButton ? '500' : 'normal'};
        transition: all 0.2s ease;
        opacity: ${opacity};
      `;
    };
    
    return `
      <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 20px;">
        <div style="display: flex; gap: 8px;">
          <button id="tour-skip" ${isDisabled ? 'disabled' : ''} style="${getButtonStyle(false)}">Skip Tour</button>
          
          <button id="tour-next" ${isDisabled ? 'disabled' : ''} style="${getButtonStyle(true)}">${isLast ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    `;
  }

  // Attach navigation event listeners
  attachNavigationEvents() {
    const nextBtn = document.getElementById('tour-next');
    const skipBtn = document.getElementById('tour-skip');
    const closeBtn = document.getElementById('tour-close');
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.isOperationInProgress) {
          return;
        }
        this.nextStep();
      });
    }
    
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        if (this.isOperationInProgress) {
          return;
        }
        this.endTour();
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (this.isOperationInProgress) {
          return;
        }
        this.endTour();
      });
    }
  }

  // Position the bubble relative to target element with improved positioning
  positionBubble(step, directTargetElement = null) {
    if (step.position === 'center') {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      this.bubble.style.top = `${viewportHeight / 2}px`;
      this.bubble.style.left = `${viewportWidth / 2}px`;
      this.bubble.style.transform = 'translate(-50%, -50%)';
      return;
    }

    // Use direct target element if provided, otherwise get from step
    const target = directTargetElement || (step.target ? step.target() : null);
    if (!target) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      this.bubble.style.top = `${viewportHeight / 2}px`;
      this.bubble.style.left = `${viewportWidth / 2}px`;
      this.bubble.style.transform = 'translate(-50%, -50%)';
      return;
    }

    // Force reflow to get updated dimensions
    target.getBoundingClientRect();
    
    // Get bubble size after content is set
    const bubbleRect = this.bubble.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    
    let top, left, transform = '';
    let arrowDirection = step.position;

    // Auto positioning for privacy links (step 3)
    if (step.position === 'auto') {
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - targetRect.bottom;
      const spaceAbove = targetRect.top;
      
      if (spaceBelow >= bubbleRect.height + 50) {
        arrowDirection = 'bottom';
        top = targetRect.bottom + 30;
        left = targetRect.left + (targetRect.width / 2);
        transform = 'translateX(-50%)';
      } else if (spaceAbove >= bubbleRect.height + 50) {
        arrowDirection = 'top';
        top = targetRect.top - bubbleRect.height - 30;
        left = targetRect.left + (targetRect.width / 2);
        transform = 'translateX(-50%)';
      } else {
        arrowDirection = 'right';
        top = targetRect.top + (targetRect.height / 2);
        left = targetRect.right + 30;
        transform = 'translateY(-50%)';
      }
    } else {
      switch (step.position) {
        case 'top':
          top = targetRect.top - bubbleRect.height - 30;
          left = targetRect.left + (targetRect.width / 2);
          transform = 'translateX(-50%)';
          break;
        case 'bottom':
          top = targetRect.bottom + 30;
          left = targetRect.left + (targetRect.width / 2);
          transform = 'translateX(-50%)';
          break;
        case 'left':
          top = targetRect.top + (targetRect.height / 2);
          left = targetRect.left - bubbleRect.width - 30;
          transform = 'translateY(-50%)';
          break;
        case 'right':
          top = targetRect.top + (targetRect.height / 2);
          left = targetRect.right + 30;
          transform = 'translateY(-50%)';
          break;
        default:
          top = targetRect.bottom + 30;
          left = targetRect.left;
          arrowDirection = 'bottom';
      }
    }

    // Ensure bubble stays within viewport with better margins
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 20;
    
    // Horizontal positioning
    if (left < margin) {
      left = margin;
      transform = transform.includes('translateY') ? 'translateY(-50%)' : '';
    }
    if (left + bubbleRect.width > viewportWidth - margin) {
      left = viewportWidth - bubbleRect.width - margin;
      transform = transform.includes('translateY') ? 'translateY(-50%)' : '';
    }
    
    // Vertical positioning
    if (top < margin) {
      top = margin;
      transform = transform.includes('translateX') ? 'translateX(-50%)' : '';
    }
    if (top + bubbleRect.height > viewportHeight - margin) {
      top = viewportHeight - bubbleRect.height - margin;
      transform = transform.includes('translateX') ? 'translateX(-50%)' : '';
    }

    // Apply positioning
    this.bubble.style.top = `${top}px`;
    this.bubble.style.left = `${left}px`;
    this.bubble.style.transform = transform;
    
    // Add arrow pointing to target
    requestAnimationFrame(() => {
      this.addArrowToBubble(arrowDirection);
    });
  }

  // Highlight target element with soft rounded rectangle spotlight
  highlightTarget(step) {
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
      el.style.removeProperty('box-shadow');
      el.style.removeProperty('position');
      el.style.removeProperty('z-index');
    });

    const target = step.target ? step.target() : null;
    if (target) {
      target.classList.add('tour-highlight');
      target.style.position = 'relative';
      target.style.zIndex = '10000000';
      
      this.createSoftSpotlight(target);
    } else {
      this.removeSpotlightOverlays();
      if (!this.overlay) {
        this.createOverlay();
      }
    }
  }

  // Create spotlight effect using four overlay blocks - most reliable method
  createSoftSpotlight(target) {
    if (!target || !target.getBoundingClientRect) {
      return;
    }
    
    const rect = target.getBoundingClientRect();
    
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    
    this.removeSpotlightOverlays();
    
    const margin = 15;
    const spotlightLeft = Math.max(0, rect.left - margin);
    const spotlightTop = Math.max(0, rect.top - margin);
    const spotlightRight = Math.min(window.innerWidth, rect.right + margin);
    const spotlightBottom = Math.min(window.innerHeight, rect.bottom + margin);
    
    const overlays = [];
    
    if (spotlightTop > 0) {
      const topOverlay = this.createOverlayBlock(0, 0, window.innerWidth, spotlightTop);
      overlays.push(topOverlay);
    }
    
    if (spotlightBottom < window.innerHeight) {
      const bottomOverlay = this.createOverlayBlock(0, spotlightBottom, window.innerWidth, window.innerHeight - spotlightBottom);
      overlays.push(bottomOverlay);
    }
    
    if (spotlightLeft > 0) {
      const leftOverlay = this.createOverlayBlock(0, spotlightTop, spotlightLeft, spotlightBottom - spotlightTop);
      overlays.push(leftOverlay);
    }
    
    if (spotlightRight < window.innerWidth) {
      const rightOverlay = this.createOverlayBlock(spotlightRight, spotlightTop, window.innerWidth - spotlightRight, spotlightBottom - spotlightTop);
      overlays.push(rightOverlay);
    }
    
    this.spotlightOverlays = overlays;
    
    this.currentSpotlightTarget = target;
  }
  
  // Create a single overlay block
  createOverlayBlock(left, top, width, height) {
    const overlay = document.createElement('div');
    overlay.className = 'guided-tour-spotlight-block';
    overlay.style.cssText = `
      position: fixed !important;
      left: ${left}px !important;
      top: ${top}px !important;
      width: ${width}px !important;
      height: ${height}px !important;
      background: rgba(0, 0, 0, 0.35) !important;
      z-index: 10000000 !important;
      pointer-events: none !important;
      opacity: 1 !important;
      display: block !important;
      visibility: visible !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      transform: none !important;
      transition: none !important;
      animation: none !important;
      filter: none !important;
      backdrop-filter: none !important;
    `;
    document.body.appendChild(overlay);
    return overlay;
  }
  
  // Remove all spotlight overlays
  removeSpotlightOverlays() {
    if (this.spotlightOverlays) {
      this.spotlightOverlays.forEach(overlay => {
        if (overlay && overlay.parentNode) {
          overlay.remove();
        }
      });
      this.spotlightOverlays = [];
    }
    
    const remainingBlocks = document.querySelectorAll('.guided-tour-spotlight-block');
    remainingBlocks.forEach(block => block.remove());
    
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  // Navigate to next step
  nextStep() {
    if (!this.isOperationInProgress) {
      // Check if we're leaving the Extension Icon step and need to close the popup
      const currentStepData = this.steps[this.currentStep];
      if (currentStepData && currentStepData.title === "Extension Icon") {
        this.closeExtensionPopup();
      }
      
      this.clearDemonstrationStyles();
      
      if (this.currentStep < this.steps.length - 1) {
        this.showStep(this.currentStep + 1);
      } else {
        this.endTour();
      }
    }
  }

  // End the tour
  endTour() {
    this.isActive = false;
    
    this.clearDemonstrationStyles();
    
    this.removeResizeListener();
    
    this.removeErrorDetection();
    
    if (this.iconProtectionInterval) {
      clearInterval(this.iconProtectionInterval);
      this.iconProtectionInterval = null;
    }
    
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
      el.style.removeProperty('box-shadow');
      el.style.removeProperty('position');
      el.style.removeProperty('z-index');
    });
    
    this.removeSpotlightOverlays();
    
    this.restoreExtensionDefaultState();
    
    Object.values(this.demoElements).forEach(element => {
      if (element && element.parentNode && !element.classList.contains('preserve-functionality')) {
        element.remove();
      }
    });
    this.demoElements = {};
    
    if (this.realFloatingIcon) {
      this.realFloatingIcon.style.display = 'block';
      this.realFloatingIcon.style.visibility = 'visible';
      this.realFloatingIcon.style.opacity = '1';
      this.realFloatingIcon = null;
    }
    
    const hiddenIcons = document.querySelectorAll('.privacy-summary-icon[style*="display: none"], .privacy-summary-icon[style*="visibility: hidden"]');
    hiddenIcons.forEach(icon => {
      icon.style.display = 'block';
      icon.style.visibility = 'visible';
      icon.style.opacity = '1';
    });
    
    // Fade out and remove elements
    if (this.bubble) {
      this.bubble.style.opacity = '0';
      this.bubble.style.transform = 'scale(0.8)';
    }
    
    if (this.overlay) {
      this.overlay.style.opacity = '0';
    }
    
    setTimeout(() => {
      if (this.bubble && this.bubble.parentNode) {
        this.bubble.remove();
        this.bubble = null;
      }
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.remove();
        this.overlay = null;
      }
      
      const remainingOverlays = document.querySelectorAll('.guided-tour-overlay');
      remainingOverlays.forEach(el => el.remove());
      
    }, 300);
  }

  // Restore extension to default state
  restoreExtensionDefaultState() {
    if (window.privacyChatbox && typeof window.privacyChatbox.closeChatWindow === 'function') {
      window.privacyChatbox.closeChatWindow();
    }
    
    if (window.privacyAuth && typeof window.privacyAuth.closeProfilePopup === 'function') {
      window.privacyAuth.closeProfilePopup();
    }
    
    if (this.demoElements.profilePopup) {
      this.demoElements.profilePopup.remove();
      delete this.demoElements.profilePopup;
    }
    
    if (this.demoElements.loginPage) {
      this.demoElements.loginPage.remove();
      delete this.demoElements.loginPage;
    }
    
    const summaryPopup = document.querySelector('#summary-popup');
    if (summaryPopup) {
      const clearBtns = summaryPopup.querySelectorAll('button');
      clearBtns.forEach(btn => {
        if (btn.textContent.includes('Clear') || btn.textContent.includes('All') || btn.textContent.includes('Reset')) {
          btn.click();
        }
      });
    }
    
    const expandedSummary = document.querySelector('.expanded-summary');
    if (expandedSummary) {
      const closeBtn = expandedSummary.querySelector('.close-btn') ||
                      expandedSummary.querySelector('button');
      if (closeBtn) {
        closeBtn.click();
      }
    }
  }

  // Add error detection for the tour
  addErrorDetection() {
    this.errorObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const isError = node.classList && (
              node.classList.contains('error') ||
              node.classList.contains('alert') ||
              node.classList.contains('warning') ||
              node.id === 'error-popup' ||
              node.querySelector('.error, .alert, .warning, [class*="error"], [id*="error"]')
            );
            
            if (isError) {
              this.handleError(node);
            }
          }
        });
      });
    });
    
    this.errorObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Handle error detection
  handleError(errorElement) {
    if (!this.isActive) return;
    
    this.isOperationInProgress = true;
    this.disableNavigation();
    
    this.bubble.innerHTML = `
      <div style="margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px 0; color: #d32f2f; font-size: 1.2rem; font-weight: 600;">
          ⚠️ Error Detected
        </h3>
        <p style="margin: 0; color: #333; line-height: 1.5; font-size: 0.95rem;">
          An error occurred during the demonstration. The guided tour has been paused.
        </p>
      </div>
      <div style="display: flex; justify-content: center; margin-top: 20px;">
        <button id="tour-error-exit" style="
          padding: 8px 16px;
          background: linear-gradient(135deg, #d32f2f, #f44336);
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
        ">Exit Tour</button>
      </div>
    `;
    
    const exitBtn = document.getElementById('tour-error-exit');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => this.endTour());
    }
    
    this.bubble.style.position = 'fixed';
    this.bubble.style.top = '50%';
    this.bubble.style.left = '50%';
    this.bubble.style.transform = 'translate(-50%, -50%)';
  }

  // Remove error detection
  removeErrorDetection() {
    if (this.errorObserver) {
      this.errorObserver.disconnect();
      this.errorObserver = null;
    }
  }

  // Update step positioning
  updateStepPositioning(step) {
    const target = step.target ? step.target() : null;
    if (target) {
      this.createSoftSpotlight(target);
    } else {
      this.overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: rgba(0, 0, 0, 0.35) !important;
        background-image: none !important;
        z-index: 10000000 !important;
        pointer-events: none !important;
        opacity: 1 !important;
        transition: opacity 0.3s ease-in-out !important;
        -webkit-mask: none !important;
        mask: none !important;
        -webkit-mask-image: none !important;
        mask-image: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        filter: none !important;
        transform: none !important;
        box-shadow: none !important;
        border: none !important;
        outline: none !important;
      `;
    }
    this.positionBubble(step);
  }

  // Pause tour for login - user needs to register/login
  pauseTourForLogin() {
    this.tourPaused = true;
    console.log('Tour paused for user login');
    
    // Update bubble to show login instructions
    this.bubble.innerHTML = `
      <div style="margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px 0; color: #1976d2; font-size: 1.2rem; font-weight: 600;">
          Ready to Register/Login
        </h3>
        <p style="margin: 0; color: #333; line-height: 1.5; font-size: 0.95rem;">
          Please register or login now. The tour will automatically continue once you're logged in and return to this page.
        </p>
      </div>
      <div style="display: flex; justify-content: center; margin-top: 20px;">
        <button id="tour-continue-login" style="
          padding: 8px 16px;
          background: linear-gradient(135deg, #1976d2, #2196f3);
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
        ">I'll Register/Login Now</button>
      </div>
    `;
    
    // Add event listener for continue button
    const continueBtn = document.getElementById('tour-continue-login');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        this.pauseTour();
        this.waitForLoginAndResume();
      });
    }
  }

  // Pause tour temporarily
  pauseTour() {
    this.isActive = false;
    
    if (this.iconProtectionInterval) {
      clearInterval(this.iconProtectionInterval);
      this.iconProtectionInterval = null;
    }
    
    if (this.bubble) {
      this.bubble.style.opacity = '0';
      this.bubble.style.transform = 'scale(0.8)';
    }
    
    this.removeSpotlightOverlays();
    
    if (this.overlay) {
      this.overlay.style.opacity = '0';
    }
    
    setTimeout(() => {
      if (this.bubble && this.bubble.parentNode) {
        this.bubble.remove();
        this.bubble = null;
      }
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.remove();
        this.overlay = null;
      }
      
      const remainingOverlays = document.querySelectorAll('.guided-tour-overlay');
      remainingOverlays.forEach(el => el.remove());
    }, 300);
  }

  // Wait for login completion and resume tour
  waitForLoginAndResume() {
    const checkLoginAndResume = () => {
      this.checkLoginStatus().then(isLoggedIn => {
        if (isLoggedIn && !this.isActive) {
          setTimeout(() => {
            const summaryExists = document.querySelector('#summary-popup') || 
                                 document.querySelector('.summary-content') ||
                                 document.querySelector('[class*="summary"]');
            
            if (summaryExists) {
              this.resumeTour();
            } else {
              setTimeout(checkLoginAndResume, 2000);
            }
          }, 1000);
        } else if (!isLoggedIn) {
          setTimeout(checkLoginAndResume, 2000);
        }
      });
    };
    
    setTimeout(checkLoginAndResume, 3000);
  }

  // Resume tour from Summary Bubbles step
  resumeTour() {
    console.log('Resuming tour after login');
    
    this.isLoggedIn = true;
    this.tourPaused = false;
    
    this.createOverlay();
    this.createBubble();
    
    this.isActive = true;
    this.currentStep = 5;
    
    setTimeout(() => {
      this.showStep(this.currentStep);
    }, 500);
  }

  // Highlight login page for logged-out users - click floating icon and wait for real login interface
  async highlightLoginPage() {
    return new Promise((resolve) => {
      const floatingIcon = this.findFloatingIcon();
      if (floatingIcon) {
        floatingIcon.style.transform = 'scale(0.95)';
        setTimeout(() => {
          floatingIcon.style.transform = 'scale(1.1)';
          const event = new MouseEvent('click', { bubbles: true });
          floatingIcon.dispatchEvent(event);
          
          this.currentOperation = 'loginPageHighlight';
          
          let attempts = 0;
          const checkLoginInterface = () => {
            const authPopup = document.querySelector('#auth-popup');
            if (authPopup) {
              console.log('Found auth-popup:', authPopup);
              this.createSoftSpotlight(authPopup);
              const tempStepConfig = {
                position: 'left',
                title: "Login Required"
              };
              this.positionBubble(tempStepConfig, authPopup);
              resolve();
              return;
            }
            
            const loginInterface = document.querySelector('#login-form') ||
                                  document.querySelector('.login-container') ||
                                  document.querySelector('.auth-container') ||
                                  document.querySelector('[class*="login"][class*="modal"]') ||
                                  document.querySelector('[class*="auth"][class*="modal"]') ||
                                  document.querySelector('[id*="login"][id*="modal"]') ||
                                  document.querySelector('form[action*="login"]') ||
                                  document.querySelector('div[class*="signin"]') ||
                                  document.querySelector('div[class*="authentication"]');
            
            if (loginInterface && attempts < 20) {
              console.log('Found real login interface:', loginInterface);
              this.createSoftSpotlight(loginInterface);
              const tempStepConfig = {
                position: 'left',
                title: "Login Required"
              };
              this.positionBubble(tempStepConfig, loginInterface);
              resolve();
            } else if (attempts < 20) {
              attempts++;
              setTimeout(checkLoginInterface, 500);
            } else {
              console.log('Real login interface not found, using fallback');
              resolve();
            }
          };
          
          setTimeout(checkLoginInterface, 800);
        }, 200);
      } else {
        resolve();
      }
    });
  }

  findLoginPage() {
    const authPopup = document.querySelector('#auth-popup');
    if (authPopup) {
      return authPopup;
    }
    
    const loginPage = document.querySelector('#login-form') ||
                      document.querySelector('.login-container') ||
                      document.querySelector('.auth-container') ||
                      document.querySelector('[class*="login"][class*="modal"]') ||
                      document.querySelector('[class*="auth"][class*="modal"]') ||
                      document.querySelector('[id*="login"][id*="modal"]') ||
                      document.querySelector('form[action*="login"]') ||
                      document.querySelector('div[class*="signin"]') ||
                      document.querySelector('div[class*="authentication"]');
    
    if (loginPage) {
      return loginPage;
    }
    
    return this.createDemoLoginPage();
  }

  createDemoLoginPage() {
    if (!this.demoElements.loginPage) {
      this.demoElements.loginPage = document.createElement('div');
      this.demoElements.loginPage.innerHTML = `
        <div style="padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); max-width: 400px;">
          <h2 style="margin: 0 0 20px 0; color: #1976d2; text-align: center;">Login to Privacy Assistant</h2>
          <div style="margin-bottom: 15px;">
            <input type="email" placeholder="Email" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
          </div>
          <div style="margin-bottom: 20px;">
            <input type="password" placeholder="Password" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="demo-element" style="flex: 1; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Login</button>
            <button class="demo-element" style="flex: 1; padding: 12px; background: #2196f3; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Register</button>
          </div>
        </div>
      `;
      this.demoElements.loginPage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999999;
      `;
      this.demoElements.loginPage.classList.add('demo-element');
      document.body.appendChild(this.demoElements.loginPage);
    }
    return this.demoElements.loginPage;
  }

  findExtensionIcon() {
    const extensionBar = document.querySelector('[role="toolbar"]') || 
                        document.querySelector('.toolbar') ||
                        document.querySelector('#extensions-bar');
    
    if (extensionBar) {
      const iconInBar = extensionBar.querySelector('[title*="Privacy"], [title*="policy"], .extension-icon');
      if (iconInBar) return iconInBar;
    }
    
    const realIcon = document.querySelector('.extension-icon') || 
                    document.querySelector('#extension-icon') ||
                    document.querySelector('[title*="Privacy Policy Assistant"]') ||
                    document.querySelector('button[title*="Privacy"]');
    
    if (realIcon) {
      return realIcon;
    }
    
    // Return null if no real extension icon found - don't create demo icon
    return null;
  }

  findExtensionPopup() {
    // Look for actual Chrome extension popup elements
    const chromePopup = document.querySelector('[role="dialog"][aria-label*="extension"]') ||
                       document.querySelector('[class*="extension"][class*="popup"]') ||
                       document.querySelector('[id*="extension"][id*="popup"]');
    
    if (chromePopup) return chromePopup;
    
    // Look for our demo extension popup
    if (this.demoElements.extensionPopup) {
      return this.demoElements.extensionPopup;
    }
    
    return null;
  }

  createDemoExtensionPopup() {
    if (!this.demoElements.extensionPopup) {
      this.demoElements.extensionPopup = document.createElement('div');
      
      // Create popup content that matches popup.html structure
      this.demoElements.extensionPopup.innerHTML = `
        <div style="
          width: 320px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 15px;
          color: #333;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        ">
          <div style="text-align: center; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 1px solid rgba(25, 118, 210, 0.1);">
            <h1 style="
              margin: 0;
              font-size: 1.3rem;
              background: linear-gradient(to right, #1565c0, #1976d2, #2196f3);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              font-weight: 600;
              letter-spacing: -0.02em;
            ">Privacy Policy Assistant</h1>
          </div>
          
          <div style="
            display: flex;
            align-items: center;
            padding: 12px 15px;
            margin-bottom: 8px;
            border-radius: 8px;
            background-color: rgba(25, 118, 210, 0.05);
          ">
            <div style="
              width: 24px;
              height: 24px;
              margin-right: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #1976d2;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
            </div>
            <div style="flex: 1; font-size: 0.95rem;">Enable Privacy Policy Analysis</div>
            <label style="
              position: relative;
              display: inline-block;
              width: 42px;
              height: 24px;
            ">
              <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
              <span style="
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #1976d2;
                transition: .3s;
                border-radius: 24px;
              ">
                <span style="
                  position: absolute;
                  content: '';
                  height: 18px;
                  width: 18px;
                  right: 3px;
                  bottom: 3px;
                  background-color: white;
                  transition: .3s;
                  border-radius: 50%;
                "></span>
              </span>
            </label>
          </div>
          
          <div style="
            display: flex;
            align-items: center;
            padding: 12px 15px;
            margin-bottom: 8px;
            border-radius: 8px;
            cursor: pointer;
            background-color: rgba(25, 118, 210, 0.05);
            transition: background-color 0.2s, transform 0.2s;
          " onmouseover="this.style.backgroundColor='rgba(25, 118, 210, 0.1)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.backgroundColor='rgba(25, 118, 210, 0.05)'; this.style.transform='translateY(0)'">
            <div style="
              width: 24px;
              height: 24px;
              margin-right: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #1976d2;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div style="flex: 1; font-size: 0.95rem;">View Tutorial</div>
          </div>
          
          <div style="
            display: flex;
            align-items: center;
            padding: 12px 15px;
            margin-bottom: 8px;
            border-radius: 8px;
            cursor: pointer;
            background-color: rgba(25, 118, 210, 0.15);
            transition: background-color 0.2s, transform 0.2s;
          " onmouseover="this.style.backgroundColor='rgba(25, 118, 210, 0.2)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.backgroundColor='rgba(25, 118, 210, 0.15)'; this.style.transform='translateY(0)'">
            <div style="
              width: 24px;
              height: 24px;
              margin-right: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #1976d2;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
              </svg>
            </div>
            <div style="flex: 1; font-size: 0.95rem;">Start Guided Tour</div>
          </div>
          
          <div style="
            font-size: 0.8rem;
            text-align: center;
            color: #666;
            margin-top: 15px;
            padding-top: 12px;
            border-top: 1px solid rgba(25, 118, 210, 0.1);
          ">
            Privacy Policy Assistant helps you understand complex privacy terms
          </div>
        </div>
      `;
      
              // Position the popup in the top-right area to simulate extension popup
        let popupTop = 50;
        let popupRight = 20;
      
      this.demoElements.extensionPopup.style.cssText = `
        position: fixed;
        top: ${popupTop}px;
        right: ${popupRight}px;
        z-index: 10000010;
        opacity: 0;
        transform: scale(0.9) translateY(-10px);
        transition: all 0.3s ease-out;
      `;
      
      this.demoElements.extensionPopup.classList.add('demo-element');
      document.body.appendChild(this.demoElements.extensionPopup);
      
      // Fade in the popup
      requestAnimationFrame(() => {
        this.demoElements.extensionPopup.style.opacity = '1';
        this.demoElements.extensionPopup.style.transform = 'scale(1) translateY(0)';
      });
    }
    
    return this.demoElements.extensionPopup;
  }

  closeExtensionPopup() {
    if (this.demoElements.extensionPopup) {
      // Fade out the popup
      this.demoElements.extensionPopup.style.opacity = '0';
      this.demoElements.extensionPopup.style.transform = 'scale(0.9) translateY(-10px)';
      
      // Remove after animation
      setTimeout(() => {
        if (this.demoElements.extensionPopup && this.demoElements.extensionPopup.parentNode) {
          this.demoElements.extensionPopup.remove();
          delete this.demoElements.extensionPopup;
        }
      }, 300);
    }
  }

  findPrivacyLink() {
    // Step 1: Prioritize finding privacy links in the bottom area of the webpage
    const bottomAreaLinks = this.findBottomAreaPrivacyLinks();
    if (bottomAreaLinks.length > 0) {
      const targetLink = bottomAreaLinks[0];
      targetLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return targetLink;
    }
    
    // Step 2: Find privacy links that can trigger floating icon display (using content.js detection logic)
    const iconTriggeredLinks = this.findIconTriggeredPrivacyLinks();
    if (iconTriggeredLinks.length > 0) {
      const targetLink = iconTriggeredLinks[0];
      targetLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return targetLink;
    }
    
    // Step 3: Create demo link as the last fallback
    return this.createDemoPrivacyLink();
  }
  
  // Find privacy links in the bottom area of the webpage
  findBottomAreaPrivacyLinks() {
    const allLinks = document.querySelectorAll('a[href]');
    const bottomLinks = [];
    
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    
    allLinks.forEach(link => {
      const text = link.textContent.toLowerCase().trim();
      const href = link.href.toLowerCase();
      
      // Check if contains privacy keywords
      const hasPrivacyText = /privacy|隐私|プライバシー|개인정보|datenschutz|privacidad/i.test(text);
      const hasPrivacyUrl = /privacy|policy|privacidad|datenschutz|隐私|プライバシー|개인정보/i.test(href);
      
      // Exclude terms-related links
      const isTermsLink = /terms|conditions|nutzungsbedingungen|利用規約|사용약관|使用条款/i.test(text) && 
                         !hasPrivacyText;
      
      if ((hasPrivacyText || hasPrivacyUrl) && !isTermsLink) {
        const rect = link.getBoundingClientRect();
        const linkPosition = rect.top + window.scrollY;
        
        // Check if in bottom area (bottom 40% of page)
        const isInBottomArea = linkPosition > documentHeight * 0.6;
        
        // Check if in footer-related container
        const hasFooterParent = link.closest('footer, .footer, [class*="footer"], [id*="footer"], [class*="bottom"], [id*="bottom"]');
        
        if (isInBottomArea || hasFooterParent) {
          bottomLinks.push({
            link: link,
            position: linkPosition,
            hasFooterParent: !!hasFooterParent,
            hasPrivacyText: hasPrivacyText
          });
        }
      }
    });
    
    // Sort: prioritize footer parent, then has privacy text, finally sort by position (lower is better)
    bottomLinks.sort((a, b) => {
      if (a.hasFooterParent && !b.hasFooterParent) return -1;
      if (!a.hasFooterParent && b.hasFooterParent) return 1;
      if (a.hasPrivacyText && !b.hasPrivacyText) return -1;
      if (!a.hasPrivacyText && b.hasPrivacyText) return 1;
      return b.position - a.position;
    });
    
    return bottomLinks.map(item => item.link);
  }
  
  // Find privacy links that can trigger floating icon display
  findIconTriggeredPrivacyLinks() {
    const iconTriggeredLinks = [];
    const allLinks = document.querySelectorAll('a[href]');
    
    allLinks.forEach(link => {
      if (this.isPrivacyPolicyLink(link)) {
        iconTriggeredLinks.push(link);
      }
    });
    
    return iconTriggeredLinks;
  }
  
  isPrivacyPolicyLink(link) {
    if (!link || !link.href) return false;
    
    const termsPattern = /terms|conditions|nutzungsbedingungen|利用規約|사용약관|使用条款/i;
    if (link.textContent && 
        termsPattern.test(link.textContent.trim()) && 
        !/privacy|隐私|プライバシー|개인정보|datenschutz|privacidad/i.test(link.textContent.trim())) {
      return false;
    }
    
    const privacyKeywords = [
      'privacy',
      '隐私',
      'プライバシー',
      '개인정보',
      'datenschutz',
      'privacidad'
    ];
    
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
    
    return hasPrivacyText && hasPrivacyUrl;
  }

  createDemoPrivacyLink() {
    if (!this.demoElements.privacyLink) {
      this.demoElements.privacyLink = document.createElement('a');
      this.demoElements.privacyLink.href = '#privacy-policy';
      this.demoElements.privacyLink.textContent = 'Privacy Policy';
      this.demoElements.privacyLink.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 15px;
        background: #1976d2;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        z-index: 9999999;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `;
      this.demoElements.privacyLink.classList.add('demo-element');
      document.body.appendChild(this.demoElements.privacyLink);
    }
    return this.demoElements.privacyLink;
  }

  // Find floating icon
  findFloatingIcon() {
    const floatingIcon = document.querySelector('.privacy-summary-icon');
    if (floatingIcon) {
      this.realFloatingIcon = floatingIcon;
      return floatingIcon;
    }
    
    // Return demo floating icon if real one not found
    return this.demoElements.floatingIcon || this.createDemoFloatingIcon();
  }

  createDemoFloatingIcon() {
    if (!this.demoElements.floatingIcon) {
      this.demoElements.floatingIcon = document.createElement('div');
      this.demoElements.floatingIcon.className = 'privacy-summary-icon demo-floating-icon';
      this.demoElements.floatingIcon.innerHTML = '📝';
      this.demoElements.floatingIcon.style.cssText = `
        position: fixed;
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #1976d2, #2196f3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        cursor: pointer;
        z-index: 99997;
        box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
        font-size: 16px;
        user-select: none;
        transition: all 0.2s ease-in-out;
        bottom: 80px;
        right: 80px;
      `;
      this.demoElements.floatingIcon.classList.add('demo-element');
      document.body.appendChild(this.demoElements.floatingIcon);
    }
    return this.demoElements.floatingIcon;
  }

  // Find login buttons
  findLoginButtons() {
    const buttons = document.querySelectorAll('button, input[type="submit"], a');
    const loginButtonCandidates = Array.from(buttons).filter(btn => {
      const text = btn.textContent.toLowerCase();
      const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
      const title = (btn.getAttribute('title') || '').toLowerCase();
      return !btn.classList.contains('demo-element') && 
             (text.includes('login') || text.includes('sign in') || 
              text.includes('register') || text.includes('sign up') ||
              ariaLabel.includes('login') || title.includes('login'));
    });
    
    if (loginButtonCandidates.length > 0) {
      return loginButtonCandidates[0].parentElement;
    }
    
    // Look for real login forms or containers
    const loginContainer = document.querySelector('#login-form') ||
                          document.querySelector('.login-container') ||
                          document.querySelector('.auth-container') ||
                          document.querySelector('[class*="login"][class*="modal"]') ||
                          document.querySelector('[class*="auth"][class*="modal"]') ||
                          document.querySelector('[id*="login"][id*="modal"]') ||
                          document.querySelector('form[action*="login"]') ||
                          document.querySelector('div[class*="signin"]') ||
                          document.querySelector('div[class*="authentication"]');
    
    if (loginContainer) return loginContainer;
    
    return this.createDemoLoginButtons();
  }

  createDemoLoginButtons() {
    if (!this.demoElements.loginButtons) {
      this.demoElements.loginButtons = document.createElement('div');
      this.demoElements.loginButtons.innerHTML = `
        <div style="padding: 15px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <button class="demo-element" style="padding: 8px 16px; margin: 5px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">Login</button>
          <button class="demo-element" style="padding: 8px 16px; margin: 5px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">Register</button>
        </div>
      `;
      this.demoElements.loginButtons.style.cssText = `
        position: fixed;
        top: 60px;
        right: 100px;
        z-index: 9999999;
      `;
      this.demoElements.loginButtons.classList.add('demo-element');
      document.body.appendChild(this.demoElements.loginButtons);
    }
    return this.demoElements.loginButtons;
  }

  findSummaryContainer() {
    const summaryPopup = document.querySelector('#summary-popup');
    if (summaryPopup) {
      const categoryContainer = summaryPopup.querySelector('.summary-content');
      if (categoryContainer) {
        const bubbleContainer = categoryContainer.querySelector('div[style*="display: flex"][style*="flex-wrap: wrap"]');
        if (bubbleContainer) {
          return bubbleContainer;
        }
        return categoryContainer;
      }
      
      const contentArea = summaryPopup.querySelector('div:not(button):not(h2)');
      if (contentArea) {
        return contentArea;
      }
      
      return summaryPopup;
    }
    
    return this.createDemoSummaryContainer();
  }

  createDemoSummaryContainer() {
    if (!this.demoElements.summaryContainer) {
      this.demoElements.summaryContainer = document.createElement('div');
      this.demoElements.summaryContainer.innerHTML = `
        <div style="padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 400px;">
          <h3 style="margin: 0 0 15px 0; color: #1976d2;">Privacy Summary</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            <div style="background: linear-gradient(135deg, #b71c1c, #d32f2f); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px;">Personal Data</div>
            <div style="background: linear-gradient(135deg, #f57c00, #fb8c00); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px;">Data Sharing</div>
            <div style="background: linear-gradient(135deg, #388e3c, #4caf50); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px;">User Rights</div>
          </div>
        </div>
      `;
      this.demoElements.summaryContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999999;
      `;
      this.demoElements.summaryContainer.classList.add('demo-element');
      document.body.appendChild(this.demoElements.summaryContainer);
    }
    return this.demoElements.summaryContainer;
  }

  findFilterButtons() {
    const summaryPopup = document.querySelector('#summary-popup');
    if (summaryPopup) {
      const categoryContainers = summaryPopup.querySelectorAll('.summary-content');
      
      for (const container of categoryContainers) {
        const bubbleContainer = container.querySelector('div[style*="display: flex"][style*="flex-wrap: wrap"]');
        if (bubbleContainer) {
          const bubbles = bubbleContainer.querySelectorAll('div[style*="border-radius: 25px"]');
          if (bubbles.length > 0) {
            const colorLegend = summaryPopup.querySelector('div[style*="linear-gradient(135deg, #f1f7fe, #f8f9fa)"]');
            if (colorLegend) {
              const segmentedBar = colorLegend.querySelector('div[style*="display: flex"][style*="gap: 2px"]');
              if (segmentedBar) return segmentedBar;
              return colorLegend;
            }
            break;
          }
        }
      }
      
      const colorSegment = summaryPopup.querySelector('.color-segment');
      const numberLabel = summaryPopup.querySelector('.number-label');
      
      if (colorSegment) return colorSegment.parentElement;
      if (numberLabel) return numberLabel.parentElement;
    }
    
    return this.createDemoFilterButtons();
  }

  createDemoFilterButtons() {
    if (!this.demoElements.filterButtons) {
      this.demoElements.filterButtons = document.createElement('div');
      this.demoElements.filterButtons.innerHTML = `
        <div style="display: flex; gap: 5px; padding: 10px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="width: 30px; height: 20px; background: linear-gradient(135deg, #b71c1c, #d32f2f); border-radius: 4px; cursor: pointer;"></div>
          <div style="width: 30px; height: 20px; background: linear-gradient(135deg, #f57c00, #fb8c00); border-radius: 4px; cursor: pointer;"></div>
          <div style="width: 30px; height: 20px; background: linear-gradient(135deg, #ffc107, #ffeb3b); border-radius: 4px; cursor: pointer;"></div>
        </div>
      `;
      this.demoElements.filterButtons.style.cssText = `
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999999;
      `;
      this.demoElements.filterButtons.classList.add('demo-element');
      document.body.appendChild(this.demoElements.filterButtons);
    }
    return this.demoElements.filterButtons;
  }

  findSummaryItem() {
    const summaryPopup = document.querySelector('#summary-popup');
    if (summaryPopup) {
      const categoryContainers = summaryPopup.querySelectorAll('.summary-content');
      
      for (const container of categoryContainers) {
        const bubbles = container.querySelectorAll('div[style*="border-radius: 25px"]');
        if (bubbles.length > 0) {
          return bubbles[0];
        }
      }
    }
    
    const summaryItems = document.querySelectorAll('div[style*="border-radius: 25px"]');
    if (summaryItems.length > 0) {
      return summaryItems[0];
    }
    
    return this.createDemoSummaryItem();
  }

  createDemoSummaryItem() {
    if (!this.demoElements.summaryItem) {
      this.demoElements.summaryItem = document.createElement('div');
      this.demoElements.summaryItem.textContent = 'Data Collection';
      this.demoElements.summaryItem.style.cssText = `
        position: fixed;
        top: 40%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #1976d2, #2196f3);
        color: white;
        padding: 10px 18px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 3px 8px rgba(33, 150, 243, 0.3);
        z-index: 9999999;
      `;
      this.demoElements.summaryItem.classList.add('demo-element');
      document.body.appendChild(this.demoElements.summaryItem);
    }
    return this.demoElements.summaryItem;
  }

  findChatButton() {
    const chatButton = document.querySelector('.privacy-chat-button') ||
                      document.querySelector('.chat-button');
    
    if (chatButton) return chatButton;
    
    return this.createDemoChatButton();
  }

  createDemoChatButton() {
    if (!this.demoElements.chatButton) {
      this.demoElements.chatButton = document.createElement('div');
      this.demoElements.chatButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#ffffff">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h2v3c0 .55.45 1 1 1c.25 0 .5-.1.7-.29l3.7-3.71H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
        </svg>
      `;
      this.demoElements.chatButton.style.cssText = `
        position: fixed;
        top: 20%;
        right: 80px;
        width: 36px;
        height: 36px;
        cursor: pointer;
        border-radius: 50%;
        background: linear-gradient(135deg, #1976d2, #2196f3);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
        z-index: 9999999;
      `;
      this.demoElements.chatButton.classList.add('demo-element');
      document.body.appendChild(this.demoElements.chatButton);
    }
    return this.demoElements.chatButton;
  }

  findProfileButton() {
    const profileButton = document.querySelector('.privacy-profile-button');
    
    if (profileButton) return profileButton;
    
    return this.createDemoProfileButton();
  }

  createDemoProfileButton() {
    if (!this.demoElements.profileButton) {
      this.demoElements.profileButton = document.createElement('div');
      this.demoElements.profileButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#ffffff">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      `;
      this.demoElements.profileButton.style.cssText = `
        position: fixed;
        top: 30%;
        right: 140px;
        width: 36px;
        height: 36px;
        cursor: pointer;
        border-radius: 50%;
        background: linear-gradient(135deg, #1976d2, #2196f3);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
        z-index: 9999999;
      `;
      this.demoElements.profileButton.classList.add('demo-element');
      document.body.appendChild(this.demoElements.profileButton);
    }
    return this.demoElements.profileButton;
  }

  async simulateExtensionClick() {
    return new Promise((resolve) => {
      // Set operation state immediately
      this.currentOperation = 'extensionClick';
      
      // Since we can't directly trigger the browser's extension popup, we create a demo popup
      this.createDemoExtensionPopup();
      
      // Wait for popup to appear and then move spotlight
      setTimeout(() => {
        const extensionPopup = this.findExtensionPopup();
        if (extensionPopup) {
          this.createSoftSpotlight(extensionPopup);
          // Create temporary step configuration for positioning
          const tempStepConfig = {
            position: 'left',
            title: "Extension Icon"
          };
          this.positionBubble(tempStepConfig, extensionPopup);
        }
        resolve();
      }, 800);
    });
  }

  async simulatePrivacyLinkHover() {
    return new Promise((resolve) => {
      const link = this.findPrivacyLink();
      if (link) {
        // Store original styles before modifying
        if (!link.dataset.originalTransform) {
          link.dataset.originalTransform = link.style.transform || '';
        }
        if (!link.dataset.originalBoxShadow) {
          link.dataset.originalBoxShadow = link.style.boxShadow || '';
        }
        
        // Simulate hover effect with visual feedback
        link.style.transform = 'scale(1.05)';
        link.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
        
        // Trigger hover event
        const event = new MouseEvent('mouseover', { bubbles: true });
        link.dispatchEvent(event);
        
        // Create and show floating icon only if not already present
        if (!this.demoElements.floatingIcon && !document.querySelector('.privacy-summary-icon')) {
          this.createDemoFloatingIcon();
        }
        
        // Protect demo floating icon from being removed by user mouse movements
        if (this.demoElements.floatingIcon) {
          // Add protection flag
          this.demoElements.floatingIcon.dataset.tourProtected = 'true';
          
          // Override any existing mouse event handlers that might hide the icon
          const originalStyle = this.demoElements.floatingIcon.style.cssText;
          
          // Create a protected version that resists style changes
          const protectIcon = () => {
            if (this.demoElements.floatingIcon && this.demoElements.floatingIcon.dataset.tourProtected === 'true') {
              this.demoElements.floatingIcon.style.cssText = originalStyle;
              this.demoElements.floatingIcon.style.display = 'flex';
              this.demoElements.floatingIcon.style.visibility = 'visible';
              this.demoElements.floatingIcon.style.opacity = '1';
            }
          };
          
          // Set up protection interval
          this.iconProtectionInterval = setInterval(protectIcon, 100);
        }
        
        this.currentOperation = 'privacyLinkHover';
        
        setTimeout(() => {
          resolve();
        }, 1000);
      } else {
        resolve();
      }
    });
  }

  async simulateIconClick() {
    return new Promise((resolve) => {
      const icon = this.findFloatingIcon();
      
      if (icon) {
        // Store original styles before modifying
        if (!icon.dataset.originalTransform) {
          icon.dataset.originalTransform = icon.style.transform || '';
        }
        if (!icon.dataset.originalBoxShadow) {
          icon.dataset.originalBoxShadow = icon.style.boxShadow || '';
        }
        
        // Set timeout protection to prevent hanging
        const timeoutId = setTimeout(() => {
          this.currentOperation = 'iconClick';
          resolve();
        }, 10000);
        
        // Simulate click with visual feedback
        icon.style.transform = 'scale(0.95)';
        setTimeout(() => {
          icon.style.transform = 'scale(1.1)';
          
          try {
            // Simulate click event with error handling
            const event = new MouseEvent('click', { bubbles: true });
            icon.dispatchEvent(event);
            
            this.currentOperation = 'iconClick';
            
            // Clear timeout since operation completed
            clearTimeout(timeoutId);
            
            // Add additional delay before resolving to allow for backend processing
            setTimeout(() => {
              resolve();
            }, 1000);
            
          } catch (error) {
            console.error('Error during simulateIconClick:', error);
            clearTimeout(timeoutId);
            this.currentOperation = 'iconClick';
            resolve();
          }
        }, 200);
      } else {
        resolve();
      }
    });
  }

  async demonstrateBubbleExpansion() {
    return new Promise((resolve) => {
      const summaryItem = this.findSummaryItem();
      if (summaryItem) {
        // Store original position for restoration
        const originalTransform = summaryItem.style.transform;
        const originalBoxShadow = summaryItem.style.boxShadow;
        
        // Ensure smooth transitions
        summaryItem.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Force initial state and apply animation
        requestAnimationFrame(() => {
          summaryItem.style.transform = originalTransform || 'scale(1)';
          summaryItem.style.boxShadow = originalBoxShadow || '0 3px 8px rgba(33, 150, 243, 0.3)';
          
          // Apply visual feedback with delay
          requestAnimationFrame(() => {
            summaryItem.style.transform = 'translateY(-5px) scale(1.1)';
            summaryItem.style.boxShadow = '0 8px 20px rgba(33, 150, 243, 0.5)';
          });
        });
        
        // Try to click real summary items
        const realBubbles = document.querySelectorAll('div[style*="border-radius: 25px"]');
        if (realBubbles.length > 0) {
          setTimeout(() => {
            realBubbles[0].click();
            this.currentOperation = 'bubbleExpansion';
            
            // Wait for expanded view and move spotlight to it
            setTimeout(() => {
              const expandedSummary = document.querySelector('.expanded-summary') ||
                                   document.querySelector('[class*="expanded"]') ||
                                   document.querySelector('[id*="detail"]');
              
              if (expandedSummary) {
                this.createSoftSpotlight(expandedSummary);
                // Create temporary step configuration for positioning
                const tempStepConfig = {
                  position: 'right',
                  title: "Expand for Details"
                };
                this.positionBubble(tempStepConfig, expandedSummary);
                
                // Universal monitoring system will handle dynamic updates automatically
              }
              
              resolve();
            }, 500);
          }, 500);
        } else {
          resolve();
        }
        
        // Store original values for restoration
        summaryItem.dataset.originalTransform = originalTransform;
        summaryItem.dataset.originalBoxShadow = originalBoxShadow;
        
        // Reset animation with smooth transition
        setTimeout(() => {
          summaryItem.style.transform = originalTransform || 'scale(1)';
          summaryItem.style.boxShadow = originalBoxShadow || '0 3px 8px rgba(33, 150, 243, 0.3)';
          
          // Remove transition after animation
          setTimeout(() => {
            summaryItem.style.transition = '';
          }, 300);
        }, 1200);
      } else {
        resolve();
      }
    });
  }

  async demonstrateFiltering() {
    return new Promise(async (resolve) => {
      // First, close any expanded bubble summary from step 6
      const expandedSummary = document.querySelector('.expanded-summary');
      if (expandedSummary) {
        const closeBtn = expandedSummary.querySelector('.close-btn') ||
                        expandedSummary.querySelector('button');
        if (closeBtn) {
          closeBtn.click();
          // Wait for close animation
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      const filterElement = this.findFilterButtons();
      if (filterElement) {
        // Ensure smooth transitions
        filterElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Force initial state
        requestAnimationFrame(() => {
          filterElement.style.transform = 'scale(1)';
          filterElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          
          // Apply visual feedback with delay
          requestAnimationFrame(() => {
            filterElement.style.transform = 'scale(1.05)';
            filterElement.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
          });
        });
        
        // Find and click actual filter buttons
        const colorSegments = document.querySelectorAll('.color-segment');
        const numberLabels = document.querySelectorAll('.number-label');
        
        if (colorSegments.length > 0) {
          // Click the first color segment
          setTimeout(() => {
            colorSegments[0].click();
            this.currentOperation = 'filtering';
            
            // Wait for filtering to complete, then move spotlight and bubble
            setTimeout(() => {
              const summaryContainer = this.findFilteredContainer();
              if (summaryContainer) {
                this.createSoftSpotlight(summaryContainer);
                // Create temporary step configuration for positioning
                const tempStepConfig = {
                  position: 'left',
                  title: "Filter Options"
                };
                this.positionBubble(tempStepConfig, summaryContainer);
              } else {
                // If no container with bubbles found, show "no results" message area
                const noResultsMsg = document.querySelector('[class*="no-result"], [class*="empty"], .summary-content');
                if (noResultsMsg) {
                  this.createSoftSpotlight(noResultsMsg);
                  // Create temporary step configuration for positioning
                  const tempStepConfig = {
                    position: 'left',
                    title: "Filter Options"
                  };
                  this.positionBubble(tempStepConfig, noResultsMsg);
                }
              }
              resolve();
            }, 800); // Increased delay for filtering animation
          }, 500);
        } else if (numberLabels.length > 0) {
          // Click the first number label
          setTimeout(() => {
            numberLabels[0].click();
            this.currentOperation = 'filtering';
            resolve();
          }, 500);
        } else {
          resolve();
        }
        
        // Reset visual feedback with smooth transition
        setTimeout(() => {
          filterElement.style.transform = 'scale(1)';
          filterElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          
          // Remove transition after animation
          setTimeout(() => {
            filterElement.style.transition = '';
          }, 300);
        }, 1000);
      } else {
        resolve();
      }
    });
  }

  // Find container with bubbles after filtering
  findFilteredContainer() {
    const summaryPopup = document.querySelector('#summary-popup');
    if (summaryPopup) {
      const categoryContainers = summaryPopup.querySelectorAll('.summary-content');
      
      for (const container of categoryContainers) {
        const bubbleContainer = container.querySelector('div[style*="display: flex"][style*="flex-wrap: wrap"]');
        if (bubbleContainer) {
          const visibleBubbles = Array.from(bubbleContainer.querySelectorAll('div[style*="border-radius: 25px"]'))
            .filter(bubble => {
              const style = window.getComputedStyle(bubble);
              return style.display !== 'none' && parseFloat(style.opacity) > 0;
            });
          
          if (visibleBubbles.length > 0) {
            return bubbleContainer;
          }
        }
      }
    }
    
    return null;
  }

  async demonstrateChat() {
    return new Promise((resolve) => {
      const chatButton = this.findChatButton();
      if (chatButton) {
        // Ensure smooth transitions
        chatButton.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Force initial state and apply animation
        requestAnimationFrame(() => {
          chatButton.style.transform = 'scale(1) rotate(0deg)';
          chatButton.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
          
          // Apply visual feedback with delay
          requestAnimationFrame(() => {
            chatButton.style.transform = 'scale(1.2) rotate(10deg)';
            chatButton.style.boxShadow = '0 8px 20px rgba(25, 118, 210, 0.5)';
          });
        });
        
        // Try to click real chat button
        const realChatButton = document.querySelector('.privacy-chat-button') ||
                              document.querySelector('.chat-button') ||
                              document.querySelector('[class*="chat"]button') ||
                              chatButton;
        
        if (realChatButton) {
          setTimeout(() => {
            realChatButton.click();
            this.currentOperation = 'chat';
            
            // Continuously check for chat window appearance
            let attempts = 0;
            const checkChatWindow = () => {
              const chatWindow = document.querySelector('#privacy-chat-window') || 
                               document.querySelector('#chat-window') || 
                               document.querySelector('.chat-container') ||
                               document.querySelector('.chat-popup') ||
                               document.querySelector('[class*="chat"][class*="window"]') ||
                               document.querySelector('[class*="chat"][class*="popup"]') ||
                               document.querySelector('[class*="chat"][class*="modal"]') ||
                               document.querySelector('[id*="chat"][id*="window"]') ||
                               document.querySelector('[id*="chat"][id*="popup"]');
              
              if (chatWindow && attempts < 15) {
                // Chat window found, move spotlight and bubble
                this.createSoftSpotlight(chatWindow);
                // Create temporary step configuration for positioning
                const tempStepConfig = {
                  position: 'left',
                  title: "Chat Feature"
                };
                this.positionBubble(tempStepConfig, chatWindow);
                
                // Universal monitoring system will handle dynamic updates automatically
                
                resolve();
              } else if (attempts < 15) {
                attempts++;
                setTimeout(checkChatWindow, 500);
              } else {
                // Timeout, resolve anyway
                resolve();
              }
            };
            
            // Start checking after a short delay
            setTimeout(checkChatWindow, 800);
          }, 500);
        } else {
          resolve();
        }
        
        // Reset after animation with smooth transition
        setTimeout(() => {
          chatButton.style.transform = 'scale(1) rotate(0deg)';
          chatButton.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
          
          // Remove transition after animation
          setTimeout(() => {
            chatButton.style.transition = '';
          }, 400);
        }, 1000);
      } else {
        resolve();
      }
    });
  }

  async demonstrateProfile() {
    return new Promise((resolve) => {
      const profileButton = this.findProfileButton();
      if (profileButton) {
        // Set current operation immediately to ensure correct positioning
        this.currentOperation = 'profile';
        
        // Step 1: First highlight the profile button with spotlight and bubble
        this.createSoftSpotlight(profileButton);
        // Create temporary step configuration for positioning - always right side
        const tempStepConfig = {
          position: 'right',
          title: "User Profile"
        };
        this.positionBubble(tempStepConfig, profileButton);
        
        // Ensure smooth transitions
        profileButton.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Force initial state and apply animation
        requestAnimationFrame(() => {
          profileButton.style.transform = 'scale(1)';
          profileButton.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
          
          // Apply visual feedback with delay
          requestAnimationFrame(() => {
            profileButton.style.transform = 'scale(1.2)';
            profileButton.style.boxShadow = '0 8px 20px rgba(25, 118, 210, 0.5)';
          });
        });
        
        // Step 2: Wait for user to see the button, then click it
        const realProfileButton = document.querySelector('.privacy-profile-button') ||
                                document.querySelector('.profile-button') ||
                                document.querySelector('[class*="profile"]button') ||
                                document.querySelector('#profile-btn') ||
                                document.querySelector('[title*="profile"]') ||
                                profileButton;
        
        setTimeout(() => {
          console.log('Attempting to click profile button:', realProfileButton);
          if (realProfileButton) {
            realProfileButton.click();
            
            // Step 3: Check for profile popup/page and move spotlight
            let attempts = 0;
            const checkProfilePopup = () => {
              console.log(`Checking for profile popup, attempt ${attempts + 1}`);
              const profilePopup = document.querySelector('#profile-popup') || 
                                 document.querySelector('.profile-container') ||
                                 document.querySelector('.privacy-profile-popup') ||
                                 document.querySelector('.profile-popup') ||
                                 document.querySelector('.profile-modal') ||
                                 document.querySelector('[class*="profile"][class*="popup"]') ||
                                 document.querySelector('[class*="profile"][class*="modal"]') ||
                                 document.querySelector('[class*="profile"][class*="window"]') ||
                                 document.querySelector('[id*="profile"][id*="popup"]');
              
              console.log('Found profile popup:', profilePopup);
              
              if (profilePopup && attempts < 20) {
                // Profile popup found, move spotlight and bubble immediately
                console.log('Moving spotlight to profile popup');
                this.createSoftSpotlight(profilePopup);
                // Position bubble on right side pointing left to popup
                const tempStepConfig = {
                  position: 'right',
                  title: "User Profile"
                };
                this.positionBubble(tempStepConfig, profilePopup);
                                
                resolve();
              } else if (attempts < 20) {
                attempts++;
                setTimeout(checkProfilePopup, 300);
              } else {
                console.log('Profile popup not found, creating demo');
                // No real popup found, create demo
                this.createDemoProfilePopup();
                const demoProfile = this.demoElements.profilePopup;
                if (demoProfile) {
                  this.createSoftSpotlight(demoProfile);
                  // Position bubble on right side pointing left to demo popup
                  const tempStepConfig = {
                    position: 'right',
                    title: "User Profile"
                  };
                  this.positionBubble(tempStepConfig, demoProfile);
                }
                resolve();
              }
            };
            
            // Start checking immediately after click
            setTimeout(checkProfilePopup, 200);
          } else {
            console.log('No real profile button found, creating demo popup');
            // No real button, create demo popup directly
            this.createDemoProfilePopup();
            const demoProfile = this.demoElements.profilePopup;
            if (demoProfile) {
              this.createSoftSpotlight(demoProfile);
              // Position bubble on right side pointing left to demo popup
              const tempStepConfig = {
                position: 'right',
                title: "User Profile"
              };
              this.positionBubble(tempStepConfig, demoProfile);
            }
            resolve();
          }
        }, 1500);
        
        setTimeout(() => {
          profileButton.style.transform = 'scale(1)';
          profileButton.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
          
          setTimeout(() => {
            profileButton.style.transition = '';
          }, 300);
        }, 1000);
      } else {
        console.log('Profile button not found at all');
        resolve();
      }
    });
  }

  createDemoProfilePopup() {
    if (!this.demoElements.profilePopup) {
      this.demoElements.profilePopup = document.createElement('div');
      this.demoElements.profilePopup.innerHTML = `
        <div style="padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 300px;">
          <h3 style="margin: 0 0 15px 0; color: #1976d2;">User Profile</h3>
          <div style="margin-bottom: 10px;">
            <strong>Email:</strong> user@example.com
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Analysis History:</strong> 5 policies
          </div>
          <button style="padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">Edit Profile</button>
        </div>
      `;
      this.demoElements.profilePopup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999999;
      `;
      this.demoElements.profilePopup.classList.add('demo-element');
      document.body.appendChild(this.demoElements.profilePopup);
    }
    return this.demoElements.profilePopup;
  }

  // Clear all demonstration styles that might be left over
  clearDemonstrationStyles() {
    const privacyLinks = document.querySelectorAll('a[href*="privacy"], a');
    privacyLinks.forEach(link => {
      if (link.dataset.originalTransform !== undefined) {
        link.style.transform = link.dataset.originalTransform || '';
        link.removeAttribute('data-original-transform');
      } else if (link.style.transform) {
        link.style.removeProperty('transform');
      }
      
      if (link.dataset.originalBoxShadow !== undefined) {
        link.style.boxShadow = link.dataset.originalBoxShadow || '';
        link.removeAttribute('data-original-box-shadow');
      } else if (link.style.boxShadow) {
        link.style.removeProperty('box-shadow');
      }
    });
    
    // Clear floating icon styles
    const floatingIcons = document.querySelectorAll('.privacy-summary-icon, .demo-floating-icon');
    floatingIcons.forEach(icon => {
      if (icon.dataset.originalTransform !== undefined) {
        icon.style.transform = icon.dataset.originalTransform || '';
        icon.removeAttribute('data-original-transform');
      } else if (icon.style.transform && icon.style.transform !== 'scale(1)') {
        icon.style.removeProperty('transform');
      }
      
      if (icon.dataset.originalBoxShadow !== undefined) {
        icon.style.boxShadow = icon.dataset.originalBoxShadow || '';
        icon.removeAttribute('data-original-box-shadow');
      } else if (icon.style.boxShadow) {
        icon.style.removeProperty('box-shadow');
      }
    });
    
    // Clear chat button styles (preserve natural styles, only remove animations)
    const chatButtons = document.querySelectorAll('.privacy-chat-button, .chat-button');
    chatButtons.forEach(button => {
      if (button.style.transform && button.style.transform !== 'scale(1)') {
        button.style.transform = 'scale(1)';
      }
      if (button.style.boxShadow && button.style.boxShadow.includes('rgba(25, 118, 210, 0.5)')) {
        button.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
      }
      if (button.style.transition && button.style.transition.includes('cubic-bezier')) {
        setTimeout(() => button.style.removeProperty('transition'), 100);
      }
    });
    
    // Clear profile button styles (preserve natural styles, only remove animations)
    const profileButtons = document.querySelectorAll('.privacy-profile-button, .profile-button');
    profileButtons.forEach(button => {
      if (button.style.transform && button.style.transform !== 'scale(1)') {
        button.style.transform = 'scale(1)';
      }
      if (button.style.boxShadow && button.style.boxShadow.includes('rgba(25, 118, 210, 0.5)')) {
        button.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
      }
      if (button.style.transition && button.style.transition.includes('cubic-bezier')) {
        setTimeout(() => button.style.removeProperty('transition'), 100);
      }
    });
    
    // Clear filter element styles (preserve natural styles, only remove animations)
    const filterElements = document.querySelectorAll('.color-segment, .number-label');
    filterElements.forEach(element => {
      if (element.style.transform && element.style.transform !== 'scale(1)') {
        element.style.transform = 'scale(1)';
      }
      if (element.style.boxShadow && element.style.boxShadow.includes('rgba(25, 118, 210, 0.4)')) {
        element.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }
      if (element.style.transition && element.style.transition.includes('cubic-bezier')) {
        setTimeout(() => element.style.removeProperty('transition'), 100);
      }
    });
    
    // Clear summary item styles
    const summaryItems = document.querySelectorAll('div[style*="border-radius: 25px"]');
    summaryItems.forEach(item => {
      if (item.dataset.originalTransform !== undefined) {
        item.style.transform = item.dataset.originalTransform || '';
        item.removeAttribute('data-original-transform');
      }
      if (item.dataset.originalBoxShadow !== undefined) {
        item.style.boxShadow = item.dataset.originalBoxShadow || '';
        item.removeAttribute('data-original-box-shadow');
      }
    });
    
    // Clear demo element styles (preserve natural styles, only remove animations)
    Object.values(this.demoElements).forEach(element => {
      if (element && element.style) {
        if (element.style.transform && element.style.transform !== 'scale(1)') {
          element.style.transition = 'all 0.2s ease';
          element.style.transform = 'scale(1)';
          
          setTimeout(() => {
            element.style.removeProperty('transition');
          }, 200);
        }
        if (element.style.boxShadow && element.style.boxShadow.includes('rgba(25, 118, 210, 0.5)')) {
          element.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
        }
      }
    });
  }
}

// Initialize guided tour system
let guidedTour = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  guidedTour = new GuidedTour();
  
  // Make it globally accessible
  window.guidedTour = guidedTour;
  
  // Check if this is first install and auto-start tour
  guidedTour.checkFirstInstall().then((isFirstInstall) => {
    if (isFirstInstall) {
      setTimeout(() => {
        guidedTour.startTour();
      }, 2000);
    }
  });
});

// Listen for messages from popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startGuidedTour') {
      if (!guidedTour) {
        guidedTour = new GuidedTour();
        window.guidedTour = guidedTour;
      }
      guidedTour.startTour();
      sendResponse({ success: true });
    }
  });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GuidedTour;
} 