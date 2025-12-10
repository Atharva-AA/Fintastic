// Helper: Extract product name + price
function getProductInfo() {
  let titleEl =
    document.querySelector('.B_NuCI') || // old Flipkart
    document.querySelector('span.VU-ZEz') || // new Flipkart
    document.querySelector('#productTitle') || // Amazon
    document.querySelector('h1') || // generic fallback
    document.querySelector('[data-tkid] h1'); // backup

  let priceEl =
    document.querySelector('._30jeq3') || // Flipkart main price
    document.querySelector('._16Jk6d') ||
    document.querySelector('._1vC4OE') ||
    document.querySelector('[class*="price"]') || // fallback
    document.querySelector('.a-price .a-offscreen') || // Amazon
    document.querySelector('.a-price-whole'); // Amazon alternative

  if (!titleEl || !priceEl) {
    console.log('[Fintastic] No product info found yet');
    return null;
  }

  const title = titleEl.innerText.trim();
  const rawPrice = priceEl.innerText.replace(/[₹,]/g, '').trim();
  const price = parseInt(rawPrice, 10);

  if (!price || isNaN(price)) {
    console.log('[Fintastic] Price parse failed:', rawPrice);
    return null;
  }

  return { title, price };
}

// Helper: Disable buy buttons on Amazon + Flipkart
function disableBuyButtons() {
  const selectors = [
    '#buy-now-button',
    '#add-to-cart-button',
    'button._2KpZ6l._2U9uOA', // Flipkart buy/add
    'button._2KpZ6l._2ObVJD',
  ];

  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((btn) => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';
    });
  });
}

// Helper: Format numbers (round very large numbers)
function formatNumber(value) {
  if (typeof value === 'string') {
    // Handle scientific notation
    if (value.includes('e+') || value.includes('e-')) {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      if (num > 1000000) {
        return `₹${Math.floor(num / 1000000)}M+`;
      }
      return `₹${Math.floor(num).toLocaleString('en-IN')}`;
    }
    // Extract number from string
    const num = parseFloat(value.replace(/[₹,]/g, ''));
    if (isNaN(num)) return value;
    if (num > 1000000) {
      return `₹${Math.floor(num / 1000000)}M+`;
    }
    return `₹${Math.floor(num).toLocaleString('en-IN')}`;
  }
  if (typeof value === 'number') {
    if (value > 1000000) {
      return `₹${Math.floor(value / 1000000)}M+`;
    }
    return `₹${Math.floor(value).toLocaleString('en-IN')}`;
  }
  return value;
}

// Helper: Parse impact data
function parseImpactData(impact) {
  const data = {
    product: null,
    price: null,
    currentBalance: null,
    balanceAfter: null,
    safeMinimum: null,
  };

  if (!Array.isArray(impact)) return data;

  impact.forEach((item) => {
    if (typeof item === 'string') {
      if (item.includes('Product:')) {
        data.product = item.replace('Product:', '').trim();
      } else if (item.includes('Price:')) {
        data.price = item.replace('Price:', '').trim();
      } else if (item.includes('Current balance:')) {
        data.currentBalance = item.replace('Current balance:', '').trim();
      } else if (item.includes('Balance after buy:')) {
        data.balanceAfter = item.replace('Balance after buy:', '').trim();
      } else if (item.includes('Safe minimum required:')) {
        data.safeMinimum = item.replace('Safe minimum required:', '').trim();
      }
    }
  });

  return data;
}

// Helper: Show floating popup
function showFintasticPopup(data, originalButton) {
  console.log('[Fintastic] Popup rendering...', data);

  if (!data || data.allowed === undefined) {
    console.log('[Fintastic] Invalid data, skipping popup');
    return;
  }

  if (!data.allowed) {
    console.log('[Fintastic] Blocked case rendering');
  }

  let box = document.getElementById('fintastic-guard-box');
  if (box) box.remove();

  box = document.createElement('div');
  box.id = 'fintastic-guard-box';

  const safe = data.allowed;
  const borderColor = safe ? '#22c55e' : '#ef4444';
  const headerColor = safe ? '#16a34a' : '#dc2626';
  const statusBadge = safe ? '✅ Allowed' : '⛔ Blocked';
  const impactData = parseImpactData(data.impact || []);

  box.innerHTML = `
    <div style="
      font-family: Inter, system-ui, sans-serif;
    ">
      <!-- Header -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e5e7eb;
      ">
        <strong style="
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.3px;
        ">Fintastic Smart Decision</strong>
        <span style="
          font-size: 13px;
          font-weight: 600;
          color: ${headerColor};
        ">${statusBadge}</span>
      </div>

      <!-- Reason -->
      <div style="
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 18px;
        line-height: 1.5;
      ">${data.reason || ''}</div>

      <!-- Impact Grid -->
      <div style="
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 20px;
        margin-bottom: 20px;
      ">
        ${
          impactData.product
            ? `
          <div style="font-size: 12px; color: #6b7280;">Product</div>
          <div style="font-size: 12px; color: #111827; font-weight: 600; text-align: right;">${impactData.product}</div>
        `
            : ''
        }
        
        ${
          impactData.price
            ? `
          <div style="font-size: 12px; color: #6b7280;">Price</div>
          <div style="font-size: 12px; color: #111827; font-weight: 600; text-align: right;">${formatNumber(
            impactData.price
          )}</div>
        `
            : ''
        }
        
        ${
          impactData.currentBalance
            ? `
          <div style="font-size: 12px; color: #6b7280;">Current Balance</div>
          <div style="font-size: 12px; color: #111827; font-weight: 600; text-align: right;">${formatNumber(
            impactData.currentBalance
          )}</div>
        `
            : ''
        }
        
        ${
          impactData.balanceAfter
            ? `
          <div style="font-size: 12px; color: #6b7280;">Balance After</div>
          <div style="font-size: 12px; color: #111827; font-weight: 600; text-align: right;">${formatNumber(
            impactData.balanceAfter
          )}</div>
        `
            : ''
        }
        
        ${
          impactData.safeMinimum
            ? `
          <div style="font-size: 12px; color: #6b7280;">Safe Minimum</div>
          <div style="font-size: 12px; color: #111827; font-weight: 600; text-align: right;">${formatNumber(
            impactData.safeMinimum
          )}</div>
        `
            : ''
        }
      </div>

      <!-- Action Buttons -->
      <div style="
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        align-items: center;
      ">
        ${
          safe
            ? `
          <button id="fintastic-continue-btn" style="
            padding: 10px 18px;
            background: #22c55e;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-family: Inter, system-ui, sans-serif;
          " onmouseover="this.style.background='#16a34a'" onmouseout="this.style.background='#22c55e'">Continue ✅</button>
        `
            : `
          <button id="fintastic-blocked-btn" style="
            padding: 10px 18px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: not-allowed;
            opacity: 0.7;
            font-family: Inter, system-ui, sans-serif;
          " disabled>Blocked 🔒</button>
        `
        }
        <button id="fintastic-close-btn" style="
          padding: 10px 18px;
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: Inter, system-ui, sans-serif;
        " onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">Close</button>
      </div>
    </div>
  `;

  // Apply styles
  box.style.position = 'fixed';
  box.style.bottom = '24px';
  box.style.right = '24px';
  box.style.width = '520px';
  box.style.background = 'white';
  box.style.borderRadius = '16px';
  box.style.padding = '18px 22px';
  box.style.zIndex = '2147483647';
  box.style.pointerEvents = 'auto';
  box.style.backdropFilter = 'blur(8px)';
  box.style.webkitBackdropFilter = 'blur(8px)';
  box.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
  box.style.borderLeft = `6px solid ${borderColor}`;
  box.style.fontFamily = 'Inter, system-ui, sans-serif';
  box.style.transform = 'translateY(20px)';
  box.style.opacity = '0';
  box.style.transition = 'transform 200ms ease, opacity 200ms ease';

  document.documentElement.appendChild(box);

  // Trigger animation
  setTimeout(() => {
    box.style.transform = 'translateY(0)';
    box.style.opacity = '1';
  }, 10);

  // Close button handler
  const closeBtn = box.querySelector('#fintastic-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      box.style.transform = 'translateY(20px)';
      box.style.opacity = '0';
      setTimeout(() => {
        box.remove();
      }, 200);
    });
  }

  // Continue button handler (if allowed)
  if (safe) {
    const continueBtn = box.querySelector('#fintastic-continue-btn');
    if (continueBtn && originalButton) {
      continueBtn.addEventListener('click', () => {
        box.style.transform = 'translateY(20px)';
        box.style.opacity = '0';
        setTimeout(() => {
          box.remove();
          // Re-enable and click the original button
          originalButton.disabled = false;
          originalButton.style.opacity = '1';
          originalButton.style.pointerEvents = 'auto';
          originalButton.click();
        }, 200);
      });
    }
  }
}

// Main check function
function checkCanIBuy() {
  const info = getProductInfo();
  if (!info) {
    console.log('[Fintastic] No product info found yet');
    return;
  }

  const { title, price } = info;
  console.log('[Fintastic] Product:', title, 'Price:', price);

  chrome.runtime.sendMessage(
    {
      type: 'CHECK_BUY',
      product: title,
      price: price,
    },
    (data) => {
      console.log('[Fintastic] Decision:', data);

      showFintasticPopup(data);

      if (data.allowed === false) {
        disableBuyButtons();
      }
    }
  );
}

// Watch for DOM changes and trigger check
const observer = new MutationObserver(() => {
  checkCanIBuy();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
