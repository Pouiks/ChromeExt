chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message reçu : ', request);
  if (request.action === "captureScreenshot") {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, function (dataUrl) {
          if (chrome.runtime.lastError) {
              console.error("Erreur de capture : ", chrome.runtime.lastError.message);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
              console.log("Capture réussie : ", dataUrl);
              sendResponse({ success: true, screenshot: dataUrl });
          }
      });
      return true; // Permet de garder la connexion ouverte pour la réponse asynchrone
  }
});