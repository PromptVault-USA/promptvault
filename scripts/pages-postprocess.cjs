/*
Rewrites absolute-root asset paths ("/assets/...", "/css/...", etc.) so they work on
GitHub Project Pages served under /<repo-name>/.

Usage (in site-build.yml, after building to dist/):
  node scripts/pages-postprocess.js dist <repoName>
*/

const fs = require("fs");
const path = require("path");

const distDir = process.argv[2] || "dist";
const repoName = process.argv[3];

if (!repoName) {
  console.error(
    "Missing repo name. Usage: node scripts/pages-postprocess.js <distDir> <repoName>",
  );
  process.exit(1);
}

const prefix = `/${repoName}/`;

function walk(dir) {
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

  // Fix Markdown links pasted into HTML attributes (Gemini copy/paste issue)
  // href="[https://a.com/x](https://a.com/x)" -> href="https://a.com/x"
  // src="[/css/style.css](https://a.com/css/style.css)" -> src="/css/style.css"
  s = s.replace(
    /(\b(?:href|src|content)=)"\[(\/[^\]]*?)\]\([^)]+\)"/g,
    '$1"$2"',
  );
  s = s.replace(
    /(\b(?:href|src|content)=)"\[(https?:\/\/[^\]]+)\]\(\2\)"/g,
    '$1"$2"',
  );

  // Replace occurrences of href="/..." src="/..." content="/..." and url(/...) etc.
  // Avoid touching protocol-relative URLs ("//example.com")
  // and existing prefixed paths ("/<repo>/...").
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

walk(distDir);
