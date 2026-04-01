import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const distDir = resolve(dirname(scriptPath), '..', 'dist');

function walk(currentDir) {
  for (const entry of readdirSync(currentDir)) {
    const fullPath = join(currentDir, entry);
    if (statSync(fullPath).isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!fullPath.endsWith('.js')) {
      continue;
    }
    const next = readFileSync(fullPath, 'utf8')
      .replaceAll('.png.js', '.png')
      .replaceAll('.jpg.js', '.jpg')
      .replaceAll('.jpeg.js', '.jpeg')
      .replaceAll('.gif.js', '.gif')
      .replaceAll('.webp.js', '.webp')
      .replaceAll('.svg.js', '.svg')
      .replaceAll('.avif.js', '.avif');
    writeFileSync(fullPath, next, 'utf8');
  }
}

walk(distDir);
