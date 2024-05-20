

let isLoggedIn = false;
let jwtToken = null;
let userEmail = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message in content script:", message);
    if (message.type === "USER_LOGGED_IN") {
      isLoggedIn = true;
      jwtToken = message.data.jwtToken;
      userEmail = message.data.userEmail;
      console.log("User logged in with:", jwtToken, userEmail);
  
      // Update button states or tooltips here
      updateButtonStates(); // Update all buttons' states
    }
  });

  chrome.storage.onChanged.addListener(function(changes, areaName) {
    console.log("Storage changes in area:", areaName, changes);
    if (areaName === "local") {
      if ('jwtToken' in changes || 'userEmail' in changes) {
        // Check if credentials were removed (newValue is undefined)
        if (!changes.jwtToken?.newValue || !changes.userEmail?.newValue) {
          isLoggedIn = false;
          jwtToken = null;
          userEmail = null;
          console.log("User logged out");
        } else {
          isLoggedIn = true;
          jwtToken = changes.jwtToken.newValue;
          userEmail = changes.userEmail.newValue;
          console.log("User logged in with:", jwtToken, userEmail);
        }
        // Update button states or tooltips here
        updateButtonStates();
      }
    }
  });
  

  function initializeContentScript() {
    chrome.storage.local.get(['jwtToken', 'userEmail'], function(result) {
      if (result.jwtToken && result.userEmail) {
        isLoggedIn = true;
        jwtToken = result.jwtToken;
        userEmail = result.userEmail;
        console.log("JWT Token:", result.jwtToken);
        console.log("User Email:", result.userEmail);
        // Update button states or tooltips here
        updateButtonStates();
      } else {
        console.log("No credentials found in storage");
        isLoggedIn = false;
        jwtToken = null;
        userEmail = null;
        updateButtonStates();
      }
    });
  }
  
  function addButton() {
    const elements = document.querySelectorAll('#metadata-line > span:nth-child(4)');

    elements.forEach(targetElement => {
        if (targetElement && !targetElement.hasAttribute('data-button-added')) {
            const button = document.createElement('button');
            button.innerText = 'Summary';
            button.disabled = !isLoggedIn; 
            button.title = isLoggedIn ? 'Click to get summary' : 'Please log in to use this feature';

            button.addEventListener('click', async function () {
                console.log('Button clicked');

                // Start from the button's parent element
                let currentElement = this.parentElement;

                // Traverse up the DOM to find the common ancestor
                while (currentElement && !currentElement.querySelector('ytd-thumbnail')) {
                    // console.log('Current element during traverse:', currentElement);
                    currentElement = currentElement.parentElement;
                }

                // Once the common ancestor is found
                if (currentElement) {
                    // console.log('Found common ancestor:', currentElement);

                    // Find the thumbnail link within the ancestor
                    const thumbnailLink = currentElement.querySelector('ytd-thumbnail a#thumbnail');
                    if (thumbnailLink && thumbnailLink.href) {
                        // console.log('Found thumbnail link:', thumbnailLink);

                        // Extract the video ID from the href attribute
                        const videoId = new URLSearchParams(thumbnailLink.href.split('?')[1]).get('v');
                        console.log('Extracted Video ID:', videoId);

                        if (videoId && isLoggedIn && jwtToken) {
                            console.log('Sending Video ID to remote endpoint:', videoId);

                            try {
                                const response = await fetch(`${BASE_URL}/summarize-videos`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'securetoken': SECURE_TOKEN,
                                        'Authorization': `Bearer ${jwtToken}`

                                    },
                                    body: JSON.stringify({ videoId: videoId }),
                                });

                                if (response.ok) {
                                    const responseData = await response.json();
                                    console.log('Response from server:', responseData);
                                    // Handle the response data here

                                    // Send a message to the background script with the articleId
                                    chrome.runtime.sendMessage({ type: "NEW_ARTICLE_ID", articleId: responseData.articleId });
                                } else {
                                    console.error('Failed to send video ID. Status:', response.status);
                                }
                            } catch (error) {
                                console.error('Error sending video ID:', error);
                            }
                        }

                    } else if (!isLoggedIn) {
                        console.log('User is not logged in');
                    } else if (!jwtToken) {
                        console.log('JWT token is missing');    
                    } else {
                        console.log('Thumbnail link not found or href is missing');
                    }
                } else {
                    console.log('Common ancestor not found');
                }
            });





            targetElement.parentNode.insertBefore(button, targetElement.nextSibling);
            targetElement.setAttribute('data-button-added', 'true');
        }
    });
}

console.log('Content script loaded');
chrome.runtime.sendMessage({ action: "getBaseUrl" }, function(response) {
    if (response.baseUrl) {
      // Use the BASE_URL received from the background script
      BASE_URL = response.baseUrl
    }
  });

  chrome.runtime.sendMessage({ action: "getSecureToken" }, function(response) {
    console.log("Secure Token in content script: ");
    SECURE_TOKEN = response.secureToken
  });

  initializeContentScript();
  


function updateButtonStates() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.disabled = !isLoggedIn; // Enable the button if the user is logged in
      button.title = isLoggedIn ? '' : 'Please log in to use this feature'; // Update tooltip text
    });
  }
  

// Call addButton initially
addButton();

// Use MutationObserver to detect changes in the DOM
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
            addButton();
        }
    });
});

observer.observe(document.body, { childList: true, subtree: true });
