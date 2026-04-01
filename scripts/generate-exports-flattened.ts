#!/usr/bin/env node

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const OUTPUT_PATH = path.join(ROOT, 'exports-flattened.json');

type PackageJson = {
  name?: string;
  exports?: Record<string, unknown>;
};

function collectExports(pkgPath: string, pkgName: string): string[] {
  const manifest = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson;
  const exports = manifest.exports;
  if (!exports || typeof exports !== 'object') {
    return [];
  }

  const entries: string[] = [];
  for (const key of Object.keys(exports)) {
    if (key === '.') continue;
    const subpath = key.startsWith('./') ? key.slice(1) : key;
    entries.push(`${pkgName}${subpath}`);
  }
  return entries;
}

function main(): void {
  const packagesDir = readdirSync(PACKAGES_DIR, { withFileTypes: true });
  const allExports: string[] = [];

  for (const entry of packagesDir) {
    if (!entry.isDirectory()) continue;

    const packageJsonPath = path.join(PACKAGES_DIR, entry.name, 'package.json');
    try {
      const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
      const name = manifest.name;
      if (!name || !name.startsWith('@ocentra/')) continue;

      const exports = collectExports(packageJsonPath, name);
      allExports.push(...exports);
    } catch {
      continue;
    }
  }

  const unique = [...new Set(allExports)].sort((a, b) => a.localeCompare(b));
  writeFileSync(OUTPUT_PATH, JSON.stringify(unique, null, 2), 'utf-8');
  process.stdout.write(`Wrote ${unique.length} entries to ${path.relative(ROOT, OUTPUT_PATH)}\n`);
}

main();
