import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = process.cwd();
const sourceRoots = [
  'src',
  'packages',
  'infra',
  'scripts',
  'vite',
];

const standaloneFiles = [
  'package.json',
  'vite.config.ts',
  'vitest.config.ts',
  'playwright.config.ts',
];

const ignoredPathParts = new Set([
  '.git',
  '.stryker-tmp',
  '.turbo',
  '.wrangler',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'output',
  'playwright-report',
  'reports',
  'test-results',
]);

const ignoredRelativePrefixes = [
  'docs/discussion/',
  'infra/cloudflare/.wrangler-build-check/',
  'infra/cloudflare/dist-',
  'infra/cloudflare/reports/',
  'packages/asset-editor/Resources/',
];

const textExtensions = new Set([
  '.cjs',
  '.js',
  '.json',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx',
]);

const forbiddenSourcePatterns = [
  { label: 'direct zod import', pattern: /from\s+['"]zod['"]|require\(\s*['"]zod['"]\s*\)/ },
  { label: 'Zod resolver', pattern: /\bzodResolver\b/ },
  { label: 'Zod public type/API', pattern: /\bZod(?:Error|Issue|Type|Schema|Object|String|Number|Boolean|Array|Record|Union)\b/ },
  { label: 'stale schema/zod path', pattern: /schema\/zod|schema\\zod/ },
  { label: 'Zod-style schema alias', pattern: /\bschema\s+as\s+z\b/ },
];

const forbiddenDependencyNames = new Set([
  'zod',
  'zod-to-json-schema',
  'zod-validation-error',
]);

const findings = [];

function toPosix(path) {
  return path.split('\\').join('/');
}

function shouldIgnorePath(path) {
  const relativePath = toPosix(relative(repoRoot, path));
  if (ignoredRelativePrefixes.some((prefix) => relativePath.startsWith(prefix))) {
    return true;
  }
  return relativePath.split('/').some((part) => ignoredPathParts.has(part));
}

function extensionOf(path) {
  const index = path.lastIndexOf('.');
  return index === -1 ? '' : path.slice(index);
}

function walk(path, files) {
  if (!existsSync(path) || shouldIgnorePath(path)) {
    return;
  }

  const stats = statSync(path);
  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) {
      walk(join(path, entry), files);
    }
    return;
  }

  if (stats.isFile() && textExtensions.has(extensionOf(path))) {
    files.push(path);
  }
}

function lineNumberFor(text, index) {
  return text.slice(0, index).split(/\r?\n/u).length;
}

function inspectSourceFile(path) {
  if (toPosix(relative(repoRoot, path)) === 'scripts/check-no-zod-source.mjs') {
    return;
  }
  const text = readFileSync(path, 'utf8');
  for (const rule of forbiddenSourcePatterns) {
    const match = rule.pattern.exec(text);
    if (match) {
      findings.push({
        path: toPosix(relative(repoRoot, path)),
        line: lineNumberFor(text, match.index),
        reason: rule.label,
      });
    }
  }
}

function inspectPackageManifest(path) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  for (const section of sections) {
    const dependencies = parsed[section];
    if (dependencies == null || typeof dependencies !== 'object') {
      continue;
    }
    for (const name of Object.keys(dependencies)) {
      if (forbiddenDependencyNames.has(name)) {
        findings.push({
          path: toPosix(relative(repoRoot, path)),
          line: 1,
          reason: `direct ${name} dependency in ${section}`,
        });
      }
    }
  }
}

const files = [];
for (const root of sourceRoots) {
  walk(join(repoRoot, root), files);
}
for (const file of standaloneFiles) {
  const path = join(repoRoot, file);
  if (existsSync(path)) {
    files.push(path);
  }
}

for (const file of files) {
  if (file.endsWith('package.json')) {
    inspectPackageManifest(file);
  }
  inspectSourceFile(file);
}

if (findings.length > 0) {
  console.error('Direct Zod usage is not allowed in repo source. Use effect/Schema through domain-owned schemas.');
  for (const finding of findings) {
    console.error(`${finding.path}:${finding.line} ${finding.reason}`);
  }
  process.exit(1);
}

console.log(`No direct Zod source usage found across ${files.length} checked files.`);
