import { BASE_URL, SECURE_TOKEN } from './config.js'

let userCredentials = { jwtToken: null, userEmail: null };

// Check for stored credentials on startup
chrome.runtime.onStartup.addListener(() => {
    console.log("Extension startup: checking for stored credentials.");
    chrome.storage.local.get(['jwtToken', 'userEmail'], function(result) {
      console.log("Stored credentials found:", result);
      if (result.jwtToken && result.userEmail) {
        userCredentials = { jwtToken: result.jwtToken, userEmail: result.userEmail };
        console.log("Credentials loaded:", userCredentials);
        // Notify content script of the stored credentials
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "USER_LOGGED_IN", data: userCredentials });
        });
      }
    });
  });
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);
    if (message.type === "LOGIN_SUCCESS") {
      // Store the JWT and user email in local storage
      userCredentials = message.data;
      console.log("Storing new credentials:", userCredentials);
      chrome.storage.local.set({ 'jwtToken': userCredentials.jwtToken, 'userEmail': userCredentials.userEmail }, function() {
        if (chrome.runtime.lastError) {
          console.error("Error in storage:", chrome.runtime.lastError);
        } else {
          console.log("Credentials stored in local storage.");
          logStoredData(); 
        }
      });
  
      // Notify the content script
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { type: "USER_LOGGED_IN", data: userCredentials });
        });
      });
      
    }
  });

  function logStoredData() {
    chrome.storage.local.get(null, function(items) {
      console.log('All items in storage:', items);
    });
  }



chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "getBaseUrl") {
      sendResponse({ baseUrl: BASE_URL });
    } else if (request.action === "getSecureToken") {
      sendResponse({ secureToken: SECURE_TOKEN });
    }
});

chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked', tab);
    chrome.windows.create({
        url: 'index.html',
        type: 'popup',
        width: 560,
        height: 900
    }, (newWindow) => {
        console.log('Popup window created', newWindow);
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "NEW_ARTICLE_ID") {
        // Forward the message to the React app
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, message);
        });
    }
});