import fs from 'fs';
import path from 'path';
import JSON5 from 'json5';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GameSchema, type Game } from '@ocentra/card-games/schema/effect/game-schema';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import type { AssetGUIDType, AssetChecksum } from '@ocentra/asset-domain/types/assetIdentifier';
import { decodeGameCategory, decodeGameSubCategory } from '@ocentra/game-domain/game/categories';
import {
  PROCESSED_GAME_CATEGORY_ROOT,
  parseProcessedGameTaxonomyPath,
  type ProcessedGameTaxonomyPath,
} from './ProcessedGameTaxonomyPath';
import type { Deck } from '@/card/deck/Deck';
import { BannerPlaybackMode, BannerTransitionType } from '@/constants/banner-presentation';
import { GameModeStatus } from '@/constants/game-mode-status';
import type { CreateGameModeOptions } from '@/factories/GameModeAssetFactory';
import { assertProcessedGameTransferCoverage } from '@/factories/ProcessedGameAssetTransferContract';

export {
  PROCESSED_GAME_CATEGORY_ROOT,
  ProcessedGameTaxonomyPathSchema,
  parseProcessedGameTaxonomyPath,
  type ProcessedGameTaxonomyPath,
} from './ProcessedGameTaxonomyPath';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const RESOURCES_ROOT = path.resolve(REPO_ROOT, 'packages/asset-editor/Resources');
const DECKS_ROOT = path.resolve(RESOURCES_ROOT, 'GameMode/CardGames/Decks');
const PROCESSED_GAMES_ROOT = path.resolve(REPO_ROOT, 'packages/card-games/src/processed-games');
const PLACEHOLDER_CAROUSEL_RESOURCE_ROOT = 'AppAssets/PlaceHolders';
const FALLBACK_CAROUSEL_SLIDE_COUNT = 3;
const PUBLIC_JUNK_TEXT_PATTERN = /\[.{1,120}\]|\b(T\.?B\.?D\.?|T\.?B\.?A\.?|TODO|FIXME|placeholder|lorem ipsum|fill in|insert here|see pagat|see wikipedia|refer to source|documented in source)\b/i;
const CAROUSEL_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

interface AssetEnvelope {
  system: {
    guid?: string;
    assetType?: string;
    displayName?: string;
    category?: unknown;
  };
  data: Record<string, unknown>;
}

interface DeckAssetRecord {
  path: string;
  envelope: AssetEnvelope;
}

interface FallbackCarouselData {
  slides: Array<Record<string, unknown>>;
  primaryImageHash: string;
  visualAssetStatus: 'ready' | 'needs_final_art';
  visualAssetSource: 'game_images_folder' | 'game_folder_fallback_art' | 'shared_fallback_art';
  visualAssetReplacementRequired: boolean;
}

export interface BuildProcessedGameOptions {
  processedGamePath: string;
  category?: ProcessedGameTaxonomyPath;
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

function hashFileHex(filePath: string): AssetChecksum {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex') as AssetChecksum;
}

function readAssetFile(filePath: string): AssetEnvelope {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as AssetEnvelope;
}

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

let deckAssetRecordsCache: DeckAssetRecord[] | null = null;

function getDeckAssetRecords(): DeckAssetRecord[] {
  if (!deckAssetRecordsCache) {
    deckAssetRecordsCache = findAssetFiles(DECKS_ROOT).map((filePath) => ({
      path: filePath,
      envelope: readAssetFile(filePath),
    }));
  }
  return deckAssetRecordsCache;
}

function normalizeSlug(processedGamePath: string): string {
  return path.basename(processedGamePath, path.extname(processedGamePath)).trim().toLowerCase();
}

export function deriveProcessedGameCategory(processedGamePath: string, processedRoot = PROCESSED_GAMES_ROOT): ProcessedGameTaxonomyPath {
  const sourceDir = path.resolve(path.dirname(processedGamePath));
  const root = path.resolve(processedRoot);
  const relativeDir = path.relative(root, sourceDir);
  if (!relativeDir || relativeDir.startsWith('..') || path.isAbsolute(relativeDir)) {
    return parseProcessedGameTaxonomyPath(`${PROCESSED_GAME_CATEGORY_ROOT}/uncategorized`);
  }

  const sourceSlug = normalizeSlug(processedGamePath);
  const segments = relativeDir
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);

  if (segments[segments.length - 1] === sourceSlug) {
    segments.pop();
  }

  return parseProcessedGameTaxonomyPath(segments.length > 0
    ? `${PROCESSED_GAME_CATEGORY_ROOT}/${segments.join('/')}`
    : `${PROCESSED_GAME_CATEGORY_ROOT}/uncategorized`);
}

function paragraphBlocks(text: string): Array<Record<string, unknown>> {
  return text
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => ({
      type: 'paragraph',
      text: entry,
    }));
}

function listBlock(items: string[]): Record<string, unknown> | null {
  const filtered = items.map((item) => item.trim()).filter(Boolean);
  if (filtered.length === 0) {
    return null;
  }

  return {
    type: 'list',
    style: 'unordered',
    items: filtered.map((item) => ({ text: item })),
  };
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  return JSON.stringify(value, null, 2);
}

function publicText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed && !PUBLIC_JUNK_TEXT_PATTERN.test(trimmed) ? trimmed : '';
}

function firstPublicText(...values: unknown[]): string {
  for (const value of values) {
    const text = publicText(value);
    if (text) {
      return text;
    }
  }
  return '';
}

function publicSetupEquipment(game: Game): string {
  return firstPublicText(game.setup.equipment, game.setup.deck, game.overview.deck);
}

function buildPublicVariationList(game: Game): Record<string, unknown>[] {
  return game.variations.list.flatMap((variation) => {
    const name = publicText(variation.name);
    const description = publicText(variation.description);
    if (!name || !description) {
      return [];
    }
    const id = publicText(variation.id);
    return [{
      ...(id ? { id } : {}),
      name,
      description,
    }];
  });
}

function normalizeNumericRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entryValue]) => {
      if (typeof entryValue === 'number' && Number.isFinite(entryValue)) {
        return [[key, entryValue]];
      }

      if (typeof entryValue === 'string') {
        const parsed = Number(entryValue);
        if (Number.isFinite(parsed)) {
          return [[key, parsed]];
        }
      }

      return [];
    }),
  );
}

function countRecordKeys(value: unknown): number {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value).length
    : 0;
}

function isMeaningfulPublicValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return Boolean(publicText(value));
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(isMeaningfulPublicValue);
  }
  if (typeof value === 'object') {
    return Object.values(value).some(isMeaningfulPublicValue);
  }
  return false;
}

function buildScoringRulesSourceCardValues(value: unknown, numericValues: Record<string, number>): Record<string, unknown> | null {
  if (countRecordKeys(value) === 0 || countRecordKeys(value) === Object.keys(numericValues).length) {
    return null;
  }
  return {
    sourceCardValues: value,
  };
}

function normalizeActionRecord(action: unknown): Record<string, unknown> {
  const record = action && typeof action === 'object' && !Array.isArray(action)
    ? { ...(action as Record<string, unknown>) }
    : {};
  const effectHints = record.effectHints;
  record.effectHints = effectHints && typeof effectHints === 'object' && !Array.isArray(effectHints)
    ? effectHints
    : {};
  return record;
}

function normalizePlayerActionRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, action]) => [key, normalizeActionRecord(action)]),
  );
}

function normalizeCustomActions(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(normalizeActionRecord);
}

function resourceFilePath(resourcePath: string): string {
  return path.join(RESOURCES_ROOT, resourcePath.replace(/\//g, path.sep));
}

function normalizeResourcePathFromFile(filePath: string): string {
  return path.relative(RESOURCES_ROOT, filePath).replace(/\\/g, '/');
}

function listImageResourcePaths(resourcePath: string): string[] {
  const root = resourceFilePath(resourcePath);
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && CAROUSEL_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => normalizeResourcePathFromFile(path.join(root, entry.name)))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));
}

function carouselResourcePathCandidates(slug: string, category?: ProcessedGameTaxonomyPath): string[] {
  const candidates = new Set<string>();
  const trimmedCategory = category?.trim();
  if (trimmedCategory) {
    candidates.add(`GameMode/${trimmedCategory}/${slug}/images`);
  }
  candidates.add(`GameMode/CardGames/Games/${slug}/images`);
  return Array.from(candidates);
}

function listGameCarouselResourcePaths(slug: string, category?: ProcessedGameTaxonomyPath): string[] {
  for (const candidate of carouselResourcePathCandidates(slug, category)) {
    const paths = listImageResourcePaths(candidate);
    if (paths.length > 0) {
      return paths;
    }
  }
  return [];
}

function listPlaceholderCarouselResourcePaths(): string[] {
  return listImageResourcePaths(PLACEHOLDER_CAROUSEL_RESOURCE_ROOT);
}

function placeholderHashes(): Set<string> {
  return new Set(listPlaceholderCarouselResourcePaths().map((resourcePath) => hashFileHex(resourceFilePath(resourcePath))));
}

function slugSeed(slug: string): number {
  return crypto.createHash('sha256').update(slug).digest().readUInt32BE(0);
}

function selectFallbackCarouselResourcePaths(slug: string): string[] {
  const paths = listPlaceholderCarouselResourcePaths();
  if (paths.length === 0) {
    throw new Error('Processed game import requires at least one shared fallback carousel image.');
  }
  const start = slugSeed(slug) % paths.length;
  return Array.from({ length: Math.min(FALLBACK_CAROUSEL_SLIDE_COUNT, paths.length) }, (_, index) => paths[(start + index) % paths.length]);
}

function carouselSlideLabel(game: Game, source: FallbackCarouselData['visualAssetSource'], index: number): string {
  return source === 'game_images_folder'
    ? `${game.name} carousel frame ${index + 1}`
    : `${game.name} fallback art ${index + 1}`;
}

function buildFallbackCarouselData(game: Game, slug: string, category?: ProcessedGameTaxonomyPath): FallbackCarouselData {
  const gameImagePaths = listGameCarouselResourcePaths(slug, category);
  const selectedResourcePaths = gameImagePaths.length > 0
    ? gameImagePaths
    : selectFallbackCarouselResourcePaths(slug);
  const fallbackHashes = placeholderHashes();
  const selectedHashes = selectedResourcePaths.map((resourcePath) => hashFileHex(resourceFilePath(resourcePath)));
  const visualAssetReplacementRequired = selectedHashes.some((imageHash) => fallbackHashes.has(imageHash));
  const visualAssetSource: FallbackCarouselData['visualAssetSource'] = gameImagePaths.length === 0
    ? 'shared_fallback_art'
    : visualAssetReplacementRequired
      ? 'game_folder_fallback_art'
      : 'game_images_folder';
  const slides = selectedResourcePaths.flatMap((resourcePath, index) => {
    const filePath = path.join(RESOURCES_ROOT, resourcePath);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const imageHash = hashFileHex(filePath);
    return [{
      id: `${slug}-carousel-${index + 1}`,
      label: carouselSlideLabel(game, visualAssetSource, index),
      alt: `Carousel artwork for ${game.name}`,
      imageHash,
    }];
  });

  if (slides.length === 0) {
    throw new Error('Processed game import requires at least one shared fallback carousel image.');
  }

  return {
    slides,
    primaryImageHash: String(slides[0].imageHash),
    visualAssetStatus: visualAssetReplacementRequired ? 'needs_final_art' : 'ready',
    visualAssetSource,
    visualAssetReplacementRequired,
  };
}

function buildGameInfoSections(game: Game): Record<string, unknown>[] {
  const aboutContent = [
    ...paragraphBlocks(game.overview.description),
    ...paragraphBlocks(game.history.origins),
  ];

  const setupContent = [
    ...paragraphBlocks(game.setup.players),
    ...paragraphBlocks(game.setup.deck),
    ...paragraphBlocks(publicSetupEquipment(game)),
    ...paragraphBlocks(game.setup.dealing),
  ];
  const publicVariationList = buildPublicVariationList(game);
  const variationsBlock = listBlock(
    publicVariationList.map((variation) => `${String(variation.name)}: ${String(variation.description)}`)
  );

  return [
    {
      type: 'about',
      tabLabel: 'About',
      pages: [
        {
          title: game.name,
          subtitle: game.synthesis.hero.subtitle ?? 'Game Overview',
          content: aboutContent,
        },
        {
          title: 'Setup',
          subtitle: 'Table, deck, equipment, and deal',
          content: setupContent,
        },
        ...(variationsBlock
          ? [{
              title: 'Variations',
              subtitle: 'Known ways this game changes',
              content: [variationsBlock],
            }]
          : []),
      ],
    },
  ];
}

function buildHistoryContent(game: Game): Record<string, unknown> {
  return {
    origins: game.history.origins,
    originCountries: game.history.originCountries,
    timeline: game.history.timeline,
    evolution: game.history.evolution ?? '',
    cultural: game.history.cultural ?? '',
  };
}

function buildSetupContent(game: Game): Record<string, unknown> {
  return {
    players: game.setup.players,
    deck: game.setup.deck,
    equipment: publicSetupEquipment(game),
    dealing: game.setup.dealing,
  };
}

function buildVariationsContent(game: Game): Record<string, unknown> {
  const list = buildPublicVariationList(game);
  return {
    list,
    noVariationsReason: list.length === 0 ? firstPublicText(game.variations.noVariationsReason, 'Base ruleset only.') : '',
  };
}

function buildAiContent(game: Game): Record<string, unknown> {
  return {
    difficulty: isMeaningfulPublicValue(game.ai.difficulty) ? game.ai.difficulty : game.overview.difficulty,
    considerations: isMeaningfulPublicValue(game.ai.considerations)
      ? game.ai.considerations
      : buildAiConsiderations(game),
  };
}

function buildAiConsiderations(game: Game): string[] {
  return [game.rules.objective, game.rules.gameplay, ...game.rules.keyRules]
    .map(publicText)
    .filter(Boolean)
    .slice(0, 4);
}

function buildRulesAudienceText(game: Game, prompt: unknown): string {
  return firstPublicText(prompt, game.rules.gameplay, game.rules.objective, game.overview.description);
}

function buildStrategySummary(game: Game): string {
  const authored = [game.strategy.basic, game.strategy.intermediate, game.strategy.advanced]
    .map(publicText)
    .filter(Boolean)
    .join('\n\n');
  if (authored.length >= 20) {
    return authored;
  }
  return [game.rules.objective, game.rules.gameplay]
    .map(publicText)
    .filter(Boolean)
    .join('\n\n');
}

function buildEditorOnlyMetadata(game: Game): Record<string, unknown> {
  return {
    processedSource: game,
    migrationReview: {
      status: 'pending_source_review',
      sourceSearchRequired: true,
      requiredChecks: [
        'verify rules against primary source pages',
        'verify deck type, suit set, rank set, deal pattern, and initial hand size',
        'verify category and subcategory against the original game identity',
        'verify aliases and duplicates so one game is not migrated twice under different names',
        'record any source conflicts before promotion beyond work-in-progress',
      ],
      reviewedAt: null,
      reviewer: null,
      notes: [],
    },
    sources: game.sources,
    evidence: game.evidence,
    extraction: game.extraction,
    fieldStatus: game.fieldStatus ?? {},
  };
}

function mechanicsModelFileNames(slug: string): Record<string, string> {
  return {
    playerModel: `${slug}PlayerModel.asset`,
    sessionModel: `${slug}SessionModel.asset`,
    deckModel: `${slug}DeckModel.asset`,
    zoneModel: `${slug}ZoneModel.asset`,
    phaseFlowModel: `${slug}PhaseFlowModel.asset`,
    actionSet: `${slug}ActionSet.asset`,
    stateEventModel: `${slug}StateEventModel.asset`,
    validationFixtures: `${slug}ValidationFixtures.asset`,
  };
}

function buildMechanicsContract(game: Game, slug: string): Record<string, unknown> {
  return {
    gameId: slug,
    mechanicsId: `${slug}-mechanics`,
    mechanicsVersion: game.engineModelVersion,
    familyKernel: slug,
    familyVariant: decodeGameSubCategory(game.overview.subCategory) || decodeGameCategory(game.overview.category),
    executorId: `${slug}.mechanics.v1`,
    strategyExecutorId: `${slug}.bot.v1`,
    linkedAssetKeys: mechanicsModelFileNames(slug),
  };
}

function buildActionModel(game: Game): Record<string, unknown> {
  const customActions = normalizeCustomActions(game.engine.customActions);
  const playerActions = normalizePlayerActionRecord(game.engine.playerActions);
  const playerActionIds = Object.entries(playerActions)
    .filter(([, value]) => Boolean((value as { supported?: boolean }).supported))
    .map(([key]) => key);
  const customActionIds = customActions
    .map((action) => typeof action.id === 'string' ? action.id : '')
    .filter(Boolean);
  return {
    actionIds: Array.from(new Set([...playerActionIds, ...customActionIds])),
    payloadSchemas: {},
    actionEndsTurn: Object.fromEntries(
      [
        ...Object.entries(playerActions),
        ...customActions
          .filter((action): action is Record<string, unknown> & { id: string } => typeof action.id === 'string')
          .map((action) => [action.id, action] as const),
      ]
        .map(([id, action]) => [id, Boolean((action as { isTerminating?: boolean }).isTerminating)]),
    ),
  };
}

function buildValidationSuites(game: Game, slug: string): Record<string, unknown>[] {
  const firstPhase = game.engine.phases[0];
  const supportedActions = [
    ...Object.entries(normalizePlayerActionRecord(game.engine.playerActions))
      .filter(([, action]) => Boolean((action as { supported?: boolean }).supported))
      .map(([id]) => id),
    ...normalizeCustomActions(game.engine.customActions)
      .map((action) => typeof action.id === 'string' && action.supported === true ? action.id : '')
      .filter(Boolean),
  ];
  return [
    {
      id: `${slug}.core-runtime-contracts`,
      title: `${game.name} Core Runtime Contracts`,
      fixtures: [
        {
          id: `${slug}.setup.initial-deal`,
          title: 'Initial deal',
          purpose: 'setup',
          expectedInitialHandSize: game.engine.initialHandSize,
          expectedPlayerCounts: {
            min: game.engine.playerConfig.minPlayers,
            max: game.engine.playerConfig.maxPlayers,
            recommended: game.overview.players.recommendedPlayers ?? game.engine.playerConfig.optimalPlayers,
          },
          expectedTotalInitialCards: game.engine.initialHandSize * game.engine.playerConfig.maxPlayers,
          expectedDeckCount: game.engine.deckCount,
          expectedVisibility: game.engine.cardVisibility.initialDeal,
          explanation: `${game.name} must start by giving each active player ${game.engine.initialHandSize} card(s), matching the processed setup and engine initialHandSize.`,
          linkedRuleIds: [`${slug}.setup.initial-deal`],
          sourceFields: ['setup.dealing', 'engine.initialHandSize', 'engine.playerConfig', 'engine.cardVisibility.initialDeal'],
        },
        {
          id: `${slug}.flow.first-phase`,
          title: 'Opening phase',
          purpose: 'flow',
          expectedFirstPhase: firstPhase.id,
          expectedActor: firstPhase.actor,
          expectedLegalActions: firstPhase.legalActions,
          expectedNextPhase: firstPhase.nextPhase,
          supportedActionIds: supportedActions,
          explanation: `${game.name} must enter ${firstPhase.id} first and expose exactly the legal actions authored for that phase.`,
          linkedRuleIds: [`${slug}.flow.${firstPhase.id}`],
          sourceFields: ['engine.phases.0', 'engine.playerActions', 'engine.customActions'],
        },
        {
          id: `${slug}.scoring.primary-outcome`,
          title: 'Primary scoring outcome',
          purpose: 'scoring',
          expectedFinalScore: stringifyUnknown(game.scoring.targetScore ?? game.scoring.winCondition),
          scoringDirection: game.scoring.scoringDirection,
          targetScore: game.scoring.targetScore,
          cardValues: game.scoring.cardValues,
          explanation: game.scoring.description,
          linkedRuleIds: [`${slug}.score.win-condition`],
          sourceFields: ['scoring.description', 'scoring.winCondition', 'scoring.cardValues', 'scoring.targetScore', 'scoring.scoringDirection'],
        },
      ],
    },
  ];
}

function buildValidationExamples(game: Game, slug: string): Record<string, unknown>[] {
  return [
    {
      id: `${slug}.initial-deal-preview`,
      purpose: 'Runtime setup preview and playtest assertion.',
      expectedInitialHandSize: game.engine.initialHandSize,
      expectedPlayerCounts: {
        min: game.engine.playerConfig.minPlayers,
        max: game.engine.playerConfig.maxPlayers,
      },
      expectedVisibility: game.engine.cardVisibility.initialDeal,
    },
  ];
}

function buildRuleExampleHands(game: Game): string[] {
  const firstPhase = game.engine.phases[0];
  return [
    `Opening deal: ${game.engine.playerConfig.minPlayers}-${game.engine.playerConfig.maxPlayers} player(s), ${game.engine.initialHandSize} card(s) per player, ${game.engine.deckCount} deck(s), initial visibility ${game.engine.cardVisibility.initialDeal}.`,
    firstPhase
      ? `Opening flow: start in ${firstPhase.id}; ${firstPhase.actor} may use ${firstPhase.legalActions.join(', ')} before ${firstPhase.nextPhase ?? 'round end'}.`
      : '',
    `Scoring check: ${game.scoring.description} Expected outcome: ${stringifyUnknown(game.scoring.targetScore ?? game.scoring.winCondition)}.`,
  ].map(publicText).filter(Boolean);
}

function asMechanicsRecord(value: unknown, fallbackKey: string): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (Array.isArray(value)) {
    return { [fallbackKey]: value };
  }
  return {};
}

function normalizePhaseFlowPhases(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((phase): phase is Record<string, unknown> => !!phase && typeof phase === 'object' && !Array.isArray(phase))
    .map((phase) => {
      const next = { ...phase };
      if (typeof next.notes !== 'string' || next.notes.trim().length === 0) {
        delete next.notes;
      }
      if (!Array.isArray(next.conditionalNext)) {
        next.conditionalNext = [];
      }
      if (!next.cardVisibilityChanges || typeof next.cardVisibilityChanges !== 'object' || Array.isArray(next.cardVisibilityChanges)) {
        next.cardVisibilityChanges = {};
      }
      return next;
    });
}

function buildMechanicsModelDataOverrides(
  game: Game,
  slug: string,
  linkedDeckAsset: AssetResourceEntry<Deck>,
  rankingAsset: Record<string, unknown>,
): NonNullable<CreateGameModeOptions['mechanicsModelDataOverrides']> {
  const playerActions = normalizePlayerActionRecord(game.engine.playerActions);
  const customActions = normalizeCustomActions(game.engine.customActions);
  const shared = {
    familyKernel: slug,
    familyVariant: decodeGameSubCategory(game.overview.subCategory) || decodeGameCategory(game.overview.category),
  };

  return {
    player: {
      ...shared,
      playerConfig: {
        playerMode: game.engine.playerConfig.playerMode,
        minPlayers: game.engine.playerConfig.minPlayers,
        maxPlayers: game.engine.playerConfig.maxPlayers,
        optimalPlayers: game.engine.playerConfig.optimalPlayers,
        dealerRotates: game.engine.turnOrder.dealerRotates,
      },
      playerModel: asMechanicsRecord(game.engine.roles, 'roles'),
    },
    session: {
      ...shared,
      sessionModel: game.engine.constants,
      bankingConfig: asMechanicsRecord(game.engine.bankingConfig, 'banking'),
      roundConfig: asMechanicsRecord(game.engine.roundConfig, 'rounds'),
      endConditions: [
        {
          id: 'round_end',
          description: describeRoundConfig(game.engine.roundConfig, 'roundEndCondition'),
          appliesToPhase: null,
        },
        {
          id: 'game_end',
          description: describeRoundConfig(game.engine.roundConfig, 'gameEndCondition'),
          appliesToPhase: null,
        },
      ],
    },
    deck: {
      ...shared,
      deckType: game.engine.deckType,
      suitSet: game.engine.suitSet,
      rankSet: game.engine.rankSet,
      deckCount: game.engine.deckCount,
      initialHandSize: game.engine.initialHandSize,
      drawConfig: asMechanicsRecord(game.engine.drawConfig, 'draw'),
      discardConfig: asMechanicsRecord(game.engine.discardConfig, 'discard'),
      deckModel: {
        deckAssetRef: 'deck',
        rankingAssetRef: 'ranking',
        deckCount: game.engine.deckCount,
        includedCards: game.setup.deck,
        excludedCards: [],
        shufflePolicy: 'seeded_round_shuffle',
        drawDirection: 'top_is_index_0',
        jokers: /joker/i.test(game.setup.deck),
      },
      handRanks: asMechanicsRecord(game.engine.handRanks, 'ranks'),
      specialCards: asMechanicsRecord(game.engine.specialCards, 'cards'),
      assetRefs: {
        deck: linkedDeckAsset,
        ranking: rankingAsset,
      },
    },
    zones: {
      ...shared,
      zones: game.engine.zones,
      zoneModel: asMechanicsRecord(game.engine.zones, 'zones'),
      cardVisibility: asMechanicsRecord(game.engine.cardVisibility, 'visibility'),
    },
    phaseFlow: {
      ...shared,
      phases: normalizePhaseFlowPhases(game.engine.phases),
      turnPolicy: {
        direction: game.engine.turnOrder.direction,
        startsWith: game.engine.turnOrder.startsWith,
        timerSeconds: null,
      },
      setupModel: {
        setup: game.setup,
      },
      turnModel: {
        turnOrder: game.engine.turnOrder,
        trickConfig: game.engine.trickConfig,
      },
      runtimeIntegration: asMechanicsRecord(game.engine.implementationHints, 'implementationHints'),
      progression: game.engine.progression,
    },
    actions: {
      ...shared,
      actionModel: buildActionModel(game),
      actions: playerActions,
      customActions,
    },
    stateEvents: {
      ...shared,
      stateModel: {
        zones: game.engine.zones,
        cardVisibility: asMechanicsRecord(game.engine.cardVisibility, 'visibility'),
        constants: asMechanicsRecord(game.engine.constants, 'constants'),
      },
      eventModel: {
        phases: game.engine.phases.map((phase) => phase.id),
        actions: buildActionModel(game).actionIds,
      },
    },
    validation: {
      ...shared,
      validationSuites: buildValidationSuites(game, slug),
      examples: buildValidationExamples(game, slug),
    },
  };
}

function deriveScoringType(game: Game): string {
  if (game.overview.category === 'Poker' || game.overview.category === 'Vying') {
    return 'poker_ranking';
  }
  return 'custom';
}

function buildDeterminismNotes(game: Game): string {
  const notes: string[] = [];
  const hints = game.engine.implementationHints;
  if (Array.isArray(hints.rngUsed) && hints.rngUsed.length > 0) {
    notes.push(`RNG: ${hints.rngUsed.join(', ')}`);
  }
  notes.push(`Authoritative server: ${hints.authoritativeServer ? 'yes' : 'no'}`);
  if (Array.isArray(hints.customLogicNeeded) && hints.customLogicNeeded.length > 0) {
    notes.push(`Custom logic: ${hints.customLogicNeeded.join(', ')}`);
  }
  return notes.join('\n');
}

function buildMoveValidityConditions(game: Game): Record<string, string> {
  const conditions: Record<string, string> = {};
  for (const [actionId, action] of Object.entries(game.engine.playerActions)) {
    const actionTyped = action as { supported: boolean; constraints?: string; reason?: string };
    if (actionTyped.supported) {
      conditions[actionId] = actionTyped.constraints ?? '';
      continue;
    }
    if (actionTyped.reason) {
      conditions[actionId] = actionTyped.reason;
    }
  }
  return conditions;
}

export function getCardRankingReference(deckEnvelope: AssetEnvelope): Record<string, unknown> {
  const rankingReference = deckEnvelope.data.rankingAsset ?? deckEnvelope.data.cardRankingAsset;
  if (!rankingReference || typeof rankingReference !== 'object') {
    throw new Error('Resolved deck asset is missing rankingAsset');
  }
  const hydratedReference: Record<string, unknown> = {
    ...(rankingReference as Record<string, unknown>),
    assetType: 'DeckRanking',
  };
  const rankingPath = typeof hydratedReference.path === 'string' ? hydratedReference.path : '';
  if (rankingPath.length > 0) {
    const rankingFilePath = path.resolve(RESOURCES_ROOT, rankingPath.replace(/^Resources[\\/]/, ''));
    if (fs.existsSync(rankingFilePath)) {
      hydratedReference.fileSize = fs.statSync(rankingFilePath).size;
      hydratedReference.mimeType = 'application/json';
      hydratedReference.checksum = hashFileHex(rankingFilePath);
    }
  }
  return hydratedReference;
}

function describeRoundConfig(roundConfig: unknown, field: 'roundEndCondition' | 'gameEndCondition'): string {
  if (!roundConfig || typeof roundConfig !== 'object') {
    return 'not specified';
  }

  const value = (roundConfig as Record<string, unknown>)[field];
  return typeof value === 'string' && value.trim().length > 0 ? value : 'not specified';
}

function buildLinkedDeckEntry(filePath: string, envelope: AssetEnvelope): AssetResourceEntry<Deck> {
  const entry = AssetResourceEntry.fromGuid<Deck>(
    String(envelope.system.guid ?? '') as AssetGUIDType,
    asAssetType('Deck'),
    String((envelope.data.name as string | undefined) ?? envelope.system.displayName ?? 'Deck'),
  );
  entry.path = path.relative(RESOURCES_ROOT, filePath).replace(/\\/g, '/');
      entry.category = (typeof envelope.system.category === 'string' ? envelope.system.category : 'Game') as typeof entry.category;
  entry.variant = typeof envelope.system.displayName === 'string' ? envelope.system.displayName : null;
  entry.mimeType = 'application/json';
  entry.fileSize = fs.statSync(filePath).size;
  entry.checksum = hashFileHex(filePath);
  return entry;
}

export function resolveDeckAssetByTriple(
  deckType: string,
  suitSet: string,
  rankSet: string,
): { linkedDeckAsset: AssetResourceEntry<Deck>; deckEnvelope: AssetEnvelope } {
  const records = getDeckAssetRecords();

  for (const record of records) {
    const triples = Array.isArray(record.envelope.data.supportedTriples)
      ? record.envelope.data.supportedTriples
      : [];
    const match = triples.find((triple) =>
      typeof triple === 'object' &&
      triple !== null &&
      (triple as Record<string, unknown>).deckType === deckType &&
      (triple as Record<string, unknown>).suitSet === suitSet &&
      (triple as Record<string, unknown>).rankSet === rankSet
    );
    if (match) {
      return {
        linkedDeckAsset: buildLinkedDeckEntry(record.path, record.envelope),
        deckEnvelope: record.envelope,
      };
    }
  }

  throw new Error(`No existing deck asset found for triple ${deckType}/${suitSet}/${rankSet}`);
}

function resolveDeckAsset(game: Game): { linkedDeckAsset: AssetResourceEntry<Deck>; deckEnvelope: AssetEnvelope } {
  return resolveDeckAssetByTriple(
    game.engine.deckType,
    game.engine.suitSet,
    game.engine.rankSet,
  );
}

export function loadProcessedGame(processedGamePath: string): Game {
  const raw = readJsonFile(processedGamePath);
  return GameSchema.parse(raw);
}

export function buildCreateGameModeOptionsFromProcessedGame(options: BuildProcessedGameOptions): CreateGameModeOptions {
  const game = loadProcessedGame(options.processedGamePath);
  const slug = normalizeSlug(options.processedGamePath);
  const category = options.category ?? deriveProcessedGameCategory(options.processedGamePath);
  const gameCategory = decodeGameCategory(game.overview.category);
  const gameSubCategory = decodeGameSubCategory(game.overview.subCategory);
  const { linkedDeckAsset, deckEnvelope } = resolveDeckAsset(game);
  const rankingAsset = getCardRankingReference(deckEnvelope);
  const carouselData = buildFallbackCarouselData(game, slug, category);
  const numericCardValues = normalizeNumericRecord(game.scoring.cardValues);
  const scoringRules = buildScoringRulesSourceCardValues(game.scoring.cardValues, numericCardValues);
  const playerActions = normalizePlayerActionRecord(game.engine.playerActions);
  const customActions = normalizeCustomActions(game.engine.customActions);
  const phases = normalizePhaseFlowPhases(game.engine.phases);

  const createOptions: CreateGameModeOptions = {
    gameId: slug,
    displayName: game.name,
    category,
    linkedDeckAsset,
    mechanicsModelDataOverrides: buildMechanicsModelDataOverrides(game, slug, linkedDeckAsset, rankingAsset),
    assetDataOverrides: {
      rules: {
        LLM: buildRulesAudienceText(game, game.prompts.ai),
        Player: buildRulesAudienceText(game, game.prompts.human),
        objective: game.rules.objective,
        gameplay: game.rules.gameplay,
        keyRules: game.rules.keyRules,
        setup: {
          players: game.setup.players,
          deck: game.setup.deck,
          equipment: publicSetupEquipment(game),
          dealing: game.setup.dealing,
        },
        turnFlow: game.rules.gameplay,
        moveValidityConditions: buildMoveValidityConditions(game),
        exampleHands: buildRuleExampleHands(game),
        bonusRules: '',
        bonusRuleGuids: [],
        useTrump: game.engine.useTrump,
        trumpBonusValues: null,
      },
      strategy: {
        LLM: buildStrategySummary(game),
        Player: buildStrategySummary(game),
        basic: publicText(game.strategy.basic) || game.rules.objective,
        intermediate: game.strategy.intermediate ?? '',
        advanced: game.strategy.advanced ?? '',
        tips: game.strategy.tips.map((tip: string) => ({
          title: 'Tip',
          description: tip,
        })),
      },
      scoring: {
        rankingAsset,
        scoringType: deriveScoringType(game),
        ...(scoringRules ? { scoringRules } : {}),
        description: game.scoring.description,
        winCondition: game.scoring.winCondition,
        cardValues: numericCardValues,
        penalties: stringifyUnknown(game.scoring.penalties),
        targetScore: typeof game.scoring.targetScore === 'number' ? game.scoring.targetScore : null,
        scoringDirection: game.scoring.scoringDirection,
      },
      gameInfo: {
        hero: {
          title: game.synthesis.hero.title || game.name,
          subtitle: game.synthesis.hero.subtitle || gameCategory,
        },
        description: game.overview.description,
        LLM: game.prompts.ai || game.overview.description,
        Player: game.prompts.human || game.overview.description,
        tagline: game.synthesis.hero.tagline || game.overview.description.slice(0, 140),
        tags: Array.from(new Set(['card-game', ...game.tags])),
        minPlayers: game.overview.players.minPlayers,
        maxPlayers: game.overview.players.maxPlayers,
        routePath: slug,
        gameCategory,
        subcategory: gameSubCategory,
        playerMode: game.overview.playerMode,
        difficulty: game.overview.difficulty,
        duration: game.overview.duration,
        origin: game.overview.origin,
        originName: firstPublicText(game.overview.originName, game.name),
        deck: game.overview.deck,
        alsoKnownAs: game.alsoKnownAs,
        playersDisplay: game.overview.players.display ?? '',
        quality: game.quality,
        completeness: game.completeness,
        historyContent: buildHistoryContent(game),
        setupContent: buildSetupContent(game),
        variationsContent: buildVariationsContent(game),
        aiContent: buildAiContent(game),
        mechanicsContract: buildMechanicsContract(game, slug),
        editorOnly: buildEditorOnlyMetadata(game),
        sections: buildGameInfoSections(game),
      },
      layout: {
        defaultPlayerCount: game.overview.players.recommendedPlayers ?? game.overview.players.minPlayers,
        presets: {},
        gameplay: {
          uiThemes: game.synthesis.uiThemes,
          uiLayout: game.synthesis.uiLayout,
        },
        extensions: {},
      },
      carousel: {
        slides: carouselData.slides,
        visualAssetStatus: carouselData.visualAssetStatus,
        visualAssetSource: carouselData.visualAssetSource,
        visualAssetReplacementRequired: carouselData.visualAssetReplacementRequired,
        autoplayIntervalMs: 1800,
        lastImageDurationMs: 2600,
        fastRotationDurationMs: 1800,
        defaultRotationDurationMs: 2200,
        fastRotationThreshold: 99,
        slideTransitionDelayMs: 0,
        playbackMode: BannerPlaybackMode.PingPong,
        transitionType: BannerTransitionType.CrossDissolve,
        transitionDurationMs: 1200,
      },
      mechanics: {
        familyKernel: slug,
        kernelVersion: game.engineModelVersion,
        playerConfig: {
          playerMode: game.engine.playerConfig.playerMode,
          minPlayers: game.engine.playerConfig.minPlayers,
          maxPlayers: game.engine.playerConfig.maxPlayers,
          optimalPlayers: game.engine.playerConfig.optimalPlayers,
          dealerRotates: game.engine.turnOrder.dealerRotates,
        },
        phases,
        actions: playerActions,
        customActions,
        zones: game.engine.zones,
        turnPolicy: {
          direction: game.engine.turnOrder.direction,
          startsWith: game.engine.turnOrder.startsWith,
          timerSeconds: null,
        },
        endConditions: [
          {
            id: 'round_end',
            description: `Round end: ${describeRoundConfig(game.engine.roundConfig, 'roundEndCondition')}`,
            appliesToPhase: null,
          },
          {
            id: 'game_end',
            description: `Game end: ${describeRoundConfig(game.engine.roundConfig, 'gameEndCondition')}`,
            appliesToPhase: null,
          },
        ],
        cardVisibility: game.engine.cardVisibility,
        drawConfig: game.engine.drawConfig,
        discardConfig: game.engine.discardConfig,
        deckType: game.engine.deckType,
        suitSet: game.engine.suitSet,
        rankSet: game.engine.rankSet,
        initialHandSize: game.engine.initialHandSize,
        trumpConfig: game.engine.trumpConfig,
        meldConfig: game.engine.meldConfig,
        trickConfig: game.engine.trickConfig,
        declarationMechanism: game.engine.declarationMechanism,
        handRanks: game.engine.handRanks,
        buyCosts: game.engine.buyCosts,
        marketConfig: game.engine.marketConfig,
        specialCards: game.engine.specialCards,
        shedding: game.engine.shedding,
        fishingConfig: game.engine.fishingConfig,
        patienceConfig: game.engine.patienceConfig,
        bankingConfig: game.engine.bankingConfig,
        roundConfig: game.engine.roundConfig,
        constants: game.engine.constants,
        finalHandSize: game.engine.finalHandSize ?? undefined,
        deckCount: game.engine.deckCount,
        implementationHints: game.engine.implementationHints,
        progression: game.engine.progression,
        roles: game.engine.roles,
        determinismNotes: buildDeterminismNotes(game),
      },
      cardGame: {
        releaseStatus: GameModeStatus.WorkInProgress,
        released: false,
        bannerImage: carouselData.primaryImageHash,
        gameIcon: carouselData.primaryImageHash,
        minPlayers: game.overview.players.minPlayers,
        maxPlayers: game.overview.players.maxPlayers,
        minHumanPlayers: 1,
        maxHumanPlayers: game.overview.players.maxPlayers,
        supportsAI: true,
        aiCountsAsPlayer: true,
        initialNumberOfCards: game.engine.initialHandSize,
        maxNumberOfCards: Math.max(game.engine.initialHandSize, game.engine.finalHandSize || game.engine.initialHandSize),
        minDecks: game.engine.deckCount,
        maxDecks: game.engine.deckCount,
        useTrump: game.engine.useTrump,
      },
    },
  };
  assertProcessedGameTransferCoverage(game, createOptions);
  return createOptions;
}
