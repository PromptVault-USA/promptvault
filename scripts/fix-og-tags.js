import fs from 'fs';
import path from 'path';

const blogDir = path.join(process.cwd(), 'blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(blogDir, file);
  let html = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Extract the specific title from the page
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : 'PromptVault USA Intelligence';
  
  // FIX: Force a clean URL generation for this file (Strip .html entirely)
  const cleanSlug = file.replace(/\.html$/, '');
  const cleanUrl = `https://promptvaultusa.shop/blog/${cleanSlug}`;

  // 1. Enforce the Clean Canonical Tag
  const canonicalRegex = /<link[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/i;
  if (html.match(canonicalRegex)) {
    const currentCanonical = html.match(canonicalRegex)[1];
    // If the canonical currently points to .html, overwrite it
    if (currentCanonical !== cleanUrl) {
      html = html.replace(canonicalRegex, `<link rel="canonical" href="${cleanUrl}">`);
      modified = true;
    }
  } else {
    // If missing entirely, inject properly right before </head>
    html = html.replace('</head>', `  <link rel="canonical" href="${cleanUrl}">\n</head>`);
    modified = true;
  }

  // 2. Enforce or Update Clean OpenGraph Tags
  if (!html.includes('property="og:title"')) {
    const ogTags = `
    <meta property="og:type" content="article">
    <meta property="og:title" content="${title}">
    <meta property="og:url" content="${cleanUrl}">
    <meta property="og:image" content="https://promptvaultusa.shop/logo.png">
    <meta name="twitter:card" content="summary_large_image">`;

    html = html.replace('</head>', `${ogTags}\n</head>`);
    modified = true;
  } else {
    // Already has an OG URL, verify it doesn't have .html
    const ogUrlRegex = /<meta property="og:url" content="([^"]+)">/i;
    const match = html.match(ogUrlRegex);
    if (match && match[1].endsWith('.html')) {
       html = html.replace(ogUrlRegex, `<meta property="og:url" content="${cleanUrl}">`);
       modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, html);
    console.log(`✅ SEO Hardened: ${file} now securely uses clean URLs.`);
  }
});

console.log("All blog files successfully checked and updated!");
