// /scripts/build.js (CommonJS)
// Node 20 compatible when package.json does NOT have "type": "module"

const fs = require("node:fs");
const path = require("node:path");
const Papa = require("papaparse");

const ROOT = process.cwd();
const CSV_PATH = path.join(ROOT, "products.csv");
const VAULT_DIR = path.join(ROOT, "vault");
const PRODUCTS_JSON_PATH = path.join(ROOT, "products.json");
const GMC_LOOKUP_JSON_PATH = path.join(ROOT, "gmc-lookup.json");

// PayPal SDK must be included on every generated vault page (Option A)
// IMPORTANT: this must be a plain URL, not a Markdown link.
const PAYPAL_SDK_SRC =
  "https://www.paypal.com/sdk/js?client-id=AWapcH0acCdiTehBXFR48XBWweSYxkuTnJ7zLadzyL9rLjGyrvVEKwKBuLUUW1ZIvcaNlhk-qSCxvu_m&currency=USD&intent=capture";

// CSV headers must match your repo CSV exactly
const REQUIRED_HEADERS = [
  "gmc_id",
  "id",
  "slug",
  "name",
  "price",
  "sale_price",
  "category",
  "desc",
  "paylink",
  "img",
  "drivelink",
];

function fail(msg) {
  console.error(`[build] ${msg}`);
  process.exit(1);
}

function toNumber(v) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeImg(img) {
  const raw = String(img ?? "").trim();
  if (!raw) return "/logo.png";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return raw;
  return `/${raw}`;
}

function validateHeaders(fields) {
  const got = (fields || []).map((f) => String(f).trim());
  const missing = REQUIRED_HEADERS.filter((h) => !got.includes(h));
  const extras = got.filter((h) => !REQUIRED_HEADERS.includes(h));
  if (missing.length) fail(`CSV missing headers: ${missing.join(", ")}`);
  if (extras.length) fail(`CSV has unexpected headers: ${extras.join(", ")}`);
}

function normalizeRow(r, i) {
  const id = String(r?.id ?? "").trim();
  const slug = String(r?.slug ?? "").trim();
  const title = String(r?.name ?? "").trim();
  const desc = String(r?.desc ?? "").trim();

  const price = toNumber(r?.price);
  const salePriceRaw = String(r?.sale_price ?? "").trim();
  const sale_price = salePriceRaw === "" ? NaN : toNumber(salePriceRaw);

  const img = normalizeImg(r?.img);
  const drivelink = String(r?.drivelink ?? "").trim();
  const gmc_id = String(r?.gmc_id ?? "").trim();

  if (!id) fail(`Row ${i + 2}: missing id`);
  if (!slug) fail(`Row ${i + 2}: missing slug`);
  if (!title) fail(`Row ${i + 2}: missing name`);
  if (!Number.isFinite(price) || price <= 0) fail(`Row ${i + 2}: invalid price`);
  if (salePriceRaw !== "" && (!Number.isFinite(sale_price) || sale_price <= 0)) {
    fail(`Row ${i + 2}: invalid sale_price`);
  }
  if (!drivelink) fail(`Row ${i + 2}: missing drivelink`);
  if (!gmc_id) fail(`Row ${i + 2}: missing gmc_id`);

  const hasSale = Number.isFinite(sale_price) && sale_price > 0 && sale_price < price;
  const finalPrice = hasSale ? sale_price : price;

  return {
    id,
    slug,
    title,
    price,
    sale_price: hasSale ? sale_price : null,
    finalPrice,
    img,
    drivelink,
    gmc_id,
    desc,
  };
}

function renderProductPage(p) {
  const msrp = p.price.toFixed(2);
  const final = p.finalPrice.toFixed(2);
  const hasSale = p.sale_price !== null && p.sale_price < p.price;

  const saleBadge = hasSale
    ? `<span style="display:inline-block;background:#fbbf24;color:#0a0e27;font-weight:900;font-size:0.75rem;letter-spacing:1px;padding:6px 10px;border-radius:999px;">SALE</span>`
    : "";

  const oldPriceHtml = hasSale
    ? `<span id="oldprice" style="text-decoration:line-through; opacity:0.7;">$${escapeHtml(msrp)}</span>`
    : "";

  const priceHtml = `<span id="price" style="font-weight:900;font-size:1.25rem;">$${escapeHtml(final)}</span>`;

  const paypalHook = `<div id="single-paypal-button"
    data-product-id="${escapeHtml(p.id)}"
    data-product-slug="${escapeHtml(p.slug)}"
    data-product-title="${escapeHtml(p.title)}"
    data-product-price="${escapeHtml(final)}"></div>`;

  // IMPORTANT: canonical must be a plain URL (not wrapped in   and not Markdown).
  const canonicalUrl = `https://promptvaultusa.shop/vault/${encodeURIComponent(p.slug)}.html`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(p.title)} | PromptVault USA</title>
  <meta name="description" content="${escapeHtml(p.desc)}">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <main style="max-width:980px;margin:0 auto;padding:24px;">
    <a href="https://promptvaultusa.shop/#browse" style="text-decoration:none;">Back to shop</a>
    <h1 style="margin-top:16px;">${escapeHtml(p.title)}</h1>

    <div style="display:grid;grid-template-columns:1fr;gap:20px;margin-top:20px;">
      <div style="border:1px solid rgba(255,255,255,0.08);border-radius:18px;overflow:hidden;">
        <img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.title)}" style="width:100%;display:block;" onerror="this.src='/logo.png'">
      </div>

      <div style="border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:18px;">
        <p>${escapeHtml(p.desc)}</p>

        <div style="display:flex;gap:10px;align-items:center;margin:14px 0;">
          ${saleBadge}
          <div style="display:flex;gap:10px;align-items:baseline;">
            ${oldPriceHtml}
            ${priceHtml}
          </div>
        </div>

        ${paypalHook}

        <div style="margin-top:12px;font-size:0.9rem;opacity:0.8;">
          After payment, your pack unlocks in My Library on this device.
        </div>
      </div>
    </div>
  </main>

  <script src="${PAYPAL_SDK_SRC}"></script>
  <script type="module" src="/app.js"></script>
</body>
</html>`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  if (!fs.existsSync(CSV_PATH)) fail("products.csv not found in repo root");

  const csv = fs.readFileSync(CSV_PATH, "utf8");
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

  if (parsed.errors && parsed.errors.length) {
    const e = parsed.errors[0];
    fail(`CSV parse error: ${e.message || JSON.stringify(e)}`);
  }

  validateHeaders(parsed.meta && parsed.meta.fields ? parsed.meta.fields : null);

  const rows = (parsed.data || []).filter(
    (r) => r && String(r.id ?? "").trim() !== "",
  );
  if (!rows.length) fail("products.csv has zero products");

  const products = rows.map((r, i) => normalizeRow(r, i));

  const seenSlugs = new Set();
  for (const p of products) {
    if (seenSlugs.has(p.slug)) fail(`Duplicate slug: ${p.slug}`);
    seenSlugs.add(p.slug);
  }

  ensureDir(VAULT_DIR);

  for (const p of products) {
    const outPath = path.join(VAULT_DIR, `${p.slug}.html`);
    fs.writeFileSync(outPath, renderProductPage(p), "utf8");
  }

  // products.json for app.js
  const productsJson = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    price: p.price,
    sale_price: p.sale_price,
    img: p.img,
    drivelink: p.drivelink,
    gmc_id: p.gmc_id,
    desc: p.desc,
  }));
  fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(productsJson, null, 2) + "\n", "utf8");

  // gmc-lookup.json
  const gmcLookup = {};
  for (const p of products) {
    gmcLookup[p.gmc_id] = {
      id: p.id,
      slug: p.slug,
      title: p.title,
      url: `https://promptvaultusa.shop/vault/${p.slug}.html`,
    };
  }
  fs.writeFileSync(GMC_LOOKUP_JSON_PATH, JSON.stringify(gmcLookup, null, 2) + "\n", "utf8");

  console.log(`[build] Wrote ${products.length} vault pages`);
  console.log("[build] Wrote products.json");
  console.log("[build] Wrote gmc-lookup.json");
}

main();
