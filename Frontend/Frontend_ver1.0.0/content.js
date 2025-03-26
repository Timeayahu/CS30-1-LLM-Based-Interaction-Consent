(function() {
    try {
      let textContent = "";
      let mainElement = document.querySelector("main, article"); 
      if (mainElement) {
        let mainClone = mainElement.cloneNode(true);
        mainClone.querySelectorAll("script, style, nav, header, footer, aside").forEach(el => el.remove());
        textContent = mainClone.innerText;
      } else {
        let bodyClone = document.body.cloneNode(true);
        bodyClone.querySelectorAll("script, style, nav, header, footer, aside").forEach(el => el.remove());
        textContent = bodyClone.innerText;
      }
  
      textContent = textContent.trim();
      
      // console.log("Extracted content: ", textContent);

      chrome.runtime.sendMessage({ action: "summarize", text: textContent });
    } catch (e) {
      console.error("Content script extraction error:", e);
      chrome.runtime.sendMessage({ action: "summarize", text: "" });
    }
  })();
  