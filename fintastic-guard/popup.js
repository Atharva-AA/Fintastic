const status = document.getElementById("status");
const connectBtn = document.getElementById("connect");

// Check if already connected
chrome.storage.local.get(["userId"], (data) => {
  if (data.userId) {
    status.textContent = "✅ Connected to Fintastic";
  }
});

connectBtn.onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    status.textContent = "❌ No active tab";
    return;
  }

  // Read userId from Fintastic website
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: () => document.body.dataset.userId || null,
    },
    (results) => {
      const userId = results?.[0]?.result;

      if (!userId) {
        status.textContent = "❌ Open Fintastic Dashboard first";
        return;
      }

      chrome.storage.local.set({ userId }, () => {
        status.textContent = "✅ Connected successfully";
      });
    }
  );
};

