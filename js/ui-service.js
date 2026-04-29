/**
 * PROJECT MEMORY: UI & UX Service (v2.3)
 * Upgrades: Absolute Image Path Resolution, Global Root Fetching & Niche Folder Mapping.
 * Responsibility: Notifications, Cart UI, Navigation, and SEO-compliant Rendering.
 */

export const UIService = {
    // REUSED: Standard notification logic
    showNotification: (text, type = 'info') => {
        const notif = document.getElementById('sales-notif');
        const textEl = document.getElementById('notif-text');
        if (!notif || !textEl) return;
        textEl.innerText = text;
        notif.style.display = 'flex';
        notif.style.borderColor = type === 'success' ? '#22c55e' : 'rgba(255,255,255,0.1)';
        notif.style.boxShadow = type === 'success' ? '0 0 20px rgba(34, 197, 94, 0.2)' : 'none';
        setTimeout(() => { notif.style.display = 'none'; }, 4000);
    },

    // REUSED: Cart pill and total synchronization
    refreshCartUI: () => {
        const cart = JSON.parse(localStorage.getItem('pv_cart')) || [];
        const pill = document.getElementById('cart-count-pill');
        const totalEl = document.getElementById('cart-total');
        if (pill) {
            pill.innerText = cart.length;
            pill.style.display = cart.length > 0 ? 'block' : 'none';
        }
        if (totalEl) {
            const total = cart.reduce((sum, item) => sum + item.price, 0);
            totalEl.innerText = `$${total.toFixed(2)}`;
        }
    },

    // REUSED: Standardized page switching logic
    // FIXED: Added leading slash to products.json to prevent 404s on sub-pages
    changePage: (id, el) => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if (el) el.classList.add('active');
        
        // --- NEW: Trust Center Logic ---
        if (id === 'trust' && window.TrustService) {
            window.TrustService.renderTrustCenter();
        }

        if (id === 'library' && window.loadUserLibrary) window.loadUserLibrary();
        
        // FIX: Using absolute domain ensures consistent fetching across sub-pages
        const domain = "https://promptvaultusa.shop";
        if (id === 'browse' && (!window.allProducts || window.allProducts.length === 0)) {
            fetch(`${domain}/products.json`)
                .then(res => res.json())
                .then(data => {
                    window.allProducts = data;
                    UIService.renderProducts(data);
                })
                .catch(err => console.error("Vault Grid Load Error:", err));
        }
    },

    /**
     * UPGRADED: Standardized Product Rendering Logic
     * FIX: Resolves "Unable to show image" by forcing absolute URLs and mapping niche folders.
     */
    renderProducts: (productsToDisplay) => {
        const list = document.getElementById('product-list');
        if (!list) return;

        if (productsToDisplay.length === 0) {
            list.innerHTML = `<p style="color:#94a3b8; text-align:center; width:100%; padding:40px;">No prompts found.</p>`;
            return;
        }

        const domain = "https://promptvaultusa.shop";

        list.innerHTML = productsToDisplay.map(p => {
            // STEP 1: Handle specific niche folder path if 'assets/' is missing
            let rawImg = p.img || '';
            if (!rawImg.startsWith('http') && !rawImg.startsWith('assets/')) {
                rawImg = `assets/images/niches/${rawImg.replace(/^\//, '')}`;
            }

            // STEP 2: Generate Absolute URL for the image
            // This ensures Google Merchant Center can find the image from the USA canonical domain
            const absoluteImg = rawImg.startsWith('http') 
                ? rawImg 
                : `${domain}/${rawImg.replace(/^\//, '')}`;

            const secureProduct = {
                id: p.id,
                name: p.name,
                price: p.price,
                driveLink: p.download,
                img: absoluteImg // Use resolved path
            };
            const pData = encodeURIComponent(JSON.stringify(secureProduct));
            
            return `
                <div class="product-card" style="background:var(--glass); border:1px solid var(--border); border-radius:24px; padding:20px; display:flex; flex-direction:column; height: 100%;">
                    <div style="aspect-ratio:1/1; border-radius:15px; overflow:hidden; margin-bottom:15px; border:1px solid var(--border); background:#000;">
                        <img src="${absoluteImg}" style="width:100%; height:100%; object-fit:cover;" loading="lazy" alt="${p.name}">
                    </div>
                    <div style="font-weight:800; font-size:1.1rem; margin-bottom:5px; color:white;">${p.name}</div>
                    <p style="font-size:0.8rem; color:#94a3b8; line-height:1.4; margin-bottom:15px; flex-grow: 1;">${p.desc}</p>
                    <div style="color:var(--secondary); font-weight:800; font-size:1.4rem; margin-bottom:15px;">$${p.price.toFixed(2)}</div>
                    
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button onclick="window.processDirectPurchase('${pData}')" class="btn-main" style="background:var(--success); color:white; font-weight:800; border:none; padding:12px; border-radius:12px; cursor:pointer;">Buy Now</button>
                        <button onclick="window.addToCart('${pData}')" class="btn-main" style="background:var(--accent); font-size:0.8rem; padding:10px; border-radius:12px;">+ Cart</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    // REUSED: Real-time filtering logic
    filterProducts: (val) => {
        if (!window.allProducts) return;
        const filtered = window.allProducts.filter(p => 
            p.name.toLowerCase().includes(val.toLowerCase()) || 
            (p.category && p.category.toLowerCase().includes(val.toLowerCase()))
        );
        UIService.renderProducts(filtered);
    }
};
