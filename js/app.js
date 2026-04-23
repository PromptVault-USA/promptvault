/**
 * PROMPTVAULT USA - CORE ENGINE v4.8
 * MODE: HEADLESS (Spreadsheet-Driven)
 * FIX: Explicit Global Exposure for Grid Buttons & Auto-Price Sync.
 */

import { getFirestore, doc, setDoc, collection, getDocs, getDoc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Initialize Firestore
const db = getFirestore();

const PAYPAL_EMAIL = "emilyperong23@gmail.com";
let cart = JSON.parse(localStorage.getItem('pv_cart')) || [];
let allProducts = [];

// --- 1. THE INVISIBLE IDENTITY SYSTEM ---

const getActiveIdentity = () => {
    if (window.auth?.currentUser && !window.auth.currentUser.isAnonymous) {
        return window.auth.currentUser.uid;
    }
    let gid = localStorage.getItem('pv_guest_uid');
    if (!gid) {
        gid = 'pv_guest_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('pv_guest_uid', gid);
    }
    return gid;
};

// --- 2. SPREADSHEET-DRIVEN RENDERING ---

const renderProducts = (productsToDisplay) => {
    const list = document.getElementById('product-list');
    if (!list) return;

    list.innerHTML = productsToDisplay.map(p => {
        // AUTO-DETECT PRICING: MSRP from 'price', Actual from 'sale_price'
        const msrp = parseFloat(p.price) || 0;
        const sale = parseFloat(p.sale_price) || 0;
        const finalPrice = (sale > 0) ? sale : msrp;

        const absoluteImg = p.img?.startsWith('http') 
            ? p.img 
            : `${window.location.origin}/${p.img?.replace(/^\//, '') || 'logo.png'}`;
        
        // Data package for PayPal
        const cleanP = { id: p.id, name: p.title || p.name, price: finalPrice };
        const pData = encodeURIComponent(JSON.stringify(cleanP));
        
        // Generate Sale UI (Crossed out MSRP if it exists and is higher than sale)
        const pricingHTML = (sale > 0 && msrp > sale) 
            ? `<span style="text-decoration:line-through; color:#64748b; font-size:0.85rem; margin-right:8px;">$${msrp.toFixed(2)}</span>
               <span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${sale.toFixed(2)}</span>`
            : `<span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${finalPrice.toFixed(2)}</span>`;

        return `
            <div class="product-card" style="background:var(--glass); border:1px solid var(--border); border-radius:24px; padding:20px; display:flex; flex-direction:column; height: 100%;">
                <div style="aspect-ratio:1/1; border-radius:15px; overflow:hidden; margin-bottom:15px; border:1px solid var(--border); background:#000;">
                    <img src="${absoluteImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/logo.png'">
                </div>
                <div style="font-weight:800; font-size:1.1rem; margin-bottom:5px; color:white; line-height:1.2;">${p.title || p.name}</div>
                <div style="margin-bottom:15px;">${pricingHTML}</div>
                <div style="display:flex; flex-direction:column; gap:8px; margin-top:auto;">
                    <button onclick="window.processDirectPurchase('${pData}')" class="btn-main" style="background:var(--success); color:white; font-weight:800; padding:12px; border-radius:12px; cursor:pointer; border:none;">Buy Now</button>
                    <button onclick="window.addToCart('${pData}')" class="btn-main" style="background:rgba(255,255,255,0.05); color:white; border:1px solid var(--border); font-size:0.8rem; padding:10px; border-radius:12px; cursor:pointer;">+ Cart</button>
                </div>
            </div>`;
    }).join('');
};

// --- 3. AUTO-SYNC LIBRARY ---

const loadUserLibrary = async () => {
    const identity = getActiveIdentity();
    const grid = document.getElementById('user-library-grid');
    if (!grid) return;

    try {
        const res = await fetch('products.json');
        const syncedProducts = await res.json();

        const q = query(collection(db, "orders"), where("uid", "==", identity));
        const querySnapshot = await getDocs(q);
        
        let libraryHTML = "";
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.status === 'paid' || data.status === 'completed') {
                data.items.forEach(item => {
                    const freshData = syncedProducts.find(p => p.id === item.id || p.gmc_id === item.id);
                    libraryHTML += `
                        <div class="library-card" style="background:var(--glass); border:1px solid var(--border); padding:18px; border-radius:18px; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; width:100%;">
                            <div>
                                <h4 style="margin:0; color:white; font-size:1rem;">${item.name}</h4>
                                <small style="color:var(--secondary); font-weight:800; text-transform:uppercase; font-size:0.6rem;">Permanent Vault Access</small>
                            </div>
                            <a href="${freshData?.drivelink || '#'}" target="_blank" class="btn-main" style="padding:10px 18px; background:var(--success); border-radius:10px; text-decoration:none; font-size:0.8rem;">Open Access ↗</a>
                        </div>`;
                });
            }
        });
        grid.innerHTML = libraryHTML || `<p style="text-align:center; padding:40px; color:#94a3b8;">No prompt packs found. GMC purchases appear here automatically.</p>`;
    } catch (e) { console.error("Library Error:", e); }
};

// --- 4. CHECKOUT ENGINE ---

window.processDirectPurchase = async (productStr) => {
    const product = JSON.parse(decodeURIComponent(productStr));
    const identity = getActiveIdentity();
    const txID = "PV-TX-" + Date.now();
    
    try {
        await setDoc(doc(db, "orders", txID), {
            uid: identity,
            items: [{ id: product.id, name: product.name }],
            status: 'pending',
            createdAt: serverTimestamp()
        });

        const params = new URLSearchParams({
            cmd: "_xclick",
            business: PAYPAL_EMAIL,
            currency_code: "USD",
            amount: product.price.toFixed(2),
            item_name: product.name,
            custom: txID,
            no_shipping: "1",
            return: `${window.location.origin}/success.html?tx=${txID}&guest=${identity}`,
            rm: "2"
        });
        window.location.href = `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
    } catch(e) { 
        console.error("Checkout Sync Failed:", e);
        alert("Payment system busy. Please try again.");
    }
};

window.addToCart = (productStr) => {
    const product = JSON.parse(decodeURIComponent(productStr));
    cart.push(product);
    localStorage.setItem('pv_cart', JSON.stringify(cart));
    window.updateCartCount();
    alert(`Added ${product.name} to selection!`);
};

window.updateCartCount = () => {
    const pill = document.getElementById('cart-count-pill');
    if (pill) pill.innerText = cart.length;
};

// --- 5. NAVIGATION ---

window.changePage = (id, el) => {
    const targetPage = document.getElementById(id);
    
    if (!targetPage) {
        if (id === 'blog') window.location.href = 'blog.html';
        if (id === 'browse' || id === 'library') window.location.href = `index.html?action=${id}#${id}`;
        return;
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    targetPage.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    el?.classList.add('active');

    if (id === 'browse' && allProducts.length === 0) {
        Papa.parse('/products.csv', {
            download: true,
            header: true,
            complete: (results) => {
                allProducts = results.data;
                renderProducts(allProducts);
            }
        });
    }
    if (id === 'library') loadUserLibrary();
};

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    window.updateCartCount();
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    if (action) window.changePage(action);
});

// Explicit Global Exposure
window.renderProducts = renderProducts;
window.loadUserLibrary = loadUserLibrary;
window.getActiveIdentity = getActiveIdentity;
