import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const repoRoot = process.cwd();
const sourceRoots = [
  'packages',
  'src',
  'infra/cloudflare/src',
];

const ignoredSegments = new Set([
  '.git',
  '.stryker-tmp',
  '.turbo',
  '.wrangler',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'output',
  'Resources',
]);

const ignoredFileSuffixes = [
  '.generated.ts',
  '.generated.tsx',
];

const sourceExtension = /\.(?:ts|tsx)$/;
const manualBrandPattern = /\b(?:export\s+)?type\s+\w+\s*=\s*string\s*&\s*\{\s*readonly\s+__brand\b/;
const nakedDomainTypeAliasPattern = /^\s*export\s+type\s+(\w*(?:Id|ID|Path|Key|Name|Hash|URL|Url|Type|Slug|Route|Label|Title|Description|Status|Version)\w*)\s*=\s*string\s*;/;

const findings = [];

function toPosix(path) {
  return path.split(sep).join('/');
}

function shouldSkip(path) {
  const relativePath = toPosix(relative(repoRoot, path));
  const parts = relativePath.split('/');
  if (parts.some((part) => ignoredSegments.has(part))) {
    return true;
  }
  return ignoredFileSuffixes.some((suffix) => relativePath.endsWith(suffix));
}

function walk(dir) {
  if (!existsSync(dir) || shouldSkip(dir)) {
    return;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (shouldSkip(path)) {
      continue;
    }
    if (entry.isDirectory()) {
      walk(path);
      continue;
    }
    if (!sourceExtension.test(entry.name)) {
      continue;
    }
    checkFile(path);
  }
}

function checkFile(path) {
  const relativePath = toPosix(relative(repoRoot, path));
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);

  lines.forEach((line, index) => {
    if (manualBrandPattern.test(line)) {
      findings.push({
        path: relativePath,
        line: index + 1,
        reason: 'manual string brand',
        text: line.trim(),
      });
    }

    const nakedDomainAlias = line.match(nakedDomainTypeAliasPattern);
    if (nakedDomainAlias) {
      findings.push({
        path: relativePath,
        line: index + 1,
        reason: `naked domain string alias ${nakedDomainAlias[1]}`,
        text: line.trim(),
      });
    }
  });
}

for (const root of sourceRoots) {
  walk(join(repoRoot, root));
}

if (findings.length > 0) {
  console.error('Naked domain string aliases are not allowed. Use Effect Schema brands plus decode/parse helpers.');
  for (const finding of findings) {
    console.error(`${finding.path}:${finding.line} ${finding.reason}: ${finding.text}`);
  }
  process.exit(1);
}

console.log('No manual string brands or naked domain string aliases found.');
