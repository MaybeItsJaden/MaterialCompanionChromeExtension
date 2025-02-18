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
      // Get a smaller sample of text and images
      const textContent = document.body.innerText.substring(0, 1000); // Just first 1000 chars
      const images = Array.from(document.images)
        .slice(0, 3)
        .map((img) => img.src); // Just first 3 images
      const url = window.location.href;

      console.log("Attempting to fetch from API, attempt:", attempt);
      console.log("Request URL:", API_URL);
      console.log(
        "Payload size:",
        new Blob([
          JSON.stringify({
            text: textContent,
            images,
            url,
          }),
        ]).size,
        "bytes"
      );

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        body: JSON.stringify({
          text: textContent,
          images,
          url,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
        toString: error.toString(),
      });

      if (attempt < MAX_RETRIES) {
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
