import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import { CardGameMechanics } from '@ocentra/game-asset-domain/game/gameMechanics/CardGameMechanics';
import { toMechanicsSpec } from '@ocentra/game-asset-domain/game/gameMechanics/MechanicsTranslator';
import type { Layout } from '@ocentra/game-asset-domain/ui/layout/Layout';
import type { CardGameLayout } from '@ocentra/game-asset-domain/ui/layout/CardGameLayout';
import type { IDeckProvider } from '@ocentra/game-domain/interfaces/IDeckProvider';
import type { MechanicsSpec } from '@ocentra/game-domain/engine/mechanics/MechanicsSpec';
import {
  asRuntimeCard,
  createRuntimeCard,
  dealRuntimePieces,
  drawRuntimePiece,
  materializeRuntimePieces,
  runtimePiecesToCards,
  shuffleRuntimePieces,
} from '@ocentra/game-domain/deck/runtimeDeck';
import {
  extractClaimStrategyProfile,
  withClaimStrategyProfile,
} from '@ocentra/game-domain/schema/claim';
import { compileMechanicsWithModels } from '@ocentra/game-domain/schema/mechanics-model';
import { Suit, type Card, type CardValue, type GameState, type Player, type RuntimePiece } from '@ocentra/game-domain/types/game';
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
  deckAsset?: AssetReference | null;
  strategyAsset?: AssetReference | null;
}

class AssetBackedDeckProvider implements IDeckProvider {
  private readonly baseDeck: RuntimePiece[];
  private seed: number;
  private originalSeed: number;

  constructor(baseDeck: RuntimePiece[], seed: number) {
    this.baseDeck = baseDeck.map((piece) => ({ ...piece, identity: { ...piece.identity }, tags: [...piece.tags] }));
    this.seed = seed;
    this.originalSeed = seed;
  }

  async createDeck(): Promise<RuntimePiece[]> {
    return materializeRuntimePieces(this.baseDeck);
  }

  async createStandardDeck(): Promise<Card[]> {
    return runtimePiecesToCards(await this.createDeck());
  }

  shuffleDeck(deck: RuntimePiece[]): RuntimePiece[] {
    this.resetSeed();
    return shuffleRuntimePieces(deck, this.seed);
  }

  dealInitialHands(deck: RuntimePiece[], playerCount: number, handSize: number): { hands: RuntimePiece[][]; remainingDeck: RuntimePiece[] } {
    return dealRuntimePieces(deck, playerCount, handSize);
  }

  drawPiece(deck: RuntimePiece[]): { piece: RuntimePiece | null; remainingDeck: RuntimePiece[] } {
    return drawRuntimePiece(deck);
  }

  drawCard(deck: RuntimePiece[]): { card: RuntimePiece | null; remainingDeck: RuntimePiece[] } {
    const { piece, remainingDeck } = this.drawPiece(deck);
    return { card: piece, remainingDeck };
  }

  getSeed(): number {
    return this.seed;
  }

  setSeed(seed: number): void {
    this.seed = seed;
    this.originalSeed = seed;
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

  const baseSpec = toMechanicsSpec(mechanics as unknown as Parameters<typeof toMechanicsSpec>[0]);
  const modelAssets = await withTimeout(
    resolveMechanicsModelAssets(baseSpec.modelRefs),
    `Game "${parsed.slug}" timed out loading mechanics model assets.`,
  );
  const compiled = compileMechanicsWithModels(baseSpec, modelAssets);
  if (compiled.issues.length > 0) {
    return {
      bundle: null,
      error: compiled.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'),
    };
  }
  const strategyProfile = await withTimeout(
    resolveClaimStrategyProfile(gameMode.strategyAsset),
    `Game "${parsed.slug}" timed out loading the strategy asset.`,
  );
  const spec = strategyProfile
    ? withClaimStrategyProfile(compiled.spec, strategyProfile)
    : compiled.spec;
  const runtimeDeck = await withTimeout(
    resolveRuntimeDeck(spec, gameMode.deckAsset),
    `Game "${parsed.slug}" timed out loading the deck asset.`,
  );
  if (!runtimeDeck) {
    return {
      bundle: null,
      error: `Game "${parsed.slug}" is missing a readable Deck asset.`,
    };
  }
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
      createDeckProvider: (seed: number) => new AssetBackedDeckProvider(runtimeDeck, seed),
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

export function formatCardLabel(piece: RuntimePiece): string {
  const card = asRuntimeCard(piece);
  if (!card) {
    return piece.logicalId || piece.id;
  }
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
  const deckRef = extractResourceReference(data.deckAsset);
  const strategyRef = extractResourceReference(data.strategyAsset);
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
    deckAsset: deckRef,
    strategyAsset: strategyRef,
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

async function resolveClaimStrategyProfile(
  strategyAsset: LoadedPlayableGameMode['strategyAsset'],
): Promise<ReturnType<typeof extractClaimStrategyProfile> | null> {
  if (!strategyAsset) {
    return null;
  }

  const raw = await loadRawAssetDocumentByGuid(strategyAsset.guid);
  return raw ? extractClaimStrategyProfile(raw) : null;
}

async function resolveMechanicsModelAssets(
  modelRefs: MechanicsSpec['modelRefs'],
): Promise<unknown[]> {
  const refs = Object.values(modelRefs ?? {}).filter((ref) => typeof ref.guid === 'string' && ref.guid.length > 0);
  return Promise.all(refs.map(async (ref) => {
    const raw = await loadRawAssetDocumentByGuid(String(ref.guid));
    if (!raw) {
      throw new Error(`Mechanics model "${ref.guid}" could not be loaded.`);
    }
    return raw;
  }));
}

async function resolveRuntimeDeck(spec: MechanicsSpec, gameDeckAsset: AssetReference | null | undefined): Promise<RuntimePiece[] | null> {
  const deckRef = extractResourceReference(spec.assetRefs?.deck) ?? gameDeckAsset ?? null;
  if (!deckRef?.guid) {
    return null;
  }

  const deckDocument = await loadRawAssetDocumentByGuid(deckRef.guid);
  if (!deckDocument) {
    return null;
  }

  const deckRoot = dataRecord(deckDocument);
  const deckData = dataRecord(deckRoot.data);
  const entries = getDeckCompositionEntries(deckData);
  if (entries.length === 0) {
    return null;
  }

  const pieces = await Promise.all(entries.flatMap((entry) =>
    Array.from({ length: entry.copies }, async () => {
      const pieceDocument = entry.ref.guid ? await loadRawAssetDocumentByGuid(entry.ref.guid) : null;
      return pieceDocument ? runtimePieceFromAssetDocument(pieceDocument, deckData, entry) : null;
    }),
  ));

  const runtimePieces = pieces.filter((piece): piece is RuntimePiece => piece !== null);
  return runtimePieces.length > 0 ? materializeRuntimePieces(runtimePieces) : null;
}

function getDeckCompositionEntries(deckData: Record<string, unknown>): Array<{
  copies: number;
  logicalId?: string;
  ref: AssetReference;
  role?: string;
  tags: string[];
}> {
  const composition = arrayValue(deckData.composition);
  if (composition.length > 0) {
    return composition.flatMap((entry) => {
      const record = dataRecord(entry);
      const ref = extractResourceReference(record.pieceTemplate);
      return ref ? [{
        copies: positiveInteger(record.copies, 1),
        logicalId: stringValue(record.logicalId) || undefined,
        ref,
        role: stringValue(record.role) || undefined,
        tags: arrayValue(record.tags).map(stringValue).filter(Boolean),
      }] : [];
    });
  }

  const cardComposition = arrayValue(deckData.cardComposition);
  if (cardComposition.length > 0) {
    return cardComposition.flatMap((entry) => {
      const record = dataRecord(entry);
      const ref = extractResourceReference(record.cardTemplate);
      return ref ? [{
        copies: positiveInteger(record.copies, 1),
        ref,
        tags: [],
      }] : [];
    });
  }

  return arrayValue(deckData.cardTemplates).flatMap((entry) => {
    const ref = extractResourceReference(entry);
    return ref ? [{ copies: 1, ref, tags: [] }] : [];
  });
}

function runtimePieceFromAssetDocument(
  document: Record<string, unknown>,
  deckData: Record<string, unknown>,
  entry: { logicalId?: string; ref: AssetReference; role?: string; tags: string[] },
): RuntimePiece | null {
  const root = dataRecord(document);
  const system = dataRecord(root.system);
  const data = dataRecord(root.data);
  const assetType = stringValue(system.assetType) || entry.ref.assetType;
  const cardIdentity = dataRecord(data.cardIdentity);
  const logicalId = entry.logicalId || stringValue(data.cardId) || stringValue(data.tileId) || stringValue(system.variant) || stringValue(system.displayName) || entry.ref.guid;
  const imageHash = stringValue(data.imageHash) || undefined;

  if (assetType === 'Card' && typeof cardIdentity.suit === 'string' && typeof cardIdentity.value === 'number') {
    return {
      ...createRuntimeCard({
        id: logicalId,
        logicalId,
        suit: cardIdentity.suit as Suit,
        value: cardIdentity.value as CardValue,
        family: stringValue(deckData.deckFamily) || stringValue(cardIdentity.family) || 'french_cards',
        imageHash,
        assetRef: entry.ref,
        tags: entry.tags,
      }),
      role: entry.role,
    };
  }

  return {
    id: logicalId,
    logicalId,
    pieceKind: stringValue(data.pieceKind) || inferPieceKind(assetType, deckData),
    family: stringValue(deckData.deckFamily) || stringValue(data.family) || assetType,
    identity: {
      ...data,
      assetType,
    },
    tags: entry.tags,
    assetRef: entry.ref,
    imageHash,
    role: entry.role,
    copyIndex: 1,
  };
}

function inferPieceKind(assetType: string, deckData: Record<string, unknown>): string {
  const deckPieceKind = stringValue(deckData.pieceKind);
  if (deckPieceKind) {
    return deckPieceKind;
  }
  if (assetType === 'DominoTile') {
    return 'domino_tile';
  }
  if (assetType === 'HanafudaCard') {
    return 'hanafuda_card';
  }
  if (assetType === 'MahjongTile') {
    return 'mahjong_tile';
  }
  return assetType === 'Card' ? 'card' : 'custom';
}

function dataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}
