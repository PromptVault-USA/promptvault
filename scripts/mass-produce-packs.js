import { GoogleGenAI } from "@google/genai";
import { mdToPdf } from 'md-to-pdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUTPUT_DIR_MD = path.join(ROOT, "generated_packs_md");
const OUTPUT_DIR_PDF = path.join(ROOT, "generated_packs_pdf");

if (!fs.existsSync(OUTPUT_DIR_MD)) fs.mkdirSync(OUTPUT_DIR_MD, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR_PDF)) fs.mkdirSync(OUTPUT_DIR_PDF, { recursive: true });

// Read the CSV file
const CSV_PATH = path.join(ROOT, "products.csv");
const rawCsv = fs.readFileSync(CSV_PATH, "utf8").split('\n');

const packs = [];
for (let i = 1; i < rawCsv.length; i++) {
  if (!rawCsv[i].trim()) continue;
  
  let row = rawCsv[i];
  let cols = [];
  let current = "";
  let inQuotes = false;
  
  for (let c = 0; c < row.length; c++) {
    if (row[c] === '"') {
      if (inQuotes && row[c+1] === '"') {
        current += '"';
        c++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (row[c] === ',' && !inQuotes) {
      cols.push(current);
      current = "";
    } else {
      current += row[c];
    }
  }
  cols.push(current);
  
  if (cols.length >= 8 && cols[0].startsWith('PV')) {
     const slug = cols[2];
     const title = cols[3];
     const category = cols[6];
     const desc = cols[7];
     
     if (category.trim() === "Prompt Pack") {
       packs.push({ slug, title, desc, category });
     }
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateSinglePack(pack) {
  const mdPath = path.join(OUTPUT_DIR_MD, pack.slug + ".md");
  const pdfPath = path.join(OUTPUT_DIR_PDF, pack.slug + ".pdf");
  
  if (fs.existsSync(pdfPath)) {
    console.log(`[SKIP] PDF already exists for: ${pack.title}`);
    return;
  }

  console.log(`[GENERATE] Starting: ${pack.title}...`);

  try {
    let mdContent = "";
    if (fs.existsSync(mdPath)) {
      mdContent = fs.readFileSync(mdPath, "utf8");
    } else {
      const prompt = `You are an expert prompt engineer and creator of premium digital learning products.
Generate a high-quality 5-10 page "Prompt Pack" formatting exclusively in Markdown.
Product Title: "${pack.title}"
Category: "${pack.category}"
Description: "${pack.desc}"

Provide:
1. An eye-catching Title Header that clearly states "100+ Prompts included"
2. Introduction & Best Practices
3. Exactly 100 premium copy-paste prompts organized logically. Provide placeholders like [Insert Niche]. For example, number them 1 to 100.
4. Conclusion & Next Steps

Formatting rules: Use clean Markdown (Headers, bullet points, code blocks for the prompts). Do NOT output conversational intro/outro wrappers (like "Here is your pack..."). Only output the raw document.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // You can change this to 'gemini-1.5-flash' if you want to use the free tier model
        contents: prompt,
        config: { temperature: 0.7 }
      });
      
      mdContent = response.text || "";
      mdContent = mdContent.replace(/^[\`]{3}markdown\n/, "").replace(/\n[\`]{3}$/, "");
      
      fs.writeFileSync(mdPath, mdContent, "utf8");
    }

    const pdf = await mdToPdf({ content: mdContent }, {
      dest: pdfPath,
      pdf_options: { format: 'A4', margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' } }
    });
    
    if (pdf) {
      console.log(`[SUCCESS] => ${pack.slug}.pdf generated successfully!`);
    }
  } catch (error) {
    console.error(`[ERROR] Failed on ${pack.title}:\n***error***:"***code":${error.status || 'unknown'},"message":"${error.message}"\n`);
  }
}

async function start() {
  console.log(`Found ${packs.length} custom prompt packs to process from products.csv.`);
  
  if(!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY is not defined in the environment.");
      process.exit(1);
  }

  for (let i = 0; i < packs.length; i++) {
    console.log(`\n--- Progress: ${i+1} / ${packs.length} ---`);
    await generateSinglePack(packs[i]);
    // Added a longer delay (10 seconds) to help prevent rate-limiting and quota blocks
    await sleep(10000); 
  }
  
  console.log("\n🎉 All PDFs generated in 'generated_packs_pdf'!");
}

start();
