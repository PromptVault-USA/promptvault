const { google } = require('googleapis');
const fs = require('fs');

// 1. Initialize Content API
const content = google.content('v2.1');

async function syncToGMC() {
    try {
        // Load GMC Key from Environment (GitHub Secrets)
        const keyData = JSON.parse(process.env.GMC_KEY);
        
        const auth = new google.auth.JWT(
            keyData.client_email,
            null,
            keyData.private_key,
            ['https://www.googleapis.com/auth/content']
        );

        const merchantId = '5766495931'; // Replace this with your GMC ID
        const productsData = JSON.parse(fs.readFileSync('./products.json', 'utf8'));

        console.log(`🚀 Starting sync for ${productsData.length} products...`);

        for (const item of productsData) {
            const product = {
                offerId: item.id,
                title: item.name,
                description: item.desc,
                link: `https://promptvaultusa.shop/product.html?id=${item.id}`,
                imageLink: item.img,
                contentLanguage: 'en',
                targetCountry: 'US',
                channel: 'online',
                availability: 'in stock',
                condition: 'new',
                price: {
                    value: item.price.toString(),
                    currency: 'USD'
                }
            };

            await content.products.insert({
                auth,
                merchantId,
                resource: product
            });
            console.log(`✅ Synced: ${item.name}`);
        }
        
        console.log("🎉 All products synced successfully!");
    } catch (error) {
        console.error("❌ Sync Error:", error.message);
        process.exit(1);
    }
}

syncToGMC();
