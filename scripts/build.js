const fs = require("fs");

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

function escapeHtml(str) {
	return String(str ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function validateSlug(slug) {
	return /^[a-z0-9-]+$/.test(slug);
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

	if (!fs.existsSync("vault/_product-template.html")) {
		console.error("❌ vault/_product-template.html not found.");
		process.exit(1);
	}

	const csvText = fs.readFileSync("products.csv", "utf8");
	const template = fs.readFileSync("vault/_product-template.html", "utf8");
	const { rows } = parseCSV(csvText);

	if (!rows.length) {
		console.error("❌ No rows found in products.csv");
		process.exit(1);
	}

	const products = rows.map((r) => {
		const gmc_id = String(r.Gmc_id || "").trim();
		const id = String(r.id || "").trim();
		const slug = String(r.slug || "").trim();
		const name = String(r.name || "").trim();
		const desc = String(r.desc || "").trim();
		const category = String(r.category || "").trim();
		const paylink = String(r.paylink || "").trim();
		const img = normalizeImg(r.img);
		const drivelink = String(r.drivelink || "").trim();

		const price = toNumber(r.price);
		const sale_price = toNumber(r.sale_price);

		return {
			gmc_id,
			id,
			slug,
			name,
			desc,
			category,
			paylink,
			img,
			drivelink,
			price,
			sale_price,
		};
	});

	for (const p of products) {
		if (!p.id) throw new Error("❌ Missing id in products.csv row");
		if (!p.slug) throw new Error(`❌ Missing slug for product id=${p.id}`);
		if (!validateSlug(p.slug)) throw new Error(`❌ Invalid slug "${p.slug}" for id=${p.id}`);
		if (!p.name) throw new Error(`❌ Missing name for product id=${p.id}`);
		if (!p.price || p.price <= 0) throw new Error(`❌ Invalid price for product id=${p.id}`);
	}

	if (!fs.existsSync("vault")) fs.mkdirSync("vault", { recursive: true });

	const lookup = [];

	for (const p of products) {
		const msrp = toNumber(p.price);
		const sale = toNumber(p.sale_price);
		const hasSale = sale > 0 && msrp > sale;
		const finalPrice = hasSale ? sale : msrp;

		const data = {
			...p,
			NAME: escapeHtml(p.name),
			DESC: escapeHtml(p.desc),
			IMG: p.img,
			ID: p.id,
			SLUG: p.slug,
			GMC_ID: p.gmc_id || p.id,
			PRICE: finalPrice.toFixed(2),
			MSRP: msrp.toFixed(2),
			PAYPAL_HOOK: `<div id="single-paypal-button" data-id="${escapeHtml(p.id)}" data-price="${finalPrice.toFixed(
				2,
			)}"></div>`,
		};

		let html = template;

		for (const key of Object.keys(data)) {
			const placeholder = `{{${String(key).toUpperCase()}}}`;
			const value = data[key] === undefined || data[key] === null ? "" : String(data[key]);
			html = html.replaceAll(placeholder, value);
		}

		fs.writeFileSync(`vault/${p.slug}.html`, html);

		lookup.push({
			id: p.gmc_id || p.id,
			slug: p.slug,
			price: finalPrice.toFixed(2),
		});
	}

	fs.writeFileSync("gmc-lookup.json", JSON.stringify(lookup, null, 2));

	console.log("✅ Build Complete!");
	console.log(`📂 Created/updated ${products.length} pages in /vault/`);
	console.log("🔗 Updated gmc-lookup.json");
})();
