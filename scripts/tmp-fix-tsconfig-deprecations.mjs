import fs from 'node:fs';
import path from 'node:path';

const packagesDir = 'packages';
const packages = fs.readdirSync(packagesDir);

for (const pkg of packages) {
  const tsconfigPath = path.join(packagesDir, pkg, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const content = fs.readFileSync(tsconfigPath, 'utf8');
    if (content.includes('"ignoreDeprecations": "5.0"')) {
      console.log(`Updating ${tsconfigPath} from 5.0 to 6.0`);
      const updated = content.replace('"ignoreDeprecations": "5.0"', '"ignoreDeprecations": "6.0"');
      fs.writeFileSync(tsconfigPath, updated);
    } else if (content.includes('"baseUrl"') && !content.includes('"ignoreDeprecations"')) {
       console.log(`Adding 6.0 to ${tsconfigPath}`);
       const updated = content.replace(/"baseUrl":/g, `"ignoreDeprecations": "6.0",\n    "baseUrl":`);
       fs.writeFileSync(tsconfigPath, updated);
    }
  }
}
