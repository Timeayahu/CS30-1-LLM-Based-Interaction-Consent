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
    this.keyboardListener = null;
    this.isUpdatingPosition = false;
    this.dynamicMonitoringInterval = null;
    this.resizeTimeout = null;
    
    // Steps for logged-in users
    this.loggedInSteps = [
      {
        title: "Welcome to Privacy Policy Assistant!",
        content: "Let's take a quick tour to show you how this tool helps you understand privacy policies easily.",
        target: null,
        position: "center",
        autoAction: null,
        duration: 3000
      },
      {
        title: "Extension Icon",
        content: "This is your Privacy Policy Assistant extension icon. Click it to access settings and features.",
        target: () => this.findExtensionPopup(),
        position: "left",
        autoAction: () => this.simulateExtensionClick(),
        duration: 5000
      },
      {
        title: "Finding Privacy Links",
        content: "Hover over privacy policy links on any website - our <span style='color: #2196f3; font-weight: bold;'>blue icon</span> will appear next to them.",
        target: () => this.findPrivacyLink(),
        position: "auto",
        autoAction: () => this.simulatePrivacyLinkHover(),
        duration: 5000
      },
      {
        title: "Click to Analyze",
        content: "Click the <span style='color: #2196f3; font-weight: bold;'>blue floating icon 📝</span> to start analyzing. AI will read and summarize the policy for you.",
        target: () => this.findFloatingIcon(),
        position: "top",
        autoAction: () => this.simulateIconClick(),
        duration: 4000
      },
      {
        title: "Summary Bubbles",
        content: "Summary appears as colored bubbles by importance: <span style='background: #d32f2f; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;'>Critical</span> <span style='background: #f57c00; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;'>Important</span> <span style='background: #fbc02d; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;'>Medium</span> <span style='background: #689f38; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;'>Low</span> <span style='background: #388e3c; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;'>Very Low</span>",
        target: () => this.findSummaryContainer(),
        position: "left",
        autoAction: null,
        duration: 5000
      },
      {
        title: "Expand for Details",
        content: "Click any bubble to expand it. Use <span style='color: #1976d2; font-weight: bold;'>'View Original Text'</span> to see source or <span style='color: #1976d2; font-weight: bold;'>'Detail Explanation'</span> for AI chat.",
        target: () => this.findSummaryItem(),
        position: "right",
        autoAction: () => this.demonstrateBubbleExpansion(),
        duration: 4000
      },
      {
        title: "Filter Options",
        content: "Use these <span style='color: #1976d2; font-weight: bold;'>color filters</span> to show only the importance levels you care about.",
        target: () => this.findFilterButtons(),
        position: "left",
        autoAction: () => this.demonstrateFiltering(),
        duration: 4000
      },
      {
        title: "Chat Feature",
        content: "Use the <span style='color: #1976d2; font-weight: bold;'>chat button</span> to ask specific questions about the privacy policy. AI provides personalized answers.",
        target: () => this.findChatButton(),
        position: "left",
        autoAction: () => this.demonstrateChat(),
        duration: 4000,
        skipCondition: () => this.shouldSkipChatStep()
      },
      {
        title: "User Profile",
        content: "Access your <span style='color: #1976d2; font-weight: bold;'>profile</span> to manage account settings.",
        target: () => this.findProfileButton(),
        position: "left",
        autoAction: () => this.demonstrateProfile(),
        duration: 3000
      },
      {
        title: "Tour Complete!",
        content: "You're all set! Start exploring privacy policies with confidence. Restart this tour anytime from the extension menu.",
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
        content: "Let's take a quick tour to show you how this tool helps you understand privacy policies easily.",
        target: null,
        position: "center",
        autoAction: null,
        duration: 3000
      },
      {
        title: "Extension Icon",
        content: "This is your Privacy Policy Assistant extension icon. Click it to access settings and features.",
        target: () => this.findExtensionPopup(),
        position: "left",
        autoAction: () => this.simulateExtensionClick(),
        duration: 5000
      },
      {
        title: "Finding Privacy Links",
        content: "Hover over privacy policy links on any website - our <span style='color: #2196f3; font-weight: bold;'>blue icon</span> will appear next to them.",
        target: () => this.findPrivacyLink(),
        position: "auto",
        autoAction: () => this.simulatePrivacyLinkHover(),
        duration: 5000
      },
      {
        title: "Login Required",
        content: "To analyze privacy policies, you need to be logged in. Click the <span style='color: #2196f3; font-weight: bold;'>blue floating icon 📝</span> to start login.",
        target: () => this.findFloatingIcon(),
        position: "top",
        autoAction: () => this.highlightLoginPage(),
        duration: 4000
      },
      {
        title: "Login or Register",
        content: "Choose <span style='color: #1976d2; font-weight: bold;'>'Login'</span> if you have an account, or <span style='color: #1976d2; font-weight: bold;'>'Register'</span> to create one. After login, we'll continue with analysis features.",
        target: () => this.findLoginPage(),
        position: "left",
        autoAction: null,
        duration: 5000,
        pauseForLogin: true
      },
      {
        title: "Summary Bubbles",
        content: "Now logged in! Summary appears as colored bubbles by importance: <span style='background: #d32f2f; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;'>Critical</span> <span style='background: #f57c00; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;'>Important</span> <span style='background: #fbc02d; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;'>Medium</span> <span style='background: #689f38; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;'>Low</span> <span style='background: #388e3c; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;'>Very Low</span>",
        target: () => this.findSummaryContainer(),
        position: "left",
        autoAction: null,
        duration: 5000
      },
      {
        title: "Expand for Details",
        content: "Click any bubble to expand it. Use <span style='color: #1976d2; font-weight: bold;'>'View Original Text'</span> to see source or <span style='color: #1976d2; font-weight: bold;'>'Detail Explanation'</span> for AI chat.",
        target: () => this.findSummaryItem(),
        position: "right",
        autoAction: () => this.demonstrateBubbleExpansion(),
        duration: 4000
      },
      {
        title: "Filter Options",
        content: "Use these <span style='color: #1976d2; font-weight: bold;'>color filters</span> to show only the importance levels you care about.",
        target: () => this.findFilterButtons(),
        position: "left",
        autoAction: () => this.demonstrateFiltering(),
        duration: 4000
      },
      {
        title: "Chat Feature",
        content: "Use the <span style='color: #1976d2; font-weight: bold;'>chat button</span> to ask specific questions about the privacy policy. AI provides personalized answers.",
        target: () => this.findChatButton(),
        position: "left",
        autoAction: () => this.demonstrateChat(),
        duration: 4000,
        skipCondition: () => this.shouldSkipChatStep()
      },
      {
        title: "User Profile",
        content: "Access your <span style='color: #1976d2; font-weight: bold;'>profile</span> to manage account settings.",
        target: () => this.findProfileButton(),
        position: "left",
        autoAction: () => this.demonstrateProfile(),
        duration: 3000
      },
      {
        title: "Tour Complete!",
        content: "You're all set! Start exploring privacy policies with confidence. Restart this tour anytime from the extension menu.",
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

  // Detect if we're on a Single Page Application (SPA) that might conflict
  detectSPAFramework() {
    const indicators = {
      react: window.React || document.querySelector('[data-reactroot]') || document.querySelector('#root') || 
             document.querySelector('[id*="react"]') || document.querySelector('[class*="react"]'),
      angular: window.angular || window.ng || document.querySelector('[ng-app]') || 
               document.querySelector('[data-ng-app]') || document.querySelector('app-root'),
      vue: window.Vue || document.querySelector('[id*="vue"]') || document.querySelector('[class*="vue"]') ||
           document.querySelector('div[data-v-]'),
      ember: window.Ember || document.querySelector('[class*="ember"]'),
      svelte: document.querySelector('[class*="svelte"]')
    };
    
    const detectedFrameworks = Object.keys(indicators).filter(framework => indicators[framework]);
    
    if (detectedFrameworks.length > 0) {
      console.log('Detected SPA frameworks:', detectedFrameworks);
      return detectedFrameworks;
    }
    
    return [];
  }

  // Enhanced start tour with SPA detection
  async startTour() {
    if (this.isActive) return;
    
    // Detect SPA frameworks
    const frameworks = this.detectSPAFramework();
    this.isSPA = frameworks.length > 0;
    
    if (this.isSPA) {
      console.log('SPA detected, using enhanced monitoring');
      // Increase monitoring intervals for SPA sites
      this.monitoringInterval = 500;
      this.resizeDebounce = 200;
    } else {
      this.monitoringInterval = 300;
      this.resizeDebounce = 150;
    }
    
    this.isLoggedIn = await this.checkLoginStatus();
    
    if (this.isLoggedIn) {
      this.steps = [...this.loggedInSteps];
      console.log('Starting tour for logged-in user');
    } else {
      this.steps = [...this.loggedOutSteps];
      console.log('Starting tour for logged-out user');
    }
    
    this.resetStepsToOriginal();
    
    const existingSummary = document.querySelector('#summary-popup');
    if (existingSummary) {
      const closeBtn = existingSummary.querySelector('button');
      if (closeBtn && (closeBtn.textContent === 'Close' || closeBtn.textContent === '✕')) {
        closeBtn.click();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    this.isActive = true;
    this.currentStep = 0;
    this.isOperationInProgress = false;
    this.loginRequired = false;
    this.tourPaused = false;
    this.isUpdatingPosition = false;
    
    this.createOverlay();
    this.createBubble();
    this.addResizeListener();
    this.addErrorDetection();
    
    setTimeout(() => {
      this.showStep(0);
    }, 100);
    
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
      if (this.isActive && !this.tourPaused && this.bubble && !this.isUpdatingPosition) {
        clearTimeout(this.resizeTimeout);
        // Use different debounce times for SPA vs regular sites
        const debounceTime = this.isSPA ? 200 : 150;
        this.resizeTimeout = setTimeout(() => {
          if (this.isActive && !this.tourPaused && !this.isUpdatingPosition) {
            this.updateCurrentStepPositioning();
          }
        }, debounceTime);
      }
    };
    
    // Add passive listeners for better performance
    window.addEventListener('resize', this.resizeListener, { passive: true });
    window.addEventListener('scroll', this.resizeListener, { passive: true });
    
    // Add SPA-specific route change detection
    if (this.isSPA) {
      this.routeChangeObserver = new MutationObserver((mutations) => {
        if (!this.isActive || this.tourPaused) return;
        
        let hasRouteChange = false;
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE && 
                  (node.querySelector('[class*="route"]') || 
                   node.querySelector('[class*="page"]') ||
                   node.id && node.id.includes('app'))) {
                hasRouteChange = true;
              }
            });
          }
        });
        
        if (hasRouteChange) {
          this.handleSPARouteChange();
        }
      });
      
      this.routeChangeObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // Universal step positioning update system
  updateCurrentStepPositioning() {
    if (!this.isActive || this.tourPaused || this.isUpdatingPosition) return;
    
    this.isUpdatingPosition = true;
    
    try {
      const step = this.steps[this.currentStep];
      if (!step) {
        this.isUpdatingPosition = false;
        return;
      }

      let targetElement = null;
      let position = step.position;
      let needsSpotlightUpdate = true;

      // Get current target based on step and operation state
      switch (step.title) {
        case "Extension Icon":
          if (this.currentOperation === 'extensionClick') {
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
            const authPopup = document.querySelector('#auth-popup');
            if (authPopup) {
              targetElement = authPopup;
              position = 'left';
            }
          } else {
            const privacyLink = this.findPrivacyLink();
            if (privacyLink) {
              if (!this.demoElements.floatingIcon) {
                this.createDemoFloatingIcon(privacyLink);
              }
              const floatingIcon = this.demoElements.floatingIcon;
              if (floatingIcon) {
                targetElement = floatingIcon;
                position = 'top';
              } else {
                targetElement = privacyLink;
                position = 'auto';
              }
            } else {
              targetElement = step.target ? step.target() : null;
            }
          }
          break;
        case "Login or Register":
          if (!this.tourPaused) {
            targetElement = this.findLoginPage();
            position = 'left';
          }
          break;
        case "Click to Analyze":
          if (this.currentOperation === 'iconClick') {
            const summaryPopup = document.querySelector('#summary-popup');
            if (summaryPopup) {
              targetElement = summaryPopup;
              position = 'left';
            } else {
              const demoSummary = this.demoElements.summaryContainer;
              if (demoSummary) {
                targetElement = demoSummary;
                position = 'left';
              }
            }
          } else {
            const privacyLink = this.findPrivacyLink();
            if (privacyLink) {
              if (!this.demoElements.floatingIcon) {
                this.createDemoFloatingIcon(privacyLink);
              }
              const floatingIcon = this.demoElements.floatingIcon;
              if (floatingIcon) {
                targetElement = floatingIcon;
                position = 'top';
              } else {
                targetElement = privacyLink;
                position = 'auto';
              }
            } else {
              targetElement = step.target ? step.target() : null;
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
            const noResultsMsg = document.querySelector('[class*="no-result"], [class*="empty"], .summary-content');
            if (summaryContainer) {
              targetElement = summaryContainer;
              position = 'left';
              needsSpotlightUpdate = false;
            } else if (noResultsMsg) {
              targetElement = noResultsMsg;
              position = 'left';
              needsSpotlightUpdate = false;
            }
          } else {
            targetElement = step.target ? step.target() : null;
          }
          break;

        case "Chat Feature":
          if (this.currentOperation === 'chat') {
            const chatWindow = document.querySelector('#privacy-chat-window') || 
                              document.querySelector('#chat-window') || 
                              document.querySelector('.chat-container') ||
                              document.querySelector('.chat-popup') ||
                              document.querySelector('[class*="chat"][class*="window"]') ||
                              document.querySelector('[class*="chat"][class*="popup"]') ||
                              document.querySelector('[class*="chat"][class*="modal"]') ||
                              document.querySelector('[id*="chat"][id*="window"]') ||
                              document.querySelector('[id*="chat"][id*="popup"]');
            
            if (chatWindow) {
              const rect = chatWindow.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0 && 
                              window.getComputedStyle(chatWindow).opacity !== '0' &&
                              window.getComputedStyle(chatWindow).visibility !== 'hidden';
              
              if (isVisible) {
                targetElement = chatWindow;
              }
            }
            position = 'left';
          } else {
            targetElement = step.target ? step.target() : null;
          }
          break;

        case "User Profile":
          if (this.currentOperation === 'profile') {
            const profilePopup = document.querySelector('#profile-popup') || 
                                document.querySelector('.profile-container') ||
                                document.querySelector('.privacy-profile-popup') ||
                                document.querySelector('.profile-popup') ||
                                document.querySelector('.profile-modal') ||
                                document.querySelector('[class*="profile"][class*="popup"]') ||
                                document.querySelector('[class*="profile"][class*="modal"]') ||
                                document.querySelector('[class*="profile"][class*="window"]') ||
                                document.querySelector('[id*="profile"][id*="popup"]');
            
            if (profilePopup) {
              const rect = profilePopup.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0 && 
                              window.getComputedStyle(profilePopup).opacity !== '0' &&
                              window.getComputedStyle(profilePopup).visibility !== 'hidden';
              
              if (isVisible) {
                targetElement = profilePopup;
              }
            }
            position = 'right';
          } else {
            targetElement = step.target ? step.target() : null;
          }
          break;

        default:
          targetElement = step.target ? step.target() : null;
          break;
      }

      // Update spotlight and bubble position
      if (targetElement && needsSpotlightUpdate) {
        this.createSoftSpotlight(targetElement);
        
        // Use setTimeout instead of requestAnimationFrame to prevent blocking
        setTimeout(() => {
          if (this.isActive && !this.tourPaused && targetElement.isConnected) {
            const tempStepConfig = {
              position: position,
              title: step.title
            };
            this.positionBubble(tempStepConfig, targetElement);
          }
          this.isUpdatingPosition = false;
        }, 50);
      } else {
        // Handle center positioning or no target
        if (step.position === 'center') {
          this.positionBubble(step);
        }
        this.isUpdatingPosition = false;
      }
      
      // Setup dynamic monitoring for the target element
      if (targetElement && targetElement.isConnected) {
        this.setupDynamicMonitoring(targetElement, step);
      }
      
    } catch (error) {
      console.error('Error in updateCurrentStepPositioning:', error);
      this.isUpdatingPosition = false;
    }
  }

  setupDynamicMonitoring(targetElement, stepConfig) {
    if (this.dynamicMonitoringInterval) {
      clearInterval(this.dynamicMonitoringInterval);
      this.dynamicMonitoringInterval = null;
    }
    
    if (!targetElement || !targetElement.isConnected) {
      return;
    }
    
    let lastRect = targetElement.getBoundingClientRect();
    let consecutiveFailures = 0;
    const maxFailures = 10;
    const interval = this.isSPA ? 500 : 300;
    
    this.dynamicMonitoringInterval = setInterval(() => {
      try {
        if (!this.isActive || this.tourPaused || !targetElement.isConnected || this.isUpdatingPosition) {
          clearInterval(this.dynamicMonitoringInterval);
          this.dynamicMonitoringInterval = null;
          return;
        }
        
        if (stepConfig.title === "Filter Options" && this.currentOperation === 'filtering') {
          return;
        }
        
        if (stepConfig.title === "Click to Analyze" && this.currentOperation === 'iconClick') {
          const summaryPopup = document.querySelector('#summary-popup');
          if (summaryPopup && targetElement !== summaryPopup) {
            return;
          }
        }
        
        const currentRect = targetElement.getBoundingClientRect();
        
        const isVisible = currentRect.width > 0 && currentRect.height > 0 && 
                         window.getComputedStyle(targetElement).opacity !== '0' &&
                         window.getComputedStyle(targetElement).visibility !== 'hidden';
        
        if (!isVisible) {
          consecutiveFailures++;
          if (consecutiveFailures >= maxFailures) {
            clearInterval(this.dynamicMonitoringInterval);
            this.dynamicMonitoringInterval = null;
          }
          return;
        }
        
        const hasPositionChanged = 
          Math.abs(currentRect.left - lastRect.left) > 5 ||
          Math.abs(currentRect.top - lastRect.top) > 5 ||
          Math.abs(currentRect.width - lastRect.width) > 5 ||
          Math.abs(currentRect.height - lastRect.height) > 5;
        
        if (hasPositionChanged && !this.isUpdatingPosition) {
          this.isUpdatingPosition = true;
          
          setTimeout(() => {
            try {
              if (this.isActive && !this.tourPaused && targetElement.isConnected) {
                this.createSoftSpotlight(targetElement);
                this.positionBubble(stepConfig, targetElement);
              }
            } catch (error) {
              console.error('Error updating position in monitoring:', error);
            } finally {
              this.isUpdatingPosition = false;
            }
          }, 100);
          
          lastRect = currentRect;
          consecutiveFailures = 0;
        }
      } catch (error) {
        console.error('Error in dynamic monitoring:', error);
        consecutiveFailures++;
        
        if (consecutiveFailures >= maxFailures) {
          console.warn('Dynamic monitoring stopped due to consecutive failures');
          clearInterval(this.dynamicMonitoringInterval);
          this.dynamicMonitoringInterval = null;
        }
      }
    }, interval);
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
    
    // Clear dynamic monitoring
    if (this.dynamicMonitoringInterval) {
      clearInterval(this.dynamicMonitoringInterval);
      this.dynamicMonitoringInterval = null;
    }
    
    // Clear SPA route change observer
    if (this.routeChangeObserver) {
      this.routeChangeObserver.disconnect();
      this.routeChangeObserver = null;
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
          if (privacyLink && !this.demoElements.floatingIcon) {
            this.createDemoFloatingIcon(privacyLink);
          }
          setTimeout(() => {
            this.updateCurrentStepPositioning();
          }, 150);
        } else if (step.title === "User Profile") {
        const profileButton = this.findProfileButton();
        if (profileButton) {
          this.createSoftSpotlight(profileButton);
          const tempStepConfig = {
            position: 'right',
            title: "User Profile"
          };
          this.positionBubble(tempStepConfig, profileButton);
        } else {
          setTimeout(() => {
            this.updateCurrentStepPositioning();
          }, 50);
        }
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
          // Special handling for "Click to Analyze" step
          if (step.title === "Click to Analyze") {
            console.log('Click to Analyze action completed, waiting for summary...');
            this.waitForSummaryAndUpdateSpotlight();
          } else {
            this.isOperationInProgress = false;
            this.enableNavigation();
          }
        }).catch((error) => {
          console.error('Error in auto action:', error);
          this.isOperationInProgress = false;
          this.enableNavigation();
        });
      }, 800); // Reduced delay
    }
  }

  // Wait for summary popup and update spotlight
  waitForSummaryAndUpdateSpotlight() {
    let attempts = 0;
    const maxAttempts = 20; // Reduced attempts
    const timeoutDuration = 10000; // Reduced timeout
    
    const overallTimeout = setTimeout(() => {
      console.warn('Summary popup wait timeout reached');
      this.isOperationInProgress = false;
      this.enableNavigation();
      
      // If no summary found, create demo for testing
      if (!document.querySelector('#summary-popup')) {
        console.log('Creating demo summary for testing');
        this.createDemoSummaryContainer();
        const demoSummary = this.demoElements.summaryContainer;
        if (demoSummary) {
          this.createSoftSpotlight(demoSummary);
          const tempStepConfig = {
            position: 'left',
            title: "Click to Analyze"
          };
          this.positionBubble(tempStepConfig, demoSummary);
        }
      }
    }, timeoutDuration);
    
    const checkSummary = () => {
      try {
        const summaryPopup = document.querySelector('#summary-popup');
        
        if (summaryPopup && attempts < maxAttempts) {
          const hasContent = summaryPopup.querySelector('.summary-content, [class*="bubble"], [class*="summary"]');
          const isLoading = summaryPopup.querySelector('[class*="loading"], [class*="spinner"], .loader');
          
          if (hasContent && !isLoading) {
            console.log('Summary popup found with content');
            clearTimeout(overallTimeout);
            this.isOperationInProgress = false;
            this.enableNavigation();
            
            if (this.dynamicMonitoringInterval) {
              clearInterval(this.dynamicMonitoringInterval);
              this.dynamicMonitoringInterval = null;
            }
            
            this.isUpdatingPosition = true;
            setTimeout(() => {
              if (this.isActive && !this.tourPaused) {
                this.createSoftSpotlight(summaryPopup);
                const tempStepConfig = {
                  position: 'left',
                  title: "Click to Analyze"
                };
                this.positionBubble(tempStepConfig, summaryPopup);
                this.setupDynamicMonitoring(summaryPopup, tempStepConfig);
              }
              this.isUpdatingPosition = false;
            }, 200);
            return;
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkSummary, 300); // Reduced interval
          } else {
            console.warn('Summary popup found but no content after max attempts');
            clearTimeout(overallTimeout);
            this.isOperationInProgress = false;
            this.enableNavigation();
          }
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkSummary, 300); // Reduced interval
        } else {
          console.warn('Summary popup not found after max attempts');
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
    
    // Start checking immediately
    setTimeout(checkSummary, 100);
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
    
    this.addKeyboardListener();
  }

  addKeyboardListener() {
    this.removeKeyboardListener();
    
    this.keyboardListener = (event) => {
      if (!this.isActive || !this.bubble) {
        return;
      }
      
      if (event.key === 'Enter') {
        if (this.isOperationInProgress) {
          return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        const isLastStep = this.currentStep === this.steps.length - 1;
        if (isLastStep) {
          this.endTour();
        } else {
          this.nextStep();
        }
      } else if (event.key === 'Escape') {
        if (this.isOperationInProgress) {
          return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        this.endTour();
      }
    };
    
    document.addEventListener('keydown', this.keyboardListener, true);
  }

  removeKeyboardListener() {
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener, true);
      this.keyboardListener = null;
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

  // Create spotlight effect using four overlay blocks
  createSoftSpotlight(target) {
    if (!target || !target.getBoundingClientRect) {
      return;
    }
    
    target.getBoundingClientRect();
    
    requestAnimationFrame(() => {
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
    });
  }
  
  // Create an overlay block
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
    console.log('Ending guided tour...');
    
    // Set all flags to stop operations
    this.isActive = false;
    this.tourPaused = false;
    this.isUpdatingPosition = false;
    this.currentOperation = null;
    this.isOperationInProgress = false;
    
    // Clear all timeouts and intervals immediately
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    
    if (this.dynamicMonitoringInterval) {
      clearInterval(this.dynamicMonitoringInterval);
      this.dynamicMonitoringInterval = null;
    }
    
    if (this.iconProtectionInterval) {
      clearInterval(this.iconProtectionInterval);
      this.iconProtectionInterval = null;
    }
    
    // Remove all event listeners
    this.removeResizeListener();
    this.removeKeyboardListener();
    this.removeErrorDetection();
    
    // Stop all monitoring (these are now empty but kept for compatibility)
    this.stopSummaryPopupMonitoring();
    this.stopExpandedSummaryMonitoring();
    this.stopChatWindowMonitoring();
    this.stopProfilePopupMonitoring();
    
    // Remove tour elements with fade out
    if (this.bubble) {
      this.bubble.style.opacity = '0';
      this.bubble.style.transform = 'scale(0.8)';
      setTimeout(() => {
        if (this.bubble && this.bubble.parentNode) {
          this.bubble.remove();
        }
        this.bubble = null;
      }, 300);
    }
    
    if (this.overlay) {
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.remove();
        }
        this.overlay = null;
      }, 300);
    }
    
    // Remove spotlight overlays
    this.removeSpotlightOverlays();
    
    // Clean up demo elements
    Object.values(this.demoElements).forEach(element => {
      if (element && element.parentNode) {
        element.remove();
      }
    });
    this.demoElements = {};
    
    // Restore any hidden real floating icons from content.js
    const hiddenRealIcons = document.querySelectorAll('.privacy-summary-icon[data-hidden-by-tour="true"]');
    hiddenRealIcons.forEach(icon => {
      icon.removeAttribute('data-hidden-by-tour');
      icon.style.display = '';
    });
    
    // Remove tour highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
      el.style.removeProperty('box-shadow');
      el.style.removeProperty('position');
      el.style.removeProperty('z-index');
    });
    
    // Clear demonstration styles
    this.clearDemonstrationStyles();
    
    // Restore extension state
    this.restoreExtensionDefaultState();
    
    // Force cleanup of any remaining tour elements
    setTimeout(() => {
      const remainingElements = document.querySelectorAll('.guided-tour-overlay, .guided-tour-bubble, .demo-element');
      remainingElements.forEach(el => {
        if (el.parentNode) {
          el.remove();
        }
      });
    }, 500);
    
    console.log('Guided tour ended and cleaned up');
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
      if (!this.isActive || this.tourPaused) return;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check for error elements
              const errorElement = node.querySelector && (
                node.querySelector('[class*="error"]') ||
                node.querySelector('[id*="error"]') ||
                node.querySelector('.alert') ||
                node.querySelector('.warning')
              );
              
              if (errorElement || (node.className && node.className.includes('error'))) {
                this.handleError(errorElement || node);
              }
              
              // Handle SPA route changes
              if (this.isSPA && (
                node.querySelector('[class*="route"]') ||
                node.querySelector('[class*="page"]') ||
                node.querySelector('[id*="app"]')
              )) {
                this.handleSPARouteChange();
              }
            }
          });
        }
      });
    });
    
    this.errorObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      attributeOldValue: false,
      characterData: false,
      characterDataOldValue: false
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
    
    this.addKeyboardListener();
  }

  addKeyboardListener() {
    this.removeKeyboardListener();
    
    this.keyboardListener = (event) => {
      if (!this.isActive || !this.bubble) {
        return;
      }
      
      if (event.key === 'Enter') {
        if (this.isOperationInProgress) {
          return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        const isLastStep = this.currentStep === this.steps.length - 1;
        if (isLastStep) {
          this.endTour();
        } else {
          this.nextStep();
        }
      } else if (event.key === 'Escape') {
        if (this.isOperationInProgress) {
          return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        this.endTour();
      }
    };
    
    document.addEventListener('keydown', this.keyboardListener, true);
  }

  removeKeyboardListener() {
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener, true);
      this.keyboardListener = null;
    }
  }

  // Pause tour temporarily
  pauseTour() {
    this.isActive = false;
    this.tourPaused = true;
    
    this.removeKeyboardListener();
    this.removeResizeListener();
    
    if (this.iconProtectionInterval) {
      clearInterval(this.iconProtectionInterval);
      this.iconProtectionInterval = null;
    }
    
    if (this.dynamicMonitoringInterval) {
      clearInterval(this.dynamicMonitoringInterval);
      this.dynamicMonitoringInterval = null;
    }
    
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    
    if (this.bubble) {
      this.bubble.style.opacity = '0';
      this.bubble.style.transform = 'scale(0.8)';
    }
    
    this.removeSpotlightOverlays();
    
    if (this.overlay) {
      this.overlay.style.opacity = '0';
    }
    
    // Restore any hidden real floating icons from content.js
    const hiddenRealIcons = document.querySelectorAll('.privacy-summary-icon[data-hidden-by-tour="true"]');
    hiddenRealIcons.forEach(icon => {
      icon.removeAttribute('data-hidden-by-tour');
      icon.style.display = '';
    });
    
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
    if (!this.tourPaused) return;
    
    const checkLoginAndResume = () => {
      if (!this.tourPaused) return;
      
      this.checkLoginStatus().then(isLoggedIn => {
        if (!this.tourPaused) return;
        
        if (isLoggedIn && !this.isActive) {
          setTimeout(() => {
            if (!this.tourPaused) return;
            
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
    
    this.addResizeListener();
    
    setTimeout(() => {
      this.showStep(this.currentStep);
    }, 500);
  }

  // Highlight login page for logged-out users
  async highlightLoginPage() {
    return new Promise((resolve) => {
      const privacyLink = this.findPrivacyLink();
      if (!privacyLink) {
        resolve();
        return;
      }

      if (!this.demoElements.floatingIcon) {
        this.createDemoFloatingIcon(privacyLink);
      }

      const icon = this.demoElements.floatingIcon;
      
      icon.style.transform = 'scale(0.95)';
      setTimeout(() => {
        icon.style.transform = 'scale(1.1)';
        
        const event = new MouseEvent('click', { bubbles: true });
        icon.dispatchEvent(event);
        
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
          } else if (attempts < 10) {
            attempts++;
            setTimeout(checkLoginInterface, 500);
          } else {
            console.log('Auth popup not found after attempts');
            resolve();
          }
        };
        
        setTimeout(checkLoginInterface, 300);
      }, 200);
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
    
    return loginPage;
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
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <path d="M9 12l2 2 4-4"></path>
              </svg>
            </div>
            <div style="flex: 1; font-size: 0.95rem;">Privacy & Consent Basics</div>
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
    const bottomAreaLinks = this.findBottomAreaPrivacyLinks();
    if (bottomAreaLinks.length > 0) {
      const targetLink = bottomAreaLinks[0];
      targetLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return targetLink;
    }
    
    const iconTriggeredLinks = this.findIconTriggeredPrivacyLinks();
    if (iconTriggeredLinks.length > 0) {
      const targetLink = iconTriggeredLinks[0];
      targetLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return targetLink;
    }
    
    return null;
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



  // Find floating icon
  findFloatingIcon() {
    // First try to find real floating icon near privacy links
    const privacyLinks = document.querySelectorAll('a[href*="privacy"], a');
    for (const link of privacyLinks) {
      if (this.isPrivacyPolicyLink(link)) {
        // Look for floating icon near this privacy link
        const linkRect = link.getBoundingClientRect();
        const floatingIcons = document.querySelectorAll('.privacy-summary-icon');
        
        for (const icon of floatingIcons) {
          const iconRect = icon.getBoundingClientRect();
          // Check if icon is near the privacy link (within 100px)
          const distance = Math.sqrt(
            Math.pow(iconRect.left - linkRect.right, 2) + 
            Math.pow(iconRect.top - linkRect.top, 2)
          );
          
          if (distance < 100) {
            this.realFloatingIcon = icon;
            return icon;
          }
        }
      }
    }
    
    // Fallback: find any floating icon
    const floatingIcon = document.querySelector('.privacy-summary-icon');
    if (floatingIcon) {
      this.realFloatingIcon = floatingIcon;
      return floatingIcon;
    }
    
    return null;
  }

  createDemoFloatingIcon(privacyLink) {
    if (!this.demoElements.floatingIcon) {
      // Hide any existing real floating icons from content.js
      const existingRealIcons = document.querySelectorAll('.privacy-summary-icon:not(.tour-demo-icon)');
      existingRealIcons.forEach(icon => {
        icon.dataset.hiddenByTour = 'true';
        icon.style.display = 'none';
      });
      
      let iconPosition;
      
      if (privacyLink) {
        const linkRect = privacyLink.getBoundingClientRect();
        iconPosition = {
          top: `${linkRect.top + window.scrollY}px`,
          left: `${linkRect.right + 10}px`,
          position: 'absolute'
        };
      } else {
        iconPosition = {
          bottom: '80px',
          right: '80px',
          position: 'fixed'
        };
      }
      
      this.demoElements.floatingIcon = document.createElement('div');
      this.demoElements.floatingIcon.className = 'privacy-summary-icon demo-floating-icon tour-demo-icon';
      this.demoElements.floatingIcon.innerHTML = '📝';
      this.demoElements.floatingIcon.style.cssText = `
        position: ${iconPosition.position};
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
        ${iconPosition.top ? `top: ${iconPosition.top};` : ''}
        ${iconPosition.left ? `left: ${iconPosition.left};` : ''}
        ${iconPosition.bottom ? `bottom: ${iconPosition.bottom};` : ''}
        ${iconPosition.right ? `right: ${iconPosition.right};` : ''}
      `;
      this.demoElements.floatingIcon.classList.add('demo-element');
      
      this.demoElements.floatingIcon.addEventListener('click', () => {
        chrome.storage.local.get(['isLoggedIn'], (result) => {
          if (result.isLoggedIn) {
            if (window.privacyAuth && typeof window.privacyAuth.handleIconClick === 'function') {
              window.privacyAuth.handleIconClick();
            } else {
              this.createDemoSummaryContainer();
            }
          } else {
            if (window.privacyAuth && typeof window.privacyAuth.showAuthPopup === 'function') {
              window.privacyAuth.showAuthPopup();
            } else if (window.privacyAuth && typeof window.privacyAuth.checkLoginStatusAndHandle === 'function') {
              window.privacyAuth.checkLoginStatusAndHandle();
            } else {
              const event = new CustomEvent('showLoginPopup');
              document.dispatchEvent(event);
            }
          }
        });
      });
      
      document.body.appendChild(this.demoElements.floatingIcon);
    }
    return this.demoElements.floatingIcon;
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
        if (!link.dataset.originalPosition) {
          link.dataset.originalPosition = link.style.position || '';
        }
        if (!link.dataset.originalZIndex) {
          link.dataset.originalZIndex = link.style.zIndex || '';
        }
        
        // Simulate hover effect with visual feedback
        link.style.transform = 'scale(1.05)';
        link.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
        
        // Trigger hover event
        const event = new MouseEvent('mouseover', { bubbles: true });
        link.dispatchEvent(event);
        
        if (!this.demoElements.floatingIcon && !document.querySelector('.privacy-summary-icon')) {
          this.createDemoFloatingIcon(link);
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
      const privacyLink = this.findPrivacyLink();
      if (!privacyLink) {
        this.createDemoSummaryContainer();
        this.currentOperation = 'iconClick';
        resolve();
        return;
      }

      if (!this.demoElements.floatingIcon) {
        this.createDemoFloatingIcon(privacyLink);
      }

      const icon = this.demoElements.floatingIcon;
      
      icon.style.transform = 'scale(0.95)';
      setTimeout(() => {
        icon.style.transform = 'scale(1.1)';
        
        const event = new MouseEvent('click', { bubbles: true });
        icon.dispatchEvent(event);
        
        this.currentOperation = 'iconClick';
        
        setTimeout(() => {
          resolve();
        }, 500);
      }, 200);
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
      const expandedSummary = document.querySelector('.expanded-summary');
      if (expandedSummary) {
        const closeBtn = expandedSummary.querySelector('.close-btn') ||
                        expandedSummary.querySelector('button');
        if (closeBtn) {
          closeBtn.click();
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      const filterElement = this.findFilterButtons();
      if (filterElement) {
        filterElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        requestAnimationFrame(() => {
          filterElement.style.transform = 'scale(1)';
          filterElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          
          requestAnimationFrame(() => {
            filterElement.style.transform = 'scale(1.05)';
            filterElement.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
          });
        });
        
        const colorSegments = document.querySelectorAll('.color-segment');
        const numberLabels = document.querySelectorAll('.number-label');
        
        if (colorSegments.length > 0) {
          setTimeout(() => {
            colorSegments[0].click();
            this.currentOperation = 'filtering';
            
            if (this.dynamicMonitoringInterval) {
              clearInterval(this.dynamicMonitoringInterval);
              this.dynamicMonitoringInterval = null;
            }
            
            setTimeout(() => {
              const summaryContainer = this.findFilteredContainer();
              if (summaryContainer) {
                this.createSoftSpotlight(summaryContainer);
                const tempStepConfig = {
                  position: 'left',
                  title: "Filter Options"
                };
                this.positionBubble(tempStepConfig, summaryContainer);
              } else {
                const noResultsMsg = document.querySelector('[class*="no-result"], [class*="empty"], .summary-content');
                if (noResultsMsg) {
                  this.createSoftSpotlight(noResultsMsg);
                  const tempStepConfig = {
                    position: 'left',
                    title: "Filter Options"
                  };
                  this.positionBubble(tempStepConfig, noResultsMsg);
                }
              }
              resolve();
            }, 800);
          }, 500);
        } else if (numberLabels.length > 0) {
          setTimeout(() => {
            numberLabels[0].click();
            this.currentOperation = 'filtering';
            
            if (this.dynamicMonitoringInterval) {
              clearInterval(this.dynamicMonitoringInterval);
              this.dynamicMonitoringInterval = null;
            }
            
            setTimeout(() => {
              const summaryContainer = this.findFilteredContainer();
              if (summaryContainer) {
                this.createSoftSpotlight(summaryContainer);
                const tempStepConfig = {
                  position: 'left',
                  title: "Filter Options"
                };
                this.positionBubble(tempStepConfig, summaryContainer);
              }
              resolve();
            }, 800);
          }, 500);
        } else {
          resolve();
        }
        
        setTimeout(() => {
          filterElement.style.transform = 'scale(1)';
          filterElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          
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
                const rect = chatWindow.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0 && 
                                window.getComputedStyle(chatWindow).opacity !== '0' &&
                                window.getComputedStyle(chatWindow).visibility !== 'hidden';
                
                if (isVisible) {
                  setTimeout(() => {
                    const updatedRect = chatWindow.getBoundingClientRect();
                    if (updatedRect.width > 0 && updatedRect.height > 0) {
                      this.createSoftSpotlight(chatWindow);
                      const tempStepConfig = {
                        position: 'left',
                        title: "Chat Feature"
                      };
                      this.positionBubble(tempStepConfig, chatWindow);
                    }
                  }, 200);
                  resolve();
                } else {
                  attempts++;
                  setTimeout(checkChatWindow, 500);
                }
              } else if (attempts < 15) {
                attempts++;
                setTimeout(checkChatWindow, 500);
              } else {
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
            
            this.currentOperation = 'profile';
            
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
                const rect = profilePopup.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0 && 
                                window.getComputedStyle(profilePopup).opacity !== '0' &&
                                window.getComputedStyle(profilePopup).visibility !== 'hidden';
                
                if (isVisible) {
                  console.log('Moving spotlight to profile popup');
                  setTimeout(() => {
                    const updatedRect = profilePopup.getBoundingClientRect();
                    if (updatedRect.width > 0 && updatedRect.height > 0) {
                      this.createSoftSpotlight(profilePopup);
                      const tempStepConfig = {
                        position: 'right',
                        title: "User Profile"
                      };
                      this.positionBubble(tempStepConfig, profilePopup);
                    }
                  }, 200);
                  resolve();
                } else {
                  attempts++;
                  setTimeout(checkProfilePopup, 300);
                }
              } else if (attempts < 20) {
                attempts++;
                setTimeout(checkProfilePopup, 300);
              } else {
                console.log('Profile popup not found, creating demo');
                this.createDemoProfilePopup();
                const demoProfile = this.demoElements.profilePopup;
                if (demoProfile) {
                  setTimeout(() => {
                    this.createSoftSpotlight(demoProfile);
                    const tempStepConfig = {
                      position: 'right',
                      title: "User Profile"
                    };
                    this.positionBubble(tempStepConfig, demoProfile);
                  }, 100);
                }
                resolve();
              }
            };
            
            // Start checking immediately after click
            setTimeout(checkProfilePopup, 200);
          } else {
            console.log('No real profile button found, creating demo popup');
            this.createDemoProfilePopup();
            const demoProfile = this.demoElements.profilePopup;
            if (demoProfile) {
              setTimeout(() => {
                this.createSoftSpotlight(demoProfile);
                const tempStepConfig = {
                  position: 'right',
                  title: "User Profile"
                };
                this.positionBubble(tempStepConfig, demoProfile);
              }, 100);
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
    try {
      // Clear all demo element styles
      Object.values(this.demoElements).forEach(element => {
        if (element && element.style) {
          element.style.transition = '';
          element.style.transform = '';
          element.style.boxShadow = '';
          element.style.filter = '';
          element.style.animation = '';
          element.style.opacity = '';
          element.style.visibility = '';
        }
      });
      
      // Clear styles from real elements that might have been modified
      const elementsToClean = [
        '.privacy-summary-icon',
        '.floating-icon',
        '.privacy-link',
        '.summary-item',
        '.filter-button',
        '.chat-button',
        '.profile-button',
        '.color-segment',
        '.number-label',
        'div[style*="border-radius: 25px"]',
        '[class*="privacy"]',
        '[id*="privacy"]'
      ];
      
      elementsToClean.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            // Restore original values if they exist
            if (el.dataset.originalTransform !== undefined) {
              el.style.transform = el.dataset.originalTransform;
              delete el.dataset.originalTransform;
            }
            if (el.dataset.originalBoxShadow !== undefined) {
              el.style.boxShadow = el.dataset.originalBoxShadow;
              delete el.dataset.originalBoxShadow;
            }
            
            // Remove any tour-specific styles
            const propertiesToRemove = [
              'transition', 'filter', 'animation', 'opacity', 'visibility',
              'z-index', 'position', 'pointer-events'
            ];
            
            propertiesToRemove.forEach(prop => {
              if (el.style.getPropertyValue(prop)) {
                el.style.removeProperty(prop);
              }
            });
            
            // Remove tour-specific transform and box-shadow if they contain tour values
            if (el.style.transform && (
              el.style.transform.includes('scale(1.') || 
              el.style.transform.includes('translateY(-5px)')
            )) {
              el.style.removeProperty('transform');
            }
            
            if (el.style.boxShadow && el.style.boxShadow.includes('rgba(25, 118, 210')) {
              el.style.removeProperty('box-shadow');
            }
          });
        } catch (selectorError) {
          console.warn('Error cleaning selector:', selector, selectorError);
        }
      });
      
      // Clear any remaining tour-specific classes
      document.querySelectorAll('.tour-highlight, .demo-element').forEach(el => {
        el.classList.remove('tour-highlight', 'demo-element');
        
        // Remove any inline styles that might have been added
        const stylesToRemove = ['box-shadow', 'position', 'z-index', 'transform'];
        stylesToRemove.forEach(style => {
          if (el.style.getPropertyValue(style)) {
            el.style.removeProperty(style);
          }
        });
      });
      
      // Clear privacy link specific styles that might have been added during tour
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
        
        if (link.dataset.originalPosition !== undefined) {
          link.style.position = link.dataset.originalPosition || '';
          link.removeAttribute('data-original-position');
        } else {
          link.style.removeProperty('position');
        }
        
        if (link.dataset.originalZIndex !== undefined) {
          link.style.zIndex = link.dataset.originalZIndex || '';
          link.removeAttribute('data-original-z-index');
        } else {
          link.style.removeProperty('z-index');
        }
        
        // Remove any tour-specific spotlight overlays and highlights
        link.classList.remove('tour-highlight');
      });
      
      // Clear any SPA-specific styles that might cause conflicts
      if (this.isSPA) {
        const spaElements = document.querySelectorAll('[data-tour-modified]');
        spaElements.forEach(el => {
          el.removeAttribute('data-tour-modified');
          // Reset any SPA-specific modifications
          const resetProperties = ['transform', 'transition', 'opacity', 'visibility'];
          resetProperties.forEach(prop => {
            if (el.style.getPropertyValue(prop)) {
              el.style.removeProperty(prop);
            }
          });
        });
      }
      
    } catch (error) {
      console.error('Error clearing demonstration styles:', error);
    }
  }

  // Handle SPA route changes
  handleSPARouteChange() {
    if (!this.isSPA || !this.isActive) return;
    
    // Pause tour temporarily during route changes
    this.tourPaused = true;
    
    // Wait for route change to complete, then resume
    setTimeout(() => {
      if (this.isActive) {
        this.tourPaused = false;
        // Re-check current step positioning after route change
        this.updateCurrentStepPositioning();
      }
    }, 1000);
  }

  // Enhanced clearDemonstrationStyles for SPA compatibility
  clearDemonstrationStyles() {
    try {
      // Clear all demo element styles
      Object.values(this.demoElements).forEach(element => {
        if (element && element.style) {
          element.style.transition = '';
          element.style.transform = '';
          element.style.boxShadow = '';
          element.style.filter = '';
          element.style.animation = '';
          element.style.opacity = '';
          element.style.visibility = '';
        }
      });
      
      // Clear styles from real elements that might have been modified
      const elementsToClean = [
        '.privacy-summary-icon',
        '.floating-icon',
        '.privacy-link',
        '.summary-item',
        '.filter-button',
        '.chat-button',
        '.profile-button',
        '.color-segment',
        '.number-label',
        'div[style*="border-radius: 25px"]',
        '[class*="privacy"]',
        '[id*="privacy"]'
      ];
      
      elementsToClean.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            // Restore original values if they exist
            if (el.dataset.originalTransform !== undefined) {
              el.style.transform = el.dataset.originalTransform;
              delete el.dataset.originalTransform;
            }
            if (el.dataset.originalBoxShadow !== undefined) {
              el.style.boxShadow = el.dataset.originalBoxShadow;
              delete el.dataset.originalBoxShadow;
            }
            
            // Remove any tour-specific styles
            const propertiesToRemove = [
              'transition', 'filter', 'animation', 'opacity', 'visibility',
              'z-index', 'position', 'pointer-events'
            ];
            
            propertiesToRemove.forEach(prop => {
              if (el.style.getPropertyValue(prop)) {
                el.style.removeProperty(prop);
              }
            });
            
            // Remove tour-specific transform and box-shadow if they contain tour values
            if (el.style.transform && (
              el.style.transform.includes('scale(1.') || 
              el.style.transform.includes('translateY(-5px)')
            )) {
              el.style.removeProperty('transform');
            }
            
            if (el.style.boxShadow && el.style.boxShadow.includes('rgba(25, 118, 210')) {
              el.style.removeProperty('box-shadow');
            }
          });
        } catch (selectorError) {
          console.warn('Error cleaning selector:', selector, selectorError);
        }
      });
      
      // Clear any remaining tour-specific classes
      document.querySelectorAll('.tour-highlight, .demo-element').forEach(el => {
        el.classList.remove('tour-highlight', 'demo-element');
        
        // Remove any inline styles that might have been added
        const stylesToRemove = ['box-shadow', 'position', 'z-index', 'transform'];
        stylesToRemove.forEach(style => {
          if (el.style.getPropertyValue(style)) {
            el.style.removeProperty(style);
          }
        });
      });
      
      // Clear any SPA-specific styles that might cause conflicts
      if (this.isSPA) {
        const spaElements = document.querySelectorAll('[data-tour-modified]');
        spaElements.forEach(el => {
          el.removeAttribute('data-tour-modified');
          // Reset any SPA-specific modifications
          const resetProperties = ['transform', 'transition', 'opacity', 'visibility'];
          resetProperties.forEach(prop => {
            if (el.style.getPropertyValue(prop)) {
              el.style.removeProperty(prop);
            }
          });
        });
      }
      
    } catch (error) {
      console.error('Error clearing demonstration styles:', error);
    }
  }

  // Enhanced method to check if tour should be disabled on problematic sites
  shouldDisableTour() {
    const problematicDomains = [
      'puma.com',
      'coach.com', 
      'jbhifi.com.au',
      'microsoft.com',
      'nike.com',
      'adidas.com',
      'amazon.com',
      'facebook.com',
      'instagram.com',
      'twitter.com',
      'linkedin.com'
    ];
    
    const currentDomain = window.location.hostname.toLowerCase();
    const isProblematic = problematicDomains.some(domain => 
      currentDomain.includes(domain)
    );
    
    // Also check for heavy SPA frameworks that might cause issues
    const heavySPAIndicators = [
      window.React && document.querySelector('[data-reactroot]'),
      window.angular && document.querySelector('[ng-app]'),
      window.Vue && document.querySelector('[id*="vue"]'),
      document.querySelector('[class*="next-"]'), // Next.js
      document.querySelector('[class*="nuxt-"]')  // Nuxt.js
    ];
    
    const hasHeavySPA = heavySPAIndicators.some(indicator => indicator);
    
    if ((isProblematic && this.isSPA) || (hasHeavySPA && isProblematic)) {
      console.warn('Tour disabled on problematic SPA site:', currentDomain);
      return true;
    }
    
    return false;
  }

  // Safe tour initialization with SPA checks
  async safeTourStart() {
    try {
      // Check if tour should be disabled
      if (this.shouldDisableTour()) {
        console.log('Tour disabled for this site');
        return false;
      }
      
      // Check if tour is already active
      if (this.isActive) {
        console.log('Tour already active');
        return false;
      }
      
      // Detect SPA frameworks before starting
      const frameworks = this.detectSPAFramework();
      this.isSPA = frameworks.length > 0;
      
      // Add extra delay for SPA sites to ensure DOM is stable
      if (this.isSPA) {
        console.log('SPA detected, waiting for DOM stability...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Double-check that the page hasn't changed during the delay
        if (window.location.href !== document.location.href) {
          console.log('Page changed during initialization, aborting tour');
          return false;
        }
      }
      
      // Final safety check before starting
      if (document.readyState !== 'complete') {
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', resolve, { once: true });
          }
        });
      }
      
      await this.startTour();
      return true;
    } catch (error) {
      console.error('Error starting tour:', error);
      this.endTour();
      return false;
    }
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

// Export for use in other files
if (typeof window !== 'undefined') {
  window.GuidedTour = GuidedTour;
}

// Auto-initialize for content scripts
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.guidedTour = new GuidedTour();
    });
  } else {
    window.guidedTour = new GuidedTour();
  }
} 