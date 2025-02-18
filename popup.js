document.addEventListener("DOMContentLoaded", () => {
  function renderData(data = {}) {
    const fields = [
      { key: "name", label: "Name" },
      { key: "image", label: "Image", isLink: true },
      { key: "link", label: "Link", isLink: true },
      { key: "size", label: "Size" },
      { key: "contact", label: "Contact", alwaysEditable: true },
    ];

    const output = document.getElementById("output");
    if (!output) return;

    output.innerHTML = fields
      .map(
        (field) => `
      <div class="data-row" data-field="${field.key}">
        <span class="data-label">${field.label}:</span>
        <div class="data-value">
          ${
            field.alwaysEditable
              ? `<input type="text" class="edit-input" value="${
                  data[field.key] || ""
                }" placeholder="Click to add contact info">`
              : field.isLink && data[field.key] && data[field.key] !== "N/A"
              ? `<a href="${data[field.key]}" target="_blank">${
                  data[field.key]
                }</a>`
              : data[field.key] || "N/A"
          }
        </div>
      </div>
    `
      )
      .join("");

    // Add contact input listener
    const contactInput = document.querySelector('[data-field="contact"] input');
    if (contactInput) {
      contactInput.addEventListener("change", (e) => {
        chrome.storage.local.get("scrapedData", (result) => {
          const data = result.scrapedData || {};
          data.contact = e.target.value;
          chrome.storage.local.set({ scrapedData: data });
        });
      });
    }
  }

  function loadData() {
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.classList.add("loading");
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0]?.id) {
        console.log("No active tab found");
        renderData({});
        if (refreshBtn) refreshBtn.classList.remove("loading");
        return;
      }

      // First, inject the content script
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          files: ["content.js"],
        },
        () => {
          // After injection, send the message
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "getData" },
            function (response) {
              if (!response) {
                console.log("No response from content script");
                renderData({});
                if (refreshBtn) refreshBtn.classList.remove("loading");
                return;
              }
              renderData(response?.scrapedData || {});
              if (refreshBtn) refreshBtn.classList.remove("loading");
            }
          );
        }
      );
    });
  }

  // Initial load
  loadData();

  // Refresh button listener
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadData);
  }

  // Copy button functionality
  const copyBtn = document.getElementById("copyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      chrome.storage.local.get("scrapedData", (result) => {
        const data = result.scrapedData || {};
        const csvData = `"${data.name || ""}","${data.image || ""}","${
          data.link || ""
        }","${data.size || ""}","${data.contact || ""}"`;

        navigator.clipboard.writeText(csvData).then(() => {
          copyBtn.innerText = "Copied!";
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.innerText = "Copy Data";
            copyBtn.classList.remove("copied");
          }, 2000);
        });
      });
    });
  }

  const scanBtn = document.getElementById("scanBtn");
  const output = document.getElementById("output");

  scanBtn.addEventListener("click", async () => {
    scanBtn.classList.add("scanning");
    copyBtn.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractProductData,
      });

      const data = results[0].result;
      renderData(data);
      copyBtn.disabled = false;
    } catch (error) {
      output.innerHTML = '<p class="error">Failed to scan page</p>';
    } finally {
      scanBtn.classList.remove("scanning");
    }
  });

  copyBtn.addEventListener("click", () => {
    chrome.storage.local.get("scrapedData", (result) => {
      const data = result.scrapedData || {};
      const csvData = `"${data.name || ""}","${data.image || ""}","${
        data.link || ""
      }","${data.size || ""}","${data.contact || ""}"`;

      navigator.clipboard.writeText(csvData);
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy Data";
      }, 2000);
    });
  });
});
