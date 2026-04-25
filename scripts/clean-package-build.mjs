#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(process.argv[2] || process.cwd());

for (const relativePath of ['dist', 'tsconfig.tsbuildinfo']) {
  const targetPath = path.join(packageRoot, relativePath);
  if (!fs.existsSync(targetPath)) {
    continue;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
}
