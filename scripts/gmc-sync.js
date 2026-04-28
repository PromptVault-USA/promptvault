import { google } from 'googleapis';

const GMC_KEY = process.env.GMC_KEY;
const MERCHANT_ID = '5766495931';
const SHEET_ID = '10635319032';
const SHEET_NAME = 'PRODUCTS SOURCE 3';

if (!GMC_KEY) {
  throw new Error('GMC_KEY environment variable is required');
}

const key = JSON.parse(GMC_KEY);

const auth = new google.auth.GoogleAuth({
  credentials: key,
  scopes: [
    'https://www.googleapis.com/auth/content',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ],
});

google.options({ auth });

const content = google.content('v2.1');
const sheets = google.sheets('v4');

async function getProductsFromSheet() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'${SHEET_NAME}'!A:O`,
    });

    const [headerRow, ...dataRows] = response.data.values || [];

    if (!headerRow) {
      throw new Error(`No data found in sheet ${SHEET_NAME}`);
    }

    const columnMap = {
      id: headerRow.indexOf('id'),
      title: headerRow.indexOf('title'),
      description: headerRow.indexOf('description'),
      link: headerRow.indexOf('link'),
      image_link: headerRow.indexOf('image_link'),
      price: headerRow.indexOf('price'),
      availability: headerRow.indexOf('availability'),
      brand: headerRow.indexOf('brand'),
      gtin: headerRow.indexOf('gtin'),
      mpn: headerRow.indexOf('mpn'),
      condition: headerRow.indexOf('condition'),
      google_product_category: headerRow.indexOf('google_product_category'),
      product_type: headerRow.indexOf('product_type'),
      shipping: headerRow.indexOf('shipping'),
      tax: headerRow.indexOf('tax'),
    };

    const products = dataRows
      .filter((row) => row.length > 0 && row[columnMap.id])
      .map((row) => ({
        id: String(row[columnMap.id] || '').trim(),
        title: String(row[columnMap.title] || '').trim(),
        description: String(row[columnMap.description] || '').trim(),
        link: String(row[columnMap.link] || '').trim(),
        image_link: String(row[columnMap.image_link] || '').trim(),
        price: String(row[columnMap.price] || '').trim(),
        availability: String(row[columnMap.availability] || '').trim(),
        brand: String(row[columnMap.brand] || '').trim(),
        gtin: String(row[columnMap.gtin] || '').trim(),
        mpn: String(row[columnMap.mpn] || '').trim(),
        condition: String(row[columnMap.condition] || '').trim(),
        google_product_category: String(row[columnMap.google_product_category] || '').trim(),
        product_type: String(row[columnMap.product_type] || '').trim(),
        shipping: String(row[columnMap.shipping] || '').trim(),
        tax: String(row[columnMap.tax] || '').trim(),
      }));

    return products;
  } catch (error) {
    throw new Error(`Failed to read products from sheet: ${error.message}`);
  }
}

async function syncProducts() {
  const products = await getProductsFromSheet();

  if (products.length === 0) {
    throw new Error('No products found in sheet');
  }

  for (const productData of products) {
    const product = {
      offerId: productData.id,
      title: productData.title,
      description: productData.description,
      link: productData.link,
      imageLink: productData.image_link,
      contentLanguage: 'en',
      targetCountry: 'US',
      channel: 'online',
      availability: productData.availability,
      condition: productData.condition,
      googleProductCategory: productData.google_product_category,
      brand: productData.brand,
      price: {
        currency: 'USD',
        value: productData.price,
      },
    };

    if (productData.gtin) {
      product.gtin = productData.gtin;
    }
    if (productData.mpn) {
      product.mpn = productData.mpn;
    }
    if (productData.product_type) {
      product.productType = productData.product_type;
    }
    if (productData.shipping) {
      product.shipping = [JSON.parse(productData.shipping)];
    }
    if (productData.tax) {
      product.taxes = [JSON.parse(productData.tax)];
    }

    await content.accounts.products.insert({
      merchantId: MERCHANT_ID,
      requestBody: product,
    });

    console.log(`SYNCED: ${productData.id} - ${productData.title}`);
  }
}

syncProducts().catch((error) => {
  console.error('Error:', error?.message || String(error));
  process.exit(1);
});
