#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { walkProcessedGameFiles } from '../processed-game-files';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROCESSED = path.join(ROOT, 'processed-games');
const SOURCE_HTML = path.join(ROOT, 'SourceHtml');

function truncate(s: string | undefined, maxLen = 200): string {
  if (!s || typeof s !== 'string') return '';
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= maxLen ? t : t.slice(0, maxLen - 3) + '...';
}

interface GameJson {
  name?: string;
  overview?: { description?: string; category?: string; subCategory?: string; origin?: string };
  alsoKnownAs?: string | string[];
}

function buildJsonDescriptors(): number {
  const files = walkProcessedGameFiles(PROCESSED);
  const lines = [
    '# JSON descriptors for fuzzy matching',
    '# Format: filename | name. 2-4 line description. Category. Origin. Also: alias1, alias2, ...',
    '',
  ];

  for (const file of files) {
    let data: GameJson;
    try {
      data = JSON.parse(fs.readFileSync(file.absolutePath, 'utf8')) as GameJson;
    } catch {
      lines.push(`${file.relativePath} | (parse error)`);
      continue;
    }

    const name = data.name ?? file.slug.replace(/-/g, ' ');
    const ov = data.overview ?? {};
    const desc = truncate(ov.description ?? '', 250);
    const cat = [ov.category, ov.subCategory].filter(Boolean).join(', ') ?? '';
    const origin = truncate(ov.origin ?? '', 80);
    const also = Array.isArray(data.alsoKnownAs)
      ? data.alsoKnownAs.join(', ')
      : typeof data.alsoKnownAs === 'string'
        ? data.alsoKnownAs
        : '';

    const parts = [file.relativePath, '|', name];
    if (desc) parts.push('.', desc);
    if (cat) parts.push('.', `Category: ${cat}`);
    if (origin) parts.push('.', `Origin: ${origin}`);
    if (also) parts.push('.', `Also: ${truncate(also, 120)}`);
    lines.push(parts.join(' '));
  }

  fs.writeFileSync(path.join(ROOT, 'json-descriptors.txt'), lines.join('\n'), 'utf8');
  return files.length;
}

function gameNameFromUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url.startsWith('/') ? 'https://x.com' + url : url);
    const pathname = u.pathname.replace(/\/$/, '');
    const seg = pathname.split('/').filter(Boolean).pop();
    if (!seg) return '';
    return seg.replace(/\.(html?|php)$/i, '').replace(/_/g, ' ').replace(/-/g, ' ');
  } catch {
    return '';
  }
}

function sourceFromFilename(file: string): string {
  if (file.startsWith('pagat-')) return 'Pagat';
  if (file.startsWith('wiki-')) return 'Wikipedia';
  if (file.startsWith('britannica-')) return 'Britannica';
  if (file.startsWith('bicyclecards-')) return 'Bicycle Cards';
  if (file.startsWith('wizardofodds-')) return 'Wizard of Odds';
  if (file.startsWith('semicolon-')) return 'Semicolon';
  if (file.startsWith('parlett-')) return 'Parlett';
  if (file.startsWith('acecardgames-')) return 'Ace Card Games';
  if (file.startsWith('namu-')) return 'Namu Wiki';
  if (file.startsWith('riichi-wiki')) return 'Riichi Wiki';
  if (file.startsWith('catsatcards-')) return 'Cats at Cards';
  if (file.startsWith('bvssolitaire-')) return 'BVS Solitaire';
  if (file.startsWith('fismelab-')) return 'Fismelab';
  if (file.startsWith('onpixelgames-')) return 'OnPixelGames';
  if (file.startsWith('ispa-')) return 'ISPA';
  if (file.startsWith('norskespilleautomater-')) return 'Norskespilleautomater';
  if (file.startsWith('scribd-')) return 'Scribd';
  if (file.startsWith('cuttle-')) return 'Cuttle';
  if (file.startsWith('piatnik-')) return 'Piatnik';
  return 'Other';
}

function extractFromHtml(content: string): { title: string; desc: string } {
  const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s*[-|–—]\s*(Wikipedia|Pagat|card game rules?|How to play).*$/i, '').trim() : '';
  const metaMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const metaDesc = metaMatch ? metaMatch[1].trim() : '';
  const shortMatch = content.match(/<div[^>]*class=["'][^"']*shortdescription[^"']*["'][^>]*>([^<]+)</i);
  const shortDesc = shortMatch ? shortMatch[1].trim() : '';
  const firstPMatch =
    content.match(/<p[^>]*>\s*<b>([^<]+)<\/b>[^<]*\s*\(?also known as\s+<b>([^<]+)<\/b>/i) ||
    content.match(/<p[^>]*>([^<]{20,300})/);
  const firstP = firstPMatch ? firstPMatch[1] : '';
  const desc = metaDesc || shortDesc || truncate(firstP, 200);
  return { title, desc };
}

function buildHtmlDescriptors(): number {
  const manifestPath = path.join(SOURCE_HTML, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, string>;
  const lines = [
    '# HTML descriptors for fuzzy matching',
    '# Format: filename | title. description. Source.',
    '',
  ];

  const allHtml = fs.readdirSync(SOURCE_HTML).filter((f) => f.endsWith('.html'));
  const files = [...new Set([...Object.keys(manifest), ...allHtml])].sort();
  for (const file of files) {
    const url = manifest[file] ?? '';
    const htmlPath = path.join(SOURCE_HTML, file);
    let title = '';
    let desc = '';

    if (fs.existsSync(htmlPath)) {
      const content = fs.readFileSync(htmlPath, 'utf8');
      const ex = extractFromHtml(content);
      title = ex.title || gameNameFromUrl(url);
      desc = ex.desc ?? '';
    } else {
      title = gameNameFromUrl(url);
    }

    const source = sourceFromFilename(file);
    const parts = [file, '|', truncate(title, 80)];
    if (desc) parts.push('.', truncate(desc, 200));
    parts.push('.', source);
    lines.push(parts.join(' '));
  }

  fs.writeFileSync(path.join(ROOT, 'html-descriptors.txt'), lines.join('\n'), 'utf8');
  return files.length;
}

const jsonCount = buildJsonDescriptors();
const htmlCount = buildHtmlDescriptors();
console.log(`Wrote json-descriptors.txt (${jsonCount} entries)`);
console.log(`Wrote html-descriptors.txt (${htmlCount} entries)`);
