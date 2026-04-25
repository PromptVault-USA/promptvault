/**
 * PROMPTVAULT USA - CORE ENGINE v5.8
 * PATH: /app.js (Root)
 * FIX: Re-init PayPal Checkout button in Cart Modal
 */
import { doc, setDoc, collection, getDocs, getDoc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
window.auth = auth;

console.log('PV Core v5.8 Online [Checkout Fix]');

let cart = JSON.parse(localStorage.getItem('pv_cart')) || [];

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

// --- 2. SINGLE PAGE DETECTOR (VAULT FOLDER) ---
const initProductPage = () => {
  const params = new URLSearchParams(window.location.search);
  const price = parseFloat(params.get('price'));
  const container = document.getElementById('single-paypal-button');
  
  if (window.location.pathname.includes('/vault/') && container && price) {
    const productName = document.title.split('|')[0].trim();
    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect' },
      createOrder: (data, actions) => actions.order.create({
        purchase_units: [{ amount: { value: price.toFixed(2) }, description: `PV - ${productName}` }]
      }),
      onApprove: (data, actions) => actions.order.capture().then(async (details) => {
        const identity = getActiveIdentity();
        await setDoc(doc(db, "orders", details.id), {
          uid: identity,
          items: [{ name: productName, price: price }],
          status: 'completed',
          createdAt: serverTimestamp()
        });
        window.location.href = `/success.html?tx=${details.id}`;
      })
    }).render('#single-paypal-button');
  }
};

// --- 3. MAIN GRID RENDERING (HOME/BROWSE) ---
const renderProducts = (productsToDisplay) => {
  const list = document.getElementById('product-list');
  if (!list) return;
  
  list.innerHTML = productsToDisplay.map((p) => {
    if (!p.id) return "";
    const msrp = parseFloat(p.price) || 0;
    const sale = parseFloat(p.sale_price) || 0;
    const finalPrice = (sale > 0) ? sale : msrp;
    const cleanP = { id: p.id, name: p.title || p.name, price: finalPrice };
    const pData = encodeURIComponent(JSON.stringify(cleanP));
    const buttonId = `paypal-button-${p.id}`;
    
    setTimeout(() => {
      const container = document.getElementById(buttonId);
      if (container && !container.hasChildNodes()) {
        paypal.Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', height: 35 },
          createOrder: (data, actions) => actions.order.create({
            purchase_units: [{ amount: { value: finalPrice.toFixed(2) }, description: `PV - ${cleanP.name}` }]
          }),
          onApprove: (data, actions) => actions.order.capture().then(async (details) => {
            const identity = getActiveIdentity();
            await setDoc(doc(db, "orders", details.id), { uid: identity, items: [cleanP], status: 'completed', createdAt: serverTimestamp() });
            window.location.href = `/success.html?tx=${details.id}`;
          })
        }).render(`#${buttonId}`);
      }
    }, 100);

    return `
      <div class="product-card" style="background:var(--glass); border:1px solid var(--border); border-radius:24px; padding:20px; display:flex; flex-direction:column; height: 100%;">
        <a href="/vault/${p.slug}.html?price=${finalPrice}&msrp=${msrp}" style="text-decoration:none;">
          <div style="aspect-ratio:1/1; border-radius:15px; overflow:hidden; margin-bottom:15px; background:#000;">
            <img src="${p.img}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/logo.png'">
          </div>
          <div style="font-weight:800; color:white;">${p.title || p.name}</div>
        </a>
        <div style="margin:10px 0;">
          <span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${finalPrice.toFixed(2)}</span>
        </div>
        <div style="margin-top:auto;">
          <div id="${buttonId}"></div>
          <button onclick="window.addToCart('${pData}')" style="width:100%; margin-top:8px; background:rgba(255,255,255,0.05); color:white; border:1px solid var(--border); padding:10px; border-radius:12px; cursor:pointer;">+ Cart</button>
        </div>
      </div>`;
  }).join('');
};

// --- 4. CART ENGINE (THE FIX) ---
window.addToCart = (productStr) => {
  const product = JSON.parse(decodeURIComponent(productStr));
  cart.push(product);
  localStorage.setItem('pv_cart', JSON.stringify(cart));
  window.updateCartCount();
  alert(`✓ Added ${product.name}`);
};

window.removeFromCart = (index) => {
  cart.splice(index, 1);
  localStorage.setItem('pv_cart', JSON.stringify(cart));
  window.updateCartCount();
  window.renderCart();
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
    list.innerHTML = `<p style="text-align:center; padding:20px; color:#94a3b8;">Empty Cart</p>`;
    totalEl.textContent = '$0.00';
    paypalContainer.innerHTML = '';
    return;
  }

  list.innerHTML = cart.map((item, index) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(0,0,0,0.2); border-radius:10px; margin-bottom:8px;">
      <div style="color:white; font-size:0.9rem;">${item.name}</div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="color:var(--secondary); font-weight:700;">$${item.price.toFixed(2)}</span>
        <button onclick="window.removeFromCart(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:800;">✕</button>
      </div>
    </div>`).join('');

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  totalEl.textContent = `$${total.toFixed(2)}`;
  
  // Render the PayPal Checkout Button
  window.renderCartPayPal(total);
};

window.renderCartPayPal = (total) => {
  setTimeout(() => {
    const container = document.getElementById('cart-paypal-container');
    if (!container) return;
    container.innerHTML = ''; // Prevent double buttons
    
    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'checkout' },
      createOrder: (data, actions) => actions.order.create({
        purchase_units: [{ amount: { value: total.toFixed(2) }, description: 'PromptVault Bundle Checkout' }]
      }),
      onApprove: (data, actions) => actions.order.capture().then(async (details) => {
        const identity = getActiveIdentity();
        await setDoc(doc(db, "orders", details.id), { uid: identity, items: cart, status: 'completed', createdAt: serverTimestamp() });
        localStorage.setItem('pv_cart', '[]');
        cart = [];
        window.location.href = `/success.html?tx=${details.id}`;
      })
    }).render('#cart-paypal-container');
  }, 300); // Wait for modal animation
};

// --- 5. PAGE ROUTER ---
window.changePage = (id, el) => {
  if (id === 'blog') { window.location.href = '/blog.html'; return; }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  
  if (id === 'browse') {
    Papa.parse('/products.csv', {
      download: true, header: true, skipEmptyLines: true,
      complete: (results) => renderProducts(results.data)
    });
  }
  if (id === 'library') window.loadUserLibrary();
  window.location.hash = id;
};

// --- INIT ---
window.updateCartCount();
initProductPage();
if(window.location.hash === '#browse') window.changePage('browse');
