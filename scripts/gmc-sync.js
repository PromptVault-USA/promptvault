import fs from 'fs';
import csv from 'csv-parser';
import { google } from 'googleapis';

const MERCHANT_ID = process.env.MERCHANT_ID;
const TARGET_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'ZA', 'SG', 'AE', 'SA', 'QA', 'BH', 'KW', 'OM', 'LB', 'JO', 'EG', 'PH', 'MY', 'IN', 'PK', 'BD', 'LK', 'NP', 'MV', 'MU', 'SC', 'FJ', 'PG', 'SB', 'VU', 'WS', 'TO', 'KI', 'TV', 'NR', 'MH', 'FM', 'PW'];

async function syncGMC() {
  let clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  // Try to use GMC_KEY JSON string if provided
  if (!clientEmail && process.env.GMC_KEY) {
    try {
      const keyData = JSON.parse(process.env.GMC_KEY);
      clientEmail = keyData.client_email;
      privateKey = keyData.private_key;
    } catch (e) {
      console.warn("Could not parse GMC_KEY as JSON.");
    }
  }

  // Gracefully skip instead of crashing the site build
  if (!MERCHANT_ID || !privateKey || !clientEmail) {
    console.warn("⚠️ GMC sync skipped: Missing GMC environment variables in GitHub Secrets.");
    console.warn("Website build will continue normally...");
    return; // Returning instead of process.exit(1) prevents the build from crashing
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/content'],
  });

  const content = google.content({ version: 'v2.1', auth });
  const productsToSync = [];

  fs.createReadStream('products.csv')
    .pipe(csv())
    .on('data', (row) => {
      const clean = (val) => val?.toString().trim() || '';
      
      const baseOfferId = clean(row.gmc_id) || clean(row.id);
      const cleanSaleDate = '2026-01-01T00:00:00-07:00/2026-12-31T23:59:59-07:00';

      TARGET_COUNTRIES.forEach(country => {
        if (country === 'KR' || country === 'KP') return;

        const uniqueOfferId = `${baseOfferId}_${country.toLowerCase()}`;

        let absoluteImage = clean(row.img);
        if (absoluteImage.startsWith('/')) {
          absoluteImage = `https://promptvaultusa.shop${absoluteImage}`;
        }

        productsToSync.push({
          offerId: uniqueOfferId,
          title: clean(row.name), 
          description: clean(row.desc), 
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
