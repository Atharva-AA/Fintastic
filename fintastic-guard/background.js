chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_BUY') {
    chrome.cookies.get(
      { url: 'http://localhost:5174', name: 'jwt' },
      async (cookie) => {
        const token = cookie?.value || null;

        try {
          const res = await fetch('http://127.0.0.1:3000/decision/can-i-buy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              product: request.product,
              price: request.price,
            }),
          });

          const data = await res.json();
          sendResponse(data);
        } catch (err) {
          console.error('[Fintastic] Backend error', err);
          sendResponse({
            allowed: true,
            reason: 'Backend unreachable',
            impact: [],
          });
        }
      }
    );

    return true; // IMPORTANT - keeps message channel open for async response
  }
});
