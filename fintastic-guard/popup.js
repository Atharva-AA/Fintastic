const status = document.getElementById('status');
const connectBtn = document.getElementById('connect');

// Check if JWT cookie exists
chrome.cookies.get(
  {
    url: 'http://localhost:5174',
    name: 'jwt',
  },
  (cookie) => {
    if (cookie && cookie.value) {
      status.textContent = '✅ Connected to Fintastic';
    } else {
      status.textContent = '❌ Not connected - please log in to Fintastic';
    }
  }
);

connectBtn.onclick = async () => {
  // Check JWT cookie again
  chrome.cookies.get(
    {
      url: 'http://localhost:5174',
      name: 'jwt',
    },
    (cookie) => {
      if (cookie && cookie.value) {
        status.textContent = '✅ Connected successfully';
      } else {
        status.textContent = '❌ Please log in to Fintastic Dashboard first';
      }
    }
  );
};
