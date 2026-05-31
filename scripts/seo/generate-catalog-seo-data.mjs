import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSON5 from 'json5';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..', '..');
const RESOURCES_DIR = path.join(ROOT_DIR, 'packages', 'asset-editor', 'Resources');
const AUTHORED_GAMES_DIR = path.join(RESOURCES_DIR, 'GameMode', 'CardGames', 'Games');
const OUTPUT_PATH = path.join(ROOT_DIR, 'src', 'seo', 'generated', 'catalogSeoData.ts');
const REPLACEMENTS_PATH = path.join(SCRIPT_DIR, 'catalog-replacements.json');
const REPLACEMENTS_OUTPUT_PATH = path.join(ROOT_DIR, 'src', 'seo', 'generated', 'catalogSeoReplacements.ts');
const MAX_DESCRIPTION_LENGTH = 260;
const MAX_SECTION_LENGTH = 900;

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function dataOf(value) {
  const record = asRecord(value);
  const data = asRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
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
  return name || description || stringifyValue(value);
}

function contentBlockText(value) {
  const record = asRecord(value);
  const direct = cleanText(record.text) || cleanText(record.description) || cleanText(record.body);
  if (direct) {
    return direct;
  }
  if (Array.isArray(record.content)) {
    return record.content.map(contentBlockText).filter(Boolean).join('\n');
  }
  if (Array.isArray(record.items)) {
    return record.items.map(item => `- ${stringifyListItem(item)}`).filter(Boolean).join('\n');
  }
  return '';
}

function sectionText(gameInfo, sectionType) {
  const sections = Array.isArray(gameInfo.sections) ? gameInfo.sections : [];
  return sections
    .filter(section => cleanText(asRecord(section).type).toLowerCase() === sectionType)
    .flatMap(section => Array.isArray(asRecord(section).pages) ? asRecord(section).pages : [])
    .map(page => {
      const pageRecord = asRecord(page);
      const content = Array.isArray(pageRecord.content) ? pageRecord.content.map(contentBlockText).filter(Boolean).join('\n') : '';
      return joinParagraphs([pageRecord.title, pageRecord.subtitle, content]);
    })
    .filter(Boolean)
    .join('\n\n');
}

function firstSectionParagraph(gameInfo) {
  const sections = Array.isArray(gameInfo.sections) ? gameInfo.sections : [];
  for (const section of sections) {
    const pages = Array.isArray(asRecord(section).pages) ? asRecord(section).pages : [];
    for (const page of pages) {
      const blocks = Array.isArray(asRecord(page).content) ? asRecord(page).content : [];
      for (const block of blocks) {
        const text = contentBlockText(block);
        if (text) {
          return text;
        }
      }
    }
  }
  return '';
}

function renderOverview(entry, source) {
  const gameInfo = source.gameInfo;
  const history = asRecord(gameInfo.historyContent);
  return joinLines([
    cleanText(gameInfo.description) || cleanText(entry.description),
    cleanText(gameInfo.origin) || cleanText(history.origins) ? `Origin: ${cleanText(gameInfo.origin) || cleanText(history.origins)}` : '',
    cleanText(entry.players) ? `Players: ${cleanText(entry.players)}` : '',
    cleanText(entry.deck) ? `Deck: ${cleanText(entry.deck)}` : '',
    cleanText(entry.difficulty) ? `Difficulty: ${cleanText(entry.difficulty)}` : '',
    cleanText(entry.duration) ? `Duration: ${cleanText(entry.duration)}` : '',
  ]);
}

function renderHistory(source) {
  const history = asRecord(source.gameInfo.historyContent);
  return joinParagraphs([
    cleanText(history.origins) || cleanText(source.gameInfo.origin),
    Array.isArray(history.timeline) ? history.timeline.map(item => `- ${stringifyListItem(item)}`).join('\n') : '',
    cleanText(history.evolution),
    cleanText(history.cultural),
    sectionText(source.gameInfo, 'history'),
  ]);
}

function renderSetup(entry, source) {
  const setup = asRecord(source.gameInfo.setupContent);
  const rules = source.rules;
  return joinLines([
    cleanText(setup.players) || cleanText(entry.players) ? `Players: ${cleanText(setup.players) || cleanText(entry.players)}` : '',
    cleanText(setup.deck) || cleanText(entry.deck) ? `Deck: ${cleanText(setup.deck) || cleanText(entry.deck)}` : '',
    cleanText(setup.equipment) ? `Equipment: ${cleanText(setup.equipment)}` : '',
    cleanText(setup.dealing) ? `Dealing: ${cleanText(setup.dealing)}` : '',
    cleanText(rules.dealing) ? `Dealing: ${cleanText(rules.dealing)}` : '',
    sectionText(source.gameInfo, 'setup'),
  ]);
}

function renderRules(source) {
  const rules = source.rules;
  const scoring = source.scoring;
  return joinParagraphs([
    cleanText(rules.objective) ? `Objective: ${cleanText(rules.objective)}` : '',
    cleanText(rules.gameplay) ? `Gameplay: ${cleanText(rules.gameplay)}` : '',
    cleanText(rules.scoring) || cleanText(scoring.description) ? `Scoring: ${cleanText(rules.scoring) || cleanText(scoring.description)}` : '',
    Array.isArray(rules.keyRules) ? rules.keyRules.map(item => `- ${stringifyListItem(item)}`).join('\n') : '',
    Array.isArray(rules.ruleGroups) ? rules.ruleGroups.map(item => `- ${stringifyListItem(item)}`).join('\n') : '',
    cleanText(scoring.winCondition) ? `Win condition: ${cleanText(scoring.winCondition)}` : '',
    sectionText(source.gameInfo, 'rules'),
  ]);
}

function renderStrategy(source) {
  const strategy = source.strategy;
  return joinParagraphs([
    cleanText(strategy.basic) ? `Basic: ${cleanText(strategy.basic)}` : '',
    cleanText(strategy.intermediate) ? `Intermediate: ${cleanText(strategy.intermediate)}` : '',
    cleanText(strategy.advanced) ? `Advanced: ${cleanText(strategy.advanced)}` : '',
    Array.isArray(strategy.tips) ? strategy.tips.map(item => `- ${stringifyListItem(item)}`).join('\n') : '',
    stringifyValue(strategy.strategy),
    sectionText(source.gameInfo, 'strategy'),
  ]);
}

function renderVariations(source) {
  const variations = asRecord(source.gameInfo.variationsContent);
  if (Array.isArray(variations.list)) {
    return variations.list.map(item => `- ${stringifyListItem(item)}`).filter(Boolean).join('\n');
  }
  return cleanText(variations.noVariationsReason) || sectionText(source.gameInfo, 'variations');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readAsset(filePath) {
  return JSON5.parse(await readFile(filePath, 'utf8'));
}

async function assetFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await assetFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.asset')) {
      files.push(entryPath);
    }
  }
  return files;
}

function resourcePathFromRef(ref) {
  const refPath = cleanText(asRecord(ref).path);
  if (!refPath) {
    return null;
  }
  const normalized = refPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const resourceRelative = normalized.startsWith('Resources/')
    ? normalized.slice('Resources/'.length)
    : normalized;
  return path.join(RESOURCES_DIR, ...resourceRelative.split('/'));
}

async function loadReferencedAsset(ref) {
  const filePath = resourcePathFromRef(ref);
  if (!filePath) {
    return {};
  }
  try {
    return await readAsset(filePath);
  } catch {
    return {};
  }
}

function formatPlayers(minPlayers, maxPlayers) {
  const min = Number(minPlayers);
  const max = Number(maxPlayers);
  if (!Number.isFinite(min) || min <= 0) {
    return '';
  }
  if (!Number.isFinite(max) || max <= 0) {
    return String(min);
  }
  return min === max ? String(min) : `${min}-${max}`;
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

async function buildEntry(gameModeFile) {
  const document = await readAsset(gameModeFile);
  const system = asRecord(document.system);
  if (system.assetType !== 'CardGameMode') {
    return null;
  }

  const gameMode = dataOf(document);
  const gameInfo = dataOf(await loadReferencedAsset(gameMode.gameInfoAsset));
  const rules = dataOf(await loadReferencedAsset(gameMode.gameRulesAsset));
  const scoring = dataOf(await loadReferencedAsset(gameMode.scoringAsset));
  const strategy = dataOf(await loadReferencedAsset(gameMode.strategyAsset));
  const deckModel = dataOf(await loadReferencedAsset(gameMode.deckModelAsset ?? gameMode.deckAsset));
  const relativeParts = path.relative(AUTHORED_GAMES_DIR, gameModeFile).split(path.sep);
  const categoryFromPath = relativeParts[0] ?? '';
  const subcategoryFromPath = relativeParts.length > 2 ? relativeParts[1] : '';
  const hero = asRecord(gameInfo.hero);
  const slug = normalizeIdentity(gameMode.gameId || system.gameId || path.basename(gameModeFile, '.asset'));
  const displayName = cleanText(gameMode.displayName) || cleanText(system.displayName) || cleanText(hero.title) || slug;
  const description =
    cleanText(gameInfo.description) ||
    cleanText(gameInfo.shortDescription) ||
    firstSectionParagraph(gameInfo) ||
    cleanText(gameMode.description);
  const players = cleanText(gameInfo.playersDisplay) || formatPlayers(gameInfo.minPlayers ?? gameMode.minPlayers, gameInfo.maxPlayers ?? gameMode.maxPlayers);
  const source = { gameInfo, rules, scoring, strategy };
  const entry = {
    slug,
    name: displayName,
    description: limitText(description, MAX_DESCRIPTION_LENGTH),
    category: cleanText(gameInfo.gameCategory) || cleanText(categoryFromPath),
    subcategory: cleanText(gameInfo.subcategory) || cleanText(subcategoryFromPath),
    players,
    deck: cleanText(gameInfo.deck) || cleanText(asRecord(gameInfo.setupContent).deck) || cleanText(deckModel.deckType) || cleanText(asRecord(gameMode.deckAsset).displayName),
    difficulty: cleanText(gameInfo.difficulty),
    duration: cleanText(gameInfo.duration),
    quality: cleanText(gameInfo.quality) || 'placeholder',
    releaseStatus: cleanText(gameMode.releaseStatus) || 'WorkInProgress',
    overview: '',
    history: '',
    setup: '',
    rules: '',
    strategy: '',
    variations: '',
  };

  return {
    ...entry,
    overview: limitText(renderOverview(entry, source), MAX_SECTION_LENGTH),
    history: limitText(renderHistory(source), MAX_SECTION_LENGTH),
    setup: limitText(renderSetup(entry, source), MAX_SECTION_LENGTH),
    rules: limitText(renderRules(source), MAX_SECTION_LENGTH),
    strategy: limitText(renderStrategy(source), MAX_SECTION_LENGTH),
    variations: limitText(renderVariations(source), MAX_SECTION_LENGTH),
  };
}

async function main() {
  const replacements = await readReplacementEntries();
  const entries = [];
  for (const filePath of await assetFiles(AUTHORED_GAMES_DIR)) {
    const entry = await buildEntry(filePath);
    if (entry) {
      entries.push(entry);
    }
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
    '  releaseStatus: string;',
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
