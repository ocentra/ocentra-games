#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');

if (!fs.existsSync(distDir)) {
  console.warn(`[fix-dist-aliases] No dist dir at ${distDir}, skipping`);
  process.exit(0);
}

const resolveAliasTarget = (relativePath, filePath, extension) => {
  const withoutAlias = relativePath.slice(2);
  const targetBase = path.resolve(distDir, withoutAlias);
  const candidates = extension === '.js'
    ? [`${targetBase}.js`, path.join(targetBase, 'index.js')]
    : [`${targetBase}.d.ts`, `${targetBase}.js`, path.join(targetBase, 'index.d.ts'), path.join(targetBase, 'index.js')];
  const resolved = candidates.find(candidate => fs.existsSync(candidate));

  if (!resolved) {
    return null;
  }

  let relative = path.relative(path.dirname(filePath), resolved).replace(/\\/g, '/');
  if (!relative.startsWith('.')) {
    relative = `./${relative}`;
  }

  if (extension === '.d.ts') {
    relative = relative.replace(/\.d\.ts$/, '').replace(/\.js$/, '');
  }

  return relative;
};

const rewriteSpecifier = (content, filePath, extension) =>
  content.replace(
    /(from\s+['"])(@\/[^'"]+)(['"])/g,
    (match, prefix, specifier, suffix) => {
      const resolved = resolveAliasTarget(specifier, filePath, extension);
      return resolved ? `${prefix}${resolved}${suffix}` : match;
    }
  ).replace(
    /(import\s*\(\s*['"])(@\/[^'"]+)(['"]\s*\))/g,
    (match, prefix, specifier, suffix) => {
      const resolved = resolveAliasTarget(specifier, filePath, extension);
      return resolved ? `${prefix}${resolved}${suffix}` : match;
    }
  );

const walk = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    const extension = entry.name.endsWith('.d.ts')
      ? '.d.ts'
      : entry.name.endsWith('.js')
        ? '.js'
        : null;

    if (!extension) {
      continue;
    }

    const original = fs.readFileSync(fullPath, 'utf8');
    const rewritten = rewriteSpecifier(original, fullPath, extension);
    if (rewritten !== original) {
      fs.writeFileSync(fullPath, rewritten);
    }
  }
};

walk(distDir);
