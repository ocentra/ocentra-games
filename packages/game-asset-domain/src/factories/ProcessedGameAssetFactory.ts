import fs from 'fs';
import path from 'path';
import JSON5 from 'json5';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GameSchema, type Game } from '@ocentra/card-games/schema/zod/game-schema';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import type { AssetGUIDType, AssetChecksum } from '@ocentra/asset-domain/types/assetIdentifier';
import type { Deck } from '@/card/deck/Deck';
import type { CreateGameModeOptions } from '@/factories/GameModeAssetFactory';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const RESOURCES_ROOT = path.resolve(REPO_ROOT, 'packages/asset-editor/Resources');
const DECKS_ROOT = path.resolve(RESOURCES_ROOT, 'GameMode/CardGames/Decks');

interface AssetEnvelope {
  system: {
    guid?: string;
    assetType?: string;
    displayName?: string;
    category?: string;
  };
  data: Record<string, unknown>;
}

interface DeckAssetRecord {
  path: string;
  envelope: AssetEnvelope;
}

export interface BuildProcessedGameOptions {
  processedGamePath: string;
  category?: string;
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

function normalizeSlug(processedGamePath: string): string {
  return path.basename(processedGamePath, path.extname(processedGamePath)).trim().toLowerCase();
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

function buildGameInfoSections(game: Game): Record<string, unknown>[] {
  const aboutContent = [
    ...paragraphBlocks(game.overview.description),
    ...paragraphBlocks(game.history.origins),
  ];

  const rulesContent = [
    {
      type: 'heading',
      level: 3,
      text: 'Objective',
    },
    ...paragraphBlocks(game.rules.objective),
    {
      type: 'heading',
      level: 3,
      text: 'Gameplay',
    },
    ...paragraphBlocks(game.rules.gameplay),
  ];

  const keyRulesBlock = listBlock(game.rules.keyRules);
  if (keyRulesBlock) {
    rulesContent.push({
      type: 'heading',
      level: 4,
      text: 'Key Rules',
    });
    rulesContent.push(keyRulesBlock);
  }

  const strategyContent = [
    ...paragraphBlocks(game.strategy.basic ?? ''),
    ...paragraphBlocks(game.strategy.intermediate ?? ''),
    ...paragraphBlocks(game.strategy.advanced ?? ''),
  ];

  const scoringContent = [
    ...paragraphBlocks(game.scoring.description),
    ...paragraphBlocks(game.scoring.winCondition),
  ];

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
      ],
    },
    {
      type: 'rules',
      tabLabel: 'Rules',
      pages: [
        {
          title: 'Rules',
          subtitle: 'How to play',
          content: rulesContent,
        },
      ],
    },
    {
      type: 'strategy',
      tabLabel: 'Strategy',
      pages: [
        {
          title: 'Strategy',
          subtitle: 'Tips and guidance',
          content: strategyContent,
        },
      ],
    },
    {
      type: 'scoring',
      tabLabel: 'Scoring',
      pages: [
        {
          title: 'Scoring',
          subtitle: 'How you win',
          content: scoringContent,
        },
      ],
    },
  ];
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
  const rankingReference = deckEnvelope.data.cardRankingAsset;
  if (!rankingReference || typeof rankingReference !== 'object') {
    throw new Error('Resolved deck asset is missing cardRankingAsset');
  }
  const hydratedReference = {
    ...(rankingReference as Record<string, unknown>),
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
  entry.category = (envelope.system.category ?? 'Game') as typeof entry.category;
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
  const deckFiles = findAssetFiles(DECKS_ROOT);
  const records: DeckAssetRecord[] = deckFiles.map((filePath) => ({
    path: filePath,
    envelope: readAssetFile(filePath),
  }));

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
  const { linkedDeckAsset, deckEnvelope } = resolveDeckAsset(game);
  const cardRankingAsset = getCardRankingReference(deckEnvelope);

  return {
    gameId: slug,
    displayName: game.name,
    category: options.category ?? 'CardGames/Imported',
    linkedDeckAsset,
    assetDataOverrides: {
      rules: {
        LLM: game.prompts.ai || game.rules.gameplay,
        Player: game.prompts.human || game.rules.gameplay,
        objective: game.rules.objective,
        gameplay: game.rules.gameplay,
        keyRules: game.rules.keyRules,
        moveValidityConditions: buildMoveValidityConditions(game),
        exampleHands: [],
        bonusRules: '',
        bonusRuleGuids: [],
        useTrump: game.engine.useTrump,
        trumpBonusValues: null,
      },
      strategy: {
        LLM: [game.strategy.basic, game.strategy.intermediate, game.strategy.advanced].filter(Boolean).join('\n\n'),
        Player: [game.strategy.basic, game.strategy.intermediate, game.strategy.advanced].filter(Boolean).join('\n\n'),
        basic: game.strategy.basic ?? '',
        intermediate: game.strategy.intermediate ?? '',
        advanced: game.strategy.advanced ?? '',
        tips: game.strategy.tips.map((tip: string) => ({
          title: 'Tip',
          description: tip,
        })),
      },
      scoring: {
        cardRankingAsset,
        scoringType: deriveScoringType(game),
        description: game.scoring.description,
        winCondition: game.scoring.winCondition,
        cardValues: normalizeNumericRecord(game.scoring.cardValues),
        penalties: stringifyUnknown(game.scoring.penalties),
        targetScore: typeof game.scoring.targetScore === 'number' ? game.scoring.targetScore : null,
        scoringDirection: game.scoring.scoringDirection,
      },
      gameInfo: {
        hero: {
          title: game.synthesis.hero.title || game.name,
          subtitle: game.synthesis.hero.subtitle || game.overview.category,
        },
        description: game.overview.description,
        LLM: game.prompts.ai || game.overview.description,
        Player: game.prompts.human || game.overview.description,
        tagline: game.synthesis.hero.tagline || game.overview.description.slice(0, 140),
        tags: Array.from(new Set(['card-game', ...game.tags])),
        minPlayers: game.overview.players.minPlayers,
        maxPlayers: game.overview.players.maxPlayers,
        routePath: slug,
        gameCategory: game.overview.category,
        subcategory: game.overview.subCategory,
        playerMode: game.overview.playerMode,
        difficulty: game.overview.difficulty,
        duration: game.overview.duration,
        origin: game.overview.origin,
        deck: game.overview.deck,
        alsoKnownAs: game.alsoKnownAs,
        playersDisplay: game.overview.players.display ?? '',
        quality: game.quality,
        completeness: game.completeness,
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
        slides: [],
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
        phases: game.engine.phases,
        actions: game.engine.playerActions,
        customActions: game.engine.customActions,
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
        finalHandSize: game.engine.finalHandSize,
        deckCount: game.engine.deckCount,
        implementationHints: game.engine.implementationHints,
        progression: game.engine.progression,
        roles: game.engine.roles,
        determinismNotes: buildDeterminismNotes(game),
      },
      cardGame: {
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
}
