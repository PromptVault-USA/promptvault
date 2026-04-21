/**
 * PROMPTVAULT USA - CORE ENGINE v2.5 (Cloud Database & Library)
 * Handles: Auth, Search, Cart, PayPal, and Firestore Persistence.
 * Features: Asset Registry v2.5, Auto-Provisioning, & Absolute Image SEO.
 */

import { getFirestore, doc, setDoc, collection, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { TrustService } from './trust-service.js';

// Initialize Firestore
const db = getFirestore();
window.db = db; 
window.TrustService = TrustService; 

const PAYPAL_EMAIL = "emilyperong23@gmail.com";
let cart = JSON.parse(localStorage.getItem('pv_cart')) || [];
let allProducts = [];

/**
 * PROMPTVAULT USA - ASSET REGISTRY (v2.5)
 * Centralized mapping of Product IDs to Secure Drive Links.
 */
const ASSET_REGISTRY = {
    // START UP ASSETS
    "welcome_letter": "https://drive.google.com/file/d/1_iV_c3L32pn9Njksp35IMt7gi7L0ikYG/view?usp=drivesdk",
    "starter_kit": "https://drive.google.com/file/d/1MBGb8x24PmqMH5CUlkxJ5ckY7cDcVf4u/view?usp=drivesdk",

    // NICHE PACKS (001 - 023)
    "niche_001": "https://drive.google.com/file/d/1LIoHBGQdbNB6bUhp1nofXFEfsoAdYvFQ/view?usp=drivesdk",
    "niche_002": "https://drive.google.com/file/d/12lJBO57d3a3XafYQtRgZ2QeMVS-OrkyE/view?usp=drivesdk",
    "niche_003": "https://drive.google.com/file/d/1t4FBs5qn35XjI9hXA8CLjEnXl73Wid2T/view?usp=drivesdk",
    "niche_004": "https://drive.google.com/file/d/1zz5ui9aOwGK8z7_9TnDt3DgKcs0s2Hew/view?usp=drivesdk",
    "niche_005": "https://drive.google.com/file/d/1pz6Ve0f_b2LqrQR1SxkLVZNEV2jkFhpz/view?usp=drivesdk",
    "niche_006": "https://drive.google.com/file/d/1b5kI7ZlYI7dgRX_9NBkUka758u_uG497/view?usp=drivesdk",
    "niche_007": "https://drive.google.com/file/d/1PrvZwxCuUaUzQ4SwngHRLjhl95frR-JZ/view?usp=drivesdk",
    "niche_008": "https://drive.google.com/file/d/1Ip8ZYjl2KU8h1D1VKDwpFO54Yopt9Pf5/view?usp=drivesdk",
    "niche_009": "https://drive.google.com/file/d/1ZtQbyHC5e8tsxCZbKYSKaZvPgHhaIOkb/view?usp=drivesdk",
    "niche_010": "https://drive.google.com/file/d/1H4_OXyAAX6iB3UMT4FpOC89LqLv1ahQH/view?usp=drivesdk",
    "niche_011": "https://drive.google.com/file/d/1CoB9iwtPwf2IF36hJTkNWG8xQj1j0dr0/view?usp=drivesdk",
    "niche_012": "https://drive.google.com/file/d/164T_3CBvKNqvWI-IvACUjPENyQjmuafv/view?usp=drivesdk",
    "niche_013": "https://drive.google.com/file/d/1uCE7bUNovVR7QjSyp7933nwRreAFKgdd/view?usp=drivesdk",
    "niche_014": "https://drive.google.com/file/d/1XyWZSekZB6ZUF6qLHWShoWbHnCd7DiZB/view?usp=drivesdk",
    "niche_015": "https://drive.google.com/file/d/1g8BNq6ZoyZ2aQInjlGKyvq5KdivrBVMd/view?usp=drivesdk",
    "niche_016": "https://drive.google.com/file/d/1GBFnWSd2wFMIVoxTqI91TS2FID9EE3rU/view?usp=drivesdk",
    "niche_017": "https://drive.google.com/file/d/1xgLFGh4LA82HsN5UOW-bvSgqfAxkKKum/view?usp=drivesdk",
    "niche_018": "https://drive.google.com/file/d/1TvXLDBLLVzAEcI34UoxqYibFVMt9RDwT/view?usp=drivesdk",
    "niche_019": "https://drive.google.com/file/d/1W0SkaggB1g_M6fujx-3t3vYgi33TYPS_/view?usp=drivesdk",
    "niche_020": "https://drive.google.com/file/d/1CpJQ5J7_qbXoM4ZUGIKrZQUrw5XW26-a/view?usp=drivesdk",
    "niche_021": "https://drive.google.com/file/d/1wX_pxdUGij1cuwR_X_gBVrlgGKgkFuz3/view?usp=drivesdk",
    "niche_022": "https://drive.google.com/file/d/11dXBDbv9qTrRsN7E3dKoxZvZdDzo3TPL/view?usp=drivesdk",
    "niche_023": "https://drive.google.com/file/d/1ELQeKBDWlrPBkN0PZgeub-iVunkx7EV0/view?usp=drivesdk"
};

// --- 1. AUTH HELPERS & PROVISIONING ---
const isUserLoggedIn = () => !!window.auth?.currentUser;

const requireLogin = () => {
    alert("🔒 Please Sign In to access the Vault and purchase prompt packs.");
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'flex';
};

window.ensureUserProfile = async (user) => {
    if (!user) return;
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                email: user.email,
                joinedDate: new Date().toISOString(),
                purchasedPrompts: [
                    { 
                        productName: "✉️ Welcome Letter & Hub Guide", 
                        driveLink: ASSET_REGISTRY.welcome_letter,
                        timestamp: Date.now() + 10 
                    },
                    { 
                        productName: "🎁 2026 AI Starter Kit (Free)", 
                        driveLink: ASSET_REGISTRY.starter_kit,
                        timestamp: Date.now() 
                    }
                ]
            });
        }
    } catch (e) { console.error("Provisioning Error:", e); }
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
        const absoluteImg = p.img?.startsWith('http') 
            ? p.img 
            : `${window.location.origin}/${p.img?.replace(/^\//, '') || 'logo.png'}`;

        const pData = encodeURIComponent(JSON.stringify({...p, img: absoluteImg}));
        
        return `
            <div class="product-card" style="background:var(--glass); border:1px solid var(--border); border-radius:24px; padding:20px; display:flex; flex-direction:column; transition: 0.3s transform;">
                <div style="aspect-ratio:1/1; border-radius:15px; overflow:hidden; margin-bottom:15px; border:1px solid var(--border); background:#000;">
                    <img src="${absoluteImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/400?text=AI+Vault'">
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
            </div>`;
    }).join('');
};

window.filterProducts = (val) => {
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(val.toLowerCase()) || 
        (p.category && p.category.toLowerCase().includes(val.toLowerCase()))
    );
    window.renderProducts(filtered);
};

// --- 3. LIBRARY RENDERING ---

window.loadUserLibrary = async () => {
    const user = window.auth?.currentUser;
    const grid = document.getElementById('user-library-grid');
    if (!grid || !user) return;

    try {
        const userRef = doc(db, "users", user.uid);
        const profileSnap = await getDoc(userRef);
        
        let purchasedPrompts = profileSnap.exists() ? (profileSnap.data().purchasedPrompts || []) : [];
        purchasedPrompts.sort((a, b) => b.timestamp - a.timestamp);

        if (purchasedPrompts.length === 0) {
            grid.innerHTML = `<p style="text-align:center; padding:40px; background:var(--glass); border-radius:20px;">You haven't unlocked any packs yet.</p>`;
            return;
        }

        grid.innerHTML = purchasedPrompts.map(item => `
            <div class="library-card" style="background:var(--glass); border:1px solid var(--border); padding:18px; border-radius:18px; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div>
                    <h4 style="margin:0; color:white; font-size:1rem;">${item.productName}</h4>
                    <small style="color:var(--secondary); font-weight:800; text-transform:uppercase; font-size:0.6rem;">Permanent Access</small>
                </div>
                <a href="${item.driveLink}" target="_blank" class="btn-main" style="padding:10px 18px; font-size:0.8rem; background:var(--success); border-radius:10px; text-decoration:none;">Open Access</a>
            </div>`).join('');
    } catch (e) { console.error("Library Error:", e); }
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
    if (notif) {
        document.getElementById('notif-text').innerText = `Added ${product.name} to selection!`;
        notif.style.display = 'flex';
        setTimeout(() => { notif.style.display = 'none'; }, 4000);
    }
};

window.processDirectPurchase = async (productStr) => {
    if (!isUserLoggedIn()) return requireLogin();
    const product = JSON.parse(decodeURIComponent(productStr));
    const txID = "PV-DIR-" + Date.now();
    
    try {
        await setDoc(doc(db, "orders", txID), {
            uid: window.auth.currentUser.uid,
            email: window.auth.currentUser.email,
            items: [product],
            status: 'pending',
            createdAt: new Date().toISOString()
        });

        localStorage.setItem('pending_assets', JSON.stringify([product]));

        const params = new URLSearchParams({
            cmd: "_xclick",
            business: PAYPAL_EMAIL,
            currency_code: "USD",
            amount: product.price.toFixed(2),
            item_name: `PromptVault: ${product.name}`,
            custom: txID,
            no_shipping: "1",
            return: `${window.location.origin}/success.html?tx=${txID}`,
            rm: "2"
        });
        window.location.href = `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
    } catch(e) { alert("Handshake Failed."); }
};

window.processPaypalCheckout = async () => {
    if (!isUserLoggedIn()) return requireLogin();
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (total <= 0) return alert("Cart empty.");
    const txID = "PV-CART-" + Date.now();

    try {
        await setDoc(doc(db, "orders", txID), {
            uid: window.auth.currentUser.uid,
            email: window.auth.currentUser.email,
            items: cart,
            status: 'pending',
            createdAt: new Date().toISOString()
        });

        localStorage.setItem('pending_assets', JSON.stringify(cart));

        const params = new URLSearchParams({
            cmd: "_xclick",
            business: PAYPAL_EMAIL,
            currency_code: "USD",
            amount: total.toFixed(2),
            item_name: `PromptVault USA - Order`,
            custom: txID,
            no_shipping: "1",
            return: `${window.location.origin}/success.html?tx=${txID}`,
            rm: "2"
        });
        window.location.href = `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
    } catch(e) { alert("Handshake Failed."); }
};

window.openCheckout = () => {
    if (!isUserLoggedIn()) return requireLogin();
    const modal = document.getElementById('checkout-overlay');
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total');
    if (!modal || !list) return;

    modal.style.display = 'flex';
    if (cart.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:20px;">Selection empty.</p>`;
        if (totalEl) totalEl.innerText = "$0.00";
        return;
    }

    list.innerHTML = cart.map((item, index) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; background:rgba(255,255,255,0.03); padding:12px; border-radius:12px; border:1px solid var(--border);">
            <div style="display:flex; flex-direction:column;">
                <span style="font-size:0.85rem; font-weight:600; color:white;">${item.name}</span>
                <span style="font-size:0.75rem; color:var(--secondary);">$${item.price.toFixed(2)}</span>
            </div>
            <button onclick="removeFromCart(${index})" style="color:#ef4444; background:none; border:none; cursor:pointer;">✕</button>
        </div>`).join('');

    if (totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
};

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    localStorage.setItem('pv_cart', JSON.stringify(cart));
    window.updateCartCount();
    window.openCheckout();
};

// --- 5. NAVIGATION & ROUTING ---

window.changePage = (id, el) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const activePage = document.getElementById(id);
    if (activePage) activePage.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');

    if (id === 'trust') window.TrustService.renderTrustCenter();
    if (id === 'browse' && allProducts.length === 0) {
        fetch('products.json').then(res => res.json()).then(data => {
            allProducts = data;
            window.renderProducts(allProducts);
            checkGoogleDeepLink();
        });
    }
    if (id === 'library') window.loadUserLibrary();
};

const checkGoogleDeepLink = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'checkout') {
        const product = allProducts.find(p => p.id === params.get('id'));
        if (product) {
            window.addToCart(encodeURIComponent(JSON.stringify(product)));
            window.openCheckout();
        }
    }
};

const showSalesNotif = () => {
    const cities = ["Chicago", "New York", "Manila", "London", "Sydney"];
    const textEl = document.getElementById('notif-text');
    if(textEl) {
        textEl.innerText = `Someone from ${cities[Math.floor(Math.random()*cities.length)]} unlocked the Vault!`;
        const el = document.getElementById('sales-notif');
        if(el) el.style.display = 'flex';
        setTimeout(() => { if(el) el.style.display = 'none'; }, 5000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.updateCartCount();
    setInterval(showSalesNotif, 18000);
    
    if (window.auth) {
        window.auth.onAuthStateChanged(user => {
            if (user) window.ensureUserProfile(user);
        });
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'checkout') window.changePage('browse');
});
