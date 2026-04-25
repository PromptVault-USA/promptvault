/**
 * PROMPTVAULT USA - CORE ENGINE v5.9
 * MODE: DIRECT-PURCHASE (Headless & Event-Driven)
 * PATH: /app.js (Root)
 */
import { doc, setDoc, collection, getDocs, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

console.log('PV Core v5.9 Online [Direct-Purchase Mode]');

// --- 1. IDENTITY SYSTEM ---
const getActiveIdentity = () => {
  if (auth?.currentUser && !auth.currentUser.isAnonymous) return auth.currentUser.uid;
  let gid = localStorage.getItem('pv_guest_uid');
  if (!gid) {
    gid = 'pv_guest_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('pv_guest_uid', gid);
  }
  return gid;
};

// --- 2. GRID RENDERING (DIRECT PAYPAL BUTTONS) ---
const renderProducts = (productsToDisplay) => {
  const list = document.getElementById('product-list');
  if (!list) return;
  
  list.innerHTML = productsToDisplay.map((p) => {
    if (!p.id) return "";
    
    // Pricing Logic
    const msrp = parseFloat(p.price) || 0;
    const sale = parseFloat(p.sale_price) || 0;
    const finalPrice = (sale > 0) ? sale : msrp;
    const buttonId = `paypal-button-${p.id}`;
    
    const pricingHTML = (sale > 0 && msrp > sale) 
      ? `<span style="text-decoration:line-through; color:#64748b; font-size:0.85rem; margin-right:8px;">$${msrp.toFixed(2)}</span> 
         <span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${sale.toFixed(2)}</span>` 
      : `<span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${finalPrice.toFixed(2)}</span>`;

    // Inject PayPal Button after card mounts
    setTimeout(() => {
      const container = document.getElementById(buttonId);
      if (container && !container.hasChildNodes()) {
        paypal.Buttons({
          style: { 
            layout: 'vertical', 
            color: 'gold', 
            shape: 'rect', 
            height: 40, 
            label: 'buynow' 
          },
          createOrder: (data, actions) => actions.order.create({
            purchase_units: [{ 
              amount: { value: finalPrice.toFixed(2) }, 
              description: `PV - ${p.title || p.name}`,
              custom_id: p.id // Crucial for Pipedream Webhook tracking
            }]
          }),
          onApprove: (data, actions) => actions.order.capture().then(async (details) => {
            const identity = getActiveIdentity();
            // Immediate Frontend Write
            await setDoc(doc(db, "orders", details.id), {
              uid: identity,
              items: [{ id: p.id, name: p.title || p.name, price: finalPrice }],
              status: 'completed', // Handled by Webhook afterward to double-verify
              createdAt: serverTimestamp()
            });
            window.location.href = `/success.html?tx=${details.id}`;
          })
        }).render(`#${buttonId}`);
      }
    }, 150);

    return `
      <div class="product-card" style="background:var(--glass); border:1px solid var(--border); border-radius:24px; padding:20px; display:flex; flex-direction:column; height: 100%;">
        <a href="/vault/${p.slug}.html?price=${finalPrice}" style="text-decoration:none;">
          <div style="aspect-ratio:1/1; border-radius:15px; overflow:hidden; margin-bottom:15px; background:#000; border:1px solid var(--border);">
            <img src="${p.img}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/logo.png'">
          </div>
          <div style="font-weight:800; color:white; font-size:1.1rem; margin-bottom:5px;">${p.title || p.name}</div>
        </a>
        <div style="margin-bottom:15px;">${pricingHTML}</div>
        <div style="margin-top:auto;">
          <div id="${buttonId}"></div>
        </div>
      </div>`;
  }).join('');
};

// --- 3. AUTO-SYNC LIBRARY ---
window.loadUserLibrary = async () => {
  const identity = getActiveIdentity();
  const grid = document.getElementById('user-library-grid');
  if (!grid) return;
  
  grid.innerHTML = `<p style="text-align:center; color:#94a3b8;">Syncing Assets...</p>`;
  
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
          <div class="library-card" style="background:var(--glass); border:1px solid var(--border); padding:15px; border-radius:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; width:100%; max-width:600px;">
            <div style="color:white; font-weight:800;">${item.name}</div>
            <a href="${fresh?.drivelink || '#'}" target="_blank" style="padding:8px 15px; background:var(--success); border-radius:8px; color:white; text-decoration:none; font-size:0.85rem; font-weight:600;">Download</a>
          </div>`;
      });
    });
    
    grid.innerHTML = libraryHTML || `<p style="text-align:center; color:#94a3b8; padding:40px;">No vaults unlocked yet.</p>`;
  } catch (e) { 
    console.error("Library Sync Error:", e);
    grid.innerHTML = `<p style="color:#ef4444; text-align:center;">Sync failed. Refresh and try again.</p>`; 
  }
};

// --- 4. ROUTER ---
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

// --- INITIALIZATION ---
// Check for existing hash on direct load
if (window.location.hash) {
  const pageId = window.location.hash.substring(1);
  window.changePage(pageId);
} else {
  // Default to Browse if on home but wanting to see products
  const productList = document.getElementById('product-list');
  if (productList) window.changePage('browse');
}
