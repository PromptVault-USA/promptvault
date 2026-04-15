const { google } = require('googleapis');
const fs = require('fs');

// 1. Initialize Content API
const content = google.content('v2.1');

async function syncToGMC() {
    try {
        // Load GMC Key from Environment (GitHub Secrets)
        if (!process.env.GMC_KEY) {
            throw new Error("GMC_KEY secret is missing in GitHub Actions.");
        }
        
        const keyData = JSON.parse(process.env.GMC_KEY);
        
        const auth = new google.auth.JWT(
            keyData.client_email,
            null,
            keyData.private_key,
            ['https://www.googleapis.com/auth/content']
        );

        const merchantId = '5766495931'; 
        const productsData = JSON.parse(fs.readFileSync('./products.json', 'utf8'));

        console.log(`🚀 Starting sync for ${productsData.length} products to GMC...`);

        for (const item of productsData) {
            // FIX: Generate the slug to match your individual HTML file names
            const slug = item.name.toLowerCase().trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-');

            const product = {
                offerId: item.id, // e.g., niche_001
                title: item.name,
                description: item.desc || "Professional AI prompt engineering and digital asset vault.",
                // FIX: Points to the actual file location in your /vault/ folder
                link: `https://promptvaultusa.shop/vault/${slug}.html`,
                imageLink: item.img, // Your Firebase Storage URL
                contentLanguage: 'en',
                targetCountry: 'US',
                feedLabel: 'US',
                channel: 'online',
                availability: 'in stock',
                condition: 'new',
                googleProductCategory: 'Software > Digital Goods',
                price: {
                    value: item.price.toString(),
                    currency: 'USD'
                }
            };

            // Using .insert to create or fully replace the product data
            await content.products.insert({
                auth,
                merchantId,
                resource: product
            });
            
            console.log(`✅ Synced & Linked: ${item.name} -> /vault/${slug}.html`);
        }
        
        console.log("🎉 All products synchronized successfully!");
    } catch (error) {
        console.error("❌ Sync Error:", error.message);
        process.exit(1);
    }
}

syncToGMC();
