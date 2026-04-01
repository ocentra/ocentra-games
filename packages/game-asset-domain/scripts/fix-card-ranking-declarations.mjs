import fs from 'fs';
import path from 'path';

const declarationPath = path.join(process.cwd(), 'dist', 'card', 'cardRanking', 'CardRanking.d.ts');

if (!fs.existsSync(declarationPath)) {
  process.exit(0);
}

const content = fs.readFileSync(declarationPath, 'utf8');
const fixed = content.replace(/\n\}\nedAsset>;\n\}\s*$/, '\n}\n');

if (fixed !== content) {
  fs.writeFileSync(declarationPath, fixed);
}
