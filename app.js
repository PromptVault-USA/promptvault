/**
 * PROMPTVAULT USA - CORE ENGINE v5.7
 * MODE: HEADLESS (Spreadsheet-Driven)
 * PATH: /app.js (Root)
 */
import { doc, setDoc, collection, getDocs, getDoc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
window.auth = auth;

console.log('PV Core v5.7 Online [Root Mode]');

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

// --- 2. SINGLE PAGE DETECTOR & INITIALIZER ---
const initProductPage = () => {
  const params = new URLSearchParams(window.location.search);
  const price = parseFloat(params.get('price'));
  const container = document.getElementById('single-paypal-button');
  
  if (window.location.pathname.includes('/vault/') && container && price) {
    const productName = document.title.split('|')[0].trim();
    
    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect' },
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [{
            amount: { value: price.toFixed(2) },
            description: `PromptVaultUSA - ${productName}`
          }]
        });
      },
      onApprove: (data, actions) => {
        return actions.order.capture().then(async (details) => {
          const identity = getActiveIdentity();
          await setDoc(doc(db, "orders", details.id), {
            uid: identity,
            items: [{ name: productName, price: price }],
            status: 'completed',
            createdAt: serverTimestamp()
          });
          window.location.href = `/success.html?tx=${details.id}`;
        });
      }
    }).render('#single-paypal-button');
  }
};

// --- 3. SPREADSHEET-DRIVEN RENDERING (GRID) ---
const renderProducts = (productsToDisplay) => {
  const list = document.getElementById('product-list');
  if (!list) return;
  
  list.innerHTML = productsToDisplay.map((p) => {
    if (!p.id) return "";
    const msrp = parseFloat(p.price) || 0;
    const sale = parseFloat(p.sale_price) || 0;
    const finalPrice = (sale > 0) ? sale : msrp;
    const absoluteImg = p.img?.startsWith('http') ? p.img : `${window.location.origin}/${p.img?.replace(/^\//, '') || 'logo.png'}`;
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
          style: { layout: 'vertical', color: 'gold', shape: 'rect', height: 40 },
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{ amount: { value: finalPrice.toFixed(2) }, description: `PV - ${cleanP.name}` }]
            });
          },
          onApprove: (data, actions) => {
            return actions.order.capture().then(async (details) => {
              const identity = getActiveIdentity();
              await setDoc(doc(db, "orders", details.id), {
                uid: identity,
                items: [cleanP],
                status: 'completed',
                createdAt: serverTimestamp()
              });
              window.location.href = `/success.html?tx=${details.id}`;
            });
          }
        }).render(`#${buttonContainerId}`);
      }
    }, 100);

    return `
      <div class="product-card" style="background:var(--glass); border:1px solid var(--border); border-radius:24px; padding:20px; display:flex; flex-direction:column; height: 100%;">
        <a href="/vault/${p.slug}.html?price=${finalPrice}&msrp=${msrp}" style="text-decoration:none;">
          <div style="aspect-ratio:1/1; border-radius:15px; overflow:hidden; margin-bottom:15px; border:1px solid var(--border); background:#000;">
            <img src="${absoluteImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/logo.png'">
          </div>
          <div style="font-weight:800; font-size:1.1rem; margin-bottom:5px; color:white;">${p.title || p.name}</div>
        </a>
        <div style="margin-bottom:15px;">${pricingHTML}</div>
        <div style="margin-top:auto;">
          <div id="${buttonContainerId}"></div>
          <button onclick="window.addToCart('${pData}')" style="width:100%; margin-top:8px; background:rgba(255,255,255,0.05); color:white; border:1px solid var(--border); padding:10px; border-radius:12px; cursor:pointer;">+ Cart</button>
        </div>
      </div>`;
  }).join('');
};

// --- 4. AUTO-SYNC LIBRARY ---
window.loadUserLibrary = async () => {
  const identity = getActiveIdentity();
  const grid = document.getElementById('user-library-grid');
  if (!grid) return;
  grid.innerHTML = `<p style="text-align:center; color:#94a3b8;">Syncing...</p>`;
  try {
    const res = await fetch('/products.json');
    const syncedProducts = await res.json();
    const q = query(collection(db, "orders"), where("uid", "==", identity));
    const querySnapshot = await getDocs(q);
    let libraryHTML = "";
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      data.items.forEach(item => {
        const fresh = syncedProducts.find(p => p.id === item.id);
        libraryHTML += `
          <div class="library-card" style="background:var(--glass); border:1px solid var(--border); padding:15px; border-radius:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="color:white; font-weight:800;">${item.name}</div>
            <a href="${fresh?.drivelink || '#'}" target="_blank" style="padding:8px 15px; background:var(--success); border-radius:8px; color:white; text-decoration:none; font-size:0.8rem;">Download</a>
          </div>`;
      });
    });
    grid.innerHTML = libraryHTML || `<p style="text-align:center; color:#94a3b8;">No packs found.</p>`;
  } catch (e) { grid.innerHTML = `<p style="color:red;">Sync error.</p>`; }
};

// --- 5. CART ENGINE ---
window.addToCart = (productStr) => {
  const product = JSON.parse(decodeURIComponent(productStr));
  cart.push(product);
  localStorage.setItem('pv_cart', JSON.stringify(cart));
  window.updateCartCount();
  alert(`✓ Added ${product.name}`);
};

window.updateCartCount = () => {
  const pill = document.getElementById('cart-count-pill');
  if (pill) pill.innerText = cart.length;
};

window.renderCart = () => {
  const list = document.getElementById('cart-items-list');
  const totalEl = document.getElementById('cart-total');
  if (!list || !totalEl) return;
  if (cart.length === 0) {
    list.innerHTML = `<p style="text-align:center; color:#94a3b8;">Empty Cart</p>`;
    totalEl.textContent = '';
    return;
  }
  list.innerHTML = cart.map((item, index) => `
    <div style="display:flex; justify-content:space-between; color:white; margin-bottom:10px;">
      <span>${item.name}</span>
      <strong>$${item.price.toFixed(2)}</strong>
    </div>`).join('');
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  totalEl.textContent = `Total: $${total.toFixed(2)}`;
  window.renderCartPayPal(total);
};

window.renderCartPayPal = (total) => {
  setTimeout(() => {
    const container = document.getElementById('cart-paypal-container');
    if (!container) return;
    container.innerHTML = '';
    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect' },
      createOrder: (data, actions) => actions.order.create({
        purchase_units: [{ amount: { value: total.toFixed(2) }, description: 'Cart Bundle' }]
      }),
      onApprove: (data, actions) => actions.order.capture().then(async (details) => {
        const identity = getActiveIdentity();
        await setDoc(doc(db, "orders", details.id), { uid: identity, items: cart, status: 'completed', createdAt: serverTimestamp() });
        localStorage.setItem('pv_cart', '[]');
        window.location.href = `/success.html?tx=${details.id}`;
      })
    }).render('#cart-paypal-container');
  }, 200);
};

// --- 6. ROUTER & GLOBAL INITIALIZATION ---
window.changePage = (id, el) => {
  if (id === 'blog') { window.location.href = '/blog.html'; return; }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  
  if (id === 'browse') {
    Papa.parse('/products.csv', {
      download: true, header: true, skipEmptyLines: true,
      complete: (results) => renderProducts(results.data)
    });
  }
  if (id === 'library') window.loadUserLibrary();
  window.location.hash = id;
};

// Auto-Init on load
window.updateCartCount();
initProductPage();
if(window.location.hash === '#browse') window.changePage('browse');
if(window.location.hash === '#library') window.changePage('library');
