/**
 * TRUST & LEGAL SERVICE (v1.0)
 * Responsibility: Renders legal compliance content within the SPA.
 */
export const TrustService = {
    renderTrustCenter: () => {
        const container = document.getElementById('trust-center-content');
        if (!container) return;

        container.innerHTML = `
            <div class="trust-container" style="max-width:850px; margin:0 auto; padding:20px; text-align:left;">
                <header style="margin-bottom: 30px; text-align:center;">
                    <h1 style="color:var(--gold); letter-spacing:2px; font-weight:800;">TRUST CENTER</h1>
                    <p style="color:var(--text-gray); font-size:0.9rem;">PromptVault USA Legal & Compliance</p>
                </header>

                <section style="background:rgba(255,255,255,0.03); padding:30px; border-radius:24px; border:1px solid rgba(255,255,255,0.1); margin-bottom:20px;">
                    <h2 style="color:var(--gold); font-size:1.1rem; margin-top:0;">REFUND & RETURN POLICY</h2>
                    <p style="color:var(--text-gray); font-size:0.9rem; line-height:1.6;">Because our products are <strong>intangible digital assets</strong> delivered via instant access, all sales are final. Once a prompt pack has been accessed, we cannot offer a refund.</p>
                    <p style="color:var(--text-gray); font-size:0.9rem;"><strong>Support:</strong> admin@promptvaultusa.shop</p>
                </section>

                <section style="background:rgba(255,255,255,0.03); padding:30px; border-radius:24px; border:1px solid rgba(255,255,255,0.1); margin-bottom:20px;">
                    <h2 style="color:var(--gold); font-size:1.1rem; margin-top:0;">PRIVACY POLICY</h2>
                    <p style="color:var(--text-gray); font-size:0.9rem; line-height:1.6;">We collect your email via Firebase for account security and library access. Payment data is processed securely through PayPal.</p>
                </section>

                <section style="background:rgba(255,255,255,0.03); padding:30px; border-radius:24px; border:1px solid rgba(255,255,255,0.1);">
                    <h2 style="color:var(--gold); font-size:1.1rem; margin-top:0;">TERMS & CONDITIONS</h2>
                    <p style="color:var(--text-gray); font-size:0.9rem; line-height:1.6;">By using promptvaultusa.shop, you agree to a non-exclusive license for personal or commercial creative projects. Reselling raw prompt strings is strictly prohibited.</p>
                </section>
            </div>
        `;
    }
};
