/**
 * PROMPTVAULT USA - CORE ENGINE v2.2 (Cloud Database & Library)
 * Handles: Auth, Search, Cart, PayPal, and Firestore Persistence.
 */

// --- NEW MODULE IMPORTS (Phase 7) ---
import { getFirestore, doc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// --- NEW MODULE IMPORTS (Phase 8: Legal) ---
import { TrustService } from './trust-service.js';

// Initialize Firestore
const db = getFirestore();
window.db = db; 
window.TrustService = TrustService; // Global bridge

const PAYPAL_EMAIL = "emilyperong23@gmail.com";
let cart = JSON.parse(localStorage.getItem('pv_cart')) || [];
let allProducts = [];

// PDF MAPPING (Your saved Google Drive links)
const DRIVE_LINKS = {
    "Real Estate Mega Pack": "YOUR_DRIVE_LINK_1",
    "E-commerce Growth Vault": "YOUR_DRIVE_LINK_2",
    "Starter Kit": "YOUR_DRIVE_LINK_3"
};

// --- 1. AUTH HELPERS ---
const isUserLoggedIn = () => !!window.auth?.currentUser;

const requireLogin = () => {
    alert("🔒 Please Sign In to access the Vault and purchase prompt packs.");
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'flex';
};

// --- 2. PRODUCT RENDERING & SEARCH ---

window.renderProducts = (productsToDisplay) => {
    const list = document.getElementById('product-list');
    if (!list) return;

    if (productsToDisplay.length === 0) {
        list.innerHTML = `<p style="color:#94a3b8; text-align:center; width:100%; padding:40px;">No prompts found matching your search.</p>`;
        return;
    }

    list.innerHTML = productsToDisplay.map(p => {
        // FIX: Ensure Absolute URL for Google Merchant Center
        const absoluteImg = p.img?.startsWith('http') 
            ? p.img 
            : `${window.location.origin}/${p.img?.replace(/^\//, '') || 'logo.png'}`;

        const pData = encodeURIComponent(JSON.stringify({...p, img: absoluteImg}));
        const displayImg = absoluteImg;
        
        return `
            <div class="product-card" style="background:var(--glass); border:1px solid var(--border); border-radius:24px; padding:20px; display:flex; flex-direction:column; transition: 0.3s transform;">
                <div style="aspect-ratio:1/1; border-radius:15px; overflow:hidden; margin-bottom:15px; border:1px solid var(--border); background:#000;">
                    <img src="${displayImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/400?text=AI+Vault'">
                </div>
                <div style="font-weight:800; font-size:1.1rem; margin-bottom:5px; color:white;">${p.name}</div>
                <div style="color:var(--secondary); font-weight:800; font-size:1.4rem; margin-bottom:15px;">$${p.price.toFixed(2)}</div>
                
                <div style="display:flex; flex-direction:column; gap:8px; margin-top:auto;">
                    <button onclick="processDirectPurchase('${pData}')" class="btn-main" style="background:var(--success); color:white; font-weight:800; border:none; padding:12px; border-radius:12px; cursor:pointer;">Buy Now (Card/PayPal)</button>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        <button onclick="addToCart('${pData}')" class="btn-main" style="background:var(--accent); font-size:0.8rem; padding:10px; border-radius:12px;">+ Cart</button>
                        <a href="product.html?id=${p.id}" class="btn-main" style="background:var(--glass); text-decoration:none; text-align:center; font-size:0.8rem; padding:10px; border-radius:12px; color:white; border:1px solid var(--border);">Details</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

window.filterProducts = (val) => {
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(val.toLowerCase()) || 
        (p.category && p.category.toLowerCase().includes(val.toLowerCase()))
    );
    window.renderProducts(filtered);
};

// --- 3. LIBRARY & DATABASE LOGIC (New v2.1) ---

window.loadUserLibrary = async () => {
    const user = window.auth?.currentUser;
    const grid = document.getElementById('user-library-grid');
    if (!grid) return;
    
    if (!user) {
        grid.innerHTML = `<button class="btn-main" onclick="document.getElementById('auth-overlay').style.display='flex'">Sign In to View Library</button>`;
        return;
    }

    try {
        const q = collection(db, "users", user.uid, "purchases");
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            grid.innerHTML = `<p style="text-align:center; padding:40px; background:var(--glass); border-radius:20px;">You haven't unlocked any packs yet.</p>`;
            return;
        }

        grid.innerHTML = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div style="background:var(--glass); border:1px solid var(--border); padding:20px; border-radius:15px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="margin:0; color:white;">${data.productName}</h4>
                        <small style="color:var(--secondary);">Unlocked: ${new Date(data.timestamp).toLocaleDateString()}</small>
                    </div>
                    <a href="${data.driveLink}" target="_blank" class="btn-main" style="padding:10px 20px; font-size:0.8rem; background:var(--accent); text-decoration:none;">Open PDF</a>
                </div>
            `;
        }).join('');
    } catch (e) { console.error("Library Sync Error:", e); }
};

// --- 4. CART & CHECKOUT OPERATIONS ---

window.updateCartCount = () => {
    const pill = document.getElementById('cart-count-pill');
    if (pill) pill.innerText = cart.length;
};

window.addToCart = (productStr) => {
    if (!isUserLoggedIn()) return requireLogin();
    const product = JSON.parse(decodeURIComponent(productStr));
    cart.push(product);
    localStorage.setItem('pv_cart', JSON.stringify(cart));
    window.updateCartCount();
    
    const notif = document.getElementById('sales-notif');
    const notifText = document.getElementById('notif-text');
    if (notif && notifText) {
        notifText.innerText = `Added ${product.name} to your selection!`;
        notif.style.display = 'flex';
        setTimeout(() => { notif.style.display = 'none'; }, 4000);
    }
};

window.processDirectPurchase = (productStr) => {
    if (!isUserLoggedIn()) return requireLogin();
    const product = JSON.parse(decodeURIComponent(productStr));
    
    const params = new URLSearchParams({
        cmd: "_xclick",
        business: PAYPAL_EMAIL,
        currency_code: "USD",
        amount: product.price.toFixed(2),
        item_name: `PromptVault: ${product.name}`,
        no_shipping: "1",
        solutiontype: "sole",
        landingpage: "billing",
        return: window.location.origin + "/success.html?item=" + encodeURIComponent(product.name),
        rm: "2"
    });

    window.location.href = `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
};

window.processPaypalCheckout = () => {
    if (!isUserLoggedIn()) return requireLogin();
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (total <= 0) return alert("Please add items to your cart first.");

    const params = new URLSearchParams({
        cmd: "_xclick",
        business: PAYPAL_EMAIL,
        currency_code: "USD",
        amount: total.toFixed(2),
        item_name: `PromptVault USA - Order`,
        no_shipping: "1",
        solutiontype: "sole",
        landingpage: "billing",
        return: window.location.origin + "/success.html?order=complete",
        rm: "2"
    });

    window.location.href = `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
};

window.openCheckout = () => {
    if (!isUserLoggedIn()) return requireLogin();
    const modal = document.getElementById('checkout-overlay');
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total');
    if (!modal || !list) return;

    modal.style.display = 'flex';
    if (cart.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:20px;">Your selection is empty.</p>`;
        if (totalEl) totalEl.innerText = "$0.00";
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
    if (totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
};

// --- 5. NAVIGATION & SOCIAL PROOF ---

window.changePage = (id, el) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const activePage = document.getElementById(id);
    if (activePage) activePage.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');

    // NEW: Trust Center Bridge
    if (id === 'trust' && window.TrustService) {
        window.TrustService.renderTrustCenter();
    }

    // Tab-Specific Logic
    if (id === 'browse' && allProducts.length === 0) {
        fetch('products.json').then(res => res.json()).then(data => {
            allProducts = data;
            window.renderProducts(allProducts);
            // Check for Google Deep Link after products load
            checkGoogleDeepLink();
        });
    }
    if (id === 'library') window.loadUserLibrary();
};

// --- NEW: GOOGLE MERCHANT DEEP-LINK HANDLER ---
const checkGoogleDeepLink = () => {
    const params = new URLSearchParams(window.location.search);
    const googleId = params.get('id');
    const action = params.get('action');

    if (googleId && action === 'checkout') {
        const product = allProducts.find(p => p.id === googleId);
        if (product) {
            const pData = encodeURIComponent(JSON.stringify(product));
            window.addToCart(pData);
            window.openCheckout();
        }
    }
};

const showSalesNotif = () => {
    const cities = ["Chicago", "New York", "London", "Manila", "Sydney", "Dubai", "Los Angeles"];
    const actions = ["joined the vault", "purchased a pack", "unlocked the kit"];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const textEl = document.getElementById('notif-text');
    if(textEl) {
        textEl.innerText = `Someone from ${city} ${action}`;
        const el = document.getElementById('sales-notif');
        if(el) el.style.display = 'flex';
        setTimeout(() => { 
            const el = document.getElementById('sales-notif');
            if(el) el.style.display = 'none'; 
        }, 5000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.updateCartCount();
    setInterval(showSalesNotif, 15000);

    // Initial check for Google arrival
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'checkout') {
        window.changePage('browse');
    }
});
