import { google } from 'googleapis';
import fs from 'fs';
import csv from 'csv-parser';

const GMC_KEY = process.env.GMC_KEY;
const MERCHANT_ID = '5766495931';
const CSV_PATH = './products.csv';

if (!GMC_KEY) {
  throw new Error('GMC_KEY environment variable is required');
}

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(GMC_KEY),
  scopes: ['https://www.googleapis.com/auth/content'],
});

const content = google.content({ version: 'v2.1', auth });

async function parseProductsCsv() {
  return new Promise((resolve, reject) => {
    const records = [];

    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (record) => records.push(record))
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

async function syncProducts() {
  const products = await parseProductsCsv();

  if (products.length === 0) {
    throw new Error('No products found in CSV');
  }

  for (const row of products) {
    const product = {
      ...row,
      offerId: String(row.id || row.offerId || '').trim(),
      title: String(row.title || '').trim(),
      description: String(row.description || '').trim(),
      link: String(row.link || '').trim(),
      imageLink: String(row.image_link || row.imageLink || '').trim(),
      contentLanguage: row.contentLanguage || 'en',
      targetCountry: row.targetCountry || 'US',
      channel: row.channel || 'online',
      price: {
        currency: 'USD',
        value: String(row.price || '0.00').trim(),
      },
      condition: row.condition || 'new',
      availability: row.availability || 'in stock',
      brand: row.brand || 'PromptVault USA',
      identifier_exists: row.identifier_exists || 'no',
      google_product_category: row.google_product_category || '5827',
    };

    await content.accounts.products.insert({
      merchantId: MERCHANT_ID,
      requestBody: product,
    });

    console.log(`SYNCED: ${row.id || row.offerId || 'unknown'} - ${row.title || 'untitled'}`);
  }
}

syncProducts().catch((error) => {
  console.error('Error:', error?.message || String(error));
  process.exit(1);
});
