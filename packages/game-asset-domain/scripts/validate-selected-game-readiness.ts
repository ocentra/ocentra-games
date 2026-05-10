import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import {
  validateSelectedGameBundleReadiness,
  type SelectedGameReadinessIssue,
} from '../src/ui/selectedGame/SelectedGameReadiness';

interface AssetEnvelope {
  system?: {
    guid?: string;
    assetType?: string;
    displayName?: string;
    treePath?: string;
    gameId?: string;
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

function issue(severity: 'error' | 'warning', code: string, path: string, message: string): SelectedGameReadinessIssue {
  return { severity, code, path, message };
}

function pathForAsset(asset: AssetEnvelope | null, fallback = ''): string {
  if (!asset) {
    return normalizeResourcePath(fallback);
  }
  return normalizeResourcePath(asText(asset.system?.treePath) || assetPathByGuid.get(asset.system?.guid ?? '') || fallback);
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

function layoutSliceRefsOwnAsset(layoutData: Record<string, unknown>, layoutTreePath: string, kind: 'selected-game' | 'lobby'): boolean {
  const slices = Array.isArray(layoutData.slices) ? layoutData.slices : [];
  const matchingSlices = slices.filter((slice): slice is Record<string, unknown> => {
    const record = asRecord(slice);
    return kind === 'selected-game'
      ? asText(record.type) === 'selected-game'
      : asText(record.id).includes('lobby') || asText(record.type) === 'custom';
  });
  if (matchingSlices.length === 0) {
    return false;
  }
  return matchingSlices.some((slice) => {
    const sourceAssetPath = normalizeResourcePath(asText(slice.sourceAssetPath).split('#')[0] ?? '');
    const controlsAssetPath = normalizeResourcePath(asText(slice.controlsAssetPath).split('#')[0] ?? '');
    return kind === 'selected-game'
      ? controlsAssetPath === layoutTreePath && sourceAssetPath.length > 0
      : sourceAssetPath === layoutTreePath || controlsAssetPath === layoutTreePath;
  });
}

function validateLayoutRef(
  refKey: 'selectedGameLayoutAsset' | 'lobbyLayoutAsset',
  kind: 'selected-game' | 'lobby',
  gameMode: AssetEnvelope,
  gameModePath: string,
  gameId: string,
): SelectedGameReadinessIssue[] {
  const issues: SelectedGameReadinessIssue[] = [];
  const ref = dataOf(gameMode)[refKey];
  const refRecord = asRecord(ref);
  const refPath = normalizeResourcePath(asText(refRecord.path));
  const layout = loadAssetFromRef(ref);
  const label = kind === 'selected-game' ? 'selected-game' : 'lobby';

  if (Object.keys(refRecord).length === 0) {
    return [
      issue('error', `missing-${label}-layout-ref`, `data.${refKey}`, `CardGameMode must reference its ${label} PageLayout asset.`),
    ];
  }

  if (!layout) {
    return [
      issue('error', `unresolved-${label}-layout-ref`, `data.${refKey}`, `Referenced ${label} PageLayout could not be resolved from guid or path.`),
    ];
  }

  const gameGuid = asText(gameMode.system?.guid);
  const gameDir = gameModePath.replace(/\/[^/]*$/, '');
  const layoutData = dataOf(layout);
  const layoutTreePath = pathForAsset(layout, refPath);
  const layoutPreviewRef = asRecord(asRecord(layoutData.preview).sampleGameRef);
  const layoutGuid = asText(layout.system?.guid);

  if (layout.system?.assetType !== 'PageLayout') {
    issues.push(issue('error', `${label}-layout-wrong-asset-type`, `data.${refKey}.assetType`, `${refKey} must point to a PageLayout asset.`));
  }
  if (asText(refRecord.assetType) && asText(refRecord.assetType) !== 'PageLayout') {
    issues.push(issue('error', `${label}-layout-ref-wrong-asset-type`, `data.${refKey}.assetType`, `${refKey} ref must declare assetType PageLayout.`));
  }
  if (layoutData.kind !== kind) {
    issues.push(issue('error', `${label}-layout-wrong-kind`, `${layoutTreePath}.data.kind`, `${refKey} points to PageLayout kind "${String(layoutData.kind)}", expected "${kind}".`));
  }
  if (!layoutTreePath.startsWith(`${gameDir}/`)) {
    issues.push(issue('error', `${label}-layout-outside-game-folder`, `${layoutTreePath}.system.treePath`, `${refKey} must live under the authored game folder ${gameDir}.`));
  }
  if (asText(layout.system?.gameId) !== gameId) {
    issues.push(issue('error', `${label}-layout-game-id-mismatch`, `${layoutTreePath}.system.gameId`, `${refKey} system.gameId must be ${gameId}.`));
  }
  if (asText(refRecord.guid) && asText(refRecord.guid) !== layoutGuid) {
    issues.push(issue('error', `${label}-layout-guid-mismatch`, `data.${refKey}.guid`, `${refKey} guid does not match the referenced PageLayout asset.`));
  }
  if (refPath && refPath !== layoutTreePath) {
    issues.push(issue('error', `${label}-layout-path-mismatch`, `data.${refKey}.path`, `${refKey} path does not match the referenced PageLayout treePath.`));
  }
  if (asText(layoutPreviewRef.gameId) !== gameId) {
    issues.push(issue('error', `${label}-layout-preview-game-id-mismatch`, `${layoutTreePath}.data.preview.sampleGameRef.gameId`, `${refKey} preview sample must be locked to ${gameId}.`));
  }
  if (gameGuid && asText(layoutPreviewRef.guid) !== gameGuid) {
    issues.push(issue('error', `${label}-layout-preview-guid-mismatch`, `${layoutTreePath}.data.preview.sampleGameRef.guid`, `${refKey} preview sample guid must match the owning CardGameMode.`));
  }
  if (normalizeResourcePath(asText(layoutPreviewRef.path)) !== gameModePath) {
    issues.push(issue('error', `${label}-layout-preview-path-mismatch`, `${layoutTreePath}.data.preview.sampleGameRef.path`, `${refKey} preview sample path must point at ${gameModePath}.`));
  }
  if (!layoutSliceRefsOwnAsset(layoutData, layoutTreePath, kind)) {
    issues.push(issue('error', `${label}-layout-slice-contract`, `${layoutTreePath}.data.slices`, `${refKey} must include an editable ${label} slice owned by the PageLayout asset.`));
  }

  return issues;
}

function validateGamePageLayoutContract(gameMode: AssetEnvelope, gameModePath: string): SelectedGameReadinessIssue[] {
  const gameId = asText(dataOf(gameMode).gameId) || asText(gameMode.system?.gameId);
  if (!gameId) {
    return [
      issue('error', 'missing-game-id-for-layout-contract', 'data.gameId', 'CardGameMode must have a gameId before layout contract validation.'),
    ];
  }
  return [
    ...validateLayoutRef('selectedGameLayoutAsset', 'selected-game', gameMode, gameModePath, gameId),
    ...validateLayoutRef('lobbyLayoutAsset', 'lobby', gameMode, gameModePath, gameId),
  ];
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

  const readinessReport = validateSelectedGameBundleReadiness({
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
  const layoutIssues = validateGamePageLayoutContract(gameMode, normalizeResourcePath(gameTreePath));
  return {
    ...readinessReport,
    ok: readinessReport.ok && layoutIssues.every((layoutIssue) => layoutIssue.severity !== 'error'),
    issues: [
      ...readinessReport.issues,
      ...layoutIssues,
    ],
  };
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
