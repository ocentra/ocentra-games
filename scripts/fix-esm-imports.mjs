#!/usr/bin/env node
/**
 * Adds .js extension to relative imports in emitted .js files for Node ESM resolution.
 * Run from package directory: node ../../scripts/fix-esm-imports.mjs
 * Uses process.cwd()/dist - must be run from the package that was just built.
 */
import fs from 'fs';
import path from 'path';

const distDir = path.join(process.cwd(), 'dist');

if (!fs.existsSync(distDir)) {
  console.warn(`[fix-esm-imports] No dist dir at ${distDir}, skipping`);
  process.exit(0);
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  content = content.replace(
    /from\s+(['"])(\.\.\/[^'"]+?\.css)\.js\1/g,
    (_, q, p) => `from ${q}${p}${q}`
  );
  content = content.replace(
    /from\s+(['"])(\.\/[^'"]+?\.css)\.js\1/g,
    (_, q, p) => `from ${q}${p}${q}`
  );
  const shouldKeepImportAsIs = (specifier) =>
    specifier.endsWith('.js') ||
    specifier.endsWith('.css') ||
    specifier.endsWith('.json') ||
    specifier.endsWith('.png') ||
    specifier.endsWith('.jpg') ||
    specifier.endsWith('.jpeg') ||
    specifier.endsWith('.gif') ||
    specifier.endsWith('.webp') ||
    specifier.endsWith('.svg') ||
    specifier.endsWith('.avif');
  content = content.replace(
    /from\s+(['"])(\.\.[^'"]+)\1/g,
    (_, q, p) => (shouldKeepImportAsIs(p) ? `from ${q}${p}${q}` : `from ${q}${p}.js${q}`)
  );
  content = content.replace(
    /from\s+(['"])(\.\/[^'"]+)\1/g,
    (_, q, p) => (shouldKeepImportAsIs(p) ? `from ${q}${p}${q}` : `from ${q}${p}.js${q}`)
  );
  if (content !== original) {
    fs.writeFileSync(filePath, content);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.js')) fixFile(full);
  }
}

walk(distDir);
