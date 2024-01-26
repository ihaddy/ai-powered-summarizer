

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
  
function addButton() {
    const elements = document.querySelectorAll('#metadata-line > span:nth-child(4)');

    elements.forEach(targetElement => {
        if (targetElement && !targetElement.hasAttribute('data-button-added')) {
            const button = document.createElement('button');
            button.innerText = 'Summary';
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

                        if (videoId) {
                            console.log('Sending Video ID to remote endpoint:', videoId);

                            try {
                                const response = await fetch(`${BASE_URL}/summarize-videos`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'securetoken': SECURE_TOKEN
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
