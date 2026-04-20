import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['CardGamePreviewSurface.css', 'CardGameDesignStudioWorkbench.css'];

await mkdir(resolve(root, 'dist'), { recursive: true });

for (const file of files) {
  const source = resolve(root, 'src', file);
  const target = resolve(root, 'dist', file);
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target);
}
