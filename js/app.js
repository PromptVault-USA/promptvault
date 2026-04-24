/**
 * PROMPTVAULT USA - CORE ENGINE v5.4
 * MODE: HEADLESS (Spreadsheet-Driven) 
 * FIX: Cart PayPal render timing + Product page URL params
 */
import { getFirestore, doc, setDoc, collection, getDocs, getDoc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth } from './firebase-config.js';

window.auth = auth;
const db = getFirestore();

// FIX 1: REMOVED duplicate PAYPAL_CLIENT_ID - index.html loads it
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
    const msrp = parseFloat(p.price) || 0;
    const sale = parseFloat(p.sale_price) || 0;
    const finalPrice = (sale > 0) ? sale : msrp;
    const absoluteImg = p.img?.startsWith('http') ? p.img : `${window.location.origin}/${p.img?.replace(/^\//, '') || 'logo.png'}`;
    const cleanP = { id: p.id, name: p.title || p.name, price: finalPrice, slug: p.slug };
    const pData = encodeURIComponent(JSON.stringify(cleanP));
    const buttonContainerId = `paypal-button-${p.id}`;
    const pricingHTML = (sale > 0 && msrp > sale) ? `<span style="text-decoration:line-through; color:#64748b; font-size:0.85rem; margin-right:8px;">$${msrp.toFixed(2)}</span> <span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${sale.toFixed(2)}</span>` : `<span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${finalPrice.toFixed(2)}</span>`;
    
    setTimeout(() => {
      const container = document.getElementById(buttonContainerId);
      if (container && !container.hasChildNodes()) {
        paypal.Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{ amount: { value: finalPrice.toFixed(2) }, description: `PromptVaultUSA - ${cleanP.name}`, custom_id: cleanP.id, invoice_id: `PV-${cleanP.id}-${Date.now()}` }]
            });
          },
          onApprove: (data, actions) => {
            return actions.order.capture().then(async (details) => {
              const identity = getActiveIdentity();
              const txID = details.id;
              await setDoc(doc(db, "orders", txID), { uid: identity, items: [{ id: cleanP.id, name: cleanP.name, price: finalPrice }], status: 'completed', paypalTransactionId: details.id, payerEmail: details.payer.email_address, createdAt: serverTimestamp() });
              window.location.href = `/success.html?tx=${txID}&guest=${identity}`;
            });
          },
          onError: (err) => {
            console.error('PayPal Error:', err);
            alert('Payment failed. Try again or contact admin@promptvaultusa.shop');
          }
        }).render(`#${buttonContainerId}`);
      }
    }, 0);
    return `
      <div class="product-card" style="background:var(--glass); border:1px solid var(--border); border-radius:24px; padding:20px; display:flex; flex-direction:column; height: 100%;">
        <a href="/vault/${p.slug}.html?price=${finalPrice}&msrp=${msrp}" style="text-decoration:none;">
          <div style="aspect-ratio:1/1; border-radius:15px; overflow:hidden; margin-bottom:15px; border:1px solid var(--border); background:#000;">
            <img src="${absoluteImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/logo.png'">
          </div>
          <div style="font-weight:800; font-size:1.1rem; margin-bottom:5px; color:white; line-height:1.2;">${p.title || p.name}</div>
        </a>
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
    const res = await fetch('/products.json');
    const syncedProducts = await res.json();
    const q = query(collection(db, "orders"), where("uid", "==", identity));
    const querySnapshot = await getDocs(q);
    let libraryHTML = "";
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'completed' || data.status === 'paid') {
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
  } catch (e) {
    console.error("Library Sync Error:", e);
    grid.innerHTML = `<p style="text-align:center; padding:40px; color:#ef4444;">Error loading library. Refresh page.</p>`;
  }
};

// --- 4. CART ENGINE (SMART BUNDLE) ---
window.addToCart = (productStr) => {
  const product = JSON.parse(decodeURIComponent(productStr));
  cart.push(product);
  localStorage.setItem('pv_cart', JSON.stringify(cart));
  window.updateCartCount();
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:var(--success); color:white; padding:12px 20px; border-radius:12px; z-index:9999; font-weight:700;';
  toast.textContent = `✓ Added ${product.name}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
};

window.updateCartCount = () => {
  const pill = document.getElementById('cart-count-pill');
  if (pill) pill.innerText = cart.length;
};

window.renderCart = () => {
  const list = document.getElementById('cart-items-list');
  const totalEl = document.getElementById('cart-total');
  const paypalContainer = document.getElementById('cart-paypal-container');
  if (!list || !totalEl || !paypalContainer) return;
  if (cart.length === 0) {
    list.innerHTML = `<p style="text-align:center; padding:40px; color:#94a3b8;">Your cart is empty.</p>`;
    totalEl.textContent = '';
    paypalContainer.innerHTML = '';
    return;
  }
  list.innerHTML = cart.map((item, index) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:rgba(0,0,0,0.2); border-radius:12px; margin-bottom:10px;">
      <div>
        <div style="color:white; font-weight:700;">${item.name}</div>
        <div style="color:var(--secondary); font-size:0.9rem;">$${item.price.toFixed(2)}</div>
      </div>
      <button onclick="removeFromCart(${index})" style="background:rgba(255,0,0,0.1); color:#ef4444; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:800;">×</button>
    </div>
  `).join('');
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  totalEl.textContent = `Total: $${total.toFixed(2)}`;
  window.renderCartPayPal(total);
};

window.removeFromCart = (index) => {
  cart.splice(index, 1);
  localStorage.setItem('pv_cart', JSON.stringify(cart));
  window.updateCartCount();
  window.renderCart();
};

window.clearCart = () => {
  cart = [];
  localStorage.setItem('pv_cart', JSON.stringify(cart));
  window.updateCartCount();
  window.renderCart();
};

// FIX 2: THE CRITICAL PAYPAL TIMING FIX
window.renderCartPayPal = (total) => {
  setTimeout(() => {  // FIX: 300ms delay lets modal become visible first
    const container = document.getElementById('cart-paypal-container');
    if (!container) return;
    container.innerHTML = ''; // Clear before render
    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [{ amount: { value: total.toFixed(2) }, description: "PromptVaultUSA - Multiple Asset Bundle", custom_id: "CART_BUNDLE", invoice_id: `PV-BUNDLE-${Date.now()}` }]
        });
      },
      onApprove: (data, actions) => {
        return actions.order.capture().then(async (details) => {
          const identity = getActiveIdentity();
          await setDoc(doc(db, "orders", details.id), { uid: identity, items: cart, status: 'completed', paypalTransactionId: details.id, payerEmail: details.payer.email_address, createdAt: serverTimestamp() });
          localStorage.removeItem('pv_cart');
          cart = [];
          window.updateCartCount();
          window.location.href = `/success.html?tx=${details.id}&guest=${identity}`;
        });
      },
      onError: (err) => {
        console.error('PayPal Cart Error:', err);
        alert('Cart checkout failed. Try again or contact admin@promptvaultusa.shop');
      }
    }).render('#cart-paypal-container');
  }, 300);  // FIX: This delay fixes the invisible button
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
    Papa.parse('/products.csv', { download: true, header: true, skipEmptyLines: true, complete: (results) => { allProducts = results.data.filter(row => row.id); renderProducts(allProducts); } });
  }
  if (id === 'library') loadUserLibrary();
  if (id === 'cart') window.renderCart();
};

// FIX 3: HANDLE /vault/ PRODUCT PAGES WITH ?price= PARAMS
const initProductPage = () => {
  const params = new URLSearchParams(window.location.search);
  const price = params.get('price');
  const msrp = params.get('msrp');
  
  if (window.location.pathname.includes('/vault/') && price) {
    // We're on a product page like /vault/real-estate-lead-generation.html?price=9&msrp=15
    const productName = document.title.replace(' - PromptVault USA', '');
    const productData = {
      id: window.location.pathname.split('/').pop().replace('.html', ''),
      name: productName,
      price: parseFloat(price)
    };
    
    // Auto-render single product view or add to cart
    const pData = encodeURIComponent(JSON.stringify(productData));
    const pricingHTML = (msrp && parseFloat(msrp) > parseFloat(price)) 
      ? `<span style="text-decoration:line-through; color:#64748b; font-size:0.85rem; margin-right:8px;">$${parseFloat(msrp).toFixed(2)}</span> <span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${parseFloat(price).toFixed(2)}</span>`
      : `<span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${parseFloat(price).toFixed(2)}</span>`;
    
    // Inject into product page if containers exist
    const priceEl = document.getElementById('product-price');
    const buttonEl = document.getElementById('product-paypal-button');
    const cartBtnEl = document.getElementById('product-add-cart');
    
    if (priceEl) priceEl.innerHTML = pricingHTML;
    if (cartBtnEl) cartBtnEl.onclick = () => window.addToCart(pData);
    if (buttonEl) {
      paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [{ amount: { value: price }, description: `PromptVaultUSA - ${productName}`, custom_id: productData.id }]
          });
        },
        onApprove: (data, actions) => actions.order.capture().then(async (details) => {
          const identity = getActiveIdentity();
          await setDoc(doc(db, "orders", details.id), { uid: identity, items: [productData], status: 'completed', paypalTransactionId: details.id, payerEmail: details.payer.email_address, createdAt: serverTimestamp() });
          window.location.href = `/success.html?tx=${details.id}&guest=${identity}`;
        })
      }).render('#product-paypal-button');
    }
  }
};

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
  window.updateCartCount();
  initProductPage(); // FIX 3: Run product page handler
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  if (action) window.changePage(action, document.querySelector(`[onclick*="${action}"]`));
});

// Explicit Global Exposure
window.renderProducts = renderProducts;
window.loadUserLibrary = loadUserLibrary;
window.getActiveIdentity = getActiveIdentity;
window.renderCart = renderCart;
