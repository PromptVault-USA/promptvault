/**
 * scripts/pages-postprocess.js (ES Module)
 * Rewrites absolute-root asset paths for GitHub Project Pages.
 * * Usage: node scripts/pages-postprocess.js dist <repoName>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = process.argv[2] || "dist";
const repoName = process.argv[3];

if (!repoName) {
  console.error(
    "❌ Missing repo name. Usage: node scripts/pages-postprocess.js <distDir> <repoName>",
  );
  process.exit(1);
}

const prefix = `/${repoName}/`;

function walk(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️ Directory not found: ${dir}`);
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else rewriteFile(full);
  }
}

function rewriteFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (![".html", ".css", ".js", ".xml", ".json", ".txt"].includes(ext)) return;

  let s = fs.readFileSync(filePath, "utf8");

  // Fix Markdown links pasted into HTML attributes
  s = s.replace(
    /(\b(?:href|src|content)=)"\[(\/[^\]]*?)\]\([^)]+\)"/g,
    '$1"$2"',
  );
  s = s.replace(
    /(\b(?:href|src|content)=)"\[(https?:\/\/[^\]]+)\]\(\2\)"/g,
    '$1"$2"',
  );

  // Replace occurrences of href="/..." etc.
  const repoEsc = escapeRegExp(repoName);

  s = s
    .replace(
      new RegExp(`(href="|src="|content=")(\\/)(?!\\/)(?!${repoEsc}\\/)`, "g"),
      `$1${prefix}`,
    )
    .replace(
      new RegExp(`url\\((['"]?)(\\/)(?!\\/)(?!${repoEsc}\\/)`, "g"),
      `url($1${prefix}`,
    );

  fs.writeFileSync(filePath, s, "utf8");
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

console.log(`🚀 Post-processing ${distDir} for repo: ${repoName}...`);
walk(distDir);
console.log("✅ Post-processing complete.");
