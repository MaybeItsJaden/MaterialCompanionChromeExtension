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

      console.log("Attempting to fetch from API, attempt:", attempt);
      console.log("Request URL:", API_URL);
      console.log(
        "Request payload size:",
        new Blob([
          JSON.stringify({
            text: textContent.substring(0, 5000),
            images: images.slice(0, 10),
            url: url,
          }),
        ]).size,
        "bytes"
      );

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin: chrome.runtime.getURL(""),
        },
        mode: "cors",
        body: JSON.stringify({
          text: textContent.substring(0, 5000),
          images: images.slice(0, 10),
          url: url,
        }),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", [...response.headers.entries()]);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response body:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Successful response data:", data);
      return data;
    } catch (error) {
      console.error(`Attempt ${attempt} details:`, {
        error: error.message,
        stack: error.stack,
        type: error.name,
      });
      if (attempt < MAX_RETRIES) {
        console.log(
          `Waiting ${RETRY_DELAY}ms before retry ${attempt + 1}/${MAX_RETRIES}`
        );
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
