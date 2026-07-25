const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
async function run() {
  const bytes = fs.readFileSync('public/pdf/S-13_S.pdf');
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  
  // Try to read page operators to find exact line Y coordinates
  // Or simply output a test PDF with 31.75
  console.log("Page height:", page.getHeight());
}
run();
