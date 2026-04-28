import { google } from 'googleapis';
import fs from 'fs';
import csv from 'csv-parser';

const merchantId = '5766495931';

// 90 countries list - South Korea (KR) strictly excluded
const TARGET_COUNTRIES = [
  'US','GB','CA','AU','DE','FR','IT','ES','NL','SE','NO','DK','FI','IE','NZ','AT','CH','BE','PT','PL',
  'CZ','HU','RO','GR','IL','AE','SA','SG','MY','TH','PH','ID','VN','JP','HK','TW','MX','BR','AR','CL',
  'CO','PE','ZA','EG','TR','UA','SK','SI','HR','BG','LT','LV','EE','LU','MT','CY','IS','LI','MC','SM',
  'VA','AD','BH','QA','KW','OM','JO','LB','MA','TN','DZ','KE','NG','GH','UG','TZ','ZM','BW','MU','RU',
  'IN','BD','PK','LK','NP','UZ','KZ','AZ','GE','AM','MD','BY','RS','ME','MK','AL','BA','XK','CR','PA'
];

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GMC_KEY),
  scopes: ['https://www.googleapis.com/auth/content']
});

const content = google.content({ version: 'v2.1', auth });
const productsToSync = [];

fs.createReadStream('gmc_products.csv')
  .pipe(csv())
  .on('data', (row) => {
    const clean = (val) => val?.toString().trim() || '';
    const offerId = clean(row.id);

    // Clean sale date: removes spaces around the "/" to satisfy GMC formatting
    const rawSaleDate = clean(row.sale_price_effective_date);
    const cleanSaleDate = rawSaleDate.replace(/\s/g, ''); 

    TARGET_COUNTRIES.forEach(country => {
      if (country === 'KR' || country === 'KP') return;

      productsToSync.push({
        offerId: offerId,
        title: clean(row.title),
        description: clean(row.description),
        link: clean(row.link),
        imageLink: clean(row.image_link),
        contentLanguage: 'en',
        targetCountry: country,
        channel: 'online',
        price: {
          value: clean(row.price).replace(/[^0-9.]/g, '') || '0',
          currency: 'USD'
        },
        // NEW: Added Sale Price logic
        salePrice: {
          value: clean(row.sale_price).replace(/[^0-9.]/g, '') || '0',
          currency: 'USD'
        },
        // NEW: Added Sale Price Effective Date
        salePriceEffectiveDate: cleanSaleDate,
        condition: clean(row.condition) || 'new',
        availability: clean(row.availability) || 'in stock',
        brand: clean(row.brand) || 'PromptVault USA',
        googleProductCategory: '5827', // Updated to your requested category
        identifierExists: 'no',
        shipping: [{
          country: country,
          service: 'Standard',
          price: { value: '0', currency: 'USD' }
        }]
      });
    });
  })
  .on('end', async () => {
    console.log(`🚀 Starting Batched Sync: ${productsToSync.length} listings (Excluding Korea)`);
    
    const BATCH_SIZE = 100;
    let successCount = 0;

    for (let i = 0; i < productsToSync.length; i += BATCH_SIZE) {
      const currentBatch = productsToSync.slice(i, i + BATCH_SIZE);
      
      const batchRequest = {
        entries: currentBatch.map((prod, index) => ({
          batchId: i + index,
          merchantId: merchantId,
          method: 'insert',
          product: prod
        }))
      };

      try {
        const response = await content.products.custombatch({
          requestBody: batchRequest
        });

        const entries = response.data.entries || [];
        const errors = entries.filter(e => e.errors);
        
        successCount += (entries.length - errors.length);
        
        if (errors.length > 0) {
          console.error(`❌ Batch Error (First item): ${errors[0].errors.errors[0].message}`);
        }

        console.log(`Progress: ${successCount}/${productsToSync.length} synced...`);
        
      } catch (err) {
        console.error(`Critical Batch Failure: ${err.message}`);
      }
    }

    console.log(`✅ DONE: ${successCount} listings successfully pushed with Sale Prices.`);
    if (successCount === 0) process.exit(1);
  });
