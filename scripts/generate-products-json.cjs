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
 */

const fs = require("fs");

function parseCSVLine(line) {
	const out = [];
	let cur = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];

		if (ch === '"') {
			// Handle escaped quotes ""
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
	return out.map((s) => s.trim());
}

function parseCSV(text) {
	const lines = text
		.replace(/\r\n/g, "\n")
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);

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
	return Number.isFinite(n) ? n : 0;
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
	if (raw.startsWith("http")) return raw;
	if (raw.startsWith("/")) return raw;
	return `/${raw}`;
}

(function main() {
	if (!fs.existsSync("products.csv")) {
		console.error("❌ products.csv not found in repo root.");
		process.exit(1);
	}

	const csvText = fs.readFileSync("products.csv", "utf8");
	const { headers, rows } = parseCSV(csvText);

	// Expected header:
	// Gmc_id,id,slug,name,price,sale_price,category,desc,paylink,img,drivelink
	const products = rows.map((r) => {
		const gmc_id = String(r.Gmc_id || "").trim();
		const id = String(r.id || "").trim();
		const slug = normalizeSlug(r.slug || "");
		const name = String(r.name || "").trim();
		const price = toNumber(r.price);
		const sale_price = toNumber(r.sale_price);
		const category = String(r.category || "").trim();
		const desc = String(r.desc || "").trim();
		const paylink = String(r.paylink || "").trim();
		const img = normalizeImg(r.img);
		const drivelink = String(r.drivelink || "").trim();

		if (!id) throw new Error(`Missing id for slug "${slug}"`);
		if (!name) throw new Error(`Missing name for id "${id}"`);
		if (!price || price <= 0) throw new Error(`Invalid price for id "${id}"`);

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

	fs.writeFileSync("products.json", JSON.stringify(products, null, 2));

	console.log("✅ Generated products.json");
	console.log(`- products.json products: ${products.length}`);
	console.log(`- headers: ${headers.join(", ")}`);
})();
