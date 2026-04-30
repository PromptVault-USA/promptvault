/**
 * PROMPTVAULT USA - Global UI & Legal Compliance Engine
 * Version: 2.0.0 (Fintech Hardened)
 */
document.addEventListener("DOMContentLoaded", function () {
  try {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const domain = "https://promptvaultusa.shop";

    // Flags for conditional injection
    const isHomePage = path === "/" || path.includes("index.html");
    const isVaultProductPage = path.includes("/vault/");
    const isVaultMainPage = path.includes("vault.html");
    const isLibraryPage = path.includes("library.html");
    const isGridPage = isVaultMainPage || !!document.querySelector(".vault-grid");

    // 1) GLOBAL UI REPAIR
    if (isVaultProductPage || path.includes("/blog") || isVaultMainPage || isLibraryPage) {
      document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        if (link.getAttribute("href")?.includes("style.css")) {
          link.setAttribute("href", `${domain}/css/style.css`);
        }
      });
      document.querySelectorAll(".logo-box, img.logo").forEach((img) => {
        if (img.tagName.toLowerCase() === 'img') {
          img.setAttribute("src", `${domain}/logo.png`);
        }
      });
    }

    // 2) MOBILE PADDING FIX
    document.body.style.paddingBottom = "160px";

    // 3) GMC TERMS INJECTION (The Point-of-Sale Shield)
    function injectGmcTerms() {
      // A) PRODUCT PAGES: Detailed Disclosure
      if (isVaultProductPage && !document.querySelector(".gmc-terms-box")) {
        const buyBtn = document.querySelector('button[onclick*="paypal"], a[href*="paypal"], .btn-main, #paypal-button-container');
        if (buyBtn) {
          const termsBox = document.createElement("div");
          termsBox.className = "gmc-terms-box";
          termsBox.style.cssText = "margin-top:20px; margin-bottom:20px; padding:15px; background:rgba(79, 209, 197, 0.05); border:1px solid rgba(79, 209, 197, 0.2); border-radius:12px; font-size:0.75rem; line-height:1.5; color:#94a3b8;";
          termsBox.innerHTML = `
            <strong style="color:#4fd1c5;">Digital Asset Fulfillment:</strong><br>
            ✓ Instant delivery to your Intelligence Vault<br>
            ✓ Verified Secure Checkout via PayPal<br>
            <span style="color:#f87171; font-weight:800;">⚠ All sales are final. No refunds on digital assets.</span>`;
          buyBtn.parentNode.insertBefore(termsBox, buyBtn); // Insert ABOVE button for visibility
        }
      }

      // B) GRID CARDS: Micro Disclosure
      if (isGridPage) {
        document.querySelectorAll(".vault-card, .product-card").forEach((card) => {
          if (card.querySelector(".gmc-terms-micro")) return;
          const buyBtn = card.querySelector("button, a[href*='paypal']");
          if (buyBtn) {
            const microTerms = document.createElement("div");
            microTerms.className = "gmc-terms-micro";
            microTerms.style.cssText = "margin-top:8px; font-size:0.6rem; color:#64748b; text-align:center;";
            microTerms.innerHTML = `Digital Download &bull; <a href="${domain}/legal.html#refunds" style="color:#4fd1c5; text-decoration:none;">No Refunds</a>`;
            buyBtn.parentNode.insertBefore(microTerms, buyBtn.nextSibling);
          }
        });
      }
    }

    // 4) GLOBAL LEGAL FOOTER (Requirement for Merchant Accounts)
    function injectLegalFooter() {
      if (document.querySelector(".global-legal-footer")) return;

      const footerHTML = `
      <footer class="global-legal-footer" style="margin-top: 100px; padding: 60px 20px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
        <div style="max-width: 800px; margin: 0 auto;">
          <div style="margin-bottom: 25px;">
            <a href="${domain}/legal.html#terms" style="color:#94a3b8; text-decoration:none; margin:0 15px; font-size:0.75rem; font-weight:600;">Terms</a>
            <a href="${domain}/legal.html#refunds" style="color:#94a3b8; text-decoration:none; margin:0 15px; font-size:0.75rem; font-weight:600;">Refund Policy</a>
            <a href="${domain}/legal.html#privacy" style="color:#94a3b8; text-decoration:none; margin:0 15px; font-size:0.75rem; font-weight:600;">Privacy</a>
          </div>
          <p style="color:#475569; font-size:0.65rem; line-height:1.6; max-width:500px; margin:0 auto;">
            &copy; 2024 PromptVault USA. All transactions appear as <strong>PROMPTVAULTUSA</strong> on your statement. 
            By purchasing, you agree to our non-refundable digital fulfillment terms.
          </p>
        </div>
      </footer>`;
      document.body.insertAdjacentHTML("beforeend", footerHTML);
    }

    // 5) BOTTOM NAV (Optimized for Mobile Conversion)
    const navHTML = `
      <nav class="bottom-nav" style="position:fixed; bottom:25px; left:50%; transform:translateX(-50%); display:flex; background:rgba(15,23,42,0.95); backdrop-filter:blur(25px); border:1px solid rgba(255,255,255,0.1); padding:12px 10px; border-radius:100px; z-index:15000; width:92%; max-width:440px;">
        <a class="nav-item" href="${domain}/index.html" style="flex:1;display:flex;flex-direction:column;align-items:center;color:#94a3b8;text-decoration:none;">
          <span style="font-size:1.2rem;">🏠</span><small style="font-size:0.6rem;font-weight:800;text-transform:uppercase;">Home</small>
        </a>
        <a class="nav-item" href="${domain}/vault.html" style="flex:1;display:flex;flex-direction:column;align-items:center;color:#94a3b8;text-decoration:none;">
          <span style="font-size:1.2rem;">⊞</span><small style="font-size:0.6rem;font-weight:800;text-transform:uppercase;">Vault</small>
        </a>
        <a class="nav-item" href="${domain}/library.html" style="flex:1;display:flex;flex-direction:column;align-items:center;color:#94a3b8;text-decoration:none;">
          <span style="font-size:1.2rem;">👤</span><small style="font-size:0.6rem;font-weight:800;text-transform:uppercase;">Library</small>
        </a>
        <a class="nav-item" href="${domain}/claim.html" style="flex:1;display:flex;flex-direction:column;align-items:center;color:#94a3b8;text-decoration:none;">
          <span style="font-size:1.2rem;">🧾</span><small style="font-size:0.6rem;font-weight:800;text-transform:uppercase;">Claim</small>
        </a>
      </nav>`;

    if (!document.querySelector(".bottom-nav")) {
      document.body.insertAdjacentHTML("beforeend", navHTML);
    }

    // Execution
    injectGmcTerms();
    injectLegalFooter();

    // 6) TRUST SCHEMA (GMC Requirement)
    if (isHomePage && !document.querySelector('#gmc-org-schema')) {
      const script = document.createElement('script');
      script.id = 'gmc-org-schema';
      script.type = 'application/ld+json';
      script.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "PromptVault USA",
        "url": domain,
        "logo": `${domain}/logo.png`,
        "contactPoint": { "@type": "ContactPoint", "email": "admin@promptvaultusa.shop", "contactType": "Customer Support" }
      });
      document.head.appendChild(script);
    }

  } catch (error) {
    console.error("UI Injection Error:", error);
  }
});
