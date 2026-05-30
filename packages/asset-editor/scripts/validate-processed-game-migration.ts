import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import JSON5 from 'json5';
import { schema } from '@ocentra/schema-domain/effect-builder';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { createTestEventBus } from '@ocentra/eventing-domain/testing/createTestEventBus';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { validateAssetFile } from '@ocentra/game-asset-domain/schemas/asset/asset-file-schema';
import { GameModeStatus } from '@ocentra/game-asset-domain/constants/game-mode-status';
import {
  deriveProcessedGameCategory,
  loadProcessedGame,
  parseProcessedGameTaxonomyPath,
  type ProcessedGameTaxonomyPath,
} from '@ocentra/game-asset-domain/factories/ProcessedGameAssetFactory';
import { validateSelectedGameBundleReadiness } from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGameReadiness';
import { createProcessedGameModeBundle } from '@/adapters/assets/createProcessedGameModeBundle';
import type { GameModeBundle, GameModeBundleFile } from '@/adapters/assets/createGameModeBundle';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const defaultProcessedRoot = path.resolve(repoRoot, 'packages/card-games/src/processed-games');
const resourcesRoot = path.resolve(repoRoot, 'packages/asset-editor/Resources');
const placeholderResourceRoot = path.resolve(resourcesRoot, 'AppAssets/PlaceHolders');
const defaultReportPath = path.resolve(repoRoot, '.temp/processed-game-migration-report.json');

const MigrationPathSchema = schema.string().trim().min(1).brand<'MigrationPath'>();
const MigrationIssueSeveritySchema = schema.enum(['error', 'warning']);
const MigrationIssueSchema = schema.object({
  severity: MigrationIssueSeveritySchema,
  sourcePath: MigrationPathSchema,
  assetPath: MigrationPathSchema.optional(),
  code: schema.string().min(1).brand<'MigrationIssueCode'>(),
  message: schema.string().min(1),
});
const MigrationGameReportSchema = schema.object({
  sourcePath: MigrationPathSchema,
  gameName: schema.string().min(1),
  generatedFiles: schema.number().int().min(0),
  generatedAssetTypes: schema.record(schema.string(), schema.number().int().min(0)),
  ok: schema.boolean(),
  issues: schema.array(MigrationIssueSchema),
});
const MigrationSummarySchema = schema.object({
  generatedAt: schema.string().datetime(),
  processedRoot: MigrationPathSchema,
  resourcesRoot: MigrationPathSchema,
  scanned: schema.number().int().min(0),
  passed: schema.number().int().min(0),
  failed: schema.number().int().min(0),
  issueCount: schema.number().int().min(0),
  errorCount: schema.number().int().min(0),
  warningCount: schema.number().int().min(0),
});
const MigrationReportSchema = schema.object({
  summary: MigrationSummarySchema,
  games: schema.array(MigrationGameReportSchema),
});

type MigrationIssue = schema.infer<typeof MigrationIssueSchema>;
type MigrationGameReport = schema.infer<typeof MigrationGameReportSchema>;

interface CliOptions {
  processedRoot: string;
  files: string[];
  category?: ProcessedGameTaxonomyPath;
  prefix?: string;
  limit?: number;
  samplePerDeckTriple: boolean;
  reportPath: string;
  maxFailures: number;
}

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

interface ResourceIndex {
  assetsByGuid: Map<string, AssetEnvelope>;
  assetsByPath: Map<string, AssetEnvelope>;
  imageHashes: Set<string>;
  placeholderImageHashes: Set<string>;
}

interface ParsedBundle {
  files: Array<GameModeBundleFile & { parsed: AssetEnvelope }>;
  assetsByGuid: Map<string, AssetEnvelope>;
  assetsByPath: Map<string, AssetEnvelope>;
  pathByGuid: Map<string, string>;
}

const REQUIRED_ASSET_COUNTS = new Map<string, number>([
  ['CardGameMode', 1],
  ['CardGameRules', 1],
  ['Strategy', 1],
  ['CardGameScoring', 1],
  ['GameInfo', 1],
  ['CardGameLayout', 1],
  ['PageLayout', 2],
  ['ImageCarousel', 1],
  ['CardGameMechanics', 1],
  ['GamePlayerModel', 1],
  ['GameSessionModel', 1],
  ['CardGameDeckModel', 1],
  ['GameZoneModel', 1],
  ['GamePhaseFlowModel', 1],
  ['GameActionSet', 1],
  ['GameStateEventModel', 1],
  ['GameValidationFixtures', 1],
]);

const REQUIRED_MAIN_REFS = [
  'scoringAsset',
  'gameRulesAsset',
  'strategyAsset',
  'gameInfoAsset',
  'layoutAsset',
  'selectedGameLayoutAsset',
  'lobbyLayoutAsset',
  'deckAsset',
  'rankingAsset',
  'carouselImagesAsset',
  'mechanicsAsset',
] as const;

const REQUIRED_MECHANICS_MODEL_REF_KEYS = [
  'player',
  'session',
  'deck',
  'zones',
  'phaseFlow',
  'actions',
  'stateEvents',
  'validation',
] as const;

const REQUIRED_LINKED_ASSET_KEYS = [
  'playerModel',
  'sessionModel',
  'deckModel',
  'zoneModel',
  'phaseFlowModel',
  'actionSet',
  'stateEventModel',
  'validationFixtures',
] as const;

const PUBLIC_CONTENT_ASSET_TYPES = new Set([
  'CardGameRules',
  'Strategy',
  'CardGameScoring',
  'GameInfo',
  'ImageCarousel',
  'CardGameLayout',
  'PageLayout',
]);

const JUNK_TEXT_PATTERN = /\b(T\.?B\.?D\.?|T\.?B\.?A\.?|TODO|FIXME|placeholder|lorem ipsum|fill in|insert here|see pagat|see wikipedia|refer to source|documented in source)\b/i;
const IMAGE_RESOURCE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.avif']);
const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function readArgValue(argv: string[], name: string): string | undefined {
  const equalsPrefix = `${name}=`;
  const equalsArg = argv.find((arg) => arg.startsWith(equalsPrefix));
  if (equalsArg) {
    return equalsArg.slice(equalsPrefix.length);
  }
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function readNumberArg(argv: string[], name: string): number | undefined {
  const value = readArgValue(argv, name);
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function resolveRepoRelativePath(value: string): string {
  const cwdResolved = path.resolve(value);
  if (fs.existsSync(cwdResolved)) {
    return cwdResolved;
  }
  return path.resolve(repoRoot, value);
}

function parseArgs(argv: string[]): CliOptions {
  const fileArgs = argv.flatMap((arg, index) => {
    if (arg === '--file' && argv[index + 1]) {
      return [argv[index + 1]];
    }
    if (arg.startsWith('--file=')) {
      return [arg.slice('--file='.length)];
    }
    return [];
  });
  const processedRoot = path.resolve(readArgValue(argv, '--root') ?? defaultProcessedRoot);
  const categoryArg = readArgValue(argv, '--category');
  return {
    processedRoot,
    files: fileArgs.map(resolveRepoRelativePath),
    category: categoryArg ? parseProcessedGameTaxonomyPath(categoryArg) : undefined,
    prefix: readArgValue(argv, '--prefix'),
    limit: readNumberArg(argv, '--limit'),
    samplePerDeckTriple: argv.includes('--sample-per-deck-triple'),
    reportPath: path.resolve(readArgValue(argv, '--report') ?? defaultReportPath),
    maxFailures: readNumberArg(argv, '--max-failures') ?? Number.MAX_SAFE_INTEGER,
  };
}

function findJsonFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findJsonFiles(fullPath, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(fullPath);
    }
  }
  return out.sort((left, right) => left.localeCompare(right));
}

function hashFileHex(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function normalizeResourcePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^Resources\//i, '')
    .toLowerCase();
}

function relativeResourcePath(filePath: string): string {
  return normalizeResourcePath(path.relative(resourcesRoot, filePath));
}

function findResourceFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findResourceFiles(fullPath, out);
      continue;
    }
    if (entry.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

function buildResourceIndex(): ResourceIndex {
  const assetsByGuid = new Map<string, AssetEnvelope>();
  const assetsByPath = new Map<string, AssetEnvelope>();
  const imageHashes = new Set<string>();
  const placeholderImageHashes = new Set<string>();
  const files = findResourceFiles(resourcesRoot);

  for (const filePath of files) {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.asset') {
      try {
        const parsed = JSON5.parse(fs.readFileSync(filePath, 'utf8')) as AssetEnvelope;
        const relativePath = relativeResourcePath(filePath);
        assetsByPath.set(relativePath, parsed);
        if (parsed.system?.guid) {
          assetsByGuid.set(parsed.system.guid, parsed);
        }
      } catch {
        continue;
      }
      continue;
    }
    if (IMAGE_RESOURCE_EXTENSIONS.has(extension)) {
      const hash = hashFileHex(filePath);
      imageHashes.add(hash);
      const relativeToPlaceholderRoot = path.relative(placeholderResourceRoot, filePath);
      if (!relativeToPlaceholderRoot.startsWith('..') && !path.isAbsolute(relativeToPlaceholderRoot)) {
        placeholderImageHashes.add(hash);
      }
    }
  }

  return { assetsByGuid, assetsByPath, imageHashes, placeholderImageHashes };
}

function addIssue(
  issues: MigrationIssue[],
  sourcePath: string,
  code: string,
  message: string,
  assetPath?: string,
  severity: MigrationIssue['severity'] = 'error',
): void {
  issues.push(MigrationIssueSchema.parse({
    severity,
    sourcePath,
    assetPath,
    code,
    message,
  }));
}

function addWarning(
  issues: MigrationIssue[],
  sourcePath: string,
  code: string,
  message: string,
  assetPath?: string,
): void {
  addIssue(issues, sourcePath, code, message, assetPath, 'warning');
}

function hasErrors(issues: MigrationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
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

function readPath(value: unknown, pathValue: string): unknown {
  return pathValue.split('.').reduce((current: unknown, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, value);
}

function requireMeaningful(
  value: unknown,
  sourcePath: string,
  assetPath: string,
  dataPath: string,
  issues: MigrationIssue[],
): void {
  if (!isMeaningful(readPath(value, dataPath))) {
    addIssue(issues, sourcePath, 'missing-required-generated-value', `Generated asset is missing ${dataPath}.`, assetPath);
  }
}

function formatAssetValidationResult(result: ReturnType<typeof validateAssetFile>): string {
  if (result.success) {
    return 'valid';
  }
  return result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' | ');
}

function parseBundle(bundle: GameModeBundle, sourcePath: string, issues: MigrationIssue[]): ParsedBundle {
  const files: ParsedBundle['files'] = [];
  const assetsByGuid = new Map<string, AssetEnvelope>();
  const assetsByPath = new Map<string, AssetEnvelope>();
  const pathByGuid = new Map<string, string>();

  for (const file of bundle.files) {
    let parsed: AssetEnvelope;
    try {
      parsed = JSON5.parse(file.content) as AssetEnvelope;
    } catch (error) {
      addIssue(issues, sourcePath, 'generated-asset-parse-failed', error instanceof Error ? error.message : String(error), file.path);
      continue;
    }

    files.push({ ...file, parsed });
    const validation = validateAssetFile(parsed);
    if (!validation.success) {
      addIssue(issues, sourcePath, 'generated-asset-schema-failed', formatAssetValidationResult(validation), file.path);
    }

    const normalizedPath = normalizeResourcePath(file.path);
    if (assetsByPath.has(normalizedPath)) {
      addIssue(issues, sourcePath, 'duplicate-generated-path', `Generated bundle contains duplicate path ${file.path}.`, file.path);
    }
    assetsByPath.set(normalizedPath, parsed);

    const guid = parsed.system?.guid;
    if (!guid) {
      addIssue(issues, sourcePath, 'missing-generated-guid', 'Generated asset is missing system.guid.', file.path);
    } else {
      if (assetsByGuid.has(guid)) {
        addIssue(issues, sourcePath, 'duplicate-generated-guid', `Generated bundle contains duplicate guid ${guid}.`, file.path);
      }
      assetsByGuid.set(guid, parsed);
      pathByGuid.set(guid, normalizedPath);
    }

    if (parsed.system?.treePath && normalizeResourcePath(parsed.system.treePath) !== normalizedPath) {
      addIssue(issues, sourcePath, 'generated-tree-path-mismatch', `system.treePath ${parsed.system.treePath} does not match bundle path ${file.path}.`, file.path);
    }
  }

  return { files, assetsByGuid, assetsByPath, pathByGuid };
}

function resolveAssetRef(ref: unknown, bundle: ParsedBundle, resources: ResourceIndex): AssetEnvelope | null {
  const record = asRecord(ref);
  const guid = asText(record.guid);
  const refPath = asText(record.path);
  if (guid) {
    return bundle.assetsByGuid.get(guid) ?? resources.assetsByGuid.get(guid) ?? null;
  }
  if (refPath) {
    const normalizedPath = normalizeResourcePath(refPath);
    return bundle.assetsByPath.get(normalizedPath) ?? resources.assetsByPath.get(normalizedPath) ?? null;
  }
  return null;
}

function findBundleAsset(bundle: ParsedBundle, assetType: string): AssetEnvelope | null {
  return bundle.files.find((file) => file.parsed.system?.assetType === assetType)?.parsed ?? null;
}

function findBundleAssetPath(bundle: ParsedBundle, asset: AssetEnvelope | null): string {
  if (!asset?.system?.guid) {
    return '';
  }
  return bundle.pathByGuid.get(asset.system.guid) ?? '';
}

function validateSourceReadiness(sourcePath: string, issues: MigrationIssue[]): ReturnType<typeof loadProcessedGame> {
  const game = loadProcessedGame(sourcePath);
  if (game.quality !== 'complete') {
    addIssue(issues, sourcePath, 'source-quality-not-complete', `Processed source quality is ${game.quality}; migration requires complete source data.`);
  }
  for (const [key, value] of Object.entries(game.completeness)) {
    if (value !== true) {
      addIssue(issues, sourcePath, 'source-completeness-gap', `Processed source completeness.${key} is not true.`);
    }
  }
  if (game.extraction.status !== 'validated') {
    addIssue(issues, sourcePath, 'source-not-validated', `Processed source extraction.status is ${game.extraction.status}; migration requires validated.`);
  }
  if (Array.isArray(game.extraction.missingCritical) && game.extraction.missingCritical.length > 0) {
    addIssue(issues, sourcePath, 'source-missing-critical-fields', `Processed source still has missingCritical entries: ${game.extraction.missingCritical.join(', ')}.`);
  }
  for (const section of ['overview', 'history', 'setup', 'rules', 'strategy', 'variations', 'ai', 'sources'] as const) {
    if (game[section].hasPlaceholders) {
      addIssue(issues, sourcePath, 'source-placeholder-section', `Processed source ${section}.hasPlaceholders is true.`);
    }
  }
  return game;
}

function validateGeneratedAssetSet(sourcePath: string, bundle: GameModeBundle, parsedBundle: ParsedBundle, issues: MigrationIssue[]): void {
  if (bundle.files.length !== 18) {
    addIssue(issues, sourcePath, 'generated-asset-count-mismatch', `Expected 18 generated assets, got ${bundle.files.length}.`);
  }

  const counts = new Map<string, number>();
  for (const file of parsedBundle.files) {
    const assetType = file.parsed.system?.assetType ?? '';
    if (assetType) {
      counts.set(assetType, (counts.get(assetType) ?? 0) + 1);
    }
  }

  for (const [assetType, expectedCount] of REQUIRED_ASSET_COUNTS) {
    const actual = counts.get(assetType) ?? 0;
    if (actual !== expectedCount) {
      addIssue(issues, sourcePath, 'required-asset-type-count-mismatch', `Expected ${expectedCount} ${assetType} asset(s), got ${actual}.`);
    }
  }
}

function validateGeneratedTaxonomyPath(sourcePath: string, bundle: GameModeBundle, options: CliOptions, issues: MigrationIssue[]): void {
  const expectedCategory = (options.category ?? deriveProcessedGameCategory(sourcePath, options.processedRoot))
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');
  const expectedPrefix = normalizeResourcePath(`Resources/GameMode/${expectedCategory}/`);
  const normalizedMainPath = normalizeResourcePath(bundle.mainAssetPath);
  const taxonomyRoot = 'gamemode/cardgames/games/';
  if (!normalizedMainPath.startsWith(taxonomyRoot)) {
    addIssue(
      issues,
      sourcePath,
      'generated-path-outside-card-games-taxonomy',
      `Generated main asset path must live under Resources/GameMode/CardGames/Games/<category>/<game>; got ${bundle.mainAssetPath}.`,
      bundle.mainAssetPath,
    );
    return;
  }

  const taxonomySegments = normalizedMainPath.slice(taxonomyRoot.length).split('/');
  if (taxonomySegments.length < 3) {
    addIssue(
      issues,
      sourcePath,
      'generated-path-missing-category-folder',
      `Generated main asset path must include at least one category folder before the game folder; got ${bundle.mainAssetPath}.`,
      bundle.mainAssetPath,
    );
  }

  if (!normalizedMainPath.startsWith(expectedPrefix)) {
    addIssue(
      issues,
      sourcePath,
      'generated-path-category-mismatch',
      `Generated main asset path must use category ${expectedCategory}; got ${bundle.mainAssetPath}.`,
      bundle.mainAssetPath,
    );
  }

  const mainFolder = normalizedMainPath.slice(0, normalizedMainPath.lastIndexOf('/') + 1);
  for (const file of bundle.files) {
    const normalizedPath = normalizeResourcePath(file.path);
    if (!normalizedPath.startsWith(mainFolder)) {
      addIssue(
        issues,
        sourcePath,
        'generated-file-outside-game-folder',
        `Generated file ${file.path} is outside the generated game folder ${mainFolder}.`,
        file.path,
      );
    }
  }
}

function validateMainReleaseState(sourcePath: string, mainAsset: AssetEnvelope | null, issues: MigrationIssue[]): void {
  if (!mainAsset) {
    addIssue(issues, sourcePath, 'missing-main-card-game-mode', 'Generated bundle is missing CardGameMode.');
    return;
  }
  const data = asRecord(mainAsset.data);
  if (data.releaseStatus !== GameModeStatus.WorkInProgress) {
    addIssue(
      issues,
      sourcePath,
      'generated-import-not-quarantined',
      `Generated imports must use releaseStatus ${GameModeStatus.WorkInProgress}; got ${String(data.releaseStatus)}.`,
      mainAsset.system?.treePath,
    );
  }
  if (data.released === true) {
    addIssue(issues, sourcePath, 'generated-import-released', 'Generated imports must not set released=true.', mainAsset.system?.treePath);
  }
}

function validatePublicContent(sourcePath: string, parsedBundle: ParsedBundle, issues: MigrationIssue[]): void {
  const visit = (value: unknown, assetPath: string, dataPath: string): void => {
    if (typeof value === 'string') {
      if (JUNK_TEXT_PATTERN.test(value)) {
        addIssue(issues, sourcePath, 'junk-public-text', `Public generated text at ${dataPath} looks like placeholder or provenance text: ${value.slice(0, 140)}`, assetPath);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, assetPath, `${dataPath}.${index}`));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (key === 'editorOnly') {
          continue;
        }
        visit(child, assetPath, `${dataPath}.${key}`);
      }
    }
  };

  for (const file of parsedBundle.files) {
    const assetType = file.parsed.system?.assetType ?? '';
    if (PUBLIC_CONTENT_ASSET_TYPES.has(assetType)) {
      visit(file.parsed.data, file.path, 'data');
    }
  }
}

function validateGameInfo(sourcePath: string, gameInfo: AssetEnvelope | null, issues: MigrationIssue[]): void {
  if (!gameInfo) {
    addIssue(issues, sourcePath, 'missing-game-info', 'Generated bundle is missing GameInfo.');
    return;
  }
  const data = asRecord(gameInfo.data);
  const assetPath = gameInfo.system?.treePath ?? 'GameInfo';
  for (const dataPath of [
    'hero.title',
    'hero.subtitle',
    'description',
    'tagline',
    'tags',
    'minPlayers',
    'maxPlayers',
    'gameCategory',
    'subcategory',
    'playerMode',
    'difficulty',
    'duration',
    'origin',
    'originName',
    'deck',
    'playersDisplay',
    'quality',
    'completeness',
    'historyContent.origins',
    'historyContent.originCountries',
    'historyContent.timeline',
    'setupContent.players',
    'setupContent.deck',
    'setupContent.equipment',
    'setupContent.dealing',
    'variationsContent',
    'aiContent.difficulty',
    'aiContent.considerations',
    'mechanicsContract.linkedAssetKeys',
    'sections',
    'editorOnly.processedSource',
    'editorOnly.migrationReview.status',
    'editorOnly.migrationReview.requiredChecks',
  ]) {
    requireMeaningful(data, sourcePath, assetPath, dataPath, issues);
  }
  const reviewStatus = asText(readPath(data, 'editorOnly.migrationReview.status'));
  if (reviewStatus !== 'verified') {
    addWarning(
      issues,
      sourcePath,
      'source-review-pending',
      `Rules, deck, category, and duplicate-identity review requires source-page knowledge work; current migrationReview.status is ${reviewStatus || 'missing'}.`,
      assetPath,
    );
  }
}

function validateImageCarousel(sourcePath: string, imageCarousel: AssetEnvelope | null, resources: ResourceIndex, issues: MigrationIssue[]): void {
  if (!imageCarousel) {
    addIssue(issues, sourcePath, 'missing-image-carousel', 'Generated bundle is missing ImageCarousel.');
    return;
  }
  const slides = readPath(imageCarousel.data, 'slides');
  const assetPath = imageCarousel.system?.treePath ?? 'ImageCarousel';
  const data = asRecord(imageCarousel.data);
  if (!Array.isArray(slides) || slides.length === 0) {
    addIssue(issues, sourcePath, 'empty-image-carousel', 'Generated ImageCarousel must contain shared fallback slides.', assetPath);
    return;
  }
  let fallbackSlideCount = 0;
  slides.forEach((slide, index) => {
    const imageHash = asText(asRecord(slide).imageHash);
    if (!imageHash) {
      addIssue(issues, sourcePath, 'carousel-slide-missing-image-hash', `Carousel slide ${index} is missing imageHash.`, assetPath);
      return;
    }
    if (!resources.imageHashes.has(imageHash)) {
      addIssue(issues, sourcePath, 'carousel-slide-image-missing-resource', `Carousel slide ${index} references imageHash ${imageHash}, but no resource image has that hash.`, assetPath);
      return;
    }
    if (resources.placeholderImageHashes.has(imageHash)) {
      fallbackSlideCount += 1;
    }
  });
  if (fallbackSlideCount > 0) {
    addWarning(issues, sourcePath, 'carousel-slide-uses-fallback-art', `${fallbackSlideCount} carousel slide(s) use shared fallback art and need final game-specific frames.`, assetPath);
  }
  if (data.visualAssetStatus === 'needs_final_art') {
    addWarning(issues, sourcePath, 'carousel-needs-final-art', 'Generated ImageCarousel is marked as needing final art replacement.', assetPath);
  }
}

function validateDeckCardVisuals(
  sourcePath: string,
  deck: AssetEnvelope | null,
  parsedBundle: ParsedBundle,
  resources: ResourceIndex,
  issues: MigrationIssue[],
): void {
  if (!deck) {
    return;
  }
  const assetPath = deck.system?.treePath ?? 'Deck';
  const composition = readPath(deck.data, 'composition');
  if (!Array.isArray(composition)) {
    return;
  }
  const counts = {
    unresolved: 0,
    missing: 0,
    unknown: 0,
    fallback: 0,
  };

  composition.map(asRecord).forEach((entry) => {
    const cardAsset = resolveAssetRef(entry.pieceTemplate, parsedBundle, resources);
    if (!cardAsset) {
      counts.unresolved += 1;
      return;
    }
    const imageHash = asText(asRecord(cardAsset.data).imageHash).toLowerCase();
    if (!imageHash || imageHash === ZERO_HASH) {
      counts.missing += 1;
      return;
    }
    if (!resources.imageHashes.has(imageHash)) {
      counts.unknown += 1;
      return;
    }
    if (resources.placeholderImageHashes.has(imageHash)) {
      counts.fallback += 1;
    }
  });

  if (counts.unresolved > 0) {
    addIssue(issues, sourcePath, 'deck-card-asset-unresolved', `${counts.unresolved} deck composition card reference(s) do not resolve.`, assetPath);
  }
  if (counts.missing > 0) {
    addWarning(issues, sourcePath, 'deck-card-image-missing', `${counts.missing} deck card asset(s) have no final image hash.`, assetPath);
  }
  if (counts.unknown > 0) {
    addWarning(issues, sourcePath, 'deck-card-image-unknown', `${counts.unknown} deck card image hash(es) do not match resource image files.`, assetPath);
  }
  if (counts.fallback > 0) {
    addWarning(issues, sourcePath, 'deck-card-image-fallback', `${counts.fallback} deck card asset(s) use shared fallback art.`, assetPath);
  }
}

function validateMainAssetRefs(
  sourcePath: string,
  mainAsset: AssetEnvelope | null,
  parsedBundle: ParsedBundle,
  resources: ResourceIndex,
  issues: MigrationIssue[],
): void {
  if (!mainAsset) {
    return;
  }
  const data = asRecord(mainAsset.data);
  const assetPath = mainAsset.system?.treePath ?? 'CardGameMode';
  for (const refKey of REQUIRED_MAIN_REFS) {
    const ref = data[refKey];
    if (!isMeaningful(ref)) {
      addIssue(issues, sourcePath, 'missing-main-asset-ref', `CardGameMode is missing ${refKey}.`, assetPath);
      continue;
    }
    if (!resolveAssetRef(ref, parsedBundle, resources)) {
      addIssue(issues, sourcePath, 'unresolved-main-asset-ref', `CardGameMode ${refKey} cannot be resolved by guid or path.`, assetPath);
    }
  }
}

function validateMechanicsGraph(sourcePath: string, parsedBundle: ParsedBundle, issues: MigrationIssue[]): void {
  const mechanics = findBundleAsset(parsedBundle, 'CardGameMechanics');
  const gameInfo = findBundleAsset(parsedBundle, 'GameInfo');
  if (!mechanics) {
    return;
  }
  const assetPath = mechanics.system?.treePath ?? 'CardGameMechanics';
  const modelRefs = asRecord(asRecord(mechanics.data).modelRefs);
  for (const key of REQUIRED_MECHANICS_MODEL_REF_KEYS) {
    const ref = modelRefs[key];
    if (!isMeaningful(ref)) {
      addIssue(issues, sourcePath, 'missing-mechanics-model-ref', `CardGameMechanics.modelRefs.${key} is missing.`, assetPath);
      continue;
    }
    const record = asRecord(ref);
    const resolvedByGuid = asText(record.guid) ? parsedBundle.assetsByGuid.get(asText(record.guid)) : null;
    const resolvedByPath = asText(record.path) ? parsedBundle.assetsByPath.get(normalizeResourcePath(asText(record.path))) : null;
    if (!resolvedByGuid && !resolvedByPath) {
      addIssue(issues, sourcePath, 'unresolved-mechanics-model-ref', `CardGameMechanics.modelRefs.${key} cannot be resolved inside the generated bundle.`, assetPath);
    }
  }

  const linkedAssetKeys = asRecord(readPath(gameInfo?.data, 'mechanicsContract.linkedAssetKeys'));
  const gameInfoPath = gameInfo?.system?.treePath ?? 'GameInfo';
  const gameInfoFolder = normalizeResourcePath(gameInfoPath).replace(/\/[^/]*$/, '');
  for (const key of REQUIRED_LINKED_ASSET_KEYS) {
    const fileName = asText(linkedAssetKeys[key]);
    if (!fileName) {
      addIssue(issues, sourcePath, 'missing-game-info-linked-asset-key', `GameInfo mechanicsContract.linkedAssetKeys.${key} is missing.`, gameInfoPath);
      continue;
    }
    const linkedPath = normalizeResourcePath(`${gameInfoFolder}/${fileName}`);
    if (!parsedBundle.assetsByPath.has(linkedPath)) {
      addIssue(issues, sourcePath, 'unresolved-game-info-linked-asset-key', `GameInfo linked asset ${key} points to ${fileName}, but that file is not in the generated bundle.`, gameInfoPath);
    }
  }
}

function validateSelectedGameReadiness(
  sourcePath: string,
  parsedBundle: ParsedBundle,
  resources: ResourceIndex,
  issues: MigrationIssue[],
): void {
  const gameMode = findBundleAsset(parsedBundle, 'CardGameMode');
  const gameInfo = findBundleAsset(parsedBundle, 'GameInfo');
  const rules = findBundleAsset(parsedBundle, 'CardGameRules');
  const strategy = findBundleAsset(parsedBundle, 'Strategy');
  const scoring = findBundleAsset(parsedBundle, 'CardGameScoring');
  const mechanics = findBundleAsset(parsedBundle, 'CardGameMechanics');
  const images = findBundleAsset(parsedBundle, 'ImageCarousel');
  const deckModel = findBundleAsset(parsedBundle, 'CardGameDeckModel');
  const actions = findBundleAsset(parsedBundle, 'GameActionSet');
  const validationFixtures = findBundleAsset(parsedBundle, 'GameValidationFixtures');
  const deck = resolveAssetRef(asRecord(gameMode?.data).deckAsset, parsedBundle, resources);
  const ranking =
    resolveAssetRef(asRecord(gameMode?.data).rankingAsset, parsedBundle, resources)
    ?? resolveAssetRef(asRecord(scoring?.data).rankingAsset, parsedBundle, resources);

  const report = validateSelectedGameBundleReadiness({
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
    label: gameMode?.system?.displayName ?? sourcePath,
    requireRichGameInfo: true,
  });

  for (const readinessIssue of report.issues) {
    addIssue(
      issues,
      sourcePath,
      `selected-game-${readinessIssue.code}`,
      `${readinessIssue.severity.toUpperCase()}: ${readinessIssue.message}`,
      findBundleAssetPath(parsedBundle, gameMode) || undefined,
      readinessIssue.severity,
    );
  }
}

async function validateOne(sourcePath: string, options: CliOptions, resources: ResourceIndex): Promise<MigrationGameReport> {
  const issues: MigrationIssue[] = [];
  let gameName = path.basename(sourcePath, path.extname(sourcePath));
  let bundle: GameModeBundle | null = null;
  let parsedBundle: ParsedBundle | null = null;

  try {
    const game = validateSourceReadiness(sourcePath, issues);
    gameName = game.name;
    bundle = await createProcessedGameModeBundle({
      processedGamePath: sourcePath,
      category: options.category,
    });
    parsedBundle = parseBundle(bundle, sourcePath, issues);
    validateGeneratedAssetSet(sourcePath, bundle, parsedBundle, issues);
    validateGeneratedTaxonomyPath(sourcePath, bundle, options, issues);
    const mainAsset = findBundleAsset(parsedBundle, 'CardGameMode');
    validateMainReleaseState(sourcePath, mainAsset, issues);
    validateMainAssetRefs(sourcePath, mainAsset, parsedBundle, resources, issues);
    validateGameInfo(sourcePath, findBundleAsset(parsedBundle, 'GameInfo'), issues);
    validateImageCarousel(sourcePath, findBundleAsset(parsedBundle, 'ImageCarousel'), resources, issues);
    validateDeckCardVisuals(sourcePath, resolveAssetRef(asRecord(mainAsset?.data).deckAsset, parsedBundle, resources), parsedBundle, resources, issues);
    validateMechanicsGraph(sourcePath, parsedBundle, issues);
    validatePublicContent(sourcePath, parsedBundle, issues);
    validateSelectedGameReadiness(sourcePath, parsedBundle, resources, issues);
  } catch (error) {
    addIssue(issues, sourcePath, 'migration-generation-failed', error instanceof Error ? error.message : String(error));
  }

  const generatedAssetTypes = Object.fromEntries(
    (parsedBundle?.files ?? []).reduce((counts, file) => {
      const assetType = file.parsed.system?.assetType ?? 'Unknown';
      counts.set(assetType, (counts.get(assetType) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()),
  );

  return MigrationGameReportSchema.parse({
    sourcePath,
    gameName,
    generatedFiles: bundle?.files.length ?? 0,
    generatedAssetTypes,
    ok: !hasErrors(issues),
    issues,
  });
}

function selectFiles(options: CliOptions): string[] {
  const files = options.files.length > 0 ? options.files : findJsonFiles(options.processedRoot);
  const filtered = options.prefix
    ? files.filter((file) => path.relative(options.processedRoot, file).replace(/\\/g, '/').startsWith(options.prefix!))
    : files;
  const sampled = options.samplePerDeckTriple ? sampleFilesPerDeckTriple(filtered) : filtered;
  return typeof options.limit === 'number' ? sampled.slice(0, options.limit) : sampled;
}

function sampleFilesPerDeckTriple(files: string[]): string[] {
  const seen = new Set<string>();
  const selected: string[] = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as { engine?: { deckType?: string; suitSet?: string; rankSet?: string } };
      const key = `${raw.engine?.deckType ?? ''}/${raw.engine?.suitSet ?? ''}/${raw.engine?.rankSet ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        selected.push(file);
      }
    } catch {
      selected.push(file);
    }
  }
  return selected;
}

function setupEventBus(): void {
  EventBus.instance = createTestEventBus();
  EventBus.instance.subscribeAsync(GenerateUniqueGuidEvent, async (event) => {
    event.deferred.resolve(OperationResult.success(crypto.randomUUID()));
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  setupEventBus();
  const resources = buildResourceIndex();
  const files = selectFiles(options);
  const reports: MigrationGameReport[] = [];
  let failed = 0;

  for (const file of files) {
    const report = await validateOne(file, options, resources);
    reports.push(report);
    if (!report.ok) {
      failed += 1;
      if (failed >= options.maxFailures) {
        break;
      }
    }
  }

  const issueCount = reports.reduce((sum, report) => sum + report.issues.length, 0);
  const errorCount = reports.reduce((sum, report) => sum + report.issues.filter((issue) => issue.severity === 'error').length, 0);
  const warningCount = reports.reduce((sum, report) => sum + report.issues.filter((issue) => issue.severity === 'warning').length, 0);
  const migrationReport = MigrationReportSchema.parse({
    summary: {
      generatedAt: new Date().toISOString(),
      processedRoot: options.processedRoot,
      resourcesRoot,
      scanned: reports.length,
      passed: reports.filter((report) => report.ok).length,
      failed: reports.filter((report) => !report.ok).length,
      issueCount,
      errorCount,
      warningCount,
    },
    games: reports,
  });

  fs.mkdirSync(path.dirname(options.reportPath), { recursive: true });
  fs.writeFileSync(options.reportPath, `${JSON.stringify(migrationReport, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(migrationReport.summary, null, 2)}\n`);
  process.stdout.write(`Wrote migration report to ${options.reportPath}\n`);

  if (migrationReport.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
