/**
 * COPY-PASTE READY FILE. Replace entire file content.
 *
 * Generate products.json from products.csv
 * Source of truth: products.csv
 * Output:
 *   - products.json
 *
 * Run:
 *   node scripts/generate-products-json.js
 *
 * Notes:
 * - CommonJS (require) for Node 20 compatibility when package.json has NO "type": "module"
 * - Fixes common copy/paste corruption like [r.id](http://r.id/) and bad regex
 * - Accepts either "gmc_id" or "Gmc_id" header (but will REQUIRE one of them)
 */

const fs = require("node:fs");

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
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function parseCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // Handle escaped quotes "" inside quoted field
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
    // IMPORTANT: don't .trim() the whole line before parsing; it can alter quoted fields.
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
    throw new Error(
      `Invalid slug "${s}". Allowed: lowercase letters, numbers, hyphen.`,
    );
  }
  return s;
}

function normalizeImg(img) {
  const raw = String(img ?? "").trim();
  if (!raw) return "/logo.png";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return raw;
  return `/${raw}`;
}

function validateHeaders(headers) {
  const got = (headers || []).map((h) => String(h ?? "").trim());
  // allow Gmc_id as an alias for gmc_id
  const gotNormalized = got.map((h) => (h === "Gmc_id" ? "gmc_id" : h));

  const missing = REQUIRED_HEADERS.filter((h) => !gotNormalized.includes(h));
  const extras = gotNormalized.filter((h) => !REQUIRED_HEADERS.includes(h));

  if (missing.length) fail(`products.csv missing headers: ${missing.join(", ")}`);
  if (extras.length) fail(`products.csv has unexpected headers: ${extras.join(", ")}`);
}

(function main() {
  if (!fs.existsSync("products.csv")) {
    fail("products.csv not found in repo root.");
  }

  const csvText = fs.readFileSync("products.csv", "utf8");
  const { headers, rows } = parseCSV(csvText);

  if (!headers.length) fail("products.csv appears empty or missing header row.");
  validateHeaders(headers);

  const products = rows
    .filter((r) => r && String(r.id ?? "").trim() !== "")
    .map((r) => {
      const gmc_id = String(r.gmc_id ?? r.Gmc_id ?? "").trim();
      const id = String(r.id ?? "").trim();
      const slug = normalizeSlug(r.slug ?? "");
      const name = String(r.name ?? "").trim();
      const price = toNumber(r.price);
      const sale_price_raw = String(r.sale_price ?? "").trim();
      const sale_price =
        sale_price_raw === "" ? null : toNumber(r.sale_price);

      const category = String(r.category ?? "").trim();
      const desc = String(r.desc ?? "").trim();
      const paylink = String(r.paylink ?? "").trim();
      const img = normalizeImg(r.img);
      const drivelink = String(r.drivelink ?? "").trim();

      if (!gmc_id) throw new Error(`Missing gmc_id for slug "${slug}"`);
      if (!id) throw new Error(`Missing id for slug "${slug}"`);
      if (!name) throw new Error(`Missing name for id "${id}"`);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`Invalid price for id "${id}"`);
      }
      if (sale_price !== null && (!Number.isFinite(sale_price) || sale_price <= 0)) {
        throw new Error(`Invalid sale_price for id "${id}"`);
      }

      return {
        gmc_id,
        id,
        slug,
        name,
        price,
        sale_price,
        category,
        desc,
        paylink,
        img,
        drivelink,
      };
    });

  fs.writeFileSync("products.json", JSON.stringify(products, null, 2) + "\n", "utf8");

  console.log("✅ Generated products.json");
  console.log(`- products.json products: ${products.length}`);
  console.log(`- headers: ${headers.join(", ")}`);
})();
