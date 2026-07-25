const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function measure() {
  const bytes = fs.readFileSync('public/pdf/S-13_S.pdf');
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const { width, height } = page.getSize();
  console.log(`Page size: ${width} x ${height}`);
  
  // We can't easily extract line coordinates with pdf-lib.
  // Let's use pdf2json or pdfjs-dist if available, or just guess based on trial and error.
}
measure();
