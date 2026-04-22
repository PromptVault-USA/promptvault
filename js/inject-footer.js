document.addEventListener("DOMContentLoaded", function() {
  const path = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const isHomePage = path === '/' || path.includes('index.html');
  const isVaultPage = path.includes('/vault/');
  const isGridPage = isHomePage || !!document.querySelector('.vault-grid');

  // 1. GLOBAL UI REPAIR
  if (path.includes('/vault/') || path.includes('/blog/')) {
    const links = document.getElementsByTagName('link');
    for (let link of links) {
      if (link.getAttribute('href') && link.getAttribute('href').includes('style.css')) {
        link.setAttribute('href', 'https://promptvaultusa.shop/css/style.css');
      }
    }
    const logos = document.querySelectorAll('.logo-box');
    logos.forEach(img => {
      img.setAttribute('src', 'https://promptvaultusa.shop/logo.png');
    });
  }

  // 2. AUTO-INJECT BACK BUTTON - Only if not already present
  if (!document.querySelector('[href*="action=browse"], [href*="action=blog"]')) {
    let backButtonHTML = '';
    if (isVaultPage) {
      backButtonHTML = `<div style="position: fixed; top: 85px; left: 20px; z-index: 10001;"><a href="https://promptvaultusa.shop/index.html?action=browse#browse" style="background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.15); color: white; text-decoration: none; padding: 10px 18px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 8px; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 8px 20px rgba(0,0,0,0.4);"><span style="font-size:1.1rem;">←</span> Back to Vaults</a></div>`;
    } else if (path.includes('/blog/') && !path.includes('trust-center.html')) {
      backButtonHTML = `<div style="position: fixed; top: 85px; left: 20px; z-index: 10001;"><a href="https://promptvaultusa.shop/blog.html?action=blog" style="background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.15); color: white; text-decoration: none; padding: 10px 18px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 8px; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 8px 20px rgba(0,0,0,0.4);"><span style="font-size:1.1rem;">←</span> Back to Blog</a></div>`;
    }
    if (backButtonHTML) document.body.insertAdjacentHTML('afterbegin', backButtonHTML);
  }

  // 3. MOBILE PADDING FIX
  document.body.style.paddingBottom = "220px";

  // 4. ***DUPLICATE-SAFE*** INJECT GMC TERMS 
  function injectGmcTerms() {
    // A. PRODUCT PAGES: One full box only
    if (isVaultPage && !document.querySelector('.gmc-terms-box')) {
      const buyBtn = document.querySelector('button[onclick*="paypal"], a[href*="paypal"], .btn-main');
      if (buyBtn && buyBtn.textContent.toLowerCase().includes('buy')) {
        const termsBox = document.createElement('div');
        termsBox.className = 'gmc-terms-box';
        termsBox.style.cssText = `margin-top:16px; margin-bottom:8px; padding:12px; background:rgba(100,255,218,0.05); border:1px solid rgba(100,255,218,0.2); border-radius:12px; font-size:0.8rem; line-height:1.6; color:#94a3b8; font-family:'Plus Jakarta Sans',sans-serif;`;
        termsBox.innerHTML = `<strong style="color:#64ffda;">Digital Product Terms:</strong><br>✓ Instant download via email after PayPal payment<br>✓ No physical shipping • Delivered in 1-5 minutes<br>✓ All sales final due to digital nature per <a href="/legal.html#refund" style="color:#64ffda; text-decoration:underline;">Refund Policy</a><br>✓ By purchasing, you agree to <a href="/legal.html#terms" style="color:#64ffda; text-decoration:underline;">Terms of Service</a>`;
        buyBtn.parentNode.insertBefore(termsBox, buyBtn.nextSibling);
      }
    }

    // B. GRID CARDS: One micro line per card
    if (isGridPage) {
      document.querySelectorAll('.vault-card, .product-card').forEach(card => {
        // Skip if already has micro terms
        if (card.querySelector('.gmc-terms-micro')) return;
        
        const buyBtn = card.querySelector('button, a[href*="paypal"]');
        if (buyBtn && buyBtn.textContent.toLowerCase().includes('buy')) {
          const microTerms = document.createElement('div');
          microTerms.className = 'gmc-terms-micro';
          microTerms.style.cssText = `margin-top:8px; font-size:0.65rem; line-height:1.4; color:#64748b; text-align:center; font-family:'Plus Jakarta Sans',sans-serif;`;
          microTerms.innerHTML = `Digital Download • No Shipping • <a href="/legal.html#refund" style="color:#64ffda; text-decoration:underline;">All Sales Final</a>`;
          buyBtn.parentNode.insertBefore(microTerms, buyBtn.nextSibling);
        }
      });
    }
  }

  // 5. INJECT BOTTOM NAV - Only if not present
  const navHTML = `<nav class="bottom-nav" style="position:fixed; bottom:25px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; gap:8px; background:rgba(15,23,42,0.95); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); padding:12px 16px; border-radius:16px; width:92%; max-width:440px; z-index:20000; box-shadow:0 15px 35px rgba(0,0,0,0.5);"><div style="display:flex; justify-content:space-around; align-items:center;"><a href="https://promptvaultusa.shop/index.html" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">🏠<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Home</small></a><a href="https://promptvaultusa.shop/index.html?action=browse#browse" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">⊞<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Vaults</small></a><a href="https://promptvaultusa.shop/blog.html" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">📖<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Blog</small></a><a href="https://promptvaultusa.shop/index.html#library" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">👤<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Library</small></a></div><div style="display:flex; justify-content:center; gap:12px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1); flex-wrap:wrap;"><a href="https://promptvaultusa.shop/legal.html#about" style="text-decoration:none; color:#64748b; font-size:0.65rem; font-weight:600;">About</a><a href="https://promptvaultusa.shop/legal.html#terms" style="text-decoration:none; color:#64748b; font-size:0.65rem; font-weight:600;">Terms</a><a href="https://promptvaultusa.shop/legal.html#privacy" style="text-decoration:none; color:#64748b; font-size:0.65rem; font-weight:600;">Privacy</a><a href="https://promptvaultusa.shop/legal.html#refund" style="text-decoration:none; color:#64748b; font-size:0.65rem; font-weight:600;">Refund</a><a href="https://promptvaultusa.shop/legal.html#contact" style="text-decoration:none; color:#64748b; font-size:0.65rem; font-weight:600;">Contact</a></div><div style="text-align:center; font-size:0.6rem; color:#475569; margin-top:4px;">PromptVault USA • Cebu City, PH • Not affiliated with OpenAI • GDPR Compliant</div></nav>`;
  
  if (!document.querySelector('.bottom-nav')) {
    document.body.insertAdjacentHTML('beforeend', navHTML);
  }

  // 6. RUN ONCE - No setTimeout loops = no duplicates
  injectGmcTerms();

  // 7. AUTO-BROWSE LOGIC
  if (urlParams.get('action') === 'browse') {
    const vaultGrid = document.querySelector('.vault-grid');
    if (vaultGrid) vaultGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
