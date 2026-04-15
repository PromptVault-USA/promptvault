document.addEventListener("DOMContentLoaded", function() {
    const glassCard = document.querySelector('.glass-card');
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    // 1. GLOBAL UI REPAIR (Forced Absolute Paths for Assets)
    if (path.includes('/vault/') || path.includes('/blog/')) {
        const links = document.getElementsByTagName('link');
        for (let link of links) {
            // Updated to catch any relative CSS reference
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
    // Logic updated to avoid showing back button on the trust center itself
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
    document.body.style.paddingBottom = "120px";

    // 3. INJECT FAQ & LEGAL (Fixed 404s with Full URLs)
    if (glassCard) {
        const glassContentHTML = `
            <div style="margin-top: 50px; border-top: 1px solid var(--border); padding-top: 40px;">
                <h3 style="color:white; margin-bottom: 25px; text-align: center;">Frequently Asked Questions</h3>
                <details style="background: rgba(15, 23, 42, 0.5); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 10px; padding: 15px; cursor: pointer;">
                    <summary style="color: white; font-weight: 800; outline: none;">What exactly do I receive after payment?</summary>
                    <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 10px; line-height: 1.6;">You will get instant access to a permanent digital vault (PDF & Google Doc) containing the engineered AI prompts and high-conversion frameworks.</p>
                </details>
                <div style="margin-top: 50px; background: rgba(255, 255, 255, 0.03); padding: 25px; border-radius: 20px; border: 1px dashed #334155;">
                    <h4 style="color: white; margin-bottom: 10px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Legal & Trust Center</h4>
                    <p style="color: #64748b; font-size: 0.75rem; line-height: 1.6; margin-bottom: 15px;">
                        <strong>Support:</strong> admin@promptvaultusa.shop <br>
                        <strong>Location:</strong> Cebu City, PH
                    </p>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <a href="https://promptvaultusa.shop/trust-center.html#privacy" style="color: var(--secondary); font-size: 0.75rem; text-decoration: none; font-weight: 800; border-bottom: 1px solid var(--secondary);">Privacy Policy</a>
                        <a href="https://promptvaultusa.shop/trust-center.html#terms" style="color: var(--secondary); font-size: 0.75rem; text-decoration: none; font-weight: 800; border-bottom: 1px solid var(--secondary);">Terms</a>
                        <a href="https://promptvaultusa.shop/trust-center.html#refunds" style="color: var(--secondary); font-size: 0.75rem; text-decoration: none; font-weight: 800; border-bottom: 1px solid var(--secondary);">Refunds</a>
                    </div>
                </div>
            </div>`;
        glassCard.insertAdjacentHTML('beforeend', glassContentHTML);
    }

    // 4. INJECT THE MASTER BOTTOM NAV (Absolute Links)
    const navHTML = `
    <nav class="bottom-nav" style="position: fixed; bottom: 25px; left: 50%; transform: translateX(-50%); display: flex; justify-content: space-around; align-items: center; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); padding: 12px 10px; border-radius: 100px; width: 92%; max-width: 440px; z-index: 20000; box-shadow: 0 15px 35px rgba(0,0,0,0.5);">
        <a href="https://promptvaultusa.shop/index.html" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">🏠<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Home</small></a>
        <a href="https://promptvaultusa.shop/index.html?action=browse#browse" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">⊞<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Vaults</small></a>
        <a href="https://promptvaultusa.shop/blog.html" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">📖<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Blog</small></a>
        <a href="https://promptvaultusa.shop/index.html#library" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">👤<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Library</small></a>
    </nav>`;
    document.body.insertAdjacentHTML('beforeend', navHTML);

    // 5. MASTER FOOTER
    const masterFooterHTML = `
    <footer style="margin-top: 80px; padding-bottom: 100px; text-align: center; opacity: 0.6;">
        <p style="color: #475569; font-size: 0.75rem;">© 2026 PromptVault USA | Cebu City, PH | Engineered for the AI Economy.</p>
    </footer>`;
    document.body.insertAdjacentHTML('beforeend', masterFooterHTML);

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
