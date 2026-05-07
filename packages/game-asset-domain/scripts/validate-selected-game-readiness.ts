import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { validateSelectedGameBundleReadiness } from '../src/ui/selectedGame/SelectedGameReadiness';

interface AssetEnvelope {
  system?: {
    guid?: string;
    assetType?: string;
    displayName?: string;
    treePath?: string;
  };
  data?: Record<string, unknown>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_ROOT = path.resolve(__dirname, '../../asset-editor/Resources');
const GAMES_ROOT = path.resolve(RESOURCES_ROOT, 'GameMode/CardGames/Games');
const failOnWarnings = process.argv.includes('--fail-on-warning') || process.argv.includes('--strict');

function findAssetFiles(dir: string, fileList: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findAssetFiles(fullPath, fileList);
      continue;
    }
    if (entry.name.endsWith('.asset')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function readAsset(filePath: string): AssetEnvelope {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as AssetEnvelope;
}

function dataOf(asset: AssetEnvelope | null): Record<string, unknown> {
  return asset?.data && typeof asset.data === 'object' ? asset.data : {};
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeResourcePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^Resources\//i, '')
    .toLowerCase();
}

function relativeResourcePath(filePath: string): string {
  return normalizeResourcePath(path.relative(RESOURCES_ROOT, filePath));
}

const assetFiles = findAssetFiles(RESOURCES_ROOT);
const assetsByPath = new Map<string, AssetEnvelope>();
const assetsByGuid = new Map<string, AssetEnvelope>();
const assetPathByGuid = new Map<string, string>();

for (const filePath of assetFiles) {
  const asset = readAsset(filePath);
  const relativePath = relativeResourcePath(filePath);
  assetsByPath.set(relativePath, asset);
  if (asset.system?.guid) {
    assetsByGuid.set(asset.system.guid, asset);
    assetPathByGuid.set(asset.system.guid, relativePath);
  }
}

function loadAssetFromRef(ref: unknown): AssetEnvelope | null {
  const record = asRecord(ref);
  const guid = asText(record.guid);
  const refPath = asText(record.path);
  if (guid && assetsByGuid.has(guid)) {
    return assetsByGuid.get(guid) ?? null;
  }
  if (refPath) {
    return assetsByPath.get(normalizeResourcePath(refPath)) ?? null;
  }
  return null;
}

function loadLinkedAsset(basePath: string, fileName: string): AssetEnvelope | null {
  if (!fileName) {
    return null;
  }
  const baseDir = basePath.replace(/\/[^/]*$/, '');
  return assetsByPath.get(normalizeResourcePath(`${baseDir}/${fileName}`)) ?? null;
}

function loadModelRef(mechanics: AssetEnvelope | null, keys: string[]): AssetEnvelope | null {
  const modelRefs = asRecord(dataOf(mechanics).modelRefs);
  for (const key of keys) {
    const asset = loadAssetFromRef(modelRefs[key]);
    if (asset) {
      return asset;
    }
  }
  return null;
}

const gameModeFiles = findAssetFiles(GAMES_ROOT)
  .filter((filePath) => readAsset(filePath).system?.assetType === 'CardGameMode');

const reports = gameModeFiles.map((gameModePath) => {
  const gameMode = readAsset(gameModePath);
  const gameModeData = dataOf(gameMode);
  const gameInfo = loadAssetFromRef(gameModeData.gameInfoAsset);
  const rules = loadAssetFromRef(gameModeData.gameRulesAsset);
  const scoring = loadAssetFromRef(gameModeData.scoringAsset);
  const strategy = loadAssetFromRef(gameModeData.strategyAsset);
  const mechanics = loadAssetFromRef(gameModeData.mechanicsAsset);
  const deck = loadAssetFromRef(gameModeData.deckAsset);
  const images = loadAssetFromRef(gameModeData.carouselImagesAsset);
  const ranking = loadAssetFromRef(gameModeData.rankingAsset)
    ?? loadAssetFromRef(dataOf(scoring).rankingAsset)
    ?? loadAssetFromRef(dataOf(scoring).cardRankingAsset);
  const gameTreePath = asText(gameMode.system?.treePath) || assetPathByGuid.get(gameMode.system?.guid ?? '') || relativeResourcePath(gameModePath);
  const linkedAssetKeys = asRecord(asRecord(dataOf(gameInfo).mechanicsContract).linkedAssetKeys);
  const deckModel = loadLinkedAsset(gameTreePath, asText(linkedAssetKeys.deckModel))
    ?? loadModelRef(mechanics, ['deck']);
  const actions = loadLinkedAsset(gameTreePath, asText(linkedAssetKeys.actionSet))
    ?? loadModelRef(mechanics, ['actionSet', 'actions']);
  const validationFixtures = loadLinkedAsset(gameTreePath, asText(linkedAssetKeys.validationFixtures))
    ?? loadModelRef(mechanics, ['validation']);

  return validateSelectedGameBundleReadiness({
    gameMode,
    gameInfo,
    rules,
    strategy,
    scoring,
    deckModel,
    deck,
    ranking,
    mechanics,
    actions,
    validationFixtures,
    images,
  }, {
    label: gameMode.system?.displayName ?? gameTreePath,
  });
});

let blockingCount = 0;
for (const report of reports) {
  const blocking = report.issues.filter((issue) => issue.severity === 'error' || failOnWarnings);
  blockingCount += blocking.length;
  if (report.issues.length === 0) {
    console.log(`${report.label}: ready`);
    continue;
  }
  console.log(`${report.label}: ${report.ok ? 'ready with warnings' : 'not ready'}`);
  for (const issue of report.issues) {
    console.log(`  ${issue.severity.toUpperCase()} [${issue.code}] ${issue.path}: ${issue.message}`);
  }
}

console.log(`\nSelected-game readiness scanned ${reports.length} game mode asset(s).`);
if (blockingCount > 0) {
  console.error(`Selected-game readiness found ${blockingCount} blocking issue(s).`);
  process.exit(1);
}
