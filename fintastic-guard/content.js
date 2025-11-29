function extractPrice() {
  const selectors = [
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    ".a-price .a-offscreen",
    "._30jeq3._16Jk6d"
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const txt = el.innerText || el.textContent || "";
      const num = txt.replace(/[^\d]/g, "");
      if (num) return parseInt(num, 10);
    }
  }
  return null;
}

function extractTitle() {
  const selectors = ["#productTitle", ".B_NuCI", "h1"];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }
  }
  return document.title;
}

function getBuyButtons() {
  return Array.from(document.querySelectorAll("button,input[type=submit],input[type=button]"))
    .filter(b => {
      const t = (b.innerText || b.value || "").toLowerCase();
      return (
        t.includes("buy") ||
        t.includes("pay") ||
        t.includes("place") ||
        t.includes("proceed")
      );
    });
}

function disableButton(btn) {
  btn.disabled = true;
  btn.style.opacity = "0.5";
  btn.style.pointerEvents = "none";
}

function showFintasticBox(data) {
  if (document.querySelector("#fintastic-box")) return;

  const box = document.createElement("div");
  box.id = "fintastic-box";
  box.innerHTML = `
    <div style="
      position:fixed;
      bottom:20px;
      right:20px;
      background:#111827;
      color:#f9fafb;
      padding:16px;
      border-radius:12px;
      box-shadow:0 10px 25px rgba(0,0,0,.35);
      max-width:300px;
      font-size:13px;
      z-index:9999999;
    ">
      <b>Fintastic Guard</b><br><br>
      ${data.allowed ? "✅ Safe purchase" : "⚠️ NOT RECOMMENDED"}
      <br>${data.reason}
      ${
        data.impact
          ? `<ul style="padding-left:16px;font-size:11px;">
              ${data.impact.map(i => `<li>${i}</li>`).join("")}
            </ul>`
          : ""
      }
    </div>
  `;
  document.body.appendChild(box);
}

setTimeout(() => {
  const price = extractPrice();
  const product = extractTitle();
  const site = window.location.hostname;

  if (!price) return;

  chrome.storage.local.get(["userId"], async (data) => {
    if (!data.userId) return;

    try {
      const response = await fetch("http://localhost:5000/decision/can-i-buy", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          userId: data.userId,
          amount: price,
          product,
          site
        })
      });

      const decision = await response.json();

      if (!decision.allowed) {
        getBuyButtons().forEach(disableButton);
      }

      showFintasticBox(decision);
    } catch (err) {
      console.error("[Fintastic] Backend not reachable", err)
    }
  });

}, 3000);

