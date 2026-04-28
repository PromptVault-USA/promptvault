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

// CHANGED: Now reads gmc_products.csv instead of products.csv
fs.createReadStream('gmc_products.csv')
  .pipe(csv())
  .on('data', (row) => {
    const gmcProduct = {
      offerId: row.id,
      title: row.title,
      description: row.description,
      link: row.link,
      imageLink: row.image_link,
      contentLanguage: 'en',
      targetCountry: 'US',
      channel: 'online',
      price: {
        // FIXED: Strips USD and any symbols, keeps only numbers
        value: row.price?.toString().replace(/[^0-9.]/g, '') || '0',
        currency: 'USD'
      },
      condition: row.condition || 'new',
      availability: row.availability || 'in stock',
      brand: row.brand || 'PromptVault USA',
      googleProductCategory: row.google_product_category || '5827',
      identifierExists: 'no',
      // ADDED: Free shipping required by GMC
      shipping: [{
        country: 'US',
        service: 'Standard',
        price: { value: '0', currency: 'USD' }
      }]
    };
    
    // REMOVED: salePrice block completely. Blank sale_price was killing approvals.
    
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
      }
    }
    
    console.log(`DONE: ${successCount}/${products.length} products synced to GMC`);
    if (successCount === 0) process.exit(1);
  });
