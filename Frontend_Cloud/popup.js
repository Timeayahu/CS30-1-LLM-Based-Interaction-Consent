// popup.js

document.addEventListener('DOMContentLoaded', function() {
  // Get toggle button
  const toggleSwitch = document.getElementById('toggle-switch');
  
  // Get tutorial button
  const tutorialBtn = document.getElementById('tutorial-btn');
  
  // Get privacy tutorial button
  const privacyTutorialBtn = document.getElementById('privacy-tutorial-btn');
  
  // Get guided tour button
  const guidedTourBtn = document.getElementById('guided-tour-btn');
  
  // Initialize toggle state
  chrome.storage.local.get(['isEnabled'], function(result) {
    toggleSwitch.checked = result.isEnabled !== false; // Default to true
  });
  
  // Listen for toggle changes
  toggleSwitch.addEventListener('change', function() {
    const isEnabled = toggleSwitch.checked;
    chrome.storage.local.set({ isEnabled: isEnabled });
    
    // Send message to background.js to update icon
    chrome.runtime.sendMessage({
      action: "updateIcon",
      isEnabled: isEnabled
    });
    
    // Send status update message to current tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "toggleEnabled",
          isEnabled: isEnabled
        });
      }
    });
  });
  
  // Listen for tutorial button click
  tutorialBtn.addEventListener('click', function() {
    // Open tutorial page
    chrome.tabs.create({
      url: chrome.runtime.getURL('tutorial.html')
    });
  });
  
  // Listen for privacy tutorial button click
  privacyTutorialBtn.addEventListener('click', function() {
    // Open privacy tutorial page
    chrome.tabs.create({
      url: chrome.runtime.getURL('privacy-tutorial.html')
    });
  });
  
  // Listen for guided tour button click
  guidedTourBtn.addEventListener('click', function() {
    // Send message to current tab to start guided tour
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "startGuidedTour"
        });
        // Close popup after starting tour
        window.close();
      }
    });
  });
}); 