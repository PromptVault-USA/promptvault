const fs = require('fs');
const path = require('path');

// Senior Note: Ensure 'npm install js-yaml' was run in your environment
let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  console.error("❌ Error: 'js-yaml' library not found. Run: npm install js-yaml");
  process.exit(1);
}

// 1. Load the Sources
const yamlFile = fs.readFileSync('products.yml', 'utf8');
const template = fs.readFileSync('vault/_product-template.html', 'utf8');
const productData = yaml.load(yamlFile);

// Check if YAML has a products array
const products = Array.isArray(productData) ? productData : productData.products;

const lookup = [];

console.log(`🚀 Starting build for ${products.length} products...`);

products.forEach(p => {
  if (!p.slug) {
    console.warn(`⚠️ Skipping product ID ${p.id}: Missing slug.`);
    return;
  }

  // 2. Prepare Data Mapping
  const data = { ...p };
  
  // Sale Logic Integration
  const msrp = parseFloat(p.price) || 0;
  const sale = parseFloat(p.sale_price) || 0;
  const hasSale = sale > 0 && msrp > sale;

  // Formatting for Template Placeholders
  data['PRICE'] = hasSale ? sale.toFixed(2) : msrp.toFixed(2);
  data['MSRP'] = msrp.toFixed(2);
  data['DISPLAYPRICE'] = data['PRICE'];
  data['OLDPRICE'] = hasSale ? `$${msrp.toFixed(2)}` : '';
  
  // 3. Headless Engine Hook Injection
  // We inject the ID and Price into the div as a backup for the app.js engine
  data['PAYPAL_HOOK'] = `<div id="single-paypal-button" data-id="${p.id}" data-price="${data['PRICE']}"></div>`;

  // 4. Generate HTML Content
  let html = template;
  
  // Replace all {{KEY}} placeholders with YAML values
  Object.keys(data).forEach(key => {
    const placeholder = `{{${key.toUpperCase()}}}`;
    const value = data[key] !== undefined ? String(data[key]) : '';
    html = html.replaceAll(placeholder, value);
  });

  // 5. Write File to /vault/
  const fileName = `vault/${p.slug}.html`;
  fs.writeFileSync(fileName, html);
  
  // 6. Update GMC Lookup
  lookup.push({ 
    id: p.gmc_id || p.id, 
    slug: p.slug,
    price: data['PRICE']
  });
});

// 7. Save Router/Lookup file
fs.writeFileSync('gmc-lookup.json', JSON.stringify(lookup, null, 2));

console.log(`✅ Build Complete!`);
console.log(`📂 Created ${products.length} pages in /vault/`);
console.log(`🔗 Updated gmc-lookup.json`);
