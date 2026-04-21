import { cp, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(root, 'src');

await mkdir(resolve(root, 'dist'), { recursive: true });

async function copyCssFiles(sourceDir) {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const source = resolve(sourceDir, entry.name);
    if (entry.isDirectory()) {
      await copyCssFiles(source);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.css')) {
      continue;
    }

    const relative = source.slice(sourceRoot.length + 1);
    const target = resolve(root, 'dist', relative);
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target);
  }
}

await copyCssFiles(sourceRoot);
