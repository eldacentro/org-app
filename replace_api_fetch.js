const fs = require('fs');
const path = require('path');

const dir = 'src/services/api';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'common.ts');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('await fetch(')) {
    content = content.replace(/await fetch\(/g, 'await apiFetch(');
    
    if (content.includes('import { apiDefault } from \'./common\';')) {
      content = content.replace('import { apiDefault } from \'./common\';', 'import { apiDefault, apiFetch } from \'./common\';');
    } else if (content.includes('import { apiDefault }')) {
      content = content.replace('import { apiDefault }', 'import { apiDefault, apiFetch }');
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
