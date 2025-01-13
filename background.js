let capturedRequests = [];

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (details.url.includes("api")) {
      const requestInfo = {
        url: details.url,
        method: details.method,
        headers: details.requestHeaders, // Captures headers
      };

      // Store captured request
      capturedRequests.push(requestInfo);
    }
  },
  { urls: ["<all_urls>"] }, // Monitor all URLs; narrow this down if needed
  ["requestHeaders"] // Needed to access headers
);

// Respond to popup requests for captured data
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "getRequests") {
//     sendResponse({ requests: capturedRequests });
//   }
// });


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('==========message.action====', message.action);
    if (message.action === "fetchAPI" && message.apiUrl) {
        const apiInput = capturedRequests.find((request) => request.url === message.apiUrl);

        if (!apiInput) {
            sendResponse({ error: "Reload page and try again." });
            return;
        }

        // Extract request details from background response
        const { method, headers } = apiInput;

        sendResponse({ requestDetails: { method, headers } });
    }
});
  