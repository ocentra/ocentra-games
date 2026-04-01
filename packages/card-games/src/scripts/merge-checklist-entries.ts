#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, "..", "..", "gap_fill_and_verify.md");

const content = readFileSync(inputPath, 'utf8');
const lines = content.split('\n');

const itemRe = /^- (\d+[a-z]?) : \[([ x])\] (.+?) - \[([^\]]+\.json)\]\(card-games\/processed-games\/[^)]+\)$/;

function stripSee(name: string): string {
  return name.replace(/\s*\(see [^)]+\)\s*$/i, '').trim();
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/\.json$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function primaryName(jsonFile: string, names: Set<string>): string {
  const slugBase = slugToTitle(jsonFile);
  const arr = [...names];
  const exact = arr.find((n) => n.toLowerCase() === slugBase.toLowerCase());
  if (exact) return exact;
  const partial = arr.find((n) =>
    n.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').includes(jsonFile.replace('.json', '').toLowerCase())
  );
  if (partial) return partial;
  return arr.sort((a, b) => a.localeCompare(b))[0];
}

function sectionKey(primary: string): string {
  const first = primary.trim().charAt(0);
  if (/[A-Za-z]/.test(first)) return first.toUpperCase();
  if (/[0-9]/.test(first)) return '0';
  return '9';
}

const byJson = new Map<string, { names: Set<string>; section: string }>();
let currentSection = 'A';
const sectionHeaders: Record<string, string> = {
  Dangling: '### Dangling (added 2026-02)',
  '0': '### Numbers and Symbols',
};
for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') sectionHeaders[c] = `### ${c}`;

for (const line of lines) {
  const sectionMatch = line.match(/^### (.)$/);
  if (sectionMatch) {
    currentSection = sectionMatch[1];
    continue;
  }
  const sectionMatch2 = line.match(/^### (Numbers and Symbols|Dangling \([^)]+\))$/);
  if (sectionMatch2) {
    currentSection = sectionMatch2[1] === 'Numbers and Symbols' ? '0' : 'Dangling';
    continue;
  }

  const m = line.match(itemRe);
  if (!m) continue;
  const [, , , name, jsonFile] = m;
  const clean = stripSee(name);
  if (!byJson.has(jsonFile)) {
    byJson.set(jsonFile, { names: new Set(), section: currentSection });
  }
  byJson.get(jsonFile)!.names.add(clean);
}

const bySection = new Map<string, Array<{ jsonFile: string; display: string; primary: string; originalSection: string }>>();

for (const [jsonFile, { names, section }] of byJson) {
  const primary = primaryName(jsonFile, names);
  const allNames = [...names].sort((a, b) => {
    if (a === primary) return -1;
    if (b === primary) return 1;
    return a.localeCompare(b);
  });
  const display = allNames.join(' | ');
  const key = section === 'Dangling' ? 'Dangling' : sectionKey(primary);
  if (!bySection.has(key)) bySection.set(key, []);
  bySection.get(key)!.push({ jsonFile, display, primary, originalSection: section });
}

const letterOrder = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '0', 'Dangling'];
for (const key of letterOrder) {
  const items = bySection.get(key);
  if (items) {
    items.sort((a, b) => a.primary.localeCompare(b.primary));
  }
}

const headerEnd = lines.findIndex((l) => l === '### A');
const header = lines.slice(0, headerEnd).join('\n').trimEnd();

const out: string[] = [header, ''];
let num = 1;

for (const key of letterOrder) {
  const items = bySection.get(key);
  if (!items || items.length === 0) continue;
  out.push(sectionHeaders[key]);
  out.push('');
  for (const { jsonFile, display } of items) {
    out.push(`- ${num} : [ ] ${display} - [${jsonFile}](card-games/processed-games/${jsonFile})`);
    num++;
  }
  out.push('');
}

const beforeCount = lines.filter((l) => itemRe.test(l)).length;
if (beforeCount === 0) {
  console.error('No checklist items found in gap_fill_and_verify.md (simplified format). Nothing to merge.');
  process.exit(0);
}

writeFileSync(inputPath, out.join('\n').trimEnd() + '\n', 'utf8');
console.error(`Merged ${beforeCount} entries → ${num - 1} unique JSON files`);
