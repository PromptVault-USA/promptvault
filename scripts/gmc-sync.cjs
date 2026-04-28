import { google } from 'googleapis';
import fs from 'fs';
import { parse } from 'csv-parse';

const GMC_KEY = process.env.GMC_KEY;
const MERCHANT_ID = process.env.MERCHANT_ID;

if (!GMC_KEY) {
  throw new Error('GMC_KEY environment variable is required');
}

if (!MERCHANT_ID) {
  throw new Error('MERCHANT_ID environment variable is required');
}

const key = JSON.parse(GMC_KEY);

const auth = new google.auth.GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/content'],
});

google.options({ auth });

const content = google.content('v2.1');

function buildProductUrl(slug) {
  return `https://promptvaultusa.shop/vault/${encodeURIComponent(slug)}.html`;
}

function normalizeImageLink(imagePath) {
  if (!imagePath) return 'https://promptvaultusa.com/assets/images/default.png';
  return imagePath.startsWith('http')
    ? imagePath
    : `https://promptvaultusa.com${imagePath}`;
}

async function parseProductsCsv() {
  const csvData = fs.readFileSync('products.csv', 'utf8');
  const records = [];

  await new Promise((resolve, reject) => {
    parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
      .on('data', (record) => records.push(record))
      .on('end', resolve)
      .on('error', reject);
  });

  return records;
}

async function syncProduct() {
  const products = await parseProductsCsv();
  const productData = products.find((record) => record.gmc_id === 'PV005' || record.id === 'PV005');

  if (!productData) {
    throw new Error('Product with id PV005 not found in products.csv');
  }

  const slug = String(productData.slug || productData.name || 'pv005').trim();
  const product = {
    offerId: String(productData.gmc_id || productData.id).trim(),
    title: String(productData.name || '').trim(),
    description: String(productData.desc || '').trim(),
    link: buildProductUrl(slug),
    imageLink: normalizeImageLink(String(productData.img || '').trim()),
    contentLanguage: 'en',
    targetCountry: 'US',
    channel: 'online',
    availability: 'in stock',
    condition: 'new',
    googleProductCategory: 'Software > Digital Goods',
    brand: 'PromptVault USA',
    price: {
      currency: 'USD',
      value: String(productData.sale_price || productData.price || '0.00'),
    },
  };

  await content.accounts.products.insert({
    merchantId: String(MERCHANT_ID).trim(),
    requestBody: product,
  });

  console.log('TEST PASS: Old key works. PV005 synced');
}

syncProduct().catch((error) => {
  console.error('TEST FAIL:', error?.message || String(error));
  process.exit(1);
});
