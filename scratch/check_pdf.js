const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
  const pdfBytes = fs.readFileSync('public/pdf/S-13_S.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();
  console.log('Size:', width, height);
})();
