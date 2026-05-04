import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUTPUT_DIR_PDF = path.join(ROOT, "generated_packs_pdf");
const CSV_PATH = path.join(ROOT, "products.csv");

// Load Secrets from Environment Variables (Passed by GitHub Actions)
const GDRIVE_CREDENTIALS = process.env.GDRIVE_CREDENTIALS;
const GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID;

if (!GDRIVE_CREDENTIALS || !GDRIVE_FOLDER_ID) {
  console.error("Missing GDRIVE_CREDENTIALS or GDRIVE_FOLDER_ID environment variables.");
  process.exit(1);
}

// Parse Credentials
const credentials = JSON.parse(GDRIVE_CREDENTIALS);

// Authenticate Google Drive
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});
const drive = google.drive({ version: 'v3', auth });

async function uploadFile(filePath, fileName) {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [GDRIVE_FOLDER_ID]
    };
    const media = {
      mimeType: 'application/pdf',
      body: fs.createReadStream(filePath)
    };
    
    // Upload the file
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });
    
    // Change permissions so anyone with the link can view it
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    return file.data.webViewLink;
  } catch (error) {
    console.error(`Error uploading ${fileName}:`, error.message);
    return null;
  }
}

async function start() {
  console.log("Starting upload to Google Drive...");
  
  if (!fs.existsSync(CSV_PATH)) {
      console.error("products.csv not found!");
      return;
  }

  // Read the CSV
  const rawCsv = fs.readFileSync(CSV_PATH, "utf8").split('\n');
  const updatedCsvLines = [rawCsv[0]]; // Keep header
  let updatedCount = 0;

  for (let i = 1; i < rawCsv.length; i++) {
    if (!rawCsv[i].trim()) continue;
    
    // Parse CSV line handling quotes properly
    let row = rawCsv[i];
    let cols = [];
    let current = "";
    let inQuotes = false;
    
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '"') {
        if (inQuotes && c + 1 < row.length && row[c+1] === '"') {
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
    
    // Pad array to ensure we have exactly 11 columns (up to drivelink)
    while(cols.length < 11) {
        cols.push("");
    }

    const slug = cols[2];
    const category = cols[6];
    let drivelink = cols[10]?.trim();
    
    // If it's a Prompt Pack and doesn't have a drivelink yet
    if (category?.trim() === "Prompt Pack" && !drivelink) {
      const pdfPath = path.join(OUTPUT_DIR_PDF, slug + ".pdf");
      
      if (fs.existsSync(pdfPath)) {
        console.log(`Uploading ${slug}.pdf to Drive...`);
        const link = await uploadFile(pdfPath, slug + ".pdf");
        
        if (link) {
          cols[10] = link;
          console.log(`Success! Drive link added for ${slug}`);
          updatedCount++;
        }
      }
    }
    
    // Reconstruct CSV line for writing back to save format
    const newLine = cols.map(col => {
      // If column contains comma, quote or newline, wrap in quotes
      if (col.includes(',') || col.includes('"') || col.includes('\n')) {
          return '"' + col.replace(/"/g, '""') + '"';
      }
      return col;
    }).join(',');
    
    updatedCsvLines.push(newLine);
  }
  
  // Write back to CSV
  fs.writeFileSync(CSV_PATH, updatedCsvLines.join('\n') + '\n', 'utf8');
  console.log(`\nFinished! Added ${updatedCount} Drive links to products.csv.`);
}

start();
