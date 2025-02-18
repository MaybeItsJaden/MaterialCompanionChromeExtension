chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveData") {
    chrome.storage.local.set({ scrapedData: message.data }, () => {
      console.log("AI-Extracted Data Saved:", message.data);
    });
  }
});
