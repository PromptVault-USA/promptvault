document.addEventListener("DOMContentLoaded", function() {
    const glassCard = document.querySelector('.glass-card');
    
    if (glassCard) {
        const footerHTML = `
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
                    <a href="legal.html" style="color: var(--secondary); font-size: 0.75rem; text-decoration: none; font-weight: 800; border-bottom: 1px solid var(--secondary);">Read Full Legal & Terms →</a>
                </div>
            </div>`;
        
        glassCard.insertAdjacentHTML('beforeend', footerHTML);
    }
});
