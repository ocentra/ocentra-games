#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

const filePath = process.argv[2];
if (!filePath) {
  process.stderr.write('Usage: npx tsx scripts/view-ndjson.ts <file.ndjson>\n');
  process.stderr.write('  Pretty-prints each NDJSON line as JSON for readability.\n');
  process.exit(1);
}

const resolved = path.resolve(filePath);
if (!fs.existsSync(resolved)) {
  process.stderr.write(`File not found: ${resolved}\n`);
  process.exit(1);
}

const content = fs.readFileSync(resolved, 'utf-8');
const lines = content.trim().split('\n').filter((l) => l.trim());

const sep = '\n' + '─'.repeat(80) + '\n';
for (let i = 0; i < lines.length; i++) {
  if (i > 0) process.stdout.write(sep);
  try {
    const obj = JSON.parse(lines[i]);
    process.stdout.write(JSON.stringify(obj, null, 2));
  } catch {
    process.stdout.write(lines[i]);
  }
}
if (lines.length > 0) process.stdout.write('\n');
