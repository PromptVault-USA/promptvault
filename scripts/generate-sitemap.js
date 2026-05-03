import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const VAULT_DIR = path.join(ROOT, "vault");
const BLOG_DIR = path.join(ROOT, "blog");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");

const BASE_URL = "https://promptvaultusa.shop";

function getFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  // Gather all generated html pages but exclude index
  return fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html');
}

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Core Pages
  const mainPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/vault", priority: "0.9", changefreq: "daily" },
    { loc: "/blog", priority: "0.8", changefreq: "daily" },
    { loc: "/library", priority: "0.8", changefreq: "weekly" },
    { loc: "/claim", priority: "0.6", changefreq: "weekly" },
    { loc: "/legal", priority: "0.5", changefreq: "monthly" }
  ];

  mainPages.forEach(p => {
    xml += `  <url><loc>${BASE_URL}${p.loc}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>\n`;
  });

  xml += `\n  <!-- DYNAMIC VAULT PAGES -->\n`;
  const vaultFiles = getFiles(VAULT_DIR);
  vaultFiles.forEach(file => {
    // We strip the .html extension for clean URLs
    const cleanUrl = `/vault/${file.replace('.html', '')}`;
    xml += `  <url><loc>${BASE_URL}${cleanUrl}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>\n`;
  });

  xml += `\n  <!-- DYNAMIC BLOG PAGES -->\n`;
  const blogFiles = getFiles(BLOG_DIR);
  blogFiles.forEach(file => {
    // We strip the .html extension for clean URLs
    const cleanUrl = `/blog/${file.replace('.html', '')}`;
    xml += `  <url><loc>${BASE_URL}${cleanUrl}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
  });

  xml += `</urlset>`;
  
  // Overwrite the sitemap.xml in the root directory before the final copy to dist
  fs.writeFileSync(SITEMAP_PATH, xml, "utf8");
  console.log(`[sitemap] ✅ Generated sitemap.xml with ${mainPages.length + vaultFiles.length + blogFiles.length} total URLs.`);
}

generateSitemap();
