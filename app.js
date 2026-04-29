// /app.js
import {
  doc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { auth, db } from "./firebase-config.js";

// --- Localization Engine ---
function getStoreCurrency() {
  return window.STORE_CURRENCY || "USD";
}

const currencyFormatter = new Intl.NumberFormat(navigator.language || 'en-US', {
  style: 'currency',
  currency: getStoreCurrency(),
  minimumFractionDigits: 2
});

function formatPrice(value) {
  return currencyFormatter.format(value);
}
// ---------------------------

function toNumber(v) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function normalizeImg(img) {
  const raw = String(img ?? "").trim();
  if (!raw) return "/logo.png";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return raw;
  return `/${raw}`;
}

function hasSale(p) {
  return (
    p.sale_price !== null &&
    Number.isFinite(p.sale_price) &&
    p.sale_price > 0 &&
    p.sale_price < p.price
  );
}

function finalPrice(p) {
  return hasSale(p) ? p.sale_price : p.price;
}

function ensurePayPalReady() {
  return !!(window.paypal && window.paypal.Buttons);
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

  return (raw || [])
    .map((p) => ({
      id: String(p.id ?? "").trim(),
      slug: String(p.slug ?? "").trim(),
      title: String(p.title ?? "").trim(),
      price: toNumber(p.price),
      sale_price:
        p.sale_price === null || p.sale_price === undefined || p.sale_price === ""
          ? null
          : toNumber(p.sale_price),
      img: normalizeImg(p.img),
      drivelink: String(p.drivelink ?? "").trim(),
      gmc_id: String(p.gmc_id ?? "").trim(),
      desc: String(p.desc ?? "").trim(),
    }))
    .filter((p) => p.id && p.slug && p.title && Number.isFinite(p.price));
}

let PRODUCTS_CACHE = [];

function renderGrid(products) {
  const list = document.getElementById("product-list");
  if (!list) return;

  const searchEl = document.getElementById("vault-search");
  const q = (searchEl?.value || "").trim().toLowerCase();

  const filtered = q
    ? products.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q),
      )
    : products;

  list.innerHTML = filtered
    .map((p) => {
      const fp = finalPrice(p);
      const sale = hasSale(p);

      const saleBadge = sale
        ? `<div style="display:inline-block;background:#fbbf24;color:#0a0e27;font-weight:900;font-size:0.7rem;letter-spacing:1px;padding:6px 10px;border-radius:999px;margin-bottom:8px;">SALE</div>`
        : "";

      const old = sale
        ? `<span style="text-decoration:line-through;opacity:0.7;">${formatPrice(p.price)}</span>`
        : "";

      const priceHTML = `<span style="font-weight:900;">${formatPrice(fp)}</span>`;
      const buttonId = `paypal-button-${p.id}`;

      return `
<div class="product-card" style="border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:14px;">
  <a href="/vault/${p.slug}.html" style="text-decoration:none;color:inherit;">
    <div style="aspect-ratio:1/1;border-radius:14px;overflow:hidden;background:#000;border:1px solid rgba(255,255,255,0.08);">
      <img src="${p.img}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/logo.png'">
    </div>
    <div style="margin-top:10px;font-weight:800;">${p.title}</div>
  </a>

  <div style="margin:10px 0;">
    ${saleBadge}
    <div style="display:flex;gap:10px;align-items:baseline;">
      ${old}
      ${priceHTML}
    </div>
  </div>

  <div
    id="${buttonId}"
    data-rendered="0"
    data-product-id="${p.id}"
    data-product-title="${p.title}"
    data-product-price="${fp.toFixed(2)}"
  ></div>
</div>`;
    })
    .join("");

  if (ensurePayPalReady()) {
    filtered.forEach((p) =>
      renderPayPalButtonForContainer(`paypal-button-${p.id}`),
    );
  }
}

function renderPayPalButtonForContainer(containerId) {
  try {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!ensurePayPalReady()) return;

    if (el.getAttribute("data-rendered") === "1") return;
    el.setAttribute("data-rendered", "1");

    const productId = el.getAttribute("data-product-id") || "";
    const title = el.getAttribute("data-product-title") || "PromptVault Pack";
    const price = el.getAttribute("data-product-price") || "0.00";

    window.paypal
      .Buttons({
        style: {
          layout: "vertical",
          color: "gold",
          shape: "rect",
          height: 40,
          label: "buynow",
        },
        createOrder: async (data, actions) => {
          try {
            await requireAnonAuth();
            return actions.order.create({
              purchase_units: [
                {
                  amount: { 
                    value: String(price),
                    currency_code: getStoreCurrency() 
                  },
                  description: `PV - ${title}`,
                  custom_id: String(productId),
                },
              ],
            });
          } catch (err) {
            console.error("PayPal Order Creation Error:", err);
            throw new Error("Failed to create order. Please try again.");
          }
        },
        onApprove: async (data, actions) => {
          try {
            await requireAnonAuth();
            const details = await actions.order.capture();

            const uid = auth.currentUser.uid;
            const orderId = details.id;

            await setDoc(doc(db, "orders", orderId), {
              uid,
              status: "completed",
              items: [{ id: productId, qty: 1 }],
              paypalOrderId: orderId,
              currency: getStoreCurrency(),
              createdAt: serverTimestamp(),
            });

            window.location.href = `/success.html?tx=${encodeURIComponent(
              orderId,
            )}`;
          } catch (err) {
            console.error("PayPal Approval Error:", err);
            alert(`Payment processing failed. Support Trace: ${auth.currentUser?.uid || 'Unknown'}`);
          }
        },
        onError: (err) => {
          console.error("PayPal Buttons error:", err);
          alert("An error occurred with PayPal. Please try again or disable ad-blockers.");
        },
      })
      .render(`#${containerId}`);
  } catch (error) {
    console.error("PayPal Button Container Error:", error);
  }
}

async function loadLibrary(products) {
  try {
    await requireAnonAuth();
    const uid = auth.currentUser.uid;

    const grid = document.getElementById("user-library-grid");
    if (!grid) return;

    grid.innerHTML = `<p style="text-align:center;opacity:0.8;">Syncing Assets...</p>`;

    const q = query(collection(db, "orders"), where("uid", "==", uid));
    const snap = await getDocs(q);

    let html = "";

    snap.forEach((d) => {
      const o = d.data();
      if (!o) return;
      if (o.status !== "completed" && o.status !== "paid") return;

      for (const it of o.items || []) {
        const pid = String(it?.id || "").trim();
        const p = products.find((x) => x.id === pid);
        if (!p) continue;

        html += `
<div style="border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
  <div style="font-weight:800;">${p.title}</div>
  <a href="${p.drivelink}" target="_blank" rel="noopener" style="padding:8px 12px;border-radius:10px;text-decoration:none;background:#10b981;color:white;font-weight:700;">Download</a>
</div>`;
      }
    });

    grid.innerHTML =
      html ||
      `<p style="text-align:center;opacity:0.8;padding:30px;">No vaults unlocked yet.</p>`;
  } catch (error) {
    console.error("Library Loading Error:", error);
    const grid = document.getElementById("user-library-grid");
    if (grid) {
      grid.innerHTML = `<p style="text-align:center;color:#ef4444;padding:30px;">Error loading library. Please try again.</p>`;
    }
  }
}

// Keep this for the search box on vault.html
window.filterProducts = (text) => {
  const el = document.getElementById("vault-search");
  if (el) el.value = String(text ?? "");
  renderGrid(PRODUCTS_CACHE);
};

// NOTE: changePage() removed — you’re now using separate HTML pages (href navigation).

async function boot() {
  try {
    PRODUCTS_CACHE = await fetchProducts();

    // Vault page behavior
    const hasVaultGrid = !!document.getElementById("product-list");
    if (hasVaultGrid) {
      const search = document.getElementById("vault-search");
      if (search) search.addEventListener("input", () => renderGrid(PRODUCTS_CACHE));

      renderGrid(PRODUCTS_CACHE);

      // Optional: handle a single-paypal container if you use it anywhere
      const single = document.getElementById("single-paypal-button");
      if (single) {
        single.setAttribute("data-rendered", "0");
        if (ensurePayPalReady()) renderPayPalButtonForContainer("single-paypal-button");
      }
    }

    // Library page behavior
    const hasLibraryGrid = !!document.getElementById("user-library-grid");
    if (hasLibraryGrid) {
      onAuthStateChanged(auth, async () => {
        await loadLibrary(PRODUCTS_CACHE);
      });
    }
  } catch (error) {
    console.error("Application Boot Error:", error);
    const list = document.getElementById("product-list");
    if (list) {
      list.innerHTML = `<p style="text-align:center;color:#ef4444;padding:40px;">Failed to load products. Please refresh the page.</p>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  boot().catch((e) => console.error("Boot Failed:", e));
});
