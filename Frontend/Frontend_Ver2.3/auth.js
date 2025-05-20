// Login and Registration Functions (auth.js)
const API_CONFIG = {
  BASE_URL: 'https://usyd-cs30-1-llm-based-consent-reader.com'
};
// Global variables
let authPopup = null;
let profilePopup = null;
let isLoggedIn = false;
let currentAuthMode = 'login'; // 'login' or 'register'
let userInfo = null;
let errorBlinkInterval = null;

// Check login status
function checkLoginStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['isLoggedIn', 'userInfo'], (result) => {
      isLoggedIn = result.isLoggedIn || false;
      userInfo = result.userInfo || null;
      resolve(isLoggedIn);
    });
  });
}

// Save login status
function saveLoginStatus(status, user) {
  chrome.storage.local.set({
    isLoggedIn: status,
    userInfo: user,
    isAdmin: user && user.role === 'admin'
  });
  isLoggedIn = status;
  userInfo = user;
}

// Remove login status (logout)
function removeLoginStatus() {
  chrome.storage.local.set({
    isLoggedIn: false,
    userInfo: null
  });
  isLoggedIn = false;
  userInfo = null;
}

// Create login page
function createLoginPage() {
  // If already exists, remove it first
  if (authPopup && authPopup.container) {
    authPopup.container.remove();
  }
  
  // Create login container
  const loginContainer = document.createElement('div');
  loginContainer.id = 'auth-popup';
  
  // Set styles (keep consistent with summary-popup style)
  Object.assign(loginContainer.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -48%) scale(0.95)',
    zIndex: 99999,
    width: '420px',
    maxWidth: '90%',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    padding: '25px',
    boxSizing: 'border-box',
    opacity: '0',
    transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    color: '#333',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  });
  
  // Create background overlay with improved animation
  const overlay = document.createElement('div');
  overlay.id = 'auth-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'radial-gradient(circle at center, rgba(25, 118, 210, 0.3), rgba(0, 0, 0, 0.6))',
    backdropFilter: 'blur(5px)',
    zIndex: 99998,
    opacity: '0',
    transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: 'auto'
  });
  
  // Handle overlay clicks - close popup when clicking outside
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeAuthPopup();
    }
  });
  
  document.body.appendChild(overlay);
  
  // Create title container
  const titleContainer = document.createElement('div');
  Object.assign(titleContainer.style, {
    textAlign: 'center',
    width: '100%',
    marginBottom: '2em'
  });
  
  // Create title
  const title = document.createElement('h2');
  title.innerText = currentAuthMode === 'login' ? "Welcome!" : "Register";
  Object.assign(title.style, {
    marginTop: '0',
    marginBottom: '0',
    fontSize: '1.6rem',
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
  
  // Add login description text
  if (currentAuthMode === 'login') {
    const loginDescription = document.createElement('p');
    loginDescription.innerText = "Please login to use the LLM summary assistant :)";
    Object.assign(loginDescription.style, {
      fontSize: '14px',
      color: '#666',
      textAlign: 'center',
      margin: '10px 0 0 0',
      fontWeight: '400'
    });
    titleContainer.appendChild(loginDescription);
  }
  
  // Create form container
  const formContainer = document.createElement('div');
  Object.assign(formContainer.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
    marginBottom: '25px'
  });
  
  // Username input
  const usernameContainer = document.createElement('div');
  Object.assign(usernameContainer.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  });
  
  const usernameLabel = document.createElement('label');
  usernameLabel.innerText = 'Username';
  Object.assign(usernameLabel.style, {
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
    marginLeft: '2px'
  });
  
  const usernameInput = document.createElement('input');
  usernameInput.type = 'text';
  usernameInput.placeholder = 'Enter username';
  Object.assign(usernameInput.style, {
    padding: '12px 15px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s ease',
    backgroundColor: 'rgba(255, 255, 255, 0.8)'
  });
  
  // Add input field focus effect
  usernameInput.addEventListener('focus', () => {
    usernameInput.style.borderColor = '#1976d2';
    usernameInput.style.boxShadow = '0 0 0 3px rgba(25, 118, 210, 0.2)';
    usernameInput.style.backgroundColor = '#ffffff';
  });
  
  usernameInput.addEventListener('blur', () => {
    usernameInput.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    usernameInput.style.boxShadow = 'none';
    usernameInput.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
  });
  
  usernameContainer.appendChild(usernameLabel);
  usernameContainer.appendChild(usernameInput);
  
  // Password input
  const passwordContainer = document.createElement('div');
  Object.assign(passwordContainer.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  });
  
  const passwordLabel = document.createElement('label');
  passwordLabel.innerText = 'Password';
  Object.assign(passwordLabel.style, {
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
    marginLeft: '2px'
  });
  
  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.placeholder = 'Enter password';
  Object.assign(passwordInput.style, {
    padding: '12px 15px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s ease',
    backgroundColor: 'rgba(255, 255, 255, 0.8)'
  });
  
  // Add password strength meter container (only visible in register mode)
  const passwordStrengthContainer = document.createElement('div');
  passwordStrengthContainer.className = 'password-strength-container';
  Object.assign(passwordStrengthContainer.style, {
    display: currentAuthMode === 'register' ? 'flex' : 'none',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '6px'
  });
  
  // Create strength bar
  const strengthBarContainer = document.createElement('div');
  Object.assign(strengthBarContainer.style, {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '2px',
    overflow: 'hidden'
  });
  
  const strengthBar = document.createElement('div');
  Object.assign(strengthBar.style, {
    width: '0%',
    height: '100%',
    backgroundColor: '#ccc',
    transition: 'all 0.3s ease',
    borderRadius: '2px'
  });
  
  strengthBarContainer.appendChild(strengthBar);
  
  // Create strength text
  const strengthText = document.createElement('div');
  Object.assign(strengthText.style, {
    fontSize: '12px',
    color: '#777',
    textAlign: 'right'
  });
  strengthText.innerText = 'Password strength: none';
  
  passwordStrengthContainer.appendChild(strengthBarContainer);
  passwordStrengthContainer.appendChild(strengthText);
  
  // Update password strength on input
  passwordInput.addEventListener('input', () => {
    if (currentAuthMode === 'register') {
      const strength = checkPasswordStrength(passwordInput.value);
      updatePasswordStrength(strength, strengthBar, strengthText);
      
      // Check confirm password match if it has a value
      if (confirmPasswordInput.value) {
        checkPasswordsMatch(passwordInput.value, confirmPasswordInput.value, confirmPasswordMatchText);
      }
    }
  });
  
  // Add input field focus effect
  passwordInput.addEventListener('focus', () => {
    passwordInput.style.borderColor = '#1976d2';
    passwordInput.style.boxShadow = '0 0 0 3px rgba(25, 118, 210, 0.2)';
    passwordInput.style.backgroundColor = '#ffffff';
  });
  
  passwordInput.addEventListener('blur', () => {
    passwordInput.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    passwordInput.style.boxShadow = 'none';
    passwordInput.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
  });
  
  passwordContainer.appendChild(passwordLabel);
  passwordContainer.appendChild(passwordInput);
  passwordContainer.appendChild(passwordStrengthContainer);
  
  // Confirm Password input (only visible in register mode)
  const confirmPasswordContainer = document.createElement('div');
  confirmPasswordContainer.className = 'confirm-password-container';
  Object.assign(confirmPasswordContainer.style, {
    display: currentAuthMode === 'register' ? 'flex' : 'none',
    flexDirection: 'column',
    gap: '8px'
  });
  
  const confirmPasswordLabel = document.createElement('label');
  confirmPasswordLabel.innerText = 'Confirm Password';
  Object.assign(confirmPasswordLabel.style, {
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
    marginLeft: '2px'
  });
  
  const confirmPasswordInput = document.createElement('input');
  confirmPasswordInput.type = 'password';
  confirmPasswordInput.placeholder = 'Confirm your password';
  Object.assign(confirmPasswordInput.style, {
    padding: '12px 15px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s ease',
    backgroundColor: 'rgba(255, 255, 255, 0.8)'
  });
  
  // Add confirmation match indicator
  const confirmPasswordMatchText = document.createElement('div');
  Object.assign(confirmPasswordMatchText.style, {
    fontSize: '12px',
    color: '#777',
    marginTop: '6px',
    transition: 'all 0.3s ease'
  });
  
  // Update match text based on inputs
  confirmPasswordInput.addEventListener('input', () => {
    if (passwordInput.value || confirmPasswordInput.value) {
      checkPasswordsMatch(passwordInput.value, confirmPasswordInput.value, confirmPasswordMatchText);
    } else {
      confirmPasswordMatchText.innerText = '';
    }
  });
  
  // Add input field focus effect
  confirmPasswordInput.addEventListener('focus', () => {
    confirmPasswordInput.style.borderColor = '#1976d2';
    confirmPasswordInput.style.boxShadow = '0 0 0 3px rgba(25, 118, 210, 0.2)';
    confirmPasswordInput.style.backgroundColor = '#ffffff';
  });
  
  confirmPasswordInput.addEventListener('blur', () => {
    confirmPasswordInput.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    confirmPasswordInput.style.boxShadow = 'none';
    confirmPasswordInput.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
  });
  
  confirmPasswordContainer.appendChild(confirmPasswordLabel);
  confirmPasswordContainer.appendChild(confirmPasswordInput);
  confirmPasswordContainer.appendChild(confirmPasswordMatchText);
  
  // Error message container
  const errorContainer = document.createElement('div');
  Object.assign(errorContainer.style, {
    color: '#e53935',
    fontSize: '14px',
    padding: '10px 15px',
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    borderRadius: '8px',
    marginTop: '10px',
    display: 'none',
    border: '1px solid rgba(229, 57, 53, 0.3)',
    boxShadow: '0 2px 6px rgba(229, 57, 53, 0.15)',
    transition: 'all 0.3s ease'
  });
  
  formContainer.appendChild(usernameContainer);
  formContainer.appendChild(passwordContainer);
  formContainer.appendChild(confirmPasswordContainer);
  formContainer.appendChild(errorContainer);
  
  // Button container
  const buttonContainer = document.createElement('div');
  Object.assign(buttonContainer.style, {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '15px',
    marginTop: '15px'
  });
  
  // Create primary button (login/register)
  const primaryButton = document.createElement('button');
  primaryButton.innerText = currentAuthMode === 'login' ? 'Login' : 'Register';
  Object.assign(primaryButton.style, {
    flex: '1',
    padding: '14px',
    background: 'linear-gradient(to right, #1976d2, #2196f3)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)'
  });
  
  // Add button hover effect
  primaryButton.addEventListener('mouseover', () => {
    primaryButton.style.background = 'linear-gradient(to right, #1565c0, #1976d2)';
    primaryButton.style.transform = 'translateY(-2px)';
    primaryButton.style.boxShadow = '0 6px 15px rgba(33, 150, 243, 0.4)';
  });
  
  primaryButton.addEventListener('mouseout', () => {
    primaryButton.style.background = 'linear-gradient(to right, #1976d2, #2196f3)';
    primaryButton.style.transform = 'translateY(0)';
    primaryButton.style.boxShadow = '0 4px 10px rgba(33, 150, 243, 0.3)';
  });
  
  // Create secondary button (switch to register/login)
  const secondaryButton = document.createElement('button');
  secondaryButton.innerText = currentAuthMode === 'login' ? 'Register' : 'Return to Login';
  Object.assign(secondaryButton.style, {
    flex: '1',
    padding: '14px',
    background: 'rgba(25, 118, 210, 0.08)',
    color: '#1976d2',
    border: '1px solid rgba(25, 118, 210, 0.3)',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 6px rgba(25, 118, 210, 0.1)'
  });
  
  // Add button hover effect
  secondaryButton.addEventListener('mouseover', () => {
    secondaryButton.style.background = 'rgba(25, 118, 210, 0.15)';
    secondaryButton.style.transform = 'translateY(-2px)';
    secondaryButton.style.boxShadow = '0 4px 10px rgba(25, 118, 210, 0.2)';
  });
  
  secondaryButton.addEventListener('mouseout', () => {
    secondaryButton.style.background = 'rgba(25, 118, 210, 0.08)';
    secondaryButton.style.transform = 'translateY(0)';
    secondaryButton.style.boxShadow = '0 2px 6px rgba(25, 118, 210, 0.1)';
  });
  
  // Close button
  const closeButtonContainer = document.createElement('div');
  Object.assign(closeButtonContainer.style, {
    position: 'absolute',
    top: '15px',
    right: '15px'
  });
  
  const closeButton = document.createElement('div');
  closeButton.innerHTML = '&times;';
  Object.assign(closeButton.style, {
    cursor: 'pointer',
    fontSize: '24px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: 'rgba(0, 0, 0, 0.05)',
    transition: 'background 0.3s ease, transform 0.2s ease'
  });
  
  closeButton.addEventListener('mouseover', () => {
    closeButton.style.background = 'rgba(0, 0, 0, 0.1)';
    closeButton.style.transform = 'rotate(90deg)';
  });
  
  closeButton.addEventListener('mouseout', () => {
    closeButton.style.background = 'rgba(0, 0, 0, 0.05)';
    closeButton.style.transform = 'rotate(0deg)';
  });
  
  closeButton.addEventListener('click', closeAuthPopup);
  
  closeButtonContainer.appendChild(closeButton);
  
  // Add button event handlers
  primaryButton.addEventListener('click', () => {
    // Hide previous errors
    errorContainer.style.display = 'none';
    
    if (currentAuthMode === 'login') {
      handleLogin(usernameInput.value, passwordInput.value, errorContainer);
    } else {
      // Check if passwords match before submitting
      if (passwordInput.value !== confirmPasswordInput.value) {
        showError(errorContainer, 'Passwords do not match');
        return;
      }
      
      // Check password strength
      const strength = checkPasswordStrength(passwordInput.value);
      if (strength.score < 2) {
        showError(errorContainer, 'Password is too weak. Please create a stronger password.');
        return;
      }
      
      handleRegister(usernameInput.value, passwordInput.value, errorContainer);
    }
  });
  
  // Modified secondary button click event - update UI instead of recreating
  secondaryButton.addEventListener('click', () => {
    // Switch mode
    currentAuthMode = currentAuthMode === 'login' ? 'register' : 'login';
    
    // Update UI elements instead of closing and recreating
    title.innerText = currentAuthMode === 'login' ? "Welcome!" : "Register";
    
    // Recreate title underline decoration
    let titleUnderline = title.querySelector('div');
    if (!titleUnderline) {
      titleUnderline = document.createElement('div');
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
    }
    
    primaryButton.innerText = currentAuthMode === 'login' ? 'Login' : 'Register';
    secondaryButton.innerText = currentAuthMode === 'login' ? 'Register' : 'Return to Login';
    
    // Get all form containers
    const formContainers = loginContainer.querySelectorAll('div[style*="display: flex"][style*="flex-direction: column"]');
    
    // Ensure username and password input containers are always visible
    if (formContainers.length >= 2) {
      formContainers[0].style.display = 'flex'; // Username container
      formContainers[1].style.display = 'flex'; // Password container
    }
    
    // Confirm password container visibility control
    const confirmContainer = loginContainer.querySelector('.confirm-password-container');
    if (confirmContainer) {
      confirmContainer.style.display = currentAuthMode === 'register' ? 'flex' : 'none';
    } else {
      // Fallback method: Find confirm password field
      const backupConfirmContainer = Array.from(formContainers).find(cont => {
        const label = cont.querySelector('label');
        return label && label.innerText.toLowerCase().includes('confirm');
      });
      
      if (backupConfirmContainer) {
        backupConfirmContainer.style.display = currentAuthMode === 'register' ? 'flex' : 'none';
      }
    }
    
    // Password strength container visibility control
    const strengthContainer = loginContainer.querySelector('.password-strength-container');
    if (strengthContainer) {
      strengthContainer.style.display = currentAuthMode === 'register' ? 'flex' : 'none';
    } else {
      // Fallback method: Use old selector
      const backupStrengthContainer = loginContainer.querySelector('div[style*="gap: 6px"]');
      if (backupStrengthContainer) {
        backupStrengthContainer.style.display = currentAuthMode === 'register' ? 'flex' : 'none';
      }
    }
    
    // Handle login description text visibility
    const existingDescription = titleContainer.querySelector('p');
    if (currentAuthMode === 'login') {
      // If in login mode but no description text exists, add it
      if (!existingDescription) {
        const loginDescription = document.createElement('p');
        loginDescription.innerText = "Please login to use the LLM summary assistant :)";
        Object.assign(loginDescription.style, {
          fontSize: '14px',
          color: '#666',
          textAlign: 'center',
          margin: '10px 0 0 0',
          fontWeight: '400'
        });
        titleContainer.appendChild(loginDescription);
      }
    } else {
      // If in register mode and description text exists, remove it
      if (existingDescription) {
        existingDescription.remove();
      }
    }
    
    // Clear form fields
    usernameInput.value = '';
    passwordInput.value = '';
    confirmPasswordInput.value = '';
    
    // Reset password strength indicator
    updatePasswordStrength(0, strengthBar, strengthText);
    confirmPasswordMatchText.innerText = '';
    
    // Hide any error/success messages
    errorContainer.style.display = 'none';
    
    // Small animation effect to indicate change
    loginContainer.style.transform = 'translate(-50%, -48%) scale(0.98)';
    setTimeout(() => {
      loginContainer.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 150);
  });
  
  buttonContainer.appendChild(secondaryButton);
  buttonContainer.appendChild(primaryButton);
  
  // Assemble login page
  loginContainer.appendChild(closeButtonContainer);
  loginContainer.appendChild(titleContainer);
  loginContainer.appendChild(formContainer);
  loginContainer.appendChild(buttonContainer);
  
  document.body.appendChild(loginContainer);
  
  // Store login UI elements
  authPopup = {
    container: loginContainer,
    overlay: overlay,
    errorContainer: errorContainer,
    usernameInput: usernameInput,
    passwordInput: passwordInput,
    confirmPasswordInput: confirmPasswordInput
  };
  
  // Add animation effect
  setTimeout(() => {
    loginContainer.style.opacity = '1';
    loginContainer.style.transform = 'translate(-50%, -50%) scale(1)';
    overlay.style.opacity = '1';
  }, 50);
  
  return authPopup;
}

// Close login page with improved cleanup and animations
function closeAuthPopup() {
  if (authPopup) {
    // Start fade-out animation
    authPopup.container.style.opacity = '0';
    authPopup.container.style.transform = 'translate(-50%, -45%) scale(0.9)';
    authPopup.overlay.style.opacity = '0';
    
    // Clear any error blinking animation
    if (errorBlinkInterval) {
      clearInterval(errorBlinkInterval);
      errorBlinkInterval = null;
    }
    
    // Immediately disable pointer events to allow clicking on the page
    authPopup.overlay.style.pointerEvents = 'none';
    
    // Reset current mode to login page for next open
    currentAuthMode = 'login';
    
    // Clean up after animation
    setTimeout(() => {
      try {
        // Remove DOM elements if they still exist
        if (authPopup.container && authPopup.container.parentNode) {
          authPopup.container.parentNode.removeChild(authPopup.container);
        }
        if (authPopup.overlay && authPopup.overlay.parentNode) {
          authPopup.overlay.parentNode.removeChild(authPopup.overlay);
        }
        
        // Clear all remaining event listeners
        if (authPopup.overlay) {
          const newOverlay = authPopup.overlay.cloneNode(true);
          if (authPopup.overlay.parentNode) {
            authPopup.overlay.parentNode.replaceChild(newOverlay, authPopup.overlay);
          }
        }
      } catch (e) {
        console.error('Error during auth popup cleanup:', e);
      } finally {
        // Always reset the authPopup variable
        authPopup = null;
      }
    }, 500);
  }
}

// Function to remove all auth-related elements from the DOM (for emergency cleanup)
function forceCleanupAuthElements() {
  // Remove any auth popups
  const popups = document.querySelectorAll('#auth-popup');
  popups.forEach(popup => {
    if (popup && popup.parentNode) {
      popup.parentNode.removeChild(popup);
    }
  });
  
  // Remove any auth overlays
  const overlays = document.querySelectorAll('#auth-overlay');
  overlays.forEach(overlay => {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });
  
  // Reset current mode to login page
  currentAuthMode = 'login';
  
  // Reset global variable
  authPopup = null;
}

// Call this function when tab is about to be closed or on severe errors
window.addEventListener('beforeunload', forceCleanupAuthElements);

// Add emergency cleanup to any unhandled errors
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('auth')) {
    forceCleanupAuthElements();
  }
});

// Show login page
function showAuthPopup() {
  // Check if there's already an open popup
  if (authPopup && authPopup.container && document.body.contains(authPopup.container)) {
    // Just update visibility if it already exists
    authPopup.container.style.opacity = '1';
    authPopup.overlay.style.opacity = '1';
    authPopup.overlay.style.pointerEvents = 'auto';
    return;
  }
  
  createLoginPage();
}

// Handle login
async function handleLogin(username, password, errorContainer) {
  if (!username || !password) {
    showError(errorContainer, 'Please enter username and password');
    return;
  }
  
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Login successful
      showSuccessMessage(errorContainer, 'Login successful');
      
      // Save login status with role information
      saveLoginStatus(true, { 
        username, 
        role: data.role
      });
      
      // Delay closing login page and showing summary
      setTimeout(() => {
        closeAuthPopup();
        
        // Trigger summary
        chrome.runtime.sendMessage({
          action: "summarizePolicy",
          url: currentHoveredLink
        });
      }, 1000);
    } else {
      // Login failed
      showError(errorContainer, data.detail || 'Username or password incorrect');
    }
  } catch (error) {
    showError(errorContainer, 'Network error, please try again later');
    console.error('Login error:', error);
  }
}

// Handle registration with password confirmation
async function handleRegister(username, password, errorContainer) {
  if (!username || !password) {
    showError(errorContainer, 'Please enter username and password');
    return;
  }
  
  // Get the confirmPasswordInput if it exists in the current UI
  const confirmPasswordInput = authPopup ? authPopup.confirmPasswordInput : null;
  
  // Check password confirmation if element exists
  if (confirmPasswordInput && confirmPasswordInput.value !== password) {
    showError(errorContainer, 'Passwords do not match');
    return;
  }
  
  // Check password strength
  const strength = checkPasswordStrength(password);
  if (strength.score < 2) {
    showError(errorContainer, `Password is too weak. ${strength.feedback}`);
    return;
  }
  
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      // If response is not valid JSON
      data = { message: 'Invalid server response' };
    }
    
    if (response.ok) {
      // Registration successful
      showSuccessMessage(errorContainer, 'Registration successful, please login');
      
      // Delay switching to login mode without closing the window
      setTimeout(() => {
        // Switch to login mode without closing the window
        if (authPopup) {
          // Get references to UI elements
          const title = authPopup.container.querySelector('h2');
          const primaryButton = authPopup.container.querySelectorAll('button')[1];
          const secondaryButton = authPopup.container.querySelectorAll('button')[0];
          const usernameInput = authPopup.usernameInput;
          const passwordInput = authPopup.passwordInput;
          const titleContainer = title.parentNode;
          
          // Update UI
          currentAuthMode = 'login';
          title.innerText = "Welcome!";
          
          // Recreate title underline decoration
          let titleUnderline = title.querySelector('div');
          if (!titleUnderline) {
            titleUnderline = document.createElement('div');
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
          }
          
          primaryButton.innerText = 'Login';
          secondaryButton.innerText = 'Register';
          
          // Keep the username but clear password
          passwordInput.value = '';
          
          // Clear error message
          errorContainer.style.display = 'none';
          
          // Ensure username and password input containers are always visible
          const formContainers = authPopup.container.querySelectorAll('div[style*="display: flex"][style*="flex-direction: column"]');
          if (formContainers.length >= 2) {
            // First and second containers are username and password input containers
            formContainers[0].style.display = 'flex'; // Username container
            formContainers[1].style.display = 'flex'; // Password container
          }
          
          // Confirm password container visibility control
          const confirmContainer = authPopup.container.querySelector('.confirm-password-container');
          if (confirmContainer) {
            confirmContainer.style.display = 'none';
          } else {
            // Fallback method: Find confirm password field
            const backupConfirmContainer = Array.from(formContainers).find(cont => {
              const label = cont.querySelector('label');
              return label && label.innerText.toLowerCase().includes('confirm');
            });
            
            if (backupConfirmContainer) {
              backupConfirmContainer.style.display = 'none';
            }
          }
          
          // Password strength container visibility control
          const strengthContainer = authPopup.container.querySelector('.password-strength-container');
          if (strengthContainer) {
            strengthContainer.style.display = 'none';
          } else {
            // Fallback method: Use old selector
            const backupStrengthContainer = authPopup.container.querySelector('div[style*="gap: 6px"]');
            if (backupStrengthContainer) {
              backupStrengthContainer.style.display = 'none';
            }
          }
          
          // Handle login description text visibility
          const existingDescription = titleContainer.querySelector('p');
          if (!existingDescription) {
            const loginDescription = document.createElement('p');
            loginDescription.innerText = "Please login to use the LLM summary assistant :)";
            Object.assign(loginDescription.style, {
              fontSize: '14px',
              color: '#666',
              textAlign: 'center',
              margin: '10px 0 0 0',
              fontWeight: '400'
            });
            titleContainer.appendChild(loginDescription);
          }
          
          // Small animation effect
          authPopup.container.style.transform = 'translate(-50%, -48%) scale(0.98)';
          setTimeout(() => {
            authPopup.container.style.transform = 'translate(-50%, -50%) scale(1)';
          }, 150);
        }
      }, 1000);
    } else {
      // Registration failed
      showError(errorContainer, data.detail || 'Registration failed');
    }
  } catch (error) {
    showError(errorContainer, 'Network error, please try again later');
    console.error('Register error:', error);
  }
}

// Display error message
function showError(container, message) {
  if (!container) return;
  
  // Clear any existing blink interval
  if (errorBlinkInterval) {
    clearInterval(errorBlinkInterval);
    errorBlinkInterval = null;
  }
  
  // Set initial styles
  container.innerText = message;
  container.style.display = 'block';
  container.style.backgroundColor = 'rgba(229, 57, 53, 0.15)';
  container.style.color = '#e53935';
  container.style.border = '1px solid rgba(229, 57, 53, 0.3)';
  container.style.boxShadow = '0 2px 8px rgba(229, 57, 53, 0.2)';
  
  // Create a blink animation for 3 seconds
  let blinkCount = 0;
  errorBlinkInterval = setInterval(() => {
    if (blinkCount % 2 === 0) {
      container.style.backgroundColor = 'rgba(229, 57, 53, 0.25)';
      container.style.boxShadow = '0 2px 10px rgba(229, 57, 53, 0.3)';
      container.style.transform = 'translateY(-1px)';
    } else {
      container.style.backgroundColor = 'rgba(229, 57, 53, 0.15)';
      container.style.boxShadow = '0 2px 8px rgba(229, 57, 53, 0.2)';
      container.style.transform = 'translateY(0)';
    }
    
    blinkCount++;
    
    // Stop blinking after 6 cycles (3 seconds)
    if (blinkCount >= 6) {
      clearInterval(errorBlinkInterval);
      errorBlinkInterval = null;
      
      // Return to normal state
      container.style.backgroundColor = 'rgba(229, 57, 53, 0.1)';
      container.style.boxShadow = '0 2px 6px rgba(229, 57, 53, 0.15)';
      container.style.transform = 'translateY(0)';
    }
  }, 500);
}

// Display success message
function showSuccessMessage(container, message) {
  if (!container) return;
  container.innerText = message;
  container.style.display = 'block';
  container.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
  container.style.color = '#43a047';
}

// Create profile page
function createProfilePage(summaryRect) {
  // If already exists, remove it first
  if (profilePopup && profilePopup.container) {
    profilePopup.container.remove();
  }
  
  // Create profile container
  const profileContainer = document.createElement('div');
  profileContainer.id = 'profile-popup';
  
  // Set style (consistent with chatbox style)
  Object.assign(profileContainer.style, {
    position: 'fixed',
    top: summaryRect ? `${summaryRect.top}px` : '50%',
    left: summaryRect ? `${summaryRect.left - 420 - 25}px` : '50%',
    transform: 'scale(0.1)',
    transformOrigin: 'top right',
    zIndex: 99999,
    width: '420px',
    height: summaryRect ? `${Math.min(summaryRect.height * 0.92, 550)}px` : '400px',
    maxHeight: '75vh',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    opacity: '0',
    transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  });
  
  // Create page header
  const profileHeader = document.createElement('div');
  Object.assign(profileHeader.style, {
    padding: '15px 20px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    background: 'transparent',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    color: '#333'
  });
  
  // Title - using the same style as other pages
  const profileTitle = document.createElement('h2');
  profileTitle.innerText = 'Profile';
  Object.assign(profileTitle.style, {
    marginTop: '0',
    marginBottom: '0.8em',
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
  profileTitle.appendChild(titleUnderline);
  
  // Close button container
  const buttonContainer = document.createElement('div');
  Object.assign(buttonContainer.style, {
    position: 'absolute',
    top: '15px',
    right: '15px',
    zIndex: 1
  });
  
  // Close button
  const closeButton = document.createElement('div');
  Object.assign(closeButton.style, {
    cursor: 'pointer',
    fontSize: '20px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: 'rgba(0, 0, 0, 0.05)',
    transition: 'background 0.3s ease'
  });
  closeButton.innerHTML = '&times;';
  
  closeButton.addEventListener('mouseover', () => {
    closeButton.style.background = 'rgba(0, 0, 0, 0.1)';
  });
  
  closeButton.addEventListener('mouseout', () => {
    closeButton.style.background = 'rgba(0, 0, 0, 0.05)';
  });
  
  closeButton.addEventListener('click', closeProfilePopup);
  
  buttonContainer.appendChild(closeButton);
  profileHeader.appendChild(profileTitle);
  profileHeader.appendChild(buttonContainer);
  
  // Create content area
  const profileContent = document.createElement('div');
  Object.assign(profileContent.style, {
    flex: '1',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    overflow: 'auto',
    // Custom scrollbar styling - match with summary page and chat page
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(25, 118, 210, 0.3) transparent'
  });
  
  // Add webkit scrollbar styles
  const scrollbarStyle = document.createElement('style');
  scrollbarStyle.textContent = `
    #profile-popup div[style*="flex: 1"]::-webkit-scrollbar {
      width: 8px;
    }
    
    #profile-popup div[style*="flex: 1"]::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 4px;
    }
    
    #profile-popup div[style*="flex: 1"]::-webkit-scrollbar-thumb {
      background-color: rgba(25, 118, 210, 0.3);
      border-radius: 4px;
      transition: background-color 0.3s ease;
    }
    
    #profile-popup div[style*="flex: 1"]::-webkit-scrollbar-thumb:hover {
      background-color: rgba(25, 118, 210, 0.5);
    }
    
    #profile-popup div[style*="flex: 1"]:not(:hover)::-webkit-scrollbar-thumb {
      background-color: transparent;
    }
    
    #profile-popup div[style*="flex: 1"]:not(:hover) {
      scrollbar-color: transparent transparent;
    }
  `;
  document.head.appendChild(scrollbarStyle);
  
  // User information
  const userInfoContainer = document.createElement('div');
  Object.assign(userInfoContainer.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 0',
    gap: '10px'
  });
  
  // User avatar
  const userAvatar = document.createElement('div');
  Object.assign(userAvatar.style, {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1976d2, #2196f3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '10px'
  });
  userAvatar.innerText = userInfo?.username?.charAt(0).toUpperCase() || 'U';
  
  // Username
  const usernameText = document.createElement('div');
  Object.assign(usernameText.style, {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '5px'
  });
  usernameText.innerText = userInfo?.username || 'User';
  
  // Add role badge for admin
  const isAdmin = userInfo?.role === 'admin';
  if (isAdmin) {
    const roleBadge = document.createElement('div');
    Object.assign(roleBadge.style, {
      fontSize: '12px',
      padding: '3px 10px',
      borderRadius: '12px',
      background: 'linear-gradient(to right, #ff9800, #ff5722)',
      color: 'white',
      fontWeight: '500',
      marginBottom: '10px',
      boxShadow: '0 2px 5px rgba(255, 87, 34, 0.3)'
    });
    roleBadge.innerText = 'Administrator';
    userInfoContainer.appendChild(roleBadge);
  }
  
  userInfoContainer.appendChild(userAvatar);
  userInfoContainer.appendChild(usernameText);
  
  // Divider
  const divider = document.createElement('div');
  Object.assign(divider.style, {
    width: '100%',
    height: '1px',
    background: 'rgba(0, 0, 0, 0.1)',
    margin: '10px 0'
  });
  
  // Admin control panel - only visible to admins
  if (isAdmin) {
    const adminPanel = document.createElement('div');
    Object.assign(adminPanel.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      background: 'rgba(25, 118, 210, 0.05)',
      borderRadius: '8px',
      padding: '15px',
      border: '1px solid rgba(25, 118, 210, 0.1)',
      marginBottom: '15px'
    });
    
    // Admin panel title
    const adminPanelTitle = document.createElement('div');
    adminPanelTitle.innerText = 'Admin Controls';
    Object.assign(adminPanelTitle.style, {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1976d2',
      marginBottom: '5px'
    });
    
    // Add Chatbox visibility toggle
    const chatboxVisibilityControl = document.createElement('div');
    Object.assign(chatboxVisibilityControl.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 10px',
      backgroundColor: '#fff',
      borderRadius: '6px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    });
    
    // Switch label
    const switchLabel = document.createElement('div');
    switchLabel.innerText = 'Enable Chat Feature';
    Object.assign(switchLabel.style, {
      fontSize: '14px',
      fontWeight: '500'
    });
    
    // Create toggle switch control
    const toggleSwitch = document.createElement('div');
    Object.assign(toggleSwitch.style, {
      position: 'relative',
      width: '40px',
      height: '20px',
      backgroundColor: '#ccc',
      borderRadius: '20px',
      transition: 'background-color 0.3s',
      cursor: 'pointer'
    });
    
    // Switch slider
    const switchSlider = document.createElement('div');
    Object.assign(switchSlider.style, {
      position: 'absolute',
      top: '2px',
      left: '2px',
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      background: '#fff',
      transition: 'transform 0.3s ease',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
    });
    
    // Save current state variable
    let isChatboxEnabled = false;
    
    // Initialize state
    function initChatboxState() {
      // Send request to get current state
      fetch(`${API_CONFIG.BASE_URL}/api/get_visibility?feature=extension`)
        .then(response => response.json())
        .then(data => {
          isChatboxEnabled = data.visible;
          updateSwitchState();
        })
        .catch(error => {
          console.error('Error fetching chatbox visibility:', error);
          // Default to not visible
          isChatboxEnabled = false;
          updateSwitchState();
        });
    }
    
    // Update switch visual state
    function updateSwitchState() {
      if (isChatboxEnabled) {
        toggleSwitch.style.backgroundColor = '#4caf50';
        switchSlider.style.transform = 'translateX(20px)';
      } else {
        toggleSwitch.style.backgroundColor = '#ccc';
        switchSlider.style.transform = 'translateX(0)';
      }
    }
    
    // Switch click event
    toggleSwitch.addEventListener('click', () => {
      // Toggle state
      isChatboxEnabled = !isChatboxEnabled;
      
      // Update switch appearance
      updateSwitchState();
      
      // Call API to update state
      fetch(`${API_CONFIG.BASE_URL}/api/toggle_visibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: userInfo.username,
          feature: 'extension',
          visible: isChatboxEnabled
        })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Visibility toggled successfully:', data);
      })
      .catch(error => {
        console.error('Error toggling visibility:', error);
        // Restore previous state
        isChatboxEnabled = !isChatboxEnabled;
        updateSwitchState();
      });
    });
    
    // Initialize get state
    initChatboxState();
    
    // Add slider to switch
    toggleSwitch.appendChild(switchSlider);
    
    // Add label and switch to control
    chatboxVisibilityControl.appendChild(switchLabel);
    chatboxVisibilityControl.appendChild(toggleSwitch);
    
    // Add to admin panel
    adminPanel.appendChild(adminPanelTitle);
    adminPanel.appendChild(chatboxVisibilityControl);
    
    // Add to content area
    profileContent.appendChild(adminPanel);
  }
  
  // Logout button
  const logoutButton = document.createElement('button');
  logoutButton.innerText = 'Logout';
  Object.assign(logoutButton.style, {
    padding: '12px 20px',
    margin: '20px 0',
    background: 'linear-gradient(to right, #1976d2, #2196f3)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    alignSelf: 'center',
    width: '100%',
    maxWidth: '300px'
  });
  
  // Add button hover effect
  logoutButton.addEventListener('mouseover', () => {
    logoutButton.style.background = 'linear-gradient(to right, #1565c0, #1976d2)';
    logoutButton.style.transform = 'translateY(-2px)';
  });
  
  logoutButton.addEventListener('mouseout', () => {
    logoutButton.style.background = 'linear-gradient(to right, #1976d2, #2196f3)';
    logoutButton.style.transform = 'translateY(0)';
  });
  
  // Logout button click event
  logoutButton.addEventListener('click', () => {
    handleLogout();
  });
  
  // Assemble content
  profileContent.appendChild(userInfoContainer);
  profileContent.appendChild(divider);
  profileContent.appendChild(logoutButton);
  
  // Assemble profile page
  profileContainer.appendChild(profileHeader);
  profileContainer.appendChild(profileContent);
  document.body.appendChild(profileContainer);
  
  // Store profile UI elements
  profilePopup = {
    container: profileContainer
  };
  
  // Add animation effect
  setTimeout(() => {
    profileContainer.style.opacity = '1';
    profileContainer.style.transform = 'scale(1)';
  }, 50);
  
  return profilePopup;
}

// Close profile page
function closeProfilePopup() {
  if (profilePopup && profilePopup.container) {
    // Add closing animation
    profilePopup.container.style.opacity = '0';
    profilePopup.container.style.transform = 'scale(0.1)';
    
    setTimeout(() => {
      if (profilePopup.container.parentNode) {
        profilePopup.container.parentNode.removeChild(profilePopup.container);
      }
      profilePopup = null;
    }, 500);
  }
}

// Sync profile page position
function syncProfilePosition() {
  if (!profilePopup || !profilePopup.container) return;
  
  const summaryPopup = document.getElementById('summary-popup');
  if (!summaryPopup) return;
  
  const summaryRect = summaryPopup.getBoundingClientRect();
  
  // Update profile page position and size
  Object.assign(profilePopup.container.style, {
    top: `${summaryRect.top}px`,
    left: `${summaryRect.left - 420 - 25}px`,
    height: `${Math.min(summaryRect.height * 0.92, 550)}px`
  });
}

// Handle logout
function handleLogout() {
  // Remove login status
  removeLoginStatus();
  
  // Get profile page
  if (profilePopup && profilePopup.container) {
    try {
      // Hide logout button and other content, keep only user info
      const userInfoContainer = profilePopup.container.querySelector('div[style*="align-items: center"][style*="padding: 20px"]');
      const logoutButton = profilePopup.container.querySelector('button');
      const divider = profilePopup.container.querySelector('div[style*="height: 1px"]');
      
      if (logoutButton) {
        logoutButton.style.display = 'none';
      }
      
      if (divider) {
        divider.style.display = 'none';
      }
      
      // Create logout success message container
      const messageContainer = document.createElement('div');
      Object.assign(messageContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '15px 0',
        gap: '10px',
        margin: '10px 0'
      });
      
      // Success icon
      const successIcon = document.createElement('div');
      Object.assign(successIcon.style, {
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        backgroundColor: '#4caf50',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '10px',
        boxShadow: '0 3px 8px rgba(76, 175, 80, 0.3)',
        transform: 'scale(0)',
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      });
      
      successIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      
      // Create logout success message text
      const logoutMessage = document.createElement('div');
      logoutMessage.innerText = "Logout successfully!";
      Object.assign(logoutMessage.style, {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        opacity: '0',
        transform: 'translateY(10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease'
      });
      
      // Add to profile page
      messageContainer.appendChild(successIcon);
      messageContainer.appendChild(logoutMessage);
      
      // Get profile content area
      const profileContent = profilePopup.container.querySelector('div[style*="flex: 1"]');
      if (profileContent) {
        // Add after user info
        if (userInfoContainer && userInfoContainer.nextSibling) {
          profileContent.insertBefore(messageContainer, userInfoContainer.nextSibling);
        } else {
          profileContent.appendChild(messageContainer);
        }
        
        // Add animation effect
        setTimeout(() => {
          successIcon.style.transform = 'scale(1)';
          
          setTimeout(() => {
            logoutMessage.style.opacity = '1';
            logoutMessage.style.transform = 'translateY(0)';
          }, 200);
        }, 100);
      }
      
      // Delay closing profile page and refresh
      setTimeout(() => {
        // Close profile page
        closeProfilePopup();
        
        // Close other pages
        const summaryContainer = document.getElementById('summary-popup');
        const summaryOverlay = document.getElementById('summary-overlay');
        
        if (summaryContainer) {
          summaryContainer.style.opacity = '0';
          summaryContainer.style.transform = 'translate(-50%, -45%) scale(0.9)';
        }
        
        if (summaryOverlay) {
          summaryOverlay.style.opacity = '0';
        }
        
        // Close potentially open chat window
        if (window.privacyChatbox && typeof window.privacyChatbox.closeChatWindow === 'function') {
          window.privacyChatbox.closeChatWindow();
        }
        
        // Refresh page
        setTimeout(() => {
          window.location.reload();
        }, 400);
      }, 1500);
      
      return; // Return, avoid executing below code
    } catch (e) {
      console.error('Error showing logout message:', e);
      // Continue executing below code
    }
  }
  
  // If no profile page or error, use fallback logic
  closeProfilePopup();
  
  // Close summary page
  const summaryContainer = document.getElementById('summary-popup');
  const summaryOverlay = document.getElementById('summary-overlay');
  
  if (summaryContainer) {
    summaryContainer.style.opacity = '0';
    summaryContainer.style.transform = 'translate(-50%, -45%) scale(0.9)';
  }
  
  if (summaryOverlay) {
    summaryOverlay.style.opacity = '0';
  }
  
  // Close potentially open chat window
  if (window.privacyChatbox && typeof window.privacyChatbox.closeChatWindow === 'function') {
    window.privacyChatbox.closeChatWindow();
  }
  
  // Short delay before refresh
  setTimeout(() => {
    window.location.reload();
  }, 1500);
}

// Add profile button to summary page
function addProfileButtonToSummary() {
  const summaryPopup = document.getElementById('summary-popup');
  if (!summaryPopup) return;
  
  // Check if personal info button already exists, avoid duplicate addition
  const existingButton = summaryPopup.querySelector('.privacy-profile-button');
  if (existingButton) return;
  
  // Try to find title container, but no longer force dependency on it
  const titleContainer = summaryPopup.querySelector('div[style*="textAlign: center"]') || 
                         summaryPopup.querySelector('h2') || 
                         summaryPopup.firstChild;
  
  // Fully match chat button container style
  const profileButtonContainer = document.createElement('div');
  Object.assign(profileButtonContainer.style, {
    position: 'absolute',
    top: '25px',
    left: '25px',
    zIndex: 99999
  });
  
  // Add personal info button - match chat button style
  const profileButton = document.createElement('div');
  profileButton.className = 'privacy-profile-button';
  Object.assign(profileButton.style, {
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
  
  // Personal info icon
  const userIcon = document.createElement('div');
  Object.assign(userIcon.style, {
    width: '18px',
    height: '18px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'translateY(-1px)'
  });
  
  userIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#ffffff">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  `;
  
  profileButton.appendChild(userIcon);
  
  // Same hover effect as chat button, but opposite rotation direction
  profileButton.addEventListener('mouseover', () => {
    profileButton.style.transform = 'scale(1.1) rotate(-5deg)';
    profileButton.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
  });
  
  profileButton.addEventListener('mouseout', () => {
    profileButton.style.transform = 'scale(1) rotate(0deg)';
    profileButton.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
  });
  
  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'profile-button-tooltip';
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
    left: '42px',
    top: '8px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
  });
  tooltip.textContent = 'User Profile';
  
  // Tooltip arrow
  const arrow = document.createElement('div');
  Object.assign(arrow.style, {
    position: 'absolute',
    top: '50%',
    left: '-4px',
    transform: 'translateY(-50%)',
    width: '0',
    height: '0',
    borderTop: '4px solid transparent',
    borderBottom: '4px solid transparent',
    borderRight: '4px solid white'
  });
  tooltip.appendChild(arrow);
  
  // Show/hide tooltip
  profileButton.addEventListener('mouseover', () => {
    tooltip.style.opacity = '1';
  });
  
  profileButton.addEventListener('mouseout', () => {
    tooltip.style.opacity = '0';
  });
  
  // Button click event
  profileButton.addEventListener('click', (e) => {
    const buttonRect = profileButton.getBoundingClientRect();
    const summaryRect = summaryPopup.getBoundingClientRect();
    createProfilePage(summaryRect);
    window.addEventListener('resize', syncProfilePosition);
  });
  
  profileButtonContainer.appendChild(profileButton);
  profileButtonContainer.appendChild(tooltip);
  
  // Flexible positioning: Try several positioning methods to ensure button is always added
  // 1. First try as next element of title
  if (titleContainer && titleContainer.nextSibling) {
    summaryPopup.insertBefore(profileButtonContainer, titleContainer.nextSibling);
  } 
  // 2. Try adding as element after title container
  else if (titleContainer && titleContainer.parentNode) {
    titleContainer.parentNode.insertBefore(profileButtonContainer, titleContainer.nextSibling);
  }
  // 3. Add as first child element
  else if (summaryPopup.firstChild) {
    summaryPopup.insertBefore(profileButtonContainer, summaryPopup.firstChild.nextSibling);
  }
  // 4. If none of the above, add to end of summary popup
  else {
    summaryPopup.appendChild(profileButtonContainer);
    console.log('Added profile button to end of summary popup');
  }
  
  // Add debug info to help troubleshoot
  console.log('Profile button added, found titleContainer:', !!titleContainer);
}

// Intercept showSummary message, check login status
function interceptShowSummary() {
  const originalShowOrUpdatePopup = window.showOrUpdatePopup || showOrUpdatePopup;
  
  // If showOrUpdatePopup function exists, redefine it
  if (typeof originalShowOrUpdatePopup === 'function') {
    window.showOrUpdatePopup = function(isLoading, text, isError) {
      if (!isLoggedIn) {
        // If not logged in, show login page first
        showAuthPopup();
        return;
      }
      
      // Normal display summary
      originalShowOrUpdatePopup(isLoading, text, isError);
      
      // If loading is complete and no error, add profile button
      if (!isLoading && !isError) {
        // Use longer delay to ensure DOM fully loaded
        setTimeout(() => {
          // Try to add personal info button
          addProfileButtonToSummary();
          // Add extra safeguard to ensure even if title container not found, add button
          const summaryPopup = document.getElementById('summary-popup');
          const existingButton = summaryPopup && summaryPopup.querySelector('.privacy-profile-button');
          // If no button, try again
          if (summaryPopup && !existingButton) {
            console.log('First attempt to add profile button failed, trying emergency method');
            // Create personal info button container
            const profileButtonContainer = document.createElement('div');
            Object.assign(profileButtonContainer.style, {
              position: 'absolute',
              top: '25px',
              left: '25px',
              zIndex: 99999
            });
            
            // Add personal info button
            const profileButton = document.createElement('div');
            profileButton.className = 'privacy-profile-button';
            Object.assign(profileButton.style, {
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
            
            // Personal info icon
            const userIcon = document.createElement('div');
            Object.assign(userIcon.style, {
              width: '18px',
              height: '18px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'translateY(-1px)'
            });
            
            userIcon.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#ffffff">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            `;
            
            profileButton.appendChild(userIcon);
            
            // Button click event
            profileButton.addEventListener('click', (e) => {
              const buttonRect = profileButton.getBoundingClientRect();
              const summaryRect = summaryPopup.getBoundingClientRect();
              createProfilePage(summaryRect);
              window.addEventListener('resize', syncProfilePosition);
            });
            
            profileButtonContainer.appendChild(profileButton);
            summaryPopup.appendChild(profileButtonContainer);
            console.log('Added profile button using emergency method');
          }
        }, 500);
      }
    };
  }
  
  // Intercept click event in content.js
  const originalOnclick = floatingIcon ? floatingIcon.onclick : null;
  
  if (floatingIcon && originalOnclick) {
    floatingIcon.onclick = function() {
      if (!isLoggedIn) {
        // If not logged in, show login page
        showAuthPopup();
        return;
      }
      
      // Logged in, call the original click handler
      originalOnclick.call(this);
    };
  }
}

// Function related to floating icon click
function handleIconClick() {
  if (!isLoggedIn) {
    // If not logged in, show login page
    showAuthPopup();
    return;
  }
  
  // If logged in, send normal message to request summary
  chrome.runtime.sendMessage({
    action: "summarizePolicy",
    url: currentHoveredLink
  });
}

// Initialize function, will be called by content.js
function initAuth() {
  // Check login status when page loads
  checkLoginStatus();
  
  // Listen for messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "checkAuth") {
      sendResponse({ isLoggedIn });
    }
  });
}

// Export key functions for content.js to use
window.privacyAuth = {
  checkLoginStatus,
  initAuth,
  showAuthPopup,
  interceptShowSummary,
  handleIconClick,
  addProfileButtonToSummary,
  closeProfilePopup
};

// Check password strength (returns score from 0-4 and feedback)
function checkPasswordStrength(password) {
  if (!password) {
    return { score: 0, feedback: 'none' };
  }
  
  let score = 0;
  const feedback = [];
  
  // Length check
  if (password.length < 6) {
    feedback.push('too short');
  } else if (password.length >= 8) {
    score += 1;
  } else if (password.length >= 12) {
    score += 2;
  }
  
  // Check for mixed case
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) {
    score += 1;
  } else {
    feedback.push('add uppercase & lowercase letters');
  }
  
  // Check for numbers
  if (password.match(/\d/)) {
    score += 1;
  } else {
    feedback.push('add numbers');
  }
  
  // Check for special characters
  if (password.match(/[^a-zA-Z\d]/)) {
    score += 1;
  } else {
    feedback.push('add special characters');
  }
  
  // Determine strength text
  let strengthText = 'very weak';
  if (score >= 4) strengthText = 'very strong';
  else if (score === 3) strengthText = 'strong';
  else if (score === 2) strengthText = 'medium';
  else if (score === 1) strengthText = 'weak';
  
  return { score, strengthText, feedback: feedback.join(', ') };
}

// Update password strength UI elements
function updatePasswordStrength(strength, strengthBar, strengthText) {
  // If strength is already an object, use it, otherwise create a default object
  const strengthData = typeof strength === 'object' 
    ? strength 
    : checkPasswordStrength(strength);
  
  const score = strengthData.score;
  
  // Update strength bar width
  strengthBar.style.width = `${Math.min(score * 25, 100)}%`;
  
  // Update strength bar color
  if (score >= 4) {
    strengthBar.style.backgroundColor = '#4caf50'; // Green
  } else if (score === 3) {
    strengthBar.style.backgroundColor = '#8bc34a'; // Light green
  } else if (score === 2) {
    strengthBar.style.backgroundColor = '#ffeb3b'; // Yellow
  } else if (score === 1) {
    strengthBar.style.backgroundColor = '#ff9800'; // Orange
  } else {
    strengthBar.style.backgroundColor = '#f44336'; // Red
  }
  
  // Update strength text
  strengthText.innerText = `Password strength: ${strengthData.strengthText}`;
  strengthText.style.color = strengthBar.style.backgroundColor;
}

// Check if passwords match and update UI
function checkPasswordsMatch(password, confirmPassword, matchTextElement) {
  if (!password || !confirmPassword) {
    matchTextElement.innerText = '';
    return false;
  }
  
  const match = password === confirmPassword;
  
  matchTextElement.innerText = match ? 'Passwords match' : 'Passwords do not match';
  matchTextElement.style.color = match ? '#4caf50' : '#f44336';
  
  return match;
} 
