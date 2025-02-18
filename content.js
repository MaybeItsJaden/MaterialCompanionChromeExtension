// Add message listener at the top level
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getData") {
    // Handle async operation properly
    extractProductData().then((data) => {
      sendResponse({ scrapedData: data });
    });
  }
  return true; // Required for async response
});

async function extractProductData() {
  const API_URL =
    "https://materialcompanion-49s81aslk-maybeitsjadens-projects.vercel.app/api";
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  async function fetchWithRetry(attempt = 1) {
    try {
      const textContent = document.body.innerText;
      const images = Array.from(document.images).map((img) => img.src);
      const url = window.location.href;

      const timeout = 30000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        credentials: "omit",
        signal: controller.signal,
        body: JSON.stringify({
          text: textContent,
          images: images,
          url: url,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received data from backend:", data);

      data.contact = "";
      chrome.storage.local.set({ scrapedData: data });
      return data;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);

      if (attempt < MAX_RETRIES) {
        console.log(`Retrying... Attempt ${attempt + 1}/${MAX_RETRIES}`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(attempt + 1);
      }

      throw error;
    }
  }

  try {
    return await fetchWithRetry();
  } catch (error) {
    console.error("All retry attempts failed:", error);
    return {
      name: "N/A",
      image: "N/A",
      link: window.location.href,
      size: "N/A",
      contact: "",
    };
  }
}

extractProductData();
