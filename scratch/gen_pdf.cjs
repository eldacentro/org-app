const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');

async function run() {
  const templateBytes = fs.readFileSync('public/pdf/S-13_S.pdf');
  const doc = await PDFDocument.create();
  const baseDoc = await PDFDocument.load(templateBytes);
  const font = await doc.embedFont('Helvetica');
  const fontBold = await doc.embedFont('Helvetica-Bold');
  
  const [pageTemplate] = await doc.copyPages(baseDoc, [0]);
  const page = doc.addPage(pageTemplate);
  
  const ROW_START_Y = 697.5;
  const ROW_HEIGHT = 31.75;
  const COL_DATE_X = 105;
  const BASELINE_TOP = 11;
  const textColor = rgb(0, 0, 0);

  const drawCentered = (text, xPos, yPos, fontSize, fnt = font) => {
    if (!text) return;
    const textWidth = fnt.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: xPos - textWidth / 2,
      y: yPos,
      size: fontSize,
      font: fnt,
      color: textColor,
    });
  };

  for(let i=0; i<20; i++) {
    const rowY = ROW_START_Y - i * ROW_HEIGHT;
    drawCentered(`12-12-2025`, COL_DATE_X, rowY - BASELINE_TOP, 8);
  }

  const pdfBytes = await doc.save();
  fs.writeFileSync('scratch/test.pdf', pdfBytes);
}
run();
