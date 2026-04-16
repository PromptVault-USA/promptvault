Document.addEventListener("DOMContentLoaded", function() {
    const glassCard = document.querySelector('.glass-card');
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    // 1. GLOBAL UI REPAIR (Forced Absolute Paths for Assets)
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

    // 1.5 AUTO-INJECT BACK BUTTON
    let backButtonHTML = '';
    if (path.includes('/vault/')) {
        backButtonHTML = `
            <div style="position: fixed; top: 85px; left: 20px; z-index: 10001;">
                <a href="https://promptvaultusa.shop/index.html?action=browse#browse" style="background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.15); color: white; text-decoration: none; padding: 10px 18px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 8px; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
                    <span style="font-size:1.1rem;">←</span> Back to Vaults
                </a>
            </div>`;
    } 
    else if (path.includes('/blog/') && !path.includes('trust-center.html')) {
        backButtonHTML = `
            <div style="position: fixed; top: 85px; left: 20px; z-index: 10001;">
                <a href="https://promptvaultusa.shop/blog.html?action=blog" style="background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.15); color: white; text-decoration: none; padding: 10px 18px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 8px; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
                    <span style="font-size:1.1rem;">←</span> Back to Blog
                </a>
            </div>`;
    }

    if (backButtonHTML) {
        document.body.insertAdjacentHTML('afterbegin', backButtonHTML);
    }

    // 2. THE MOBILE CLICK FIX
    // Adjusted to ensure bottom nav doesn't overlap content
    document.body.style.paddingBottom = "120px";

    // --- SECTION 3 (LEGAL INJECTION) REMOVED TO PREVENT DUPLICATION ---

    // 4. INJECT THE MASTER BOTTOM NAV (Absolute Links)
    const navHTML = `
    <nav class="bottom-nav" style="position: fixed; bottom: 25px; left: 50%; transform: translateX(-50%); display: flex; justify-content: space-around; align-items: center; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); padding: 12px 10px; border-radius: 100px; width: 92%; max-width: 440px; z-index: 20000; box-shadow: 0 15px 35px rgba(0,0,0,0.5);">
        <a href="https://promptvaultusa.shop/index.html" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">🏠<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Home</small></a>
        <a href="https://promptvaultusa.shop/index.html?action=browse#browse" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">⊞<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Vaults</small></a>
        <a href="https://promptvaultusa.shop/blog.html" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">📖<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Blog</small></a>
        <a href="https://promptvaultusa.shop/index.html#library" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">👤<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Library</small></a>
    </nav>`;
    
    // Check if nav already exists before injecting
    if (!document.querySelector('.bottom-nav')) {
        document.body.insertAdjacentHTML('beforeend', navHTML);
    }

    // --- SECTION 5 (MASTER FOOTER) REMOVED TO PREVENT DUPLICATION ---

    // 6. AUTO-BROWSE & FORCED JUMP LOGIC
    if (urlParams.get('action') === 'browse') {
        const forceShowVaults = () => {
            const vaultBtn = document.querySelector('a[href*="action=browse"]');
            const vaultGrid = document.querySelector('.vault-grid');
            const allPages = document.querySelectorAll('.page'); 

            if (vaultBtn) {
                vaultBtn.click();
                if (allPages.length > 0) {
                    allPages.forEach(p => p.style.display = 'none');
                    const vPage = document.querySelector('#vault-page') || Array.from(allPages).find(p => p.innerHTML.includes('vault-grid'));
                    if (vPage) vPage.style.display = 'block';
                }
                if (vaultGrid) {
                    vaultGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    return true;
                }
            }
            return false;
        };

        let browseAttempts = 0;
        const browseInterval = setInterval(() => {
            browseAttempts++;
            if (forceShowVaults() || browseAttempts > 15) clearInterval(browseInterval);
        }, 100);
    }

    if (urlParams.get('action') === 'blog') {
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 300);
    }
});
