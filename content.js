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
  try {
    const textContent = document.body.innerText;
    const images = Array.from(document.images).map((img) => img.src);
    const url = window.location.href;

    const timeout = 30000; // 30 seconds
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(
        "https://materialcompanion-kpbhavr6l-maybeitsjadens-projects.vercel.app/api",
        {
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
        }
      );

      clearTimeout(id);

      if (!response.ok) {
        throw new Error("Failed to process data");
      }

      const data = await response.json();
      console.log("Received data from backend:", data);

      // Add empty contact field
      data.contact = "";

      // Store in chrome storage
      chrome.storage.local.set({ scrapedData: data });
      return data;
    } catch (error) {
      clearTimeout(id);
      if (error.name === "AbortError") {
        console.log("Request timed out");
      }
      throw error;
    }
  } catch (error) {
    console.error("Error extracting product data:", error);
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
