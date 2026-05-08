import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..', '..');
const CATALOG_DIR = path.join(ROOT_DIR, 'packages', 'asset-editor', 'Resources', 'catalog');
const GAMES_DIR = path.join(CATALOG_DIR, 'games');
const OUTPUT_PATH = path.join(ROOT_DIR, 'src', 'seo', 'generated', 'catalogSeoData.ts');
const REPLACEMENTS_PATH = path.join(SCRIPT_DIR, 'catalog-replacements.json');
const REPLACEMENTS_OUTPUT_PATH = path.join(ROOT_DIR, 'src', 'seo', 'generated', 'catalogSeoReplacements.ts');
const MAX_DESCRIPTION_LENGTH = 260;
const MAX_SECTION_LENGTH = 900;

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cleanText(value) {
  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function normalizeIdentity(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function limitText(value, maxLength) {
  const text = cleanText(value);
  if (text.length <= maxLength) {
    return text;
  }
  const slice = text.slice(0, maxLength - 1);
  const boundary = slice.lastIndexOf(' ');
  return `${slice.slice(0, boundary > 120 ? boundary : slice.length).trim()}...`;
}

function uniqueParts(parts) {
  const out = [];
  const seen = new Set();
  for (const part of parts) {
    const text = cleanText(part);
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    out.push(text);
  }
  return out;
}

function joinLines(parts) {
  return uniqueParts(parts).join('\n');
}

function joinParagraphs(parts) {
  return uniqueParts(parts).join('\n\n');
}

function stringifyValue(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map(item => stringifyListItem(item)).filter(Boolean).join('\n');
  }
  if (!value || typeof value !== 'object') {
    return cleanText(value);
  }
  return Object.entries(value)
    .map(([key, entryValue]) => {
      const rendered = stringifyValue(entryValue);
      return rendered ? `${key}: ${rendered}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function stringifyListItem(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return stringifyValue(value);
  }
  const record = asRecord(value);
  const name = cleanText(record.name) || cleanText(record.title) || cleanText(record.label);
  const description = cleanText(record.description) || cleanText(record.body) || cleanText(record.text) || cleanText(record.value);
  if (name && description) {
    return `${name}: ${description}`;
  }
  if (name) {
    return name;
  }
  if (description) {
    return description;
  }
  return stringifyValue(value);
}

function renderOverview(entry, source) {
  const overview = asRecord(source.overview);
  return joinLines([
    cleanText(overview.description) || cleanText(source.description) || cleanText(entry.description),
    cleanText(overview.origin) || cleanText(source.origin) || cleanText(entry.origin) ? `Origin: ${cleanText(overview.origin) || cleanText(source.origin) || cleanText(entry.origin)}` : '',
    cleanText(overview.players) || cleanText(source.players) || cleanText(entry.players) ? `Players: ${cleanText(overview.players) || cleanText(source.players) || cleanText(entry.players)}` : '',
    cleanText(overview.deck) || cleanText(source.deck) || cleanText(entry.deck) ? `Deck: ${cleanText(overview.deck) || cleanText(source.deck) || cleanText(entry.deck)}` : '',
    cleanText(overview.difficulty) || cleanText(source.difficulty) || cleanText(entry.difficulty) ? `Difficulty: ${cleanText(overview.difficulty) || cleanText(source.difficulty) || cleanText(entry.difficulty)}` : '',
    cleanText(overview.duration) || cleanText(source.duration) || cleanText(entry.duration) ? `Duration: ${cleanText(overview.duration) || cleanText(source.duration) || cleanText(entry.duration)}` : '',
  ]);
}

function renderHistory(source) {
  const history = asRecord(source.history);
  return joinParagraphs([
    cleanText(history.origins),
    Array.isArray(history.timeline) ? history.timeline.map(item => `- ${stringifyListItem(item)}`).join('\n') : '',
    cleanText(history.evolution),
    cleanText(history.cultural),
  ]);
}

function renderSetup(entry, source) {
  const setup = asRecord(source.setup);
  return joinLines([
    cleanText(setup.players) || cleanText(source.players) || cleanText(entry.players) ? `Players: ${cleanText(setup.players) || cleanText(source.players) || cleanText(entry.players)}` : '',
    cleanText(setup.deck) || cleanText(source.deck) || cleanText(entry.deck) ? `Deck: ${cleanText(setup.deck) || cleanText(source.deck) || cleanText(entry.deck)}` : '',
    cleanText(setup.equipment) ? `Equipment: ${cleanText(setup.equipment)}` : '',
    cleanText(setup.dealing) ? `Dealing: ${cleanText(setup.dealing)}` : '',
  ]);
}

function renderRules(source) {
  const rules = asRecord(source.rules);
  const scoring = asRecord(source.scoring);
  return joinParagraphs([
    cleanText(rules.objective) ? `Objective: ${cleanText(rules.objective)}` : '',
    cleanText(rules.gameplay) ? `Gameplay: ${cleanText(rules.gameplay)}` : '',
    cleanText(rules.scoring) || cleanText(scoring.description) ? `Scoring: ${cleanText(rules.scoring) || cleanText(scoring.description)}` : '',
    Array.isArray(rules.keyRules) ? rules.keyRules.map(item => `- ${stringifyListItem(item)}`).join('\n') : '',
    cleanText(scoring.winCondition) ? `Win condition: ${cleanText(scoring.winCondition)}` : '',
  ]);
}

function renderStrategy(source) {
  const strategy = asRecord(source.strategy);
  return joinParagraphs([
    cleanText(strategy.basic) ? `Basic: ${cleanText(strategy.basic)}` : '',
    cleanText(strategy.intermediate) ? `Intermediate: ${cleanText(strategy.intermediate)}` : '',
    cleanText(strategy.advanced) ? `Advanced: ${cleanText(strategy.advanced)}` : '',
    Array.isArray(strategy.tips) ? strategy.tips.map(item => `- ${stringifyListItem(item)}`).join('\n') : '',
  ]);
}

function renderVariations(source) {
  if (Array.isArray(source.variations)) {
    return source.variations.map(item => `- ${stringifyListItem(item)}`).filter(Boolean).join('\n');
  }
  return stringifyValue(source.variations);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function gameFileNames() {
  return new Set((await readdir(GAMES_DIR)).filter(fileName => fileName.endsWith('.json')));
}

function cleanReplacementEntry(entry) {
  const authoredSlug = normalizeIdentity(entry.authoredSlug);
  const catalogSlugs = Array.isArray(entry.catalogSlugs)
    ? entry.catalogSlugs.map(normalizeIdentity).filter(Boolean)
    : [];
  return authoredSlug && catalogSlugs.length > 0
    ? { authoredSlug, catalogSlugs: [...new Set(catalogSlugs)] }
    : null;
}

async function readReplacementEntries() {
  const source = await readJson(REPLACEMENTS_PATH);
  return (Array.isArray(source.replacements) ? source.replacements : [])
    .map(cleanReplacementEntry)
    .filter(Boolean);
}

function replacedCatalogSlugSet(replacements) {
  return new Set(replacements.flatMap(entry => entry.catalogSlugs));
}

async function writeReplacementData(replacements) {
  const source = [
    'export interface CatalogSeoReplacement {',
    '  authoredSlug: string;',
    '  catalogSlugs: readonly string[];',
    '}',
    '',
    `export const catalogSeoReplacements = ${JSON.stringify(replacements, null, 2)} satisfies readonly CatalogSeoReplacement[];`,
    '',
    'const catalogSeoReplacementLookup = new Map(',
    '  catalogSeoReplacements.flatMap(entry => entry.catalogSlugs.map(slug => [slug, entry.authoredSlug] as const)),',
    ');',
    '',
    'export function findAuthoredSlugForCatalogSlug(slug: string): string | undefined {',
    '  return catalogSeoReplacementLookup.get(slug);',
    '}',
    '',
    'export function catalogSeoReplacementSlugsForAuthoredSlug(authoredSlug: string): readonly string[] {',
    '  return catalogSeoReplacements.find(entry => entry.authoredSlug === authoredSlug)?.catalogSlugs ?? [];',
    '}',
    '',
  ].join('\n');
  await mkdir(path.dirname(REPLACEMENTS_OUTPUT_PATH), { recursive: true });
  await writeFile(REPLACEMENTS_OUTPUT_PATH, source, 'utf8');
}

async function buildEntry(entry, names) {
  const fileName = `${entry.slug}.json`;
  const source = names.has(fileName)
    ? await readJson(path.join(GAMES_DIR, fileName))
    : entry;
  return {
    slug: String(entry.slug),
    name: cleanText(source.name) || cleanText(entry.name) || String(entry.slug),
    description: limitText(cleanText(source.description) || cleanText(entry.description), MAX_DESCRIPTION_LENGTH),
    category: cleanText(source.category) || cleanText(entry.category),
    subcategory: cleanText(source.subcategory) || cleanText(entry.subcategory),
    players: cleanText(source.players) || cleanText(entry.players),
    deck: cleanText(source.deck) || cleanText(entry.deck),
    difficulty: cleanText(source.difficulty) || cleanText(entry.difficulty),
    duration: cleanText(source.duration) || cleanText(entry.duration),
    quality: cleanText(source.quality) || cleanText(entry.quality) || 'placeholder',
    overview: limitText(renderOverview(entry, source), MAX_SECTION_LENGTH),
    history: limitText(renderHistory(source), MAX_SECTION_LENGTH),
    setup: limitText(renderSetup(entry, source), MAX_SECTION_LENGTH),
    rules: limitText(renderRules(source), MAX_SECTION_LENGTH),
    strategy: limitText(renderStrategy(source), MAX_SECTION_LENGTH),
    variations: limitText(renderVariations(source), MAX_SECTION_LENGTH),
  };
}

async function main() {
  const index = await readJson(path.join(CATALOG_DIR, 'index.json'));
  const names = await gameFileNames();
  const replacements = await readReplacementEntries();
  const replacedSlugs = replacedCatalogSlugSet(replacements);
  const entries = [];
  for (const entry of index.games ?? []) {
    if (replacedSlugs.has(normalizeIdentity(entry.slug))) {
      continue;
    }
    entries.push(await buildEntry(entry, names));
  }
  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  await writeReplacementData(replacements);

  const source = [
    'export interface CatalogSeoGameEntry {',
    '  slug: string;',
    '  name: string;',
    '  description: string;',
    '  category: string;',
    '  subcategory: string;',
    '  players: string;',
    '  deck: string;',
    '  difficulty: string;',
    '  duration: string;',
    '  quality: string;',
    '  overview: string;',
    '  history: string;',
    '  setup: string;',
    '  rules: string;',
    '  strategy: string;',
    '  variations: string;',
    '}',
    '',
    `export const catalogSeoGames = ${JSON.stringify(entries, null, 2)} satisfies readonly CatalogSeoGameEntry[];`,
    '',
    'const catalogSeoGameLookup = new Map(catalogSeoGames.map(game => [game.slug, game] as const));',
    '',
    'export function findCatalogSeoGame(slug: string): CatalogSeoGameEntry | undefined {',
    '  return catalogSeoGameLookup.get(slug);',
    '}',
    '',
  ].join('\n');

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, source, 'utf8');
}

await main();
