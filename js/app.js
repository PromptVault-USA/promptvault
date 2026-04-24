/**
 * PROMPTVAULT USA - CORE ENGINE v5.2
 * MODE: HEADLESS (Spreadsheet-Driven) 
 * FIX: Fully Adaptive Pricing + Smart Cart Logic Sync
 */

import { getFirestore, doc, setDoc, collection, getDocs, getDoc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth } from './firebase-config.js';

window.auth = auth; 
const db = getFirestore();
const PAYPAL_CLIENT_ID = "AWapcH0acCdiTehBXFR48XBWweSYxkuTnJ7zLadzyL9rLjGyrvVEKwKBuLUUW1ZIvcaNlhk-qSCxvu_m"; 
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

// --- 2. SPREADSHEET-DRIVEN RENDERING + ADAPTIVE PAYPAL BUTTONS ---
const renderProducts = (productsToDisplay) => {
  const list = document.getElementById('product-list');
  if (!list) return;
  
  list.innerHTML = productsToDisplay.map((p, index) => {
    if (!p.id) return ""; 
    
    // Dynamic Pricing Logic: Prioritize Sale Price
    const msrp = parseFloat(p.price) || 0;
    const sale = parseFloat(p.sale_price) || 0;
    const finalPrice = (sale > 0) ? sale : msrp;
    
    const absoluteImg = p.img?.startsWith('http') ? p.img : `${window.location.origin}/${p.img?.replace(/^\//, '') || 'logo.png'}`;
    
    // Data package for the cart function
    const cleanP = { id: p.id, name: p.title || p.name, price: finalPrice };
    const pData = encodeURIComponent(JSON.stringify(cleanP));
    const buttonContainerId = `paypal-button-${p.id}`; 

    const pricingHTML = (sale > 0 && msrp > sale) 
      ? `<span style="text-decoration:line-through; color:#64748b; font-size:0.85rem; margin-right:8px;">$${msrp.toFixed(2)}</span> <span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${sale.toFixed(2)}</span>` 
      : `<span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${finalPrice.toFixed(2)}</span>`;

    setTimeout(() => {
      const container = document.getElementById(buttonContainerId);
      if (container && !container.hasChildNodes()) {
        paypal.Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{
                amount: { value: finalPrice.toFixed(2) },
                description: `PromptVaultUSA - ${cleanP.name}`,
                custom_id: cleanP.id,
                invoice_id: `PV-${cleanP.id}-${Date.now()}`
              }]
            });
          },
          onApprove: (data, actions) => {
            return actions.order.capture().then(async (details) => {
              const identity = getActiveIdentity();
              const txID = details.id; 
              await setDoc(doc(db, "orders", txID), {
                uid: identity,
                items: [{ id: cleanP.id, name: cleanP.name, price: finalPrice }],
                status: 'paid', 
                paypalTransactionId: details.id,
                payerEmail: details.payer.email_address,
                createdAt: serverTimestamp()
              });
              window.location.href = `/success.html?tx=${txID}&guest=${identity}`;
            });
          }
        }).render(`#${buttonContainerId}`);
      }
    }, 0);

    return `
    <div class="product-card" style="background:var(--glass); border:1px solid var(--border); border-radius:24px; padding:20px; display:flex; flex-direction:column; height: 100%;">
      <div style="aspect-ratio:1/1; border-radius:15px; overflow:hidden; margin-bottom:15px; border:1px solid var(--border); background:#000;">
        <img src="${absoluteImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/logo.png'">
      </div>
      <div style="font-weight:800; font-size:1.1rem; margin-bottom:5px; color:white; line-height:1.2;">${p.title || p.name}</div>
      <div style="margin-bottom:15px;">${pricingHTML}</div>
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:auto;">
        <div id="${buttonContainerId}"></div>
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
  grid.innerHTML = `<p style="text-align:center; padding:20px; color:#94a3b8;">Syncing Vault...</p>`;
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
    grid.innerHTML = libraryHTML || `<p style="text-align:center; padding:40px; color:#94a3b8;">No prompt packs found. Purchases appear here automatically.</p>`;
  } catch (e) { console.error("Library Sync Error:", e); }
};

// --- 4. CART ENGINE (SMART BUNDLE) ---
window.addToCart = (productStr) => {
  const product = JSON.parse(decodeURIComponent(productStr));
  cart.push(product);
  localStorage.setItem('pv_cart', JSON.stringify(cart));
  window.updateCartCount();
  
  // Create a toast/notif instead of a blocky alert for better UX
  console.log(`🛒 Added: ${product.name}`);
};

window.updateCartCount = () => {
  const pill = document.getElementById('cart-count-pill');
  if (pill) pill.innerText = cart.length;
};

// --- THE SMART CART CHECKOUT FIX ---
window.renderCartPayPal = (total) => {
  const container = document.getElementById('cart-paypal-container');
  if (!container) return;
  container.innerHTML = ''; // Force clear to prevent duplication
  
  paypal.Buttons({
    style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
    createOrder: (data, actions) => {
      return actions.order.create({
        purchase_units: [{
          amount: { value: total.toFixed(2) },
          description: "PromptVaultUSA - Multiple Asset Bundle",
          custom_id: "CART_BUNDLE" 
        }]
      });
    },
    onApprove: (data, actions) => {
      return actions.order.capture().then(async (details) => {
        const identity = getActiveIdentity();
        await setDoc(doc(db, "orders", details.id), {
          uid: identity,
          items: cart, // Pass the entire bundle array
          status: 'paid',
          paypalTransactionId: details.id,
          createdAt: serverTimestamp()
        });
        localStorage.removeItem('pv_cart');
        cart = [];
        window.updateCartCount();
        window.location.href = `/success.html?tx=${details.id}&guest=${identity}`;
      });
    }
  }).render('#cart-paypal-container');
};

// --- 5. NAVIGATION ---
window.changePage = (id, el) => {
  const targetPage = document.getElementById(id);
  if (!targetPage) {
    if (id === 'blog') window.location.href = 'blog.html';
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  targetPage.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  el?.classList.add('active');
  
  if (id === 'browse' && allProducts.length === 0) {
    Papa.parse('/products.csv', {
      download: true, header: true, skipEmptyLines: true,
      complete: (results) => {
        allProducts = results.data.filter(row => row.id);
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
