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

      // Test the API endpoint first
      try {
        const healthCheck = await fetch(API_URL, {
          method: "GET",
          mode: "cors",
        });
        console.log("Health check response:", await healthCheck.text());
      } catch (healthError) {
        console.error("Health check failed:", healthError.toString());
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        body: JSON.stringify({
          text: textContent.substring(0, 5000),
          images: images.slice(0, 10),
          url: url,
        }),
      });

      console.log("Response received:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers]),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, {
        message: error.toString(),
        stack: error.stack,
        name: error.name,
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
