// scripts/upload.js (CommonJS)
// Sync products.json to Google Merchant Center via Content API.
//
// Requires GitHub Actions secret:
// - GMC_KEY: JSON service account key (stringified JSON)
// Optional env:
// - GMC_MERCHANT_ID: defaults to "5766495931"
//
// Run:
//   node scripts/upload.js

const { google } = require("googleapis");
const fs = require("node:fs");
const path = require("node:path");

// 1) Initialize Content API
const content = google.content("v2.1");

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function slugify(input) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    // remove anything not alphanumeric, space, underscore, or hyphen
    .replace(/[^\w\s-]/g, "")
    // collapse spaces/underscores/hyphens into a single hyphen
    .replace(/[\s_-]+/g, "-")
    // trim hyphens
    .replace(/^-+|-+$/g, "");
}

async function syncToGMC() {
  try {
    // Load GMC Key from Environment (GitHub Secrets)
    if (!process.env.GMC_KEY) {
      throw new Error("GMC_KEY secret is missing in GitHub Actions.");
    }

    let keyData;
    try {
      keyData = JSON.parse(process.env.GMC_KEY);
    } catch {
      throw new Error("GMC_KEY is not valid JSON (it must be the full service account key JSON).");
    }

    const auth = new google.auth.JWT(
      keyData.client_email,
      null,
      keyData.private_key,
      ["https://www.googleapis.com/auth/content"],
    );

    const merchantId = String(process.env.GMC_MERCHANT_ID || "5766495931").trim();

    const productsPath = path.join(process.cwd(), "products.json");
    if (!fs.existsSync(productsPath)) {
      fail("products.json not found. Run your build first to generate products.json.");
    }

    const productsData = JSON.parse(fs.readFileSync(productsPath, "utf8"));
    if (!Array.isArray(productsData) || productsData.length === 0) {
      fail("products.json is empty or not an array.");
    }

    console.log(`🚀 Starting sync for ${productsData.length} products to GMC...`);

    for (const item of productsData) {
      const id = String(item?.id ?? "").trim();
      const name = String(item?.name ?? item?.title ?? "").trim(); // support either name or title
      const desc = String(item?.desc ?? "").trim();
      const img = String(item?.img ?? "").trim();

      const priceNum = Number(String(item?.price ?? "").trim());
      if (!id) fail("A product is missing id.");
      if (!name) fail(`Product "${id}" is missing name/title.`);
      if (!Number.isFinite(priceNum) || priceNum <= 0) fail(`Product "${id}" has invalid price.`);
      if (!img) fail(`Product "${id}" is missing img.`);

      // Prefer the explicit slug in products.json if present; otherwise slugify from name.
      const slug = String(item?.slug ?? "").trim() || slugify(name);
      if (!slug) fail(`Product "${id}" could not generate slug.`);

      // IMPORTANT: plain URL only (no   and no Markdown)
      const link = `https://promptvaultusa.shop/vault/${encodeURIComponent(slug)}.html`;

      const product = {
        offerId: id, // e.g., niche_001
        title: name,
        description: desc || "Professional AI prompt engineering and digital asset vault.",
        link,
        imageLink: img,
        contentLanguage: "en",
        targetCountry: "US",
        feedLabel: "US",
        channel: "online",
        availability: "in stock",
        condition: "new",
        googleProductCategory: "Software > Digital Goods",
        price: {
          value: priceNum.toFixed(2),
          currency: "USD",
        },
      };

      // Insert (create/replace) product
      await content.products.insert({
        auth,
        merchantId,
        resource: product,
      });

      console.log(`✅ Synced & Linked: ${name} -> /vault/${slug}.html`);
    }

    console.log("🎉 All products synchronized successfully!");
  } catch (error) {
    console.error("❌ Sync Error:", error && error.message ? error.message : String(error));
    process.exit(1);
  }
}

syncToGMC();
