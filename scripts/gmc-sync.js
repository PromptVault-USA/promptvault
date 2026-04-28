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
fs.createReadStream('products.csv')
  .pipe(csv())
    .on('data', (row) => {
            const gmcProduct = {
                      offerId: row.id,
                            title: row.name || row.title,
                                  description: row.desc || row.description,
                                        link: row.link,
                                              imageLink: row.img || row.image_link,
                                                    contentLanguage: 'en',
                                                          targetCountry: 'US',
                                                                channel: 'online',
                                                                      price: {
                                                                                value: row.price?.replace('$', '').replace(',', '') || '0',
                                                                                        currency: 'USD'
                                                                      },
                                                                            condition: row.condition || 'new',
                                                                                  availability: row.availability || 'in stock',
                                                                                        brand: row.brand || 'PromptVault USA',
                                                                                              googleProductCategory: row.google_product_category || row.category || '5827',
                                                                                                    identifierExists: row.identifier_exists || 'no'
            };
                
                    if (row.sale_price && row.sale_price !== '') {
                              gmcProduct.salePrice = {
                                        value: row.sale_price.replace('$', '').replace(',', ''),
                                                currency: 'USD'
                                      };
                    }
                        
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

