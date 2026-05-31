import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
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
const PLACEHOLDER_RESOURCE_ROOT = path.resolve(RESOURCES_ROOT, 'AppAssets/PlaceHolders');
const failOnWarnings = process.argv.includes('--fail-on-warning') || process.argv.includes('--strict');
const IMAGE_EXTENSIONS = new Set(['.gif', '.jpg', '.jpeg', '.png', '.webp']);
const PUBLIC_RELEASE_STATUSES = new Set(['Available', 'ComingSoon']);
const SHA_256_PATTERN = /^[a-f0-9]{64}$/;
const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const REQUIRED_LINKED_MODEL_KEYS = ['deckModel', 'actionSet', 'validationFixtures'] as const;
const NON_BLOCKING_WARNING_CODES = new Set([
  'visual-art-needs-final',
  'placeholder-image-used',
  'deck-card-image-missing',
  'deck-card-image-unknown',
  'deck-card-image-placeholder',
  'deck-too-small-for-initial-deal',
  'game-info-incomplete-flag',
  'game-info-not-complete',
]);

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

function findResourceFiles(dir: string, extensions: ReadonlySet<string>, fileList: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findResourceFiles(fullPath, extensions, fileList);
      continue;
    }
    if (extensions.has(path.extname(entry.name).toLowerCase())) {
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(isMeaningful);
  }
  if (typeof value === 'object') {
    return Object.values(value).some(isMeaningful);
  }
  return false;
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

function releaseBlockingSeverity(bundle: LoadedGameBundle): 'error' | 'warning' {
  const releaseStatus = asText(dataOf(bundle.gameMode).releaseStatus);
  return PUBLIC_RELEASE_STATUSES.has(releaseStatus) ? 'error' : 'warning';
}

function sha256File(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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
const imageHashes = new Set(findResourceFiles(RESOURCES_ROOT, IMAGE_EXTENSIONS).map(sha256File));
const placeholderImageHashes = new Set(
  fs.existsSync(PLACEHOLDER_RESOURCE_ROOT)
    ? findResourceFiles(PLACEHOLDER_RESOURCE_ROOT, IMAGE_EXTENSIONS).map(sha256File)
    : [],
);

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

interface LoadedGameBundle {
  gameMode: AssetEnvelope;
  gameInfo: AssetEnvelope | null;
  rules: AssetEnvelope | null;
  scoring: AssetEnvelope | null;
  mechanics: AssetEnvelope | null;
  deck: AssetEnvelope | null;
  images: AssetEnvelope | null;
  deckModel: AssetEnvelope | null;
  actions: AssetEnvelope | null;
  validationFixtures: AssetEnvelope | null;
  gameTreePath: string;
}

function validateGameAssetContract(bundle: LoadedGameBundle): SelectedGameReadinessIssue[] {
  const gameModeData = dataOf(bundle.gameMode);
  const releaseStatus = asText(gameModeData.releaseStatus);
  const issues: SelectedGameReadinessIssue[] = [];

  if (!releaseStatus) {
    issues.push(issue('error', 'missing-release-status', `${bundle.gameTreePath}.data.releaseStatus`, 'CardGameMode must declare releaseStatus.'));
    return issues;
  }

  issues.push(...validateImageContract(bundle));
  issues.push(...validateGameInfoContract(bundle));
  issues.push(...validateMechanicsContract(bundle));
  issues.push(...validateDeckContract(bundle));
  return issues;
}

function validateImageContract(bundle: LoadedGameBundle): SelectedGameReadinessIssue[] {
  const gameModeData = dataOf(bundle.gameMode);
  const imageData = dataOf(bundle.images);
  const issues: SelectedGameReadinessIssue[] = [];
  const bannerHash = asText(gameModeData.bannerImage);
  const iconHash = asText(gameModeData.gameIcon);
  const slides = asArray(imageData.slides).map(asRecord);

  requireKnownImageHash(issues, bannerHash, `${bundle.gameTreePath}.data.bannerImage`, 'bannerImage');
  requireKnownImageHash(issues, iconHash, `${bundle.gameTreePath}.data.gameIcon`, 'gameIcon');

  if (!bundle.images) {
    issues.push(issue('error', 'missing-carousel-asset', `${bundle.gameTreePath}.data.carouselImagesAsset`, 'CardGameMode must resolve an ImageCarousel asset.'));
    return issues;
  }

  if (bundle.images.system?.assetType !== 'ImageCarousel') {
    issues.push(issue('error', 'carousel-wrong-asset-type', `${pathForAsset(bundle.images)}.system.assetType`, 'carouselImagesAsset must resolve to ImageCarousel.'));
  }

  if (imageData.visualAssetStatus === 'needs_final_art') {
    issues.push(issue('warning', 'visual-art-needs-final', `${pathForAsset(bundle.images)}.data.visualAssetStatus`, 'Carousel is intentionally using non-final art and needs replacement before release quality is final.'));
  }

  if (slides.length < 3) {
    issues.push(issue('error', 'carousel-too-small', `${pathForAsset(bundle.images)}.data.slides`, 'Game carousel must contain at least 3 slides.'));
  }

  const slideHashes = new Set<string>();
  slides.forEach((slide, index) => {
    const slidePath = `${pathForAsset(bundle.images)}.data.slides.${index}`;
    const imageHash = asText(slide.imageHash);
    if (!asText(slide.id)) {
      issues.push(issue('error', 'carousel-slide-missing-id', `${slidePath}.id`, 'Carousel slide must have a stable id.'));
    }
    if (!asText(slide.label)) {
      issues.push(issue('error', 'carousel-slide-missing-label', `${slidePath}.label`, 'Carousel slide must have a non-empty label.'));
    }
    if (!asText(slide.alt)) {
      issues.push(issue('error', 'carousel-slide-missing-alt', `${slidePath}.alt`, 'Carousel slide must have non-empty alt text.'));
    }
    requireKnownImageHash(issues, imageHash, `${slidePath}.imageHash`, 'carousel slide imageHash');
    if (imageHash) {
      slideHashes.add(imageHash.toLowerCase());
    }
  });

  if (bannerHash && !slideHashes.has(bannerHash.toLowerCase())) {
    issues.push(issue('error', 'banner-not-in-carousel', `${bundle.gameTreePath}.data.bannerImage`, 'bannerImage must match one of the carousel slide image hashes.'));
  }

  const logoImageHash = asText(imageData.logoImageHash);
  if (logoImageHash) {
    requireKnownImageHash(issues, logoImageHash, `${pathForAsset(bundle.images)}.data.logoImageHash`, 'logoImageHash');
  }

  return issues;
}

function requireKnownImageHash(issues: SelectedGameReadinessIssue[], hash: string, issuePath: string, fieldName: string): void {
  if (!hash) {
    issues.push(issue('error', 'missing-image-hash', issuePath, `${fieldName} must be a non-empty sha256 image hash.`));
    return;
  }
  if (!SHA_256_PATTERN.test(hash)) {
    issues.push(issue('error', 'invalid-image-hash', issuePath, `${fieldName} must be a 64-character lowercase sha256 hash.`));
    return;
  }
  if (!imageHashes.has(hash.toLowerCase())) {
    issues.push(issue('error', 'unknown-image-hash', issuePath, `${fieldName} does not match any image file under Resources.`));
    return;
  }
  if (placeholderImageHashes.has(hash.toLowerCase())) {
    issues.push(issue('warning', 'placeholder-image-used', issuePath, `${fieldName} uses shared fallback art and needs a final game-specific image.`));
  }
}

function validateGameInfoContract(bundle: LoadedGameBundle): SelectedGameReadinessIssue[] {
  const issues: SelectedGameReadinessIssue[] = [];
  const gameInfoData = dataOf(bundle.gameInfo);
  const gameInfoPath = pathForAsset(bundle.gameInfo, `${bundle.gameTreePath}.gameInfoAsset`);
  const completeness = asRecord(gameInfoData.completeness);
  const quality = asText(gameInfoData.quality);
  const releaseSeverity = releaseBlockingSeverity(bundle);

  if (!bundle.gameInfo) {
    issues.push(issue('error', 'missing-game-info-asset', `${bundle.gameTreePath}.data.gameInfoAsset`, 'CardGameMode must resolve a GameInfo asset.'));
    return issues;
  }

  if (quality !== 'complete') {
    issues.push(issue(releaseSeverity, 'game-info-not-complete', `${gameInfoPath}.data.quality`, 'GameInfo quality must be complete before public release; WIP assets keep this as source-review work-left.'));
  }

  for (const field of ['overview', 'history', 'setup', 'rules', 'strategy', 'variations', 'ai', 'sources']) {
    if (completeness[field] !== true) {
      issues.push(issue(releaseSeverity, 'game-info-incomplete-flag', `${gameInfoPath}.data.completeness.${field}`, `GameInfo completeness.${field} must be true before public release; WIP assets keep this as source-review work-left.`));
    }
  }

  for (const field of ['historyContent', 'setupContent', 'variationsContent', 'aiContent', 'sourcesContent']) {
    if (!isMeaningful(gameInfoData[field])) {
      issues.push(issue('error', 'missing-game-info-content', `${gameInfoPath}.data.${field}`, `GameInfo must include ${field}.`));
    }
  }

  const sourcesContent = asRecord(gameInfoData.sourcesContent);
  const primarySources = asArray(sourcesContent.primary).map(asRecord);
  if (primarySources.length === 0) {
    issues.push(issue('error', 'missing-primary-sources', `${gameInfoPath}.data.sourcesContent.primary`, 'GameInfo must list primary source records.'));
  }
  primarySources.forEach((source, index) => {
    if (!asText(source.name)) {
      issues.push(issue('error', 'source-missing-name', `${gameInfoPath}.data.sourcesContent.primary.${index}.name`, 'Source record must include a name.'));
    }
    if (!asText(source.url)) {
      issues.push(issue('error', 'source-missing-url', `${gameInfoPath}.data.sourcesContent.primary.${index}.url`, 'Source record must include a URL or asset URL.'));
    }
  });

  return issues;
}

function validateMechanicsContract(bundle: LoadedGameBundle): SelectedGameReadinessIssue[] {
  const issues: SelectedGameReadinessIssue[] = [];
  const gameModeData = dataOf(bundle.gameMode);
  const gameInfoData = dataOf(bundle.gameInfo);
  const mechanicsData = dataOf(bundle.mechanics);
  const actionSetData = dataOf(bundle.actions);
  const gameInfoPath = pathForAsset(bundle.gameInfo, `${bundle.gameTreePath}.gameInfoAsset`);
  const mechanicsPath = pathForAsset(bundle.mechanics, `${bundle.gameTreePath}.mechanicsAsset`);
  const actionSetPath = pathForAsset(bundle.actions, `${bundle.gameTreePath}.actionSet`);

  if (!bundle.mechanics) {
    issues.push(issue('error', 'missing-mechanics-asset', `${bundle.gameTreePath}.data.mechanicsAsset`, 'CardGameMode must resolve a CardGameMechanics asset.'));
    return issues;
  }

  const linkedAssetKeys = asRecord(asRecord(gameInfoData.mechanicsContract).linkedAssetKeys);
  for (const key of REQUIRED_LINKED_MODEL_KEYS) {
    if (!asText(linkedAssetKeys[key])) {
      issues.push(issue('error', 'missing-linked-model-key', `${gameInfoPath}.data.mechanicsContract.linkedAssetKeys.${key}`, `mechanicsContract must link ${key}.`));
    }
  }

  if (!bundle.deckModel) {
    issues.push(issue('error', 'unresolved-deck-model', `${gameInfoPath}.data.mechanicsContract.linkedAssetKeys.deckModel`, 'Linked deck model asset must resolve.'));
  }
  if (!bundle.actions) {
    issues.push(issue('error', 'unresolved-action-set', `${gameInfoPath}.data.mechanicsContract.linkedAssetKeys.actionSet`, 'Linked action set asset must resolve.'));
  }
  if (!bundle.validationFixtures) {
    issues.push(issue('error', 'unresolved-validation-fixtures', `${gameInfoPath}.data.mechanicsContract.linkedAssetKeys.validationFixtures`, 'Linked validation fixtures asset must resolve.'));
  }

  const mechanicsInitialHand = asFiniteNumber(mechanicsData.initialHandSize);
  const gameInitialHand = asFiniteNumber(gameModeData.initialNumberOfCards);
  const deckModelInitialHand = asFiniteNumber(dataOf(bundle.deckModel).initialHandSize);
  if (mechanicsInitialHand === null || gameInitialHand === null || deckModelInitialHand === null) {
    issues.push(issue('error', 'missing-initial-hand-size', `${mechanicsPath}.data.initialHandSize`, 'Game mode, mechanics, and deck model must all declare initial hand size.'));
  } else if (mechanicsInitialHand !== gameInitialHand || mechanicsInitialHand !== deckModelInitialHand) {
    issues.push(issue('error', 'initial-hand-size-mismatch', `${mechanicsPath}.data.initialHandSize`, 'Game mode, mechanics, and deck model initial hand sizes must match.'));
  }

  const mechanicsPlayerConfig = asRecord(mechanicsData.playerConfig);
  assertSameNumber(issues, asFiniteNumber(gameModeData.minPlayers), asFiniteNumber(mechanicsPlayerConfig.minPlayers), `${bundle.gameTreePath}.data.minPlayers`, `${mechanicsPath}.data.playerConfig.minPlayers`, 'minPlayers');
  assertSameNumber(issues, asFiniteNumber(gameModeData.maxPlayers), asFiniteNumber(mechanicsPlayerConfig.maxPlayers), `${bundle.gameTreePath}.data.maxPlayers`, `${mechanicsPath}.data.playerConfig.maxPlayers`, 'maxPlayers');

  const phases = asArray(mechanicsData.phases).map(asRecord);
  const firstPhase = phases[0] ?? {};
  if (asText(firstPhase.actor) !== 'system' || !asArray(firstPhase.legalActions).includes('setup_round')) {
    issues.push(issue('error', 'missing-system-setup-phase', `${mechanicsPath}.data.phases.0`, 'Game mechanics must start with an automatic setup_round system phase.'));
  }

  const progression = asArray(mechanicsData.progression).map((value) => asText(value)).filter(Boolean);
  if (progression.length > 0) {
    const phaseIds = new Set(phases.map((phase) => asText(phase.id)));
    for (const phaseId of progression) {
      if (!phaseIds.has(phaseId)) {
        issues.push(issue('error', 'progression-unknown-phase', `${mechanicsPath}.data.progression`, `Progression includes unknown phase ${phaseId}.`));
      }
    }
  }

  const mechanicsActionIds = collectSupportedMechanicsActionIds(mechanicsData);
  const actionSetIds = collectSupportedActionSetIds(actionSetData);
  phases.forEach((phase, phaseIndex) => {
    asArray(phase.legalActions).forEach((value) => {
      const actionId = asText(value);
      if (!actionId) {
        return;
      }
      if (!mechanicsActionIds.has(actionId)) {
        issues.push(issue('error', 'phase-legal-action-not-supported', `${mechanicsPath}.data.phases.${phaseIndex}.legalActions`, `Mechanics phase lists unsupported action ${actionId}.`));
      }
      if (bundle.actions && !actionSetIds.has(actionId)) {
        issues.push(issue('error', 'phase-legal-action-missing-action-set', `${actionSetPath}.data.actionModel.actionIds`, `Action set must include legal mechanics action ${actionId}.`));
      }
    });
  });

  const runtimeIntegration = asRecord(mechanicsData.runtimeIntegration);
  const runtimeReadiness = asText(runtimeIntegration.readiness);
  if (/not_.*ready|not.*pilot/i.test(runtimeReadiness)) {
    issues.push(issue('error', 'runtime-marked-not-ready', `${mechanicsPath}.data.runtimeIntegration.readiness`, 'Game asset contract cannot be marked as not pilot/runtime ready.'));
  }

  return issues;
}

function collectSupportedMechanicsActionIds(mechanicsData: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();
  Object.entries(asRecord(mechanicsData.actions)).forEach(([actionId, value]) => {
    if (asRecord(value).supported === true) {
      ids.add(actionId);
    }
  });
  asArray(mechanicsData.customActions).map(asRecord).forEach((action) => {
    if (action.supported === true && asText(action.id)) {
      ids.add(asText(action.id));
    }
  });
  return ids;
}

function collectSupportedActionSetIds(actionSetData: Record<string, unknown>): Set<string> {
  const ids = new Set(asArray(asRecord(actionSetData.actionModel).actionIds).map(asText).filter(Boolean));
  Object.entries(asRecord(actionSetData.actions)).forEach(([actionId, value]) => {
    if (asRecord(value).supported === true) {
      ids.add(actionId);
    }
  });
  asArray(actionSetData.customActions).map(asRecord).forEach((action) => {
    if (action.supported === true && asText(action.id)) {
      ids.add(asText(action.id));
    }
  });
  return ids;
}

function assertSameNumber(
  issues: SelectedGameReadinessIssue[],
  left: number | null,
  right: number | null,
  leftPath: string,
  rightPath: string,
  label: string,
): void {
  if (left === null || right === null) {
    issues.push(issue('error', `missing-${label.toLowerCase()}`, `${leftPath} / ${rightPath}`, `${label} must be declared in both game mode and mechanics.`));
    return;
  }
  if (left !== right) {
    issues.push(issue('error', `${label.toLowerCase()}-mismatch`, `${leftPath} / ${rightPath}`, `${label} must match between game mode and mechanics.`));
  }
}

function validateDeckContract(bundle: LoadedGameBundle): SelectedGameReadinessIssue[] {
  const issues: SelectedGameReadinessIssue[] = [];
  const gameModeData = dataOf(bundle.gameMode);
  const mechanicsData = dataOf(bundle.mechanics);
  const deckData = dataOf(bundle.deck);
  const deckModelData = dataOf(bundle.deckModel);
  const deckPath = pathForAsset(bundle.deck, `${bundle.gameTreePath}.deckAsset`);
  const mechanicsPath = pathForAsset(bundle.mechanics, `${bundle.gameTreePath}.mechanicsAsset`);
  const deckModelPath = pathForAsset(bundle.deckModel, `${bundle.gameTreePath}.deckModel`);

  if (!bundle.deck) {
    issues.push(issue('error', 'missing-physical-deck', `${bundle.gameTreePath}.data.deckAsset`, 'CardGameMode must resolve a physical Deck asset.'));
    return issues;
  }

  const deckType = asText(mechanicsData.deckType);
  const suitSet = asText(mechanicsData.suitSet);
  const rankSet = asText(mechanicsData.rankSet);
  const supportedTriples = asArray(deckData.supportedTriples).map(asRecord);
  if (!supportedTriples.some((triple) => asText(triple.deckType) === deckType && asText(triple.suitSet) === suitSet && asText(triple.rankSet) === rankSet)) {
    issues.push(issue('error', 'deck-triple-not-supported', `${deckPath}.data.supportedTriples`, `Deck must support ${deckType} / ${suitSet} / ${rankSet}.`));
  }

  const mechanicsDeckCount = asFiniteNumber(mechanicsData.deckCount);
  const deckModelDeckCount = asFiniteNumber(deckModelData.deckCount);
  const gameMinDecks = asFiniteNumber(gameModeData.minDecks);
  if (mechanicsDeckCount === null || deckModelDeckCount === null || gameMinDecks === null) {
    issues.push(issue('error', 'missing-deck-count', `${mechanicsPath}.data.deckCount / ${deckModelPath}.data.deckCount`, 'Game mode, mechanics, and deck model must declare deck count.'));
  } else if (mechanicsDeckCount !== deckModelDeckCount || mechanicsDeckCount !== gameMinDecks) {
    issues.push(issue('error', 'deck-count-mismatch', `${mechanicsPath}.data.deckCount / ${deckModelPath}.data.deckCount`, 'Game mode, mechanics, and deck model deck counts must match.'));
  }

  const compositionCount = asArray(deckData.composition)
    .map(asRecord)
    .reduce((total, entry) => total + (asFiniteNumber(entry.copies) ?? 0), 0);
  const maxPlayers = asFiniteNumber(gameModeData.maxPlayers) ?? 0;
  const initialHandSize = asFiniteNumber(mechanicsData.initialHandSize) ?? 0;
  const needsTurnedTrump = asRecord(mechanicsData.trumpConfig).hasTrump === true
    && /turn|upcard|revealed/i.test(asText(asRecord(mechanicsData.trumpConfig).trumpDetermination));
  const requiredCards = (maxPlayers * initialHandSize) + (needsTurnedTrump ? 1 : 0);
  const totalDeckCards = compositionCount * (mechanicsDeckCount ?? 1);
  if (requiredCards > 0 && totalDeckCards < requiredCards) {
    const severity = releaseBlockingSeverity(bundle);
    const reviewText = severity === 'warning' ? ' This WIP game needs source review for variable player counts, deal policy, or deck count before public release.' : '';
    issues.push(issue(severity, 'deck-too-small-for-initial-deal', `${deckPath}.data.composition`, `Deck has ${totalDeckCards} card(s), but max players and setup require at least ${requiredCards}.${reviewText}`));
  }

  issues.push(...validateDeckCardVisuals(bundle.deck, deckPath));
  return issues;
}

function validateDeckCardVisuals(deck: AssetEnvelope | null, deckPath: string): SelectedGameReadinessIssue[] {
  const issues: SelectedGameReadinessIssue[] = [];
  const counts = {
    unresolved: 0,
    missing: 0,
    unknown: 0,
    placeholder: 0,
  };

  asArray(dataOf(deck).composition).map(asRecord).forEach((entry) => {
    const cardAsset = loadAssetFromRef(entry.pieceTemplate);
    if (!cardAsset) {
      counts.unresolved += 1;
      return;
    }
    const imageHash = asText(dataOf(cardAsset).imageHash).toLowerCase();
    if (!imageHash || imageHash === ZERO_HASH) {
      counts.missing += 1;
      return;
    }
    if (!imageHashes.has(imageHash)) {
      counts.unknown += 1;
      return;
    }
    if (placeholderImageHashes.has(imageHash)) {
      counts.placeholder += 1;
    }
  });

  if (counts.unresolved > 0) {
    issues.push(issue('error', 'deck-card-asset-unresolved', `${deckPath}.data.composition`, `${counts.unresolved} deck composition card reference(s) do not resolve.`));
  }
  if (counts.missing > 0) {
    issues.push(issue('warning', 'deck-card-image-missing', `${deckPath}.data.composition`, `${counts.missing} deck card asset(s) have no final image hash.`));
  }
  if (counts.unknown > 0) {
    issues.push(issue('warning', 'deck-card-image-unknown', `${deckPath}.data.composition`, `${counts.unknown} deck card image hash(es) do not match resource image files.`));
  }
  if (counts.placeholder > 0) {
    issues.push(issue('warning', 'deck-card-image-placeholder', `${deckPath}.data.composition`, `${counts.placeholder} deck card asset(s) use shared fallback art.`));
  }

  return issues;
}

const gameModeFiles = findAssetFiles(GAMES_ROOT)
  .filter((filePath) => readAsset(filePath).system?.assetType === 'CardGameMode');

const reports = gameModeFiles.map((gameModePath) => {
  const gameMode = readAsset(gameModePath);
  const gameModeData = dataOf(gameMode);
  const releaseStatus = asText(gameModeData.releaseStatus) || 'missing';
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

  const loadedBundle = {
    gameMode,
    gameInfo,
    rules,
    scoring,
    mechanics,
    deck,
    images,
    deckModel,
    actions,
    validationFixtures,
    gameTreePath: normalizeResourcePath(gameTreePath),
  };
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
  const assetContractIssues = validateGameAssetContract(loadedBundle);
  return {
    ...readinessReport,
    releaseStatus,
    ok: readinessReport.ok
      && layoutIssues.every((layoutIssue) => layoutIssue.severity !== 'error')
      && assetContractIssues.every((assetIssue) => assetIssue.severity !== 'error'),
    issues: [
      ...readinessReport.issues,
      ...layoutIssues,
      ...assetContractIssues,
    ],
  };
});

let blockingCount = 0;
let warningCount = 0;
for (const report of reports) {
  const blocking = report.issues.filter((issue) => issue.severity === 'error' || (failOnWarnings && !NON_BLOCKING_WARNING_CODES.has(issue.code)));
  warningCount += report.issues.filter((issue) => issue.severity === 'warning').length;
  blockingCount += blocking.length;
  if (report.issues.length === 0) {
    const statusLabel = PUBLIC_RELEASE_STATUSES.has(report.releaseStatus)
      ? 'public ready'
      : `asset contract valid (${report.releaseStatus})`;
    console.log(`${report.label}: ${statusLabel}`);
    continue;
  }
  const issueLabel = report.ok
    ? `asset contract valid with warnings (${report.releaseStatus})`
    : `not ready (${report.releaseStatus})`;
  console.log(`${report.label}: ${issueLabel}`);
  for (const issue of report.issues) {
    console.log(`  ${issue.severity.toUpperCase()} [${issue.code}] ${issue.path}: ${issue.message}`);
  }
}

console.log(`\nSelected-game readiness scanned ${reports.length} game mode asset(s).`);
if (warningCount > 0) {
  console.warn(`Selected-game readiness found ${warningCount} work-left warning(s).`);
}
if (blockingCount > 0) {
  console.error(`Selected-game readiness found ${blockingCount} blocking issue(s).`);
  process.exit(1);
}
