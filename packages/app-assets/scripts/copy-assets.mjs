import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const packageRoot = resolve(dirname(scriptPath), '..');
const srcDir = resolve(packageRoot, 'src', 'images');
const distDir = resolve(packageRoot, 'dist', 'images');

if (existsSync(srcDir)) {
  mkdirSync(distDir, { recursive: true });
  cpSync(srcDir, distDir, { recursive: true });
}
