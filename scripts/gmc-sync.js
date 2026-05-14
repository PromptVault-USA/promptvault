import fs from 'fs';
import csv from 'csv-parser';
import { google } from 'googleapis';

// 1. Service Account setup - Uses standard environment variables for Google APIs
let client_email = process.env.GOOGLE_CLIENT_EMAIL;
let private_key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (process.env.GMC_KEY) {
  try {
    const keyData = JSON.parse(process.env.GMC_KEY);
    client_email = keyData.client_email || client_email;
    private_key = keyData.private_key?.replace(/\\n/g, '\n') || private_key;
  } catch (err) {
    console.error("Failed to parse GMC_KEY json. Is it formatted correctly?");
  }
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email,
    private_key,
  },
  scopes: ['https://www.googleapis.com/auth/content'],
});

const MERCHANT_ID = process.env.MERCHANT_ID;
// Added multiple Target Countries as requested
const TARGET_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'ZA', 'SG', 'AE', 'SA', 'QA', 'BH', 'KW', 'OM', 'LB', 'JO', 'EG', 'PH', 'MY', 'IN', 'PK', 'BD', 'LK', 'NP', 'MV', 'MU', 'SC', 'FJ', 'PG', 'SB', 'VU', 'WS', 'TO', 'KI', 'TV', 'NR', 'MH', 'FM', 'PW'];

async function syncGMC() {
  if (!MERCHANT_ID || !client_email || !private_key) {
    console.error("Missing GMC environment variables. Ensure GMC_KEY (or GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY) and MERCHANT_ID are set.");
    process.exit(1);
  }

  const content = google.content({ version: 'v2.1', auth });
  const productsToSync = [];

  // Updated to read straight from products.csv instead of gmc_products.csv
  fs.createReadStream('products.csv')
    .pipe(csv())
    .on('data', (row) => {
      const clean = (val) => val?.toString().trim() || '';
      
      // Determine base offer ID from either gmc_id or id
      const baseOfferId = clean(row.gmc_id) || clean(row.id);

      const rawSaleDate = '2026-01-01T00:00:00-07:00/2026-12-31T23:59:59-07:00';
      const cleanSaleDate = rawSaleDate;

      TARGET_COUNTRIES.forEach(country => {
        if (country === 'KR' || country === 'KP') return;

        // ENSURES NO DUPLICATES: Unique ID per country
        const uniqueOfferId = `${baseOfferId}_${country.toLowerCase()}`;

        // Ensure images are absolute URLs (required by Google)
        let absoluteImage = clean(row.img);
        if (absoluteImage.startsWith('/')) {
          absoluteImage = `https://promptvaultusa.shop${absoluteImage}`;
        }

        productsToSync.push({
          offerId: uniqueOfferId,
          title: clean(row.name), // In products.csv this is 'name' 
          description: clean(row.desc), // In products.csv this is 'desc'
          link: `https://promptvaultusa.shop/vault/${clean(row.slug)}.html`,
          imageLink: absoluteImage,
          contentLanguage: 'en',
          targetCountry: country,
          feedLabel: country, 
          channel: 'online',
          availability: 'in stock',
          condition: 'new',
          price: {
            value: clean(row.price),
            currency: 'USD'
          },
          salePrice: {
            value: clean(row.sale_price),
            currency: 'USD'
          },
          salePriceEffectiveDate: cleanSaleDate,
          brand: 'PromptVault USA',
          googleProductCategory: '5827', 
          identifierExists: 'no',
          shipping: [{
            country: country,
            price: { value: '0.00', currency: 'USD' }
          }]
        });
      });
    })
    .on('end', async () => {
      console.log(`🚀 Starting Batched Sync: ${productsToSync.length} total listings for ID: ${MERCHANT_ID}`);
      
      const BATCH_SIZE = 100;
      for (let i = 0; i < productsToSync.length; i += BATCH_SIZE) {
        const batch = productsToSync.slice(i, i + BATCH_SIZE);
        
        const entries = batch.map((product, index) => ({
          batchId: i + index,
          merchantId: MERCHANT_ID,
          method: 'insert',
          product: product,
        }));

        try {
          const res = await content.products.custombatch({
            requestBody: { entries }
          });
          
          if (res.data.entries) {
            const errors = res.data.entries.filter(e => e.errors);
            if (errors.length > 0) {
              console.error(`⚠️ Batch Custom Error for ID ${errors[0].batchId}:`, errors[0].errors.errors[0].message);
            } else {
              console.log(`✅ Batch ${i/BATCH_SIZE + 1} synced successfully!`);
            }
          }
        } catch (err) {
          console.error('❌ Critical Batch Sync Failed:', err.message);
        }
      }
      console.log("🏁 Global Sync Operation Complete.");
    });
}

syncGMC();
