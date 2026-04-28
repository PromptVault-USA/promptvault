import { google } from 'googleapis';
import fs from 'fs';
import csv from 'csv-parser';

const merchantId = '5766495931';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GMC_KEY),
  scopes: ['https://www.googleapis.com/auth/content'],
});

const content = google.content({ version: 'v2.1', auth });

const defaults = {
  condition: 'new',
  availability: 'in stock',
  brand: 'PromptVault USA',
  identifier_exists: 'no',
  google_product_category: '5827',
  sale_price: '',
  sale_price_effective_date: ''
};

const products = [];
fs.createReadStream('products.csv')
  .pipe(csv())
  .on('data', (row) => {
    const finalProduct = { ...defaults, ...row };
    products.push(finalProduct);
  })
  .on('end', async () => {
    console.log(`Starting sync of ${products.length} products to GMC ${merchantId}`);
    let successCount = 0;
    for (const product of products) {
      try {
        await content.products.insert({
          merchantId: merchantId,
          requestBody: product
        });
        console.log(`SYNCED: ${product.id} - ${product.title}`);
        successCount++;
      } catch (err) {
        console.error(`FAILED: ${product.id} - ${err.message}`);
      }
    }
    console.log(`DONE: ${successCount}/${products.length} products synced to GMC`);
    if (successCount === 0) process.exit(1);
  })
  .on('error', (err) => {
    console.error('CSV Read Error:', err);
    process.exit(1);
  });

