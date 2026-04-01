/* eslint-env node */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'dist');

function findDtsFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      findDtsFiles(filePath, fileList);
    } else if (file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const dtsFiles = findDtsFiles(distDir);

for (const file of dtsFiles) {
  let content = readFileSync(file, 'utf-8');
  const originalContent = content;
  
  content = content.replace(/from ['"]@\/([^'"]+)['"]/g, (match) => {
    const fileDir = dirname(file);
    const relativePath = fileDir.replace(distDir, '').replace(/\\/g, '/');
    const depth = relativePath ? (relativePath.match(/\//g) || []).length : 0;
    const prefix = depth > 0 ? '../'.repeat(depth) : './';
    return match.replace('@/', prefix);
  });
  
  if (content !== originalContent) {
    writeFileSync(file, content, 'utf-8');
    console.log(`Fixed: ${file.replace(distDir, '')}`);
  }
}

