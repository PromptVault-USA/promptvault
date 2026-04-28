document.addEventListener("DOMContentLoaded", function () {
  try {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    const isHomePage = path === "/" || path.includes("index.html");
    const isVaultProductPage = path.includes("/vault/"); // /vault/<slug>.html (generated product pages)
    const isVaultMainPage = path.includes("vault.html"); // /vault.html (grid)
    const isLibraryPage = path.includes("library.html");
    const isGridPage = isVaultMainPage || !!document.querySelector(".vault-grid");

    // 1) GLOBAL UI REPAIR
    if (
      isVaultProductPage ||
      path.includes("/blog") ||
      isVaultMainPage ||
      isLibraryPage
    ) {
      const links = document.getElementsByTagName("link");
      for (let link of links) {
        if (
          link.getAttribute("href") &&
          link.getAttribute("href").includes("style.css")
        ) {
          link.setAttribute("href", "https://promptvaultusa.shop/css/style.css");
        }
      }

      const logos = document.querySelectorAll(".logo-box");
      logos.forEach((img) => {
        img.setAttribute("src", "https://promptvaultusa.shop/logo.png");
      });
    }

    // 2) AUTO-INJECT BACK BUTTON (UPDATED: no more action=browse#browse)
    if (!document.querySelector('[data-pv-back="1"]')) {
      let backHref = "";

      if (isVaultProductPage) {
        backHref = "https://promptvaultusa.shop/vault.html";
      } else if (path.includes("/blog/") && !path.includes("trust-center.html")) {
        backHref = "https://promptvaultusa.shop/blog.html";
      }

      if (backHref) {
        const backButtonHTML = `
          <div data-pv-back="1" style="position: fixed; top: 85px; left: 20px; z-index: 10001;">
            <a href="${backHref}"
              style="background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px); color: white; padding: 10px 15px; border-radius: 10px; text-decoration: none; font-size: 0.85rem; font-weight: 600; border: 1px solid rgba(255,255,255,0.1);">
              ← Back
            </a>
          </div>`;
        document.body.insertAdjacentHTML("afterbegin", backButtonHTML);
      }
    }

    // 3) MOBILE PADDING FIX
    document.body.style.paddingBottom = "220px";

    // 4) DUPLICATE-SAFE INJECT GMC TERMS
    function injectGmcTerms() {
      // A) PRODUCT PAGES: one full box only
      if (isVaultProductPage && !document.querySelector(".gmc-terms-box")) {
        const buyBtn = document.querySelector(
          'button[onclick*="paypal"], a[href*="paypal"], .btn-main',
        );
        if (buyBtn && buyBtn.textContent.toLowerCase().includes("buy")) {
          const termsBox = document.createElement("div");
          termsBox.className = "gmc-terms-box";
          termsBox.style.cssText =
            "margin-top:16px; margin-bottom:8px; padding:12px; background:rgba(100,255,218,0.05); border:1px solid rgba(100,255,218,0.2); border-radius:12px; font-size:0.8rem; line-height:1.4; color:#64748b;";
          termsBox.innerHTML =
            '<strong style="color:#64ffda;">Digital Product Terms:</strong><br>✓ Instant download via email after PayPal payment<br>✓ No physical shipping • Delivered in 1-5 minutes<br>✓ Non-refundable digital license';
          buyBtn.parentNode.insertBefore(termsBox, buyBtn.nextSibling);
        }
      }

      // B) GRID CARDS: one micro line per card
      if (isGridPage) {
        document.querySelectorAll(".vault-card, .product-card").forEach((card) => {
          if (card.querySelector(".gmc-terms-micro")) return;

          const buyBtn = card.querySelector("button, a[href*='paypal']");
          if (buyBtn && buyBtn.textContent.toLowerCase().includes("buy")) {
            const microTerms = document.createElement("div");
            microTerms.className = "gmc-terms-micro";
            microTerms.style.cssText =
              "margin-top:8px; font-size:0.65rem; line-height:1.4; color:#64748b; text-align:center; font-family:'Plus Jakarta Sans',sans-serif;";
            microTerms.innerHTML =
              'Digital Download • No Shipping • <a href="/legal.html#refund" style="color:#64ffda; text-decoration:underline;">All Sales Final</a>';
            buyBtn.parentNode.insertBefore(microTerms, buyBtn.nextSibling);
          }
        });
      }
    }

    // 5) INJECT BOTTOM NAV (UPDATED: real href pages, no changePage())
    const navHTML = `
      <nav class="bottom-nav"
        style="position:fixed; bottom:25px; left:50%; transform:translateX(-50%);
        display:flex; flex-direction:row; gap:0px;
        background:rgba(15,23,42,0.95); backdrop-filter:blur(25px);
        border:1px solid rgba(255,255,255,0.1); padding:12px 10px; border-radius:100px;
        z-index:15000; box-shadow:0 20px 50px rgba(0,0,0,0.8); width:92%; max-width:440px; min-width:300px;">

        <a class="nav-item" href="/index.html"
          style="flex:1;display:flex;flex-direction:column;align-items:center;color:#94a3b8;text-decoration:none;transition:0.3s;">
          <span style="font-size:1.3rem;margin-bottom:2px;">🏠</span>
          <small style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">Home</small>
        </a>

        <a class="nav-item" href="/vault.html"
          style="flex:1;display:flex;flex-direction:column;align-items:center;color:#94a3b8;text-decoration:none;transition:0.3s;">
          <span style="font-size:1.3rem;margin-bottom:2px;">⊞</span>
          <small style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">Vault</small>
        </a>

        <a class="nav-item" href="/library.html"
          style="flex:1;display:flex;flex-direction:column;align-items:center;color:#94a3b8;text-decoration:none;transition:0.3s;">
          <span style="font-size:1.3rem;margin-bottom:2px;">👤</span>
          <small style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">Library</small>
        </a>

        <a class="nav-item" href="/blog.html"
          style="flex:1;display:flex;flex-direction:column;align-items:center;color:#94a3b8;text-decoration:none;transition:0.3s;">
          <span style="font-size:1.3rem;margin-bottom:2px;">📰</span>
          <small style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">Blog</small>
        </a>

        <a class="nav-item" href="/claim.html"
          style="flex:1;display:flex;flex-direction:column;align-items:center;color:#94a3b8;text-decoration:none;transition:0.3s;">
          <span style="font-size:1.3rem;margin-bottom:2px;">🧾</span>
          <small style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">Claim</small>
        </a>
      </nav>
    `;

    if (!document.querySelector(".bottom-nav")) {
      document.body.insertAdjacentHTML("beforeend", navHTML);
    }

    // 6) RUN ONCE
    injectGmcTerms();

    // 7) OPTIONAL: if someone uses ?action=vault, scroll to grid
    if (urlParams.get("action") === "vault") {
      const vaultGrid = document.querySelector(".vault-grid");
      if (vaultGrid) {
        vaultGrid.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  } catch (error) {
    console.error("Footer injection error:", error);
  }
});
