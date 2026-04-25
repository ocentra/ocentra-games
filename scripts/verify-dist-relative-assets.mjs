#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(process.argv[2] || process.cwd());
const distRoot = path.join(packageRoot, 'dist');

if (!fs.existsSync(distRoot)) {
  process.exit(0);
}

const assetImportPattern = /(?:import\s+['"]|from\s+['"])(\.[^'"]+\.(?:css|json))(?:['"])/g;
const distFiles = [];
const missingAssets = [];

function collectFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath);
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.js')) {
      distFiles.push(fullPath);
    }
  }
}

collectFiles(distRoot);

for (const filePath of distFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativeFilePath = path.relative(packageRoot, filePath);

  for (const match of content.matchAll(assetImportPattern)) {
    const relativeImportPath = match[1];
    const resolvedImportPath = path.resolve(path.dirname(filePath), relativeImportPath);
    if (!fs.existsSync(resolvedImportPath)) {
      missingAssets.push(`${relativeFilePath} -> ${relativeImportPath}`);
    }
  }
}

if (missingAssets.length > 0) {
  console.error('[verify-dist-relative-assets] Missing emitted assets:');
  for (const missingAsset of missingAssets) {
    console.error(`  - ${missingAsset}`);
  }
  process.exit(1);
}
