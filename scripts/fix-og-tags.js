const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, '../blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(blogDir, file);
  let html = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Extract the specific title from the page
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const title = titleMatch ? titleMatch[1] : 'PromptVault USA Intelligence';

  // If the file is missing the OpenGraph SEO tags, auto-inject them
  if (!html.includes('property="og:title"')) {
    const ogTags = `
    <meta property="og:type" content="article">
    <meta property="og:title" content="${title}">
    <meta property="og:url" content="https://promptvaultusa.shop/blog/${file}">
    <meta property="og:image" content="https://promptvaultusa.shop/logo.png">
    <meta name="twitter:card" content="summary_large_image">`;

    // Inject them right before the </head> tag closes
    html = html.replace('</head>', `${ogTags}\n</head>`);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, html);
    console.log(`Updated SEO OG tags in ${file}`);
  }
});
console.log("All blog files successfully checked and updated!");
