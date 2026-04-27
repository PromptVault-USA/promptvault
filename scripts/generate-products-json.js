/**
 * /scripts/generate-products-json.js (ES Module)
 * Fully compatible with "type": "module" in package.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repo root is one level up from /scripts/
const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, "products.csv");
const OUTPUT_PATH = path.join(ROOT, "products.json");

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
  console.error(`❌ [generate-json] ${msg}`);
  process.exit(1);
}

function parseCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => String(s ?? "").trim());
}

function parseCSV(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => (l === undefined || l === null ? "" : String(l)))
    .filter((l) => l.length > 0);

  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

function toNumber(v) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function normalizeSlug(slug) {
  const s = String(slug ?? "").trim();
  if (!/^[a-z0-9-]+$/.test(s)) {
    throw new Error(`Invalid slug "${s}". Use lowercase, numbers, and hyphens only.`);
  }
  return s;
}

function normalizeImg(img) {
  const raw = String(img ?? "").trim();
  if (!raw) return "/logo.png";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function validateHeaders(headers) {
  const got = (headers || []).map((h) => String(h ?? "").trim());
  const gotNormalized = got.map((h) => (h === "Gmc_id" ? "gmc_id" : h));

  const missing = REQUIRED_HEADERS.filter((h) => !gotNormalized.includes(h));
  if (missing.length) fail(`products.csv missing headers: ${missing.join(", ")}`);
}

// Main execution
(function main() {
  if (!fs.existsSync(CSV_PATH)) {
    fail(`products.csv not found at ${CSV_PATH}`);
  }

  const csvText = fs.readFileSync(CSV_PATH, "utf8");
  const { headers, rows } = parseCSV(csvText);

  if (!headers.length) fail("products.csv is empty or missing headers.");
  validateHeaders(headers);

  try {
    const products = rows
      .filter((r) => r && String(r.id ?? "").trim() !== "")
      .map((r) => {
        const gmc_id = String(r.gmc_id ?? r.Gmc_id ?? "").trim();
        const id = String(r.id ?? "").trim();
        const slug = normalizeSlug(r.slug ?? "");
        const name = String(r.name ?? "").trim();
        const price = toNumber(r.price);
        const sale_price_raw = String(r.sale_price ?? "").trim();
        const sale_price = sale_price_raw === "" ? null : toNumber(sale_price_raw);

        const category = String(r.category ?? "").trim();
        const desc = String(r.desc ?? "").trim();
        const paylink = String(r.paylink ?? "").trim();
        const img = normalizeImg(r.img);
        const drivelink = String(r.drivelink ?? "").trim();

        if (!gmc_id || !id || !name || !Number.isFinite(price) || price <= 0) {
          throw new Error(`Validation failed for product: ${slug || id}`);
        }

        return { gmc_id, id, slug, name, price, sale_price, category, desc, paylink, img, drivelink };
      });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(products, null, 2) + "\n", "utf8");

    console.log("✅ Generated products.json");
    console.log(`- Total products: ${products.length}`);
  } catch (err) {
    fail(err.message);
  }
})();
