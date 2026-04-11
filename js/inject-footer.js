document.addEventListener("DOMContentLoaded", function() {
    const glassCard = document.querySelector('.glass-card');
    const path = window.location.pathname;
    
    // 1. GLOBAL UI REPAIR (Glass & Path Fix for Subdirectories)
    if (path.includes('/vault/')) {
        const links = document.getElementsByTagName('link');
        for (let link of links) {
            if (link.getAttribute('href') === 'css/style.css') {
                link.setAttribute('href', '../css/style.css');
            }
        }
        const logos = document.querySelectorAll('.logo-box');
        logos.forEach(img => {
            if (img.getAttribute('src') === 'logo.png') {
                img.setAttribute('src', '../logo.png');
            }
        });
    }

    // 1.5 AUTO-INJECT BACK BUTTON (The "Save Your Energy" Fix)
    let backButtonHTML = '';
    if (path.includes('/vault/')) {
        backButtonHTML = `
            <div style="position: fixed; top: 85px; left: 20px; z-index: 10001;">
                <a href="https://promptvaultusa.shop/index.html?action=browse" style="background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); color: white; text-decoration: none; padding: 8px 16px; border-radius: 100px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 8px; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                    <span>←</span> Back to Vaults
                </a>
            </div>`;
    } else if (path.includes('blog.html') && path !== '/' && !path.endsWith('index.html')) {
        // This covers individual blog post pages if they contain 'blog' in the name
        backButtonHTML = `
            <div style="position: fixed; top: 85px; left: 20px; z-index: 10001;">
                <a href="https://promptvaultusa.shop/blog.html" style="background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); color: white; text-decoration: none; padding: 8px 16px; border-radius: 100px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 8px; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                    <span>←</span> Back to Blog
                </a>
            </div>`;
    }

    if (backButtonHTML) {
        document.body.insertAdjacentHTML('afterbegin', backButtonHTML);
    }

    // 2. THE MOBILE CLICK FIX (Safety Buffer)
    document.body.style.paddingBottom = "120px";

    // 3. INJECT FAQ & LEGAL (Your Existing Code)
    if (glassCard) {
        const glassContentHTML = `
            <div style="margin-top: 50px; border-top: 1px solid var(--border); padding-top: 40px;">
                <h3 style="color:white; margin-bottom: 25px; text-align: center;">Frequently Asked Questions</h3>
                
                <details style="background: rgba(15, 23, 42, 0.5); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 10px; padding: 15px; cursor: pointer;">
                    <summary style="color: white; font-weight: 800; outline: none;">What exactly do I receive after payment?</summary>
                    <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 10px; line-height: 1.6;">You will get instant access to a permanent digital vault (PDF & Google Doc) containing the engineered AI prompts, usage instructions, and high-conversion frameworks specific to this niche.</p>
                </details>

                <details style="background: rgba(15, 23, 42, 0.5); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 10px; padding: 15px; cursor: pointer;">
                    <summary style="color: white; font-weight: 800; outline: none;">Do these prompts work with free AI versions?</summary>
                    <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 10px; line-height: 1.6;">Yes. While they are optimized for 2026 models like GPT-4o and Claude 3.5, they are structured to provide high-quality results even on free versions like GPT-4 mini.</p>
                </details>

                <div style="margin-top: 50px; background: rgba(255, 255, 255, 0.03); padding: 25px; border-radius: 20px; border: 1px dashed #334155;">
                    <h4 style="color: white; margin-bottom: 10px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Legal Terms & License</h4>
                    <p style="color: #64748b; font-size: 0.75rem; line-height: 1.6; margin-bottom: 15px;">
                        <strong>License:</strong> Single-user license. Redistribution or resale of raw prompts is strictly prohibited. <br>
                        <strong>Refunds:</strong> All sales are final due to the digital nature of the products.
                    </p>
                    <a href="https://promptvaultusa.shop/legal.html" style="color: var(--secondary); font-size: 0.75rem; text-decoration: none; font-weight: 800; border-bottom: 1px solid var(--secondary);">Read Full Legal & Terms →</a>
                </div>
            </div>`;
        
        glassCard.insertAdjacentHTML('beforeend', glassContentHTML);
    }

    // 4. INJECT THE MASTER BOTTOM NAV (Mobile Fixed)
    const navHTML = `
    <nav class="bottom-nav" style="position: fixed; bottom: 25px; left: 50%; transform: translateX(-50%); display: flex; justify-content: space-around; align-items: center; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); padding: 12px 10px; border-radius: 100px; width: 92%; max-width: 440px; z-index: 20000; box-shadow: 0 15px 35px rgba(0,0,0,0.5);">
        <a href="https://promptvaultusa.shop/index.html" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">🏠<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Home</small></a>
        <a href="https://promptvaultusa.shop/index.html?action=browse" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">⊞<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Vaults</small></a>
        <a href="https://promptvaultusa.shop/blog.html" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">📖<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Blog</small></a>
        <a href="https://promptvaultusa.shop/index.html?page=library" style="text-decoration:none; color:#94a3b8; text-align:center; flex:1;">👤<br><small style="font-size:0.6rem; font-weight:800; text-transform:uppercase;">Library</small></a>
    </nav>`;

    document.body.insertAdjacentHTML('beforeend', navHTML);

    // 5. MASTER FOOTER (Compliance)
    const masterFooterHTML = `
    <footer style="margin-top: 80px; padding-bottom: 100px; text-align: center; opacity: 0.6;">
        <p style="color: #475569; font-size: 0.75rem;">© 2026 PromptVault USA | Engineered for the AI Economy.</p>
    </footer>`;
    
    document.body.insertAdjacentHTML('beforeend', masterFooterHTML);
});
