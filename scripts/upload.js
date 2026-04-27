/**
 * /scripts/upload.js (ES Module)
 * Sync products.json to Google Merchant Center via Content API.
 * Fully compatible with "type": "module" in package.json
 */

import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repo root is one level up from /scripts/
const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_PATH = path.join(ROOT, "products.json");

// 1) Initialize Content API
const content = google.content("v2.1");

function fail(msg) {
  console.error(`❌ [GMC-Upload] ${msg}`);
  process.exit(1);
}

function slugify(input) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
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
      throw new Error("GMC_KEY is not valid JSON (must be the full service account key).");
    }

    const auth = new google.auth.JWT(
      keyData.client_email,
      null,
      keyData.private_key,
      ["https://www.googleapis.com/auth/content"]
    );

    const merchantId = String(process.env.GMC_MERCHANT_ID || "5766495931").trim();

    if (!fs.existsSync(PRODUCTS_PATH)) {
      fail("products.json not found. Run your build scripts first.");
    }

    const productsData = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));
    if (!Array.isArray(productsData) || productsData.length === 0) {
      fail("products.json is empty or not an array.");
    }

    console.log(`🚀 Starting GMC sync for ${productsData.length} products...`);

    for (const item of productsData) {
      const id = String(item?.id ?? "").trim();
      const name = String(item?.name ?? item?.title ?? "").trim();
      const desc = String(item?.desc ?? "").trim();
      const img = String(item?.img ?? "").trim();
      const priceNum = Number(String(item?.price ?? "").trim());

      if (!id || !name || !Number.isFinite(priceNum) || priceNum <= 0 || !img) {
        console.warn(`⚠️ Skipping invalid product: ${id || 'unknown'}`);
        continue;
      }

      const slug = String(item?.slug ?? "").trim() || slugify(name);
      
      // Plain URL for GMC compliance
      const link = `https://promptvaultusa.shop/vault/${encodeURIComponent(slug)}.html`;

      const product = {
        offerId: id,
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

      console.log(`✅ GMC Synced: ${name}`);
    }

    console.log("🎉 GMC synchronization complete!");
  } catch (error) {
    console.error("❌ Sync Error:", error?.message || String(error));
    process.exit(1);
  }
}

syncToGMC();
