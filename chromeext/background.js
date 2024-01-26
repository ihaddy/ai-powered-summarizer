import { BASE_URL, SECURE_TOKEN } from './config.js'

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