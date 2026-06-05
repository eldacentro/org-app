const fs = require('fs');
const glob = require('glob');

const textToRemove = " (Antes de activarla, asegúrate de que el uso de aplicaciones en línea para almacenar registros no confidenciales esté aprobado para el territorio de tu sucursal)";

glob("src/locales/**/*.json", (err, files) => {
  if (err) throw err;
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(textToRemove)) {
      content = content.replace(textToRemove, "");
      fs.writeFileSync(file, content, 'utf8');
      console.log("Updated", file);
    }
  });
});
