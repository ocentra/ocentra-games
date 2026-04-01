#!/usr/bin/env node

import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_HTML = join(__dirname, '..', 'SourceHtml');

const titleRe = /<title[^>]*>([^<]+)<\/title>/i;
const h1Re = /<h1[^>]*>([^<]+)<\/h1>/i;

const files = readdirSync(SOURCE_HTML).filter((f) => f.endsWith('.html'));
const out = ['# SourceHtml manifest: filename → extracted title', '', 'filename | title', '--- | ---'];

for (const f of files.sort()) {
  try {
    const raw = readFileSync(join(SOURCE_HTML, f), 'utf8').slice(0, 8000);
    const m = raw.match(titleRe) || raw.match(h1Re);
    const title = m ? m[1].replace(/\s+/g, ' ').trim() : '(no title)';
    out.push(`${f} | ${title}`);
  } catch {
    out.push(`${f} | (read error)`);
  }
}

console.log(out.join('\n'));
