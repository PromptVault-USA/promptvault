const fs = require('fs');

const csv = fs.readFileSync('products.csv', 'utf8').trim().split('\n');
const headers = csv[0].split(',');
const template = fs.readFileSync('vault/_product-template.html', 'utf8');

const lookup = [];
const rows = csv.slice(1);

rows.forEach(row => {
  if (!row) return;
  const values = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(v => v.replace(/^"|"$/g, ''));
  const data = {};
  headers.forEach((h, i) => data[h.trim()] = values[i] || '');

  // Pass product ID to PayPal for Firebase
  data['PAYLINK'] = `${data['paylink']}?custom=${data['id']}`;

  // >>> SALE LOGIC ADDED HERE <<<
  const hasSale = data['sale_price'] && data['sale_price'].trim()!== '';
  data['DISPLAYPRICE'] = hasSale? data['sale_price'] : data['price'];
  data['OLDPRICE'] = hasSale? `$${data['price']}` : '';

  let html = template;
  Object.keys(data).forEach(key => {
    html = html.replaceAll(`{{${key.toUpperCase()}}}`, data[key]);
  });

  fs.writeFileSync(`vault/${data.slug}.html`, html);
  lookup.push({ id: data.gmc_id, slug: data.slug });
});

fs.writeFileSync('gmc-lookup.json', JSON.stringify(lookup, null, 2));
console.log(`✅ Built ${lookup.length} product pages + updated gmc-lookup.json`);
