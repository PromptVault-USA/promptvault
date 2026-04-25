/**
 * PROMPTVAULT USA - CORE ENGINE v5.9.1 (Audit Patch)
 * MODE: DIRECT-PURCHASE (Headless & Event-Driven)
 * PATH: /app.js (Root)
 *
 * Step 1 Fixes applied:
 * - Removed FulfillmentService dependency completely (prevents module boot failure).
 * - Added hard guards for missing PayPal SDK + PapaParse so the app doesn’t crash silently.
 * - Normalized product field handling for CSV (title/name, sale_price, img).
 * - Removed price query-string injection to vault links (prevents tamperable pricing display).
 * - Prevented double-render/double-button injection during rerenders.
 *
 * WARNING (intentional): This still does NOT implement secure server-side payment verification.
 * It only restores site boot + stability so you can proceed to Step 2/3 safely.
 */

import {
	doc,
	setDoc,
	collection,
	getDocs,
	serverTimestamp,
	query,
	where,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

console.log("PV Core v5.9.1 Online [Direct-Purchase Mode]");

// ---------------------------
// 1) IDENTITY SYSTEM
// ---------------------------
const getActiveIdentity = () => {
	// NOTE: Your current Firestore rules require request.auth != null for create.
	// That means "guest uid" only works if the user is actually authenticated (anonymous auth counts).
	// This function is kept for continuity, but Step 3 should ensure auth is present before checkout.
	if (auth?.currentUser && !auth.currentUser.isAnonymous) return auth.currentUser.uid;

	let gid = localStorage.getItem("pv_guest_uid");
	if (!gid) {
		gid = "pv_guest_" + Math.random().toString(36).substr(2, 9);
		localStorage.setItem("pv_guest_uid", gid);
	}
	return gid;
};

// ---------------------------
// 2) HELPERS
// ---------------------------
const toNumber = (v) => {
	const n = Number(String(v ?? "").trim());
	return Number.isFinite(n) ? n : 0;
};

const normalizeImg = (img) => {
	const raw = String(img ?? "").trim();
	if (!raw) return "/logo.png";
	if (raw.startsWith("http")) return raw;
	if (raw.startsWith("/")) return raw;
	return `/${raw}`;
};

const normalizeProduct = (p) => {
	const id = String(p.id ?? "").trim();
	const slug = String(p.slug ?? "").trim();
	const name = String(p.title ?? p.name ?? "").trim();
	const msrp = toNumber(p.price);
	const sale = toNumber(p.sale_price);
	const finalPrice = sale > 0 && msrp > sale ? sale : msrp;

	return {
		id,
		slug,
		name,
		price: msrp,
		sale_price: sale,
		finalPrice,
		img: normalizeImg(p.img),
		gmc_id: String(p.gmc_id ?? p.Gmc_id ?? "").trim(),
		drivelink: String(p.drivelink ?? p.driveLink ?? "").trim(),
	};
};

const ensurePayPalReady = () => {
	if (!window.paypal || !window.paypal.Buttons) {
		console.warn("PayPal SDK not ready. Buttons will not render yet.");
		return false;
	}
	return true;
};

const ensurePapaReady = () => {
	if (!window.Papa || !window.Papa.parse) {
		console.error("PapaParse is missing. Ensure index.html includes papaparse before app.js.");
		return false;
	}
	return true;
};

// ---------------------------
// 3) GRID RENDERING (DIRECT PAYPAL BUTTONS)
// ---------------------------
const renderProducts = (rawProducts) => {
	const list = document.getElementById("product-list");
	if (!list) return;

	const products = (rawProducts || [])
		.map(normalizeProduct)
		.filter((p) => p.id && p.slug && p.name);

	list.innerHTML = products
		.map((p) => {
			const buttonId = `paypal-button-${p.id}`;

			const hasSale = p.sale_price > 0 && p.price > p.sale_price;
			const pricingHTML = hasSale
				? `<span style="text-decoration:line-through; color:#64748b; font-size:0.85rem; margin-right:8px;">$${p.price.toFixed(2)}</span>
           <span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${p.finalPrice.toFixed(2)}</span>`
				: `<span style="color:var(--secondary); font-weight:800; font-size:1.4rem;">$${p.finalPrice.toFixed(2)}</span>`;

			return `
      <div class="product-card" style="background:var(--glass); border:1px solid var(--border); border-radius:24px; padding:20px; display:flex; flex-direction:column; height: 100%;">
        <a href="/vault/${p.slug}.html" style="text-decoration:none;">
          <div style="aspect-ratio:1/1; border-radius:15px; overflow:hidden; margin-bottom:15px; background:#000; border:1px solid var(--border);">
            <img src="${p.img}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/logo.png'">
          </div>
          <div style="font-weight:800; color:white; font-size:1.1rem; margin-bottom:5px;">${p.name}</div>
        </a>

        <div style="margin-bottom:15px;">${pricingHTML}</div>

        <div style="margin-top:auto;">
          <div id="${buttonId}" data-rendered="0"></div>
        </div>
      </div>`;
		})
		.join("");

	if (!ensurePayPalReady()) return;

	products.forEach((p) => {
		const buttonId = `paypal-button-${p.id}`;
		const container = document.getElementById(buttonId);
		if (!container) return;

		if (container.getAttribute("data-rendered") === "1") return;
		container.setAttribute("data-rendered", "1");

		window.paypal
			.Buttons({
				style: {
					layout: "vertical",
					color: "gold",
					shape: "rect",
					height: 40,
					label: "buynow",
				},
				createOrder: (data, actions) =>
					actions.order.create({
						purchase_units: [
							{
								amount: { value: p.finalPrice.toFixed(2) },
								description: `PV - ${p.name}`,
								custom_id: p.id,
							},
						],
					}),
				onApprove: (data, actions) =>
					actions.order.capture().then(async (details) => {
						const identity = getActiveIdentity();

						await setDoc(doc(db, "orders", details.id), {
							uid: identity,
							items: [{ id: p.id, name: p.name, price: p.finalPrice }],
							status: "completed",
							paypalTransactionId: details.id,
							payerEmail: details?.payer?.email_address || null,
							createdAt: serverTimestamp(),
						});

						window.location.href = `/success.html?tx=${encodeURIComponent(details.id)}`;
					}),
				onError: (err) => {
					console.error("PayPal Buttons error:", err);
				},
			})
			.render(`#${buttonId}`);
	});
};

// ---------------------------
// 4) AUTO-SYNC LIBRARY
// ---------------------------
window.loadUserLibrary = async () => {
	const identity = getActiveIdentity();
	const grid = document.getElementById("user-library-grid");
	if (!grid) return;

	grid.innerHTML = `<p style="text-align:center; color:#94a3b8;">Syncing Assets...</p>`;

	try {
		const res = await fetch("/products.json", { cache: "no-store" });
		if (!res.ok) throw new Error(`products.json fetch failed: ${res.status}`);
		const syncedProductsRaw = await res.json();
		const syncedProducts = (syncedProductsRaw || []).map(normalizeProduct);

		const q = query(collection(db, "orders"), where("uid", "==", identity));
		const querySnapshot = await getDocs(q);

		let libraryHTML = "";

		querySnapshot.forEach((orderDoc) => {
			const data = orderDoc.data();

			if (data.status === "completed" || data.status === "paid") {
				(data.items || []).forEach((item) => {
					const itemId = String(item.id ?? "").trim();
					const fresh = syncedProducts.find((p) => p.id === itemId || p.gmc_id === itemId);

					libraryHTML += `
            <div class="library-card" style="background:var(--glass); border:1px solid var(--border); padding:15px; border-radius:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; width:100%; max-width:600px;">
              <div style="color:white; font-weight:800;">${item.name || fresh?.name || "Unlocked Vault"}</div>
              <a href="${fresh?.drivelink || "#"}" target="_blank" rel="noopener" style="padding:8px 15px; background:var(--success); border-radius:8px; color:white; text-decoration:none; font-size:0.85rem; font-weight:600;">Download</a>
            </div>`;
				});
			}
		});

		grid.innerHTML =
			libraryHTML ||
			`<p style="text-align:center; color:#94a3b8; padding:40px;">No vaults unlocked yet.</p>`;
	} catch (e) {
		console.error("Library Sync Error:", e);
		grid.innerHTML = `<p style="color:#ef4444; text-align:center;">Sync failed. Please refresh.</p>`;
	}
};

// ---------------------------
// 5) ROUTER
// ---------------------------
window.changePage = (id, el) => {
	const target = document.getElementById(id);
	if (!target) return;

	document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
	target.classList.add("active");

	document.querySelectorAll(".nav-item").forEach((i) => i.classList.remove("active"));
	if (el) el.classList.add("active");

	if (id === "browse") {
		if (!ensurePapaReady()) return;

		window.Papa.parse("/products.csv", {
			download: true,
			header: true,
			skipEmptyLines: true,
			complete: (results) => {
				const rows = (results?.data || []).filter((r) => r && r.id);
				renderProducts(rows);
			},
			error: (err) => console.error("CSV parse error:", err),
		});
	}

	if (id === "library") window.loadUserLibrary();

	window.location.hash = id;
};

// ---------------------------
// 6) INITIALIZATION
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
	if (window.location.hash) {
		const pageId = window.location.hash.substring(1);
		const navEl = document.querySelector(`[onclick*="${pageId}"]`);
		window.changePage(pageId, navEl);
		return;
	}

	const productList = document.getElementById("product-list");
	if (productList) {
		window.changePage("browse", document.querySelector(`[onclick*="browse"]`));
	}
});
