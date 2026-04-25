import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

function toNumber(v) {
  const n = Number(String(v?? "").trim());
  return Number.isFinite(n)? n : NaN;
}

function normalizeImg(img) {
  const raw = String(img?? "").trim();
  if (!raw) return "/logo.png";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return raw;
  return `/${raw}`;
}

function finalPrice(p) {
  const price = toNumber(p.price);
  const sale = p.sale_price === null || p.sale_price === undefined || p.sale_price === ""? NaN : toNumber(p.sale_price);
  if (Number.isFinite(sale) && sale > 0 && sale < price) return sale;
  return price;
}

function ensurePayPalReady() {
  return!!(window.paypal && window.paypal.Buttons);
}

async function requireAnonAuth() {
  if (auth.currentUser) return auth.currentUser;
  await signInAnonymously(auth);
  return auth.currentUser;
}

async function fetchProducts() {
  const res = await fetch("/products.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`products.json fetch failed: ${res.status}`);
  const raw = await res.json();
  return (raw || []).map((p) => ({
    id: String(p.id?? "").trim(),
    slug: String(p.slug?? "").trim(),
    title: String(p.title?? "").trim(),
    price: toNumber(p.price),
    sale_price: p.sale_price === null || p.sale_price === undefined || p.sale_price === ""? null : toNumber(p.sale_price),
    img: normalizeImg(p.img),
    drivelink: String(p.drivelink?? "").trim(),
    gmc_id: String(p.gmc_id?? "").trim(),
    desc: String(p.desc?? "").trim(),
  })).filter((p) => p.id && p.slug && p.title && Number.isFinite(p.price));
}

function renderGrid(products) {
  const list = document.getElementById("product-list");
  if (!list) return;
  const q = (document.getElementById("product-search")?.value || "").trim().toLowerCase();
  const filtered = q? products.filter((p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) : products;

  list.innerHTML = filtered.map((p) => {
    const fp = finalPrice(p);
    const hasSale = p.sale_price!== null && p.sale_price < p.price;
    const old = hasSale? `<span style="text-decoration:line-through;opacity:0.7;">$${p.price.toFixed(2)}</span>` : "";
    const price = `<span style="font-weight:800;">$${fp.toFixed(2)}</span>`;
    const buttonId = `paypal-button-${p.id}`;
    return `
      <div class="product-card" style="border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:14px;">
        <a href="/vault/${p.slug}.html" style="text-decoration:none;color:inherit;">
          <div style="aspect-ratio:1/1;border-radius:14px;overflow:hidden;background:#000;border:1px solid rgba(255,255,255,0.08);">
            <img src="${p.img}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/logo.png'">
          </div>
          <div style="margin-top:10px;font-weight:800;">${p.title}</div>
        </a>
        <div style="margin:10px 0;display:flex;gap:10px;align-items:baseline;">
          ${old} ${price}
        </div>
        <div id="${buttonId}" data-rendered="0" data-product-id="${p.id}" data-product-slug="${p.slug}" data-product-title="${p.title}" data-product-price="${fp.toFixed(2)}"></div>
      </div>`;
  }).join("");

  if (ensurePayPalReady()) {
    filtered.forEach((p) => renderPayPalButtonForContainer(`paypal-button-${p.id}`));
  }
}

function renderPayPalButtonForContainer(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!ensurePayPalReady()) return;
  if (el.getAttribute("data-rendered") === "1") return;
  el.setAttribute("data-rendered", "1");

  const productId = el.getAttribute("data-product-id") || "";
  const title = el.getAttribute("data-product-title") || "PromptVault Pack";
  const price = el.getAttribute("data-product-price") || "0.00";

  window.paypal.Buttons({
    style: { layout: "vertical", color: "gold", shape: "rect", height: 40, label: "buynow" },
    createOrder: async (data, actions) => {
      await requireAnonAuth();
      return actions.order.create({
        purchase_units: [{
          amount: { value: String(price) },
          description: `PV - ${title}`,
          custom_id: String(productId),
        }],
      });
    },
    onApprove: async (data, actions) => {
      await requireAnonAuth();
      const details = await actions.order.capture();
      const uid = auth.currentUser.uid;
      const orderId = details.id;
      await setDoc(doc(db, "orders", orderId), {
        uid,
        status: "completed",
        items: [{ id: productId, qty: 1 }],
        paypalOrderId: orderId,
        createdAt: serverTimestamp(),
      });
      window.location.href = `/success.html?tx=${encodeURIComponent(orderId)}`;
    },
    onError: (err) => {
      console.error("PayPal Buttons error:", err);
    },
  }).render(`#${containerId}`);
}

async function loadLibrary(products) {
  await requireAnonAuth();
  const uid = auth.currentUser.uid;
  const grid = document.getElementById("user-library-grid");
  if (!grid) return;
  grid.innerHTML = `<p style="text-align:center;opacity:0.8;">Syncing Assets...</p>`;
  const q = collection(db, "orders");
  const snap = await getDocs(q);
  let html = "";
  snap.forEach((d) => {
    const o = d.data();
    if (!o || o.uid!== uid) return;
    if (o.status!== "completed" && o.status!== "paid") return;
    for (const it of o.items || []) {
      const pid = String(it.id || "").trim();
      const p = products.find((x) => x.id === pid);
      if (!p) continue;
      html += `
        <div style="border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:800;">${p.title}</div>
          <a href="${p.drivelink}" target="_blank" rel="noopener" style="padding:8px 12px;border-radius:10px;text-decoration:none;background:#10b981;color:white;font-weight:700;">Download</a>
        </div>`;
    }
  });
  grid.innerHTML = html || `<p style="text-align:center;opacity:0.8;padding:30px;">No vaults unlocked yet.</p>`;
}

async function boot() {
  const products = await fetchProducts();
  const search = document.getElementById("product-search");
  if (search) {
    search.addEventListener("input", () => renderGrid(products));
  }
  renderGrid(products);

  const single = document.getElementById("single-paypal-button");
  if (single) {
    single.setAttribute("data-rendered", "0");
    if (ensurePayPalReady()) renderPayPalButtonForContainer("single-paypal-button");
  }

  const libraryPage = document.getElementById("user-library-grid");
  if (libraryPage) {
    onAuthStateChanged(auth, async () => {
      await loadLibrary(products);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  boot().catch((e) => console.error(e));
});
