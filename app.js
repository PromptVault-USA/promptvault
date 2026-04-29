import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

let app, auth, db;
let productData = []; // Store fetched products in memory

async function boot() {
  console.log("app.js boot() started");
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  setupAuthUI();
  
  if (document.getElementById("product-list")) {
    await fetchProducts();
    if(window.location.pathname.includes('vault.html')) {
        renderProducts(productData); // Render all on vault.html
    }
  }
}

function setupAuthUI() {
  const btn = document.getElementById("auth-btn");
  if (!btn) return;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      btn.textContent = "Sign Out";
      btn.onclick = () => signOut(auth);
      
      const libBtn = document.getElementById("library-btn");
      if(libBtn) libBtn.style.display = "flex";
      
      if (document.getElementById("library-list")) {
        loadLibrary(user);
      }
    } else {
      btn.textContent = "Sign In / View Library";
      btn.onclick = () => {
        const p = new GoogleAuthProvider();
        signInWithPopup(auth, p).catch((e) => console.error("Login failed:", e));
      };
      const libBtn = document.getElementById("library-btn");
      if(libBtn) libBtn.style.display = "none";
      
      const libList = document.getElementById("library-list");
      if (libList) {
        libList.innerHTML = `<div style="text-align:center; padding:40px; color:#64748b;">Please sign in to view your library.</div>`;
      }
    }
  });
}

async function fetchProducts() {
  const res = await fetch("https://promptvaultusa.shop/products.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`products.json fetch failed: ${res.status}`);

  const raw = await res.json();
  productData = raw; 

  // Make available globally if a specific page needs it later
  window.products = productData;
}

// Renders the products into the grid
function renderProducts(items) {
  const grid = document.getElementById("product-list");
  if (!grid) return;

  grid.innerHTML = "";

  if (!items || items.length === 0) {
    grid.innerHTML = '<div style="text-align:center; color:#64748b; padding:40px; grid-column:1/-1;">No assets found in the vault.</div>';
    return;
  }

  items.forEach((p) => {
    // Basic fallbacks
    if (!p.features) p.features = ["Instant Download", "Lifetime Access"];
    const fileId = p.pdfId || "no-file-id"; // Ensure mapping exists

    const div = document.createElement("div");
    div.innerHTML = `
<div class="product-card" style="border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:14px;">
  <a href="https://promptvaultusa.shop/vault/${p.slug}.html" style="text-decoration:none;color:inherit;">
    <div style="aspect-ratio:1/1;border-radius:14px;overflow:hidden;background:#000;border:1px solid rgba(255,255,255,0.08);">
      <img src="${p.img}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='https://promptvaultusa.shop/logo.png'">
    </div>
    <div style="margin-top:10px;font-weight:800;">${p.title}</div>
  </a>
  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px; margin-bottom:15px;">
     <div style="font-size:1.1rem; color:var(--accent); font-weight:800;">$${p.price}</div>
  </div>
  <div id="paypal-btn-${p.slug}"></div>
</div>`;
    grid.appendChild(div);

    renderPayPal(p, `paypal-btn-${p.slug}`, fileId);
  });
}

function renderPayPal(item, containerId, fileId) {
  // If we're not on a secure (https) environment, PayPal SDK might not load properly,
  // but we still try to render if the window.paypal object exists.
  if (!window.paypal) {
      console.warn("PayPal SDK not loaded yet for", containerId);
      return;
  }

  window.paypal
    .Buttons({
      style: { layout: "horizontal", color: "blue", shape: "pill", label: "buy", height: 35 },
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [
            {
              amount: { value: item.price },
              description: item.title,
            },
          ],
        });
      },
      onApprove: async (data, actions) => {
        try {
          const order = await actions.order.capture();
          const pEmail = order.payer?.email_address;
          if (!pEmail) throw new Error("No buyer email found.");

          const orderId = order.id;
          
          await savePurchase(pEmail, item, fileId, orderId);

        } catch (err) {
          console.error("Capture Error:", err);
          alert("Payment processed, but order saving failed. Contact support with your email.");
        }
      },
      onError: (err) => {
        console.error("PayPal UI Error:", err);
        alert("Payment failed or was canceled.");
      },
    })
    .render("#" + containerId);
}

async function savePurchase(email, item, fileId, orderId) {
    try {
        console.log("Saving purchase for", email);
        const userQuery = query(
            collection(db, "users"),
            where("email", "==", email),
        );
        const snap = await getDocs(userQuery);

        let uid;
        if (!snap.empty) {
            uid = snap.docs[0].id;
        } else {
            // Unregistered email, create a placeholder mapped to their email string
            uid = `unregistered_${email}`;
        }

        const purchaseRef = doc(db, "users", uid, "purchases", orderId);
        await setDoc(purchaseRef, {
            orderId: orderId,
            productSlug: item.slug,
            productTitle: item.title,
            pdfId: fileId,
            buyerEmail: email,
            pricePaid: item.price,
            createdAt: serverTimestamp(),
        });

        window.location.href = `https://promptvaultusa.shop/success.html?tx=${encodeURIComponent(
            orderId,
        )}`;
    } catch (err) {
        console.error("Purchase logging error:", err);
        alert("Payment succeeded, but we couldn't log the order to your account automatically. Please email support@promptvaultusa.shop to claim your asset manually.");
    }
}

async function loadLibrary(user) {
  const libList = document.getElementById("library-list");
  if (!libList) return;

  libList.innerHTML = `<div style="text-align:center; padding:20px;">Fetching your library...</div>`;

  try {
    const q = query(collection(db, "users", user.uid, "purchases"));
    const snap = await getDocs(q);

    if (snap.empty) {
      libList.innerHTML = `<div style="text-align:center; padding:40px; color:#64748b; background:rgba(255,255,255,0.02); border-radius:18px;">
        <span style="font-size:2rem; display:block; margin-bottom:10px;">📭</span>
        You don't have any assets in your library yet.<br>
        <a href="https://promptvaultusa.shop/vault.html" style="color:var(--accent); text-decoration:none; display:inline-block; margin-top:10px;">Browse the Vault →</a>
      </div>`;
      return;
    }

    libList.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.className = "purchase-item";
      div.style.cssText = `
        background: rgba(255,255,255,0.03); 
        padding: 20px; 
        border-radius: 12px; 
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1px solid rgba(255,255,255,0.05);
      `;

      // The download button opens the proxy download endpoint
      div.innerHTML = `
        <div>
          <div style="font-weight:800; font-size:1.1rem; color:white;">${data.productTitle}</div>
          <div style="font-size:0.8rem; color:#64748b; margin-top:4px;">Order ID: ${data.orderId.substring(0,8)}...</div>
        </div>
        <a href="https://asia-southeast1-promptvaultusa.cloudfunctions.net/downloadPdf?pdfId=${data.pdfId}&uid=${user.uid}" 
           class="btn-main" 
           style="text-decoration:none; display:inline-block; font-size:0.85rem; padding:10px 20px;">
           Download Asset
        </a>
      `;
      libList.appendChild(div);
    });
  } catch (err) {
    console.error("Library Error:", err);
    libList.innerHTML = `<div style="color:var(--danger); padding:20px; text-align:center;">Failed to load library: ${err.message}</div>`;
  }
}

// Start everything up when the Document Object Model is parsed
document.addEventListener("DOMContentLoaded", () => {
  boot().catch((e) => console.error("Boot Failed:", e));
});
