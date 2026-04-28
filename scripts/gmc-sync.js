import { google } from 'googleapis';
import fs from 'fs';
import csv from 'csv-parser';

const merchantId = '5766495931';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GMC_KEY),
  scopes: ['https://www.googleapis.com/auth/content']
});

const content = google.content({ version: 'v2.1', auth });
const products = [];

fs.createReadStream('gmc_products.csv')
  .pipe(csv())
  .on('data', (row) => {
    // Trim spaces from all CSV fields - fixes "Invalid product availability" errors
    const clean = (val) => val?.toString().trim() || '';

    const gmcProduct = {
      offerId: clean(row.id),
      title: clean(row.title),
      description: clean(row.description),
      link: clean(row.link),
      imageLink: clean(row.image_link),
      contentLanguage: 'en',
      targetCountry: 'US',
      channel: 'online',
      price: {
        // Strips USD, $, commas, spaces - keeps only numbers + decimal
        value: clean(row.price).replace(/[^0-9.]/g, '') || '0',
        currency: 'USD'
      },
      condition: clean(row.condition) || 'new',
      availability: clean(row.availability) || 'in stock',
      brand: clean(row.brand) || 'PromptVault USA',
      googleProductCategory: clean(row.google_product_category) || '5827',
      identifierExists: 'no',
      shipping: [{
        country: 'US',
        service: 'Standard',
        price: { value: '0', currency: 'USD' }
      }]
    };

    // Debug log to verify URLs before sending to GMC
    console.log(`QUEUED: ${gmcProduct.offerId} | Image: ${gmcProduct.imageLink}`);
    
    products.push(gmcProduct);
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
        console.log(`SYNCED: ${product.offerId} - ${product.title}`);
        successCount++;
      } catch (err) {
        console.error(`FAILED: ${product.offerId} - ${err.message}`);
        console.error(`  Link: ${product.link}`);
        console.error(`  Image: ${product.imageLink}`);
      }
    }
    
    console.log(`DONE: ${successCount}/${products.length} products synced to GMC`);
    if (successCount === 0) process.exit(1);
  });
