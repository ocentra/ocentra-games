import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import { CardGameMechanics } from '@ocentra/game-asset-domain/game/gameMechanics/CardGameMechanics';
import { toMechanicsSpec } from '@ocentra/game-asset-domain/game/gameMechanics/MechanicsTranslator';
import type { Layout } from '@ocentra/game-asset-domain/ui/layout/Layout';
import type { CardGameLayout } from '@ocentra/game-asset-domain/ui/layout/CardGameLayout';
import type { IDeckProvider } from '@ocentra/game-domain/interfaces/IDeckProvider';
import type { MechanicsSpec } from '@ocentra/game-domain/engine/mechanics/MechanicsSpec';
import { Suit, type Card, type CardValue, type GameState, type Player } from '@ocentra/game-domain/types/game';
import { getGameModeEntries } from '@/adapters/assets/GameCatalogService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
import {
  loadCardGameLayoutDocument,
  resolveLayoutPreset,
  type NormalizedCardGameLayoutDocument,
} from '@/ui/layout/cardGameLayoutAsset';
import type { LayoutPreset } from '@/ui/layout/tableLayoutTypes';
import { getLocalPilotStatus } from './localPilotCatalog';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';

const SUPPORTED_PILOT_FAMILY = 'claim';
const ASSET_LOAD_TIMEOUT_MS = 10000;

const FRENCH_CARD_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as CardValue[];
const ITALIAN_BRISCOLA_VALUES = [2, 3, 4, 5, 6, 7, 11, 12, 13, 14] as CardValue[];
const FRENCH_SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
const ITALIAN_SUITS = ['coppe', 'denari', 'spade', 'bastoni'] as const;
const ITALIAN_TO_RUNTIME_SUIT = {
  coppe: Suit.HEARTS,
  denari: Suit.DIAMONDS,
  spade: Suit.SPADES,
  bastoni: Suit.CLUBS,
} as const;

interface ParsedIdentifier {
  slug: string;
  guid: AssetGUIDType | null;
}

type AssetReference = {
  guid: string;
  assetType: string;
  displayName?: string;
  path?: string;
};

interface LoadedPlayableGameMode {
  gameId: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
  baseBet?: number | null;
  maxRounds?: number | null;
  mechanicsAsset: AssetResourceEntry<CardGameMechanics> | CardGameMechanics;
  layoutAsset?: AssetResourceEntry<Layout> | AssetResourceEntry<CardGameLayout> | CardGameLayout;
}

class StaticDeckProvider implements IDeckProvider {
  private readonly baseDeck: Card[];
  private seed: number;
  private originalSeed: number;

  constructor(baseDeck: Card[], seed: number) {
    this.baseDeck = [...baseDeck];
    this.seed = seed;
    this.originalSeed = seed;
  }

  async createStandardDeck(): Promise<Card[]> {
    return [...this.baseDeck];
  }

  shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    let currentIndex = shuffled.length;
    this.resetSeed();

    while (currentIndex !== 0) {
      const randomIndex = Math.floor(this.seededRandom() * currentIndex);
      currentIndex -= 1;
      [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
    }

    return shuffled;
  }

  dealInitialHands(deck: Card[], playerCount: number, handSize: number): { hands: Card[][]; remainingDeck: Card[] } {
    const hands: Card[][] = Array.from({ length: playerCount }, () => []);
    const remainingDeck = [...deck];

    for (let cardIndex = 0; cardIndex < handSize; cardIndex += 1) {
      for (let playerIndex = 0; playerIndex < playerCount; playerIndex += 1) {
        const card = remainingDeck.shift();
        if (card) {
          hands[playerIndex].push(card);
        }
      }
    }

    return { hands, remainingDeck };
  }

  drawCard(deck: Card[]): { card: Card | null; remainingDeck: Card[] } {
    const remainingDeck = [...deck];
    const card = remainingDeck.shift() ?? null;
    return { card, remainingDeck };
  }

  getSeed(): number {
    return this.seed;
  }

  setSeed(seed: number): void {
    this.seed = seed;
    this.originalSeed = seed;
  }

  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private resetSeed(): void {
    this.seed = this.originalSeed;
  }
}

export interface LocalPlayableGameBundle {
  gameId: string;
  displayName: string;
  familyKernel: string;
  playerCount: number;
  deckSize: number;
  gameMode: LoadedPlayableGameMode;
  mechanics: CardGameMechanics;
  spec: MechanicsSpec;
  layoutDocument: NormalizedCardGameLayoutDocument;
  layoutPreset: LayoutPreset;
  createDeckProvider: (seed: number) => IDeckProvider;
}

export interface LocalPlayableGameLoadResult {
  bundle: LocalPlayableGameBundle | null;
  error: string | null;
}

export async function loadLocalPlayableGame(
  identifier: string,
  preferredPlayerCount?: number,
): Promise<LocalPlayableGameLoadResult> {
  const parsed = parseIdentifier(identifier);
  const readiness = getLocalPilotStatus(parsed.slug);
  if (!readiness.isReady) {
    return {
      bundle: null,
      error: readiness.message,
    };
  }

  const gameModeEntry = await withTimeout(
    resolveGameModeEntry(parsed.slug, parsed.guid),
    `Game "${parsed.slug}" timed out resolving the game mode entry.`,
  );
  if (!gameModeEntry) {
    return {
      bundle: null,
      error: `Game "${parsed.slug}" could not be loaded.`,
    };
  }

  const gameModeDocument = await withTimeout(
    loadPlayableGameModeDocument(gameModeEntry.guid, parsed.slug),
    `Game "${parsed.slug}" timed out loading the game mode asset.`,
  );
  if (!gameModeDocument) {
    return {
      bundle: null,
      error: `Game "${parsed.slug}" could not be loaded.`,
    };
  }

  const gameMode = gameModeDocument;
  const mechanics = await withTimeout(
    resolveMechanicsAsset(gameMode.mechanicsAsset),
    `Game "${parsed.slug}" timed out loading the mechanics asset.`,
  );
  if (!mechanics) {
    return {
      bundle: null,
      error: `Game "${parsed.slug}" is missing a mechanics asset.`,
    };
  }

  if (mechanics.familyKernel !== SUPPORTED_PILOT_FAMILY) {
    return {
      bundle: null,
      error: `Claim is the only ready local pilot. "${parsed.slug}" uses "${mechanics.familyKernel}".`,
    };
  }

  const runtimeDeck = buildRuntimeDeck(mechanics);
  const spec = toMechanicsSpec(mechanics);
  const playerCount = clamp(
    preferredPlayerCount ?? mechanics.playerConfig.optimalPlayers ?? mechanics.playerConfig.minPlayers,
    mechanics.playerConfig.minPlayers,
    mechanics.playerConfig.maxPlayers,
  );
  const layoutDocument = await withTimeout(
    loadCardGameLayoutDocument(gameMode.layoutAsset ?? null),
    `Game "${parsed.slug}" timed out loading the layout asset.`,
  );
  if (!layoutDocument) {
    return {
      bundle: null,
      error: `Game "${parsed.slug}" is missing a readable layout asset.`,
    };
  }

  const layoutPreset = resolveLayoutPreset(layoutDocument, playerCount);
  if (!layoutPreset) {
    return {
      bundle: null,
      error: `Game "${parsed.slug}" does not define a layout preset for ${playerCount} seats.`,
    };
  }

  if (layoutPreset.seats.length < playerCount) {
    return {
      bundle: null,
      error: `Game "${parsed.slug}" layout preset for ${playerCount} seats only defines ${layoutPreset.seats.length} seat positions.`,
    };
  }

  return {
    bundle: {
      gameId: parsed.slug,
      displayName: gameMode.displayName || parsed.slug,
      familyKernel: mechanics.familyKernel,
      playerCount,
      deckSize: runtimeDeck.length,
      gameMode,
      mechanics,
      spec,
      layoutDocument,
      layoutPreset,
      createDeckProvider: (seed: number) => new StaticDeckProvider(runtimeDeck, seed),
    },
    error: null,
  };
}

export function getCurrentMechanicsPhase(spec: MechanicsSpec, gameState: GameState | null): MechanicsSpec['phases'][number] | null {
  if (!gameState) {
    return null;
  }
  const phaseId = gameState.mechanicsPhaseId ?? spec.phases[0]?.id ?? null;
  if (!phaseId) {
    return null;
  }
  return spec.phases.find((phase) => phase.id === phaseId) ?? null;
}

export function getLegalActions(spec: MechanicsSpec, gameState: GameState | null): string[] {
  return getCurrentMechanicsPhase(spec, gameState)?.legalActions ?? [];
}

export function formatCardLabel(card: Card): string {
  const valueMap: Record<number, string> = {
    14: 'A',
    13: 'K',
    12: 'Q',
    11: 'J',
  };
  const suitMap: Record<string, string> = {
    spades: 'Spades',
    hearts: 'Hearts',
    diamonds: 'Diamonds',
    clubs: 'Clubs',
  };
  const italianMatch = /^italian_(coppe|denari|spade|bastoni)_\d+$/i.exec(card.id);
  const italianSuitLabel = italianMatch?.[1];

  const valueLabel = valueMap[card.value] ?? String(card.value);
  const suitLabel = italianSuitLabel
    ? italianSuitLabel.charAt(0).toUpperCase() + italianSuitLabel.slice(1)
    : (suitMap[card.suit] ?? card.suit);
  return `${valueLabel} ${suitLabel}`;
}

export function describePlayer(player: Player, gameState: GameState | null): string[] {
  const details: string[] = [];
  if (player.declaredSuit) {
    details.push(`Declared: ${player.declaredSuit}`);
  }
  if (gameState?.mechanicsContext?.foldedPlayerIds?.includes(player.id)) {
    details.push('Folded');
  }
  if (gameState?.mechanicsContext?.revealedPlayerIds?.includes(player.id)) {
    details.push('Revealed');
  }
  return details;
}

function parseIdentifier(identifier: string): ParsedIdentifier {
  const [slug, rawGuid] = identifier.split(':');
  return {
    slug: slug || identifier,
    guid: rawGuid && isAssetGUID(rawGuid) ? rawGuid : null,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildRuntimeDeck(mechanics: CardGameMechanics): Card[] {
  return createCanonicalDeck(mechanics);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ASSET_LOAD_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function extractResourceReference(value: unknown): AssetReference | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const guid = typeof record.guid === 'string' ? record.guid : null;
  const assetType = typeof record.assetType === 'string' ? record.assetType : null;
  if (!guid || !assetType) {
    return null;
  }

  return {
    guid,
    assetType,
    displayName: typeof record.displayName === 'string' ? record.displayName : undefined,
    path: typeof record.path === 'string' ? record.path : undefined,
  };
}

async function resolveGameModeEntry(slug: string, guid: AssetGUIDType | null): Promise<{ guid: string; displayName: string } | null> {
  const entries = await getGameModeEntries();
  const entry = entries.find((candidate) => candidate.gameId === slug || candidate.guid === guid) ?? null;
  if (!entry) {
    return null;
  }

  return {
    guid: entry.guid,
    displayName: entry.displayName || slug,
  };
}

async function loadPlayableGameModeDocument(guid: string, fallbackGameId: string): Promise<LoadedPlayableGameMode | null> {
  const raw = await loadRawAssetDocumentByGuid(guid);
  if (!raw) {
    return null;
  }

  const system = raw.system && typeof raw.system === 'object' && !Array.isArray(raw.system)
    ? (raw.system as Record<string, unknown>)
    : {};
  const data = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
    ? (raw.data as Record<string, unknown>)
    : {};

  const mechanicsRef = extractResourceReference(data.mechanicsAsset);
  const layoutRef = extractResourceReference(data.layoutAsset);
  if (!mechanicsRef || !layoutRef) {
    return null;
  }

  const mechanicsEntry = AssetResourceEntry.fromGuid(
    mechanicsRef.guid,
    asAssetType(mechanicsRef.assetType),
    mechanicsRef.displayName ?? 'Mechanics',
  ) as AssetResourceEntry<CardGameMechanics>;
  if (mechanicsRef.path) {
    mechanicsEntry.path = mechanicsRef.path;
  }

  const layoutEntry = AssetResourceEntry.fromGuid(
    layoutRef.guid,
    asAssetType(layoutRef.assetType),
    layoutRef.displayName ?? 'Layout',
  ) as AssetResourceEntry<CardGameLayout>;
  if (layoutRef.path) {
    layoutEntry.path = layoutRef.path;
  }

  return {
    gameId: typeof system.gameId === 'string' ? system.gameId : fallbackGameId,
    displayName: typeof system.displayName === 'string' && system.displayName ? system.displayName : fallbackGameId,
    minPlayers: typeof data.minPlayers === 'number' ? data.minPlayers : 2,
    maxPlayers: typeof data.maxPlayers === 'number' ? data.maxPlayers : 6,
    baseBet: typeof data.baseBet === 'number' ? data.baseBet : null,
    maxRounds: typeof data.maxRounds === 'number' ? data.maxRounds : null,
    mechanicsAsset: mechanicsEntry,
    layoutAsset: layoutEntry,
  };
}

function isAssetEntry<T>(value: unknown): value is AssetResourceEntry<T> {
  return value instanceof AssetResourceEntry;
}

function isLoadedMechanicsAsset(value: unknown): value is CardGameMechanics {
  return value instanceof CardGameMechanics;
}

async function resolveMechanicsAsset(
  mechanicsAsset: LoadedPlayableGameMode['mechanicsAsset'],
): Promise<CardGameMechanics | null> {
  if (isLoadedMechanicsAsset(mechanicsAsset)) {
    return mechanicsAsset;
  }

  if (isAssetEntry<CardGameMechanics>(mechanicsAsset)) {
    const raw = await loadRawAssetDocumentByGuid(String(mechanicsAsset.guid));
    if (!raw) {
      return null;
    }

    const data = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : null;
    if (!data) {
      return null;
    }

    return Object.assign(new CardGameMechanics(), data) as CardGameMechanics;
  }

  return null;
}

function createCanonicalDeck(mechanics: CardGameMechanics): Card[] {
  if (mechanics.deckType === 'Standard 40' && mechanics.suitSet === 'Italian') {
    return ITALIAN_SUITS.flatMap((suit) =>
      ITALIAN_BRISCOLA_VALUES.map((value) => ({
        id: `italian_${suit}_${value}`,
        suit: ITALIAN_TO_RUNTIME_SUIT[suit],
        value,
      })),
    );
  }

  return FRENCH_SUITS.flatMap((suit) =>
    FRENCH_CARD_VALUES.map((value) => ({
      id: `${value}_of_${suit}`,
      suit,
      value,
    })),
  );
}
