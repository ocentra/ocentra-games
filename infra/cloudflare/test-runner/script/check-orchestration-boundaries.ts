import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const handlerLineLimit = 1300;
const forbiddenLiterals = [
  'daily/claim',
  'battle-pass/claim',
  'battle-pass/xp',
  'mission/claim',
  'mission/progress',
  'streak/freeze',
  'add-item',
  'remove-item',
  "endsWith('buy')",
  "endsWith('sell')",
] as const;
const forbiddenInlineSchemaPattern = /\bz\.(?:object|enum|union)\s*\(/;

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (entry.isFile() && fullPath.endsWith('.ts') && !fullPath.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function readText(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}

function main(): void {
  const cwd = process.cwd();
  const srcRoot = path.join(cwd, 'src');

  const doFiles = collectFiles(path.join(srcRoot, 'durable-objects'));
  const doOffenders = doFiles.filter((file) => readText(file).includes('.fetch('));

  const handlerFiles = collectFiles(path.join(srcRoot, 'handlers'));
  const handlerOffenders = handlerFiles
    .map((file) => ({ file, lines: readText(file).split(/\r?\n/).length }))
    .filter((entry) => entry.lines > handlerLineLimit);

  const contractSchemaFiles = [
    ...handlerFiles,
    ...collectFiles(path.join(cwd, 'tests')),
    ...collectFiles(path.join(cwd, 'test-runner', 'script')),
  ];
  const contractSchemaOffenders = contractSchemaFiles.filter((file) => forbiddenInlineSchemaPattern.test(readText(file)));

  const policyFiles = [
    ...collectFiles(path.join(srcRoot, 'handlers')),
    ...collectFiles(path.join(srcRoot, 'durable-objects')),
    ...collectFiles(path.join(srcRoot, 'flows')),
  ];
  const literalOffenders: Array<{ file: string; literal: string }> = [];
  for (const file of policyFiles) {
    const text = readText(file);
    for (const literal of forbiddenLiterals) {
      if (text.includes(literal)) {
        literalOffenders.push({ file, literal });
      }
    }
  }

  const errors: string[] = [];
  if (doOffenders.length > 0) {
    errors.push(`Direct DO fetches found:\n${doOffenders.map((file) => `- ${file}`).join('\n')}`);
  }
  if (handlerOffenders.length > 0) {
    errors.push(
      `Handlers exceed ${handlerLineLimit} lines:\n${handlerOffenders.map((entry) => `- ${entry.file} (${entry.lines} lines)`).join('\n')}`
    );
  }
  if (contractSchemaOffenders.length > 0) {
    errors.push(
      `Inline Zod contract definitions found outside endpoint-domain:\n${contractSchemaOffenders.map((file) => `- ${file}`).join('\n')}`
    );
  }
  if (literalOffenders.length > 0) {
    errors.push(
      `Raw reward/inventory boundary literals found:\n${literalOffenders.map((entry) => `- ${entry.file}: ${entry.literal}`).join('\n')}`
    );
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  console.log('Orchestration boundary checks passed.');
}

main();
