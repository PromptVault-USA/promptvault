const fs = require('fs');
const { TwitterApi } = require('twitter-api-v2');
const axios = require('axios');

async function main() {
  try {
    // 1. Pick a random product from products.json
    const rawData = fs.readFileSync('products.json', 'utf-8');
    const products = JSON.parse(rawData);
    // Filter out anything broken, then pick random
    const validProducts = products.filter(p => p.id || p.ID);
    const randomProduct = validProducts[Math.floor(Math.random() * validProducts.length)];

    // Grab product details
    const name = randomProduct.name || randomProduct.Title || randomProduct.title || "Premium AI Prompt Pack";
    const desc = randomProduct.description || randomProduct.Description || "Supercharge your workflow with our expertly crafted AI prompts.";
    const id = randomProduct.id || randomProduct.ID || "";
    
    // Create the Link and Image
    const url = `https://promptvaultusa.shop/vault.html?id=${id}`;
    const imageUrl = "https://promptvaultusa.shop/og-image.jpg"; // Default banner image

    console.log(`Selected Product for Post: ${name}`);

    // 2. TWITTER POST
    if (process.env.TWITTER_API_KEY) {
      const twitterClient = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
      });

      const tweetText = `Unlock the power of AI! 🚀\n\n${name}\n\n📝 ${desc.slice(0, 80)}...\n\nGrab it here: ${url}\n\n#ChatGPT #PromptEngineering #AI`;
      
      await twitterClient.v2.tweet(tweetText);
      console.log("✅ Successfully posted to Twitter!");
    } else {
      console.log("⏭️ Skipping Twitter (No API Keys found)");
    }

    // 3. PINTEREST POST
    if (process.env.PINTEREST_ACCESS_TOKEN) {
      const boardId = process.env.PINTEREST_BOARD_ID;
      await axios.post('https://api.pinterest.com/v5/pins', {
        board_id: boardId,
        title: name,
        description: `${desc}\n\nGet the prompts here: ${url} #PromptVaultUSA #AIPrompts`,
        link: url,
        media_source: {
          source_type: "image_url",
          url: imageUrl
        }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log("✅ Successfully posted to Pinterest!");
    } else {
      console.log("⏭️ Skipping Pinterest (No Access Token found)");
    }

  } catch (error) {
    console.error("❌ Error:", error.response ? JSON.stringify(error.response.data) : error.message);
  }
}

main();
