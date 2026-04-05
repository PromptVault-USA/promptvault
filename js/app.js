/**
 * PROMPTVAULT USA - CORE ENGINE v1.6
 * Handles: Product Rendering, Search, Cart Persistence, and PayPal Integration.
 */

const PAYPAL_EMAIL = "emilyperong23@gmail.com";
let cart = JSON.parse(localStorage.getItem('pv_cart')) || [];
let allProducts = [];

// --- 1. PRODUCT RENDERING & SEARCH (Step 6) ---

/**
 * Renders the product grid with "Add to Cart" and "Details" functionality.
 * @param {Array} productsToDisplay - The filtered or full list of products.
 */
export const renderProducts = (productsToDisplay) => {
    const list = document.getElementById('product-list');
    if (!list) return;

    if (productsToDisplay.length === 0) {
        list.innerHTML = `<p style="color:#94a3b8; text-align:center; width:100%; padding:40px;">No prompts found matching your search.</p>`;
        return;
    }

    list.innerHTML = productsToDisplay.map(p => {
        const pData = encodeURIComponent(JSON.stringify(p));
        const displayImg = p.img || `https://picsum.photos/seed/${p.id}/400/400`;
        
        return `
            <div class="product-card" style="background:var(--glass); border:1px solid var(--border); border-radius:24px; padding:20px; display:flex; flex-direction:column; transition: 0.3s transform;">
                <div style="aspect-ratio:1/1; border-radius:15px; overflow:hidden; margin-bottom:15px; border:1px solid var(--border); background:#000;">
                    <img src="${displayImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/400?text=AI+Vault'">
                </div>
                <div style="font-weight:800; font-size:1.1rem; margin-bottom:5px; color:white;">${p.name}</div>
                <div style="color:var(--secondary); font-weight:800; font-size:1.4rem; margin-bottom:15px;">$${p.price.toFixed(2)}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:auto;">
                    <button onclick="addToCart('${pData}')" class="btn-main" style="background:var(--accent); font-size:0.8rem; padding:12px; border-radius:12px;">+ Cart</button>
                    <a href="product.html?id=${p.id}" class="btn-main" style="background:var(--glass); text-decoration:none; text-align:center; font-size:0.8rem; padding:12px; border-radius:12px; color:white; border:1px solid var(--border);">Details</a>
                </div>
            </div>
        `;
    }).join('');
};

/**
 * Filters the master product list based on user input.
 */
window.filterProducts = (val) => {
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(val.toLowerCase()) || 
        (p.category && p.category.toLowerCase().includes(val.toLowerCase()))
    );
    renderProducts(filtered);
};

// --- 2. CART OPERATIONS (Step 5) ---

window.updateCartCount = () => {
    const pill = document.getElementById('cart-count-pill');
    if (pill) pill.innerText = cart.length;
};

window.addToCart = (productStr) => {
    const product = JSON.parse(decodeURIComponent(productStr));
    cart.push(product);
    localStorage.setItem('pv_cart', JSON.stringify(cart));
    updateCartCount();
    
    // UI Feedback
    const notif = document.getElementById('sales-notif');
    const notifText = document.getElementById('notif-text');
    if (notif && notifText) {
        notifText.innerText = `Added ${product.name} to your vault!`;
        notif.style.display = 'flex';
        setTimeout(() => { notif.style.display = 'none'; }, 3000);
    }
};

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    localStorage.setItem('pv_cart', JSON.stringify(cart));
    updateCartCount();
    openCheckout(); // Refresh the checkout UI
};

// --- 3. CHECKOUT & PAYPAL (Step 7) ---

window.openCheckout = () => {
    const modal = document.getElementById('checkout-overlay');
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total');
    
    if (!modal || !list) return;

    modal.style.display = 'flex';
    
    if (cart.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:20px;">Your selection is empty.</p>`;
        totalEl.innerText = "$0.00";
        return;
    }

    list.innerHTML = cart.map((item, index) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; background:rgba(255,255,255,0.03); padding:12px; border-radius:12px; border:1px solid var(--border);">
            <div style="display:flex; flex-direction:column;">
                <span style="font-size:0.85rem; font-weight:600; color:white;">${item.name}</span>
                <span style="font-size:0.75rem; color:var(--secondary);">$${item.price.toFixed(2)}</span>
            </div>
            <button onclick="removeFromCart(${index})" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:1.2rem; padding:5px;">✕</button>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    totalEl.innerText = `$${total.toFixed(2)}`;
};

window.processPaypalCheckout = () => {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (total <= 0) return alert("Please add items to your cart first.");

    // Dynamic standard PayPal redirect
    const baseUrl = "https://www.paypal.com/cgi-bin/webscr";
    const params = new URLSearchParams({
        cmd: "_xclick",
        business: PAYPAL_EMAIL,
        currency_code: "USD",
        amount: total.toFixed(2),
        item_name: `PromptVault USA - ${cart.length} AI Assets`,
        no_shipping: "1",
        return: window.location.origin + "/success.html",
        cancel_return: window.location.origin
    });

    window.location.href = `${baseUrl}?${params.toString()}`;
};

// --- 4. NAVIGATION & INITIALIZATION ---

window.changePage = (id, el) => {
    // Switch visibility
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const activePage = document.getElementById(id);
    if (activePage) activePage.classList.add('active');

    // Update Nav UI
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');

    // Load products only when entering the browse page
    if (id === 'browse' && allProducts.length === 0) {
        fetch('products.json')
            .then(res => res.json())
            .then(data => {
                allProducts = data;
                renderProducts(allProducts);
            })
            .catch(err => console.error("Vault Sync Error:", err));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
});
