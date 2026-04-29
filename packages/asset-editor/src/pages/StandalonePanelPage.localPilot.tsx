import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSON5 from 'json5';
import {
  LocalPilotArenaOverlay,
  LocalPilotStageOverlay,
} from '@ocentra/card-game-ui/localPilot/LocalPilotRuntimePresentation';
import {
  buildLocalPilotCardStripPresentation,
  buildLocalPilotHudActions,
  buildLocalPilotHudControls,
  buildLocalPilotScoreboardPresentation,
  buildLocalPilotSeatPresentation,
  buildLocalPilotZonePresentation,
  getLocalPilotWinnerText,
  type LocalPilotHudActionDescriptor,
} from '@ocentra/card-game-ui/localPilot/localPilotRuntimeHelpers';
import type {
  CardGameSeatPresentation,
  CardGameZonePresentation,
} from '@ocentra/card-game-ui/CardGamePreviewSurface';
import type { HudArtworkControls } from '@ocentra/card-game-ui/scene/HudArtwork.types';
import { CardGameMechanics } from '@ocentra/game-asset-domain/game/gameMechanics/CardGameMechanics';
import { toMechanicsSpec } from '@ocentra/game-asset-domain/game/gameMechanics/MechanicsTranslator';
import { GameEngine } from '@ocentra/game-domain/engine/GameEngine';
import type { MechanicsSpec } from '@ocentra/game-domain/engine/mechanics/MechanicsSpec';
import type { IDeckProvider } from '@ocentra/game-domain/interfaces/IDeckProvider';
import {
  GamePhase,
  Suit,
  type Card,
  type CardValue,
  type GameState,
} from '@ocentra/game-domain/types/game';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import {
  getResourceByGuidDb,
  loadAsset,
} from '@/adapters/assets/TauriAssetAdapter';

const SUPPORTED_LOCAL_PILOT_ID = 'claim';
const AUTO_START_COUNTDOWN_SECONDS = 3;
const DEFAULT_SEED = 42;
const PREVIEW_LOAD_TIMEOUT_MS = 5000;

const FRENCH_CARD_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as CardValue[];
const ITALIAN_BRISCOLA_VALUES = [2, 3, 4, 5, 6, 7, 11, 12, 13, 14] as CardValue[];
const FRENCH_SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
const ITALIAN_SUITS = ['coppe', 'denari', 'spade', 'bastoni'] as const;
const ITALIAN_TO_RUNTIME_SUIT = {
  bastoni: Suit.CLUBS,
  coppe: Suit.HEARTS,
  denari: Suit.DIAMONDS,
  spade: Suit.SPADES,
} as const;

interface LocalPilotPreviewBundle {
  createDeckProvider: (seed: number) => IDeckProvider;
  deckSize: number;
  displayName: string;
  gameId: string;
  gameMode: {
    baseBet?: number | null;
    maxRounds?: number | null;
  };
  spec: MechanicsSpec;
}

interface UseLocalPilotRuntimePreviewOptions {
  assetPath: string;
  document: CardGameLayoutDocument;
  gameId: string;
  playerCount: number;
}

interface UseLocalPilotRuntimePreviewResult {
  arenaOverlay: React.ReactNode;
  cardStripPresentation?: import('@ocentra/game-ui-types/cardGameLayoutTypes').CardGameCardStripPresentation;
  onHudButtonClick: (index: number) => void;
  runtimeHudControls?: HudArtworkControls;
  scoreboardPresentation?: import('@ocentra/game-ui-types/cardGameLayoutTypes').CardGameScoreboardPresentation;
  seatPresentationById: Partial<Record<number, CardGameSeatPresentation>>;
  stageOverlay: React.ReactNode;
  zonePresentationById: Partial<Record<string, CardGameZonePresentation>>;
}

class StaticDeckProvider implements IDeckProvider {
  private readonly baseDeck: Card[];
  private originalSeed: number;
  private seed: number;

  constructor(baseDeck: Card[], seed: number) {
    this.baseDeck = [...baseDeck];
    this.originalSeed = seed;
    this.seed = seed;
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

function getSeatName(index: number): string {
  return index === 0 ? 'You' : `Seat ${index + 1}`;
}

function getCurrentMechanicsPhase(spec: MechanicsSpec, gameState: GameState | null): MechanicsSpec['phases'][number] | null {
  if (!gameState) {
    return null;
  }

  const phaseId = gameState.mechanicsPhaseId ?? spec.phases[0]?.id ?? null;
  if (!phaseId) {
    return null;
  }

  return spec.phases.find((phase) => phase.id === phaseId) ?? null;
}

function getLegalActions(spec: MechanicsSpec, gameState: GameState | null): string[] {
  return getCurrentMechanicsPhase(spec, gameState)?.legalActions ?? [];
}

function cloneGameStateSnapshot(state: GameState | null): GameState | null {
  if (!state) {
    return null;
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(state) as GameState;
  }

  return {
    ...state,
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    floorCard: state.floorCard ? { ...state.floorCard } : null,
    lastAction: new Date(state.lastAction),
    mechanicsContext: state.mechanicsContext
      ? {
          ...state.mechanicsContext,
          capturedCardsByPlayerId: Object.fromEntries(
            Object.entries(state.mechanicsContext.capturedCardsByPlayerId).map(([playerId, cards]) => [
              playerId,
              cards.map((card) => ({ ...card })),
            ]),
          ),
          foldedPlayerIds: [...state.mechanicsContext.foldedPlayerIds],
          revealedPlayerIds: [...state.mechanicsContext.revealedPlayerIds],
          tableCards: [...state.mechanicsContext.tableCards].map((entry) => ({
            card: { ...entry.card },
            playerId: entry.playerId,
          })),
          trumpCard: state.mechanicsContext.trumpCard ? { ...state.mechanicsContext.trumpCard } : null,
        }
      : undefined,
    players: state.players.map((player) => ({
      ...player,
      hand: [...player.hand],
      intentCard: player.intentCard ? { ...player.intentCard } : null,
    })),
    startTime: new Date(state.startTime),
  };
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

function getDataBlock(root: Record<string, unknown>): Record<string, unknown> {
  const data = root.data;
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function normalizeResourcePath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized.startsWith('Resources/') ? normalized : `Resources/${normalized}`;
}

function getFolderPath(path: string): string {
  const normalized = normalizeResourcePath(path);
  const lastSlashIndex = normalized.lastIndexOf('/');
  return lastSlashIndex === -1 ? '' : normalized.slice(0, lastSlashIndex);
}

function joinResourcePath(folder: string, fileName: string): string {
  return `${folder.replace(/\/+$/, '')}/${fileName.replace(/^\/+/, '')}`;
}

function getGameIdFromRoot(root: Record<string, unknown>): string | null {
  const system = root.system;
  if (!system || typeof system !== 'object' || Array.isArray(system)) {
    return null;
  }

  const gameId = (system as Record<string, unknown>).gameId;
  return typeof gameId === 'string' && gameId.length > 0 ? gameId : null;
}

function getDisplayNameFromRoot(root: Record<string, unknown>): string | null {
  const system = root.system;
  if (!system || typeof system !== 'object' || Array.isArray(system)) {
    return null;
  }

  const displayName = (system as Record<string, unknown>).displayName;
  return typeof displayName === 'string' && displayName.trim().length > 0 ? displayName.trim() : null;
}

function getGuidFromRoot(root: Record<string, unknown>): string | null {
  const system = root.system;
  if (!system || typeof system !== 'object' || Array.isArray(system)) {
    return null;
  }

  const guid = (system as Record<string, unknown>).guid;
  return typeof guid === 'string' && guid.length > 0 ? guid : null;
}

async function resolveResourcePath(guid: string): Promise<string> {
  const entry = await getResourceByGuidDb(guid);
  if (!entry?.path) {
    throw new Error(`Path lookup failed for asset "${guid}".`);
  }
  return entry.path;
}

async function loadRawAssetDocument(reference: { guid: string; path?: string | null }): Promise<Record<string, unknown>> {
  const path = reference.path && reference.path.length > 0
    ? reference.path
    : await resolveResourcePath(reference.guid);
  const response = await loadAsset({ path });
  if (!response.ok) {
    throw new Error(`Failed to load asset "${reference.guid}" from "${path}".`);
  }
  return JSON5.parse(await response.text()) as Record<string, unknown>;
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      reject(new Error(`${label} timed out after ${PREVIEW_LOAD_TIMEOUT_MS}ms.`));
    }, PREVIEW_LOAD_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
  }
}

async function resolveGameModeReference(assetPath: string, gameId: string): Promise<{ guid: string; path: string }> {
  const folderPath = getFolderPath(assetPath);
  const directPath = joinResourcePath(folderPath, `${gameId}.asset`);
  try {
    const directRoot = await withTimeout(loadRawAssetDocument({
      guid: gameId,
      path: directPath,
    }), 'Loading sibling game mode asset');
    const directGameId = getGameIdFromRoot(directRoot)?.toLowerCase();
    const directData = getDataBlock(directRoot);
    const directLayoutAsset = directData.layoutAsset;
    const directLayoutPath = directLayoutAsset && typeof directLayoutAsset === 'object' && !Array.isArray(directLayoutAsset)
      ? (directLayoutAsset as Record<string, unknown>).path
      : null;
    const normalizedDirectLayoutPath = typeof directLayoutPath === 'string'
      ? normalizeResourcePath(directLayoutPath).toLowerCase()
      : null;
    const layoutPath = normalizeResourcePath(assetPath).toLowerCase();

    if (directGameId === gameId.toLowerCase() || normalizedDirectLayoutPath === layoutPath) {
      return {
        guid: getGuidFromRoot(directRoot) ?? gameId,
        path: directPath,
      };
    }
  } catch {
    // Fall back to a GUID/path lookup below when the direct sibling path is not enough.
  }

  const layoutPath = normalizeResourcePath(assetPath).toLowerCase();
  const siblingPaths = [
    joinResourcePath(folderPath, 'game.asset'),
    joinResourcePath(folderPath, 'mode.asset'),
  ];

  for (const siblingPath of siblingPaths) {
    try {
      const root = await loadRawAssetDocument({
        guid: siblingPath,
        path: siblingPath,
      });
      const rootGameId = getGameIdFromRoot(root)?.toLowerCase();
      const data = getDataBlock(root);
      const layoutAsset = data.layoutAsset;
      const layoutAssetPath = layoutAsset && typeof layoutAsset === 'object' && !Array.isArray(layoutAsset)
        ? (layoutAsset as Record<string, unknown>).path
        : null;
      const normalizedLayoutPath = typeof layoutAssetPath === 'string'
        ? normalizeResourcePath(layoutAssetPath).toLowerCase()
        : null;

      if (normalizedLayoutPath === layoutPath || rootGameId === gameId.toLowerCase()) {
        return {
          guid: getGuidFromRoot(root) ?? siblingPath,
          path: siblingPath,
        };
      }
    } catch {
      // Try the next conventional sibling filename.
    }
  }

  try {
    const gameModeRoot = await withTimeout(loadRawAssetDocument({
      guid: gameId,
      path: directPath,
    }), 'Loading fallback game mode asset');
    return {
      guid: getGuidFromRoot(gameModeRoot) ?? gameId,
      path: directPath,
    };
  } catch {
    // Fall through to the final error below.
  }

  throw new Error(`Game "${gameId}" could not be loaded from "${folderPath}".`);
}

async function resolveAssetPathFromReference(record: Record<string, unknown>, key: string): Promise<{ guid: string; path?: string | null }> {
  const reference = record[key];
  if (!reference || typeof reference !== 'object' || Array.isArray(reference)) {
    throw new Error(`Game "${record.gameId ?? 'unknown'}" is missing a ${key}.`);
  }

  const assetGuid = (reference as Record<string, unknown>).guid;
  const assetPath = (reference as Record<string, unknown>).path;
  if (typeof assetGuid !== 'string' || assetGuid.length === 0) {
    throw new Error(`Game "${record.gameId ?? 'unknown'}" is missing a ${key} guid.`);
  }

  return {
    guid: assetGuid,
    path: typeof assetPath === 'string' && assetPath.length > 0 ? assetPath : null,
  };
}

async function loadLocalPilotBundle(gameId: string, assetPath: string): Promise<LocalPilotPreviewBundle> {
  if (gameId !== SUPPORTED_LOCAL_PILOT_ID) {
    throw new Error(`${gameId} local pilot is not ready yet. Claim is the first supported local pilot.`);
  }

  const gameModeEntry = await withTimeout(
    resolveGameModeReference(assetPath, gameId),
    'Resolving preview game mode reference',
  );
  const gameModeRoot = await withTimeout(loadRawAssetDocument({
    guid: gameModeEntry.guid,
    path: gameModeEntry.path,
  }), 'Loading preview game mode asset');
  const gameModeData = getDataBlock(gameModeRoot);
  const mechanicsReference = await resolveAssetPathFromReference(gameModeData, 'mechanicsAsset');
  const mechanicsRoot = await withTimeout(
    loadRawAssetDocument(mechanicsReference),
    'Loading preview mechanics asset',
  );
  const mechanicsData = getDataBlock(mechanicsRoot);
  const mechanics = Object.assign(new CardGameMechanics(), mechanicsData) as CardGameMechanics;
  if (mechanics.familyKernel !== SUPPORTED_LOCAL_PILOT_ID) {
    throw new Error(`Claim is the only ready local pilot. "${gameId}" uses "${mechanics.familyKernel}".`);
  }

  const runtimeDeck = createCanonicalDeck(mechanics);
  return {
    createDeckProvider: (seed: number) => new StaticDeckProvider(runtimeDeck, seed),
    deckSize: runtimeDeck.length,
    displayName: getDisplayNameFromRoot(gameModeRoot) ?? gameId,
    gameId,
    gameMode: {
      baseBet: typeof gameModeData.baseBet === 'number' ? gameModeData.baseBet : null,
      maxRounds: typeof gameModeData.maxRounds === 'number' ? gameModeData.maxRounds : null,
    },
    spec: toMechanicsSpec(mechanics),
  };
}

export function useLocalPilotRuntimePreview({
  assetPath,
  document,
  gameId,
  playerCount,
}: UseLocalPilotRuntimePreviewOptions): UseLocalPilotRuntimePreviewResult {
  const [bundle, setBundle] = useState<LocalPilotPreviewBundle | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [seed] = useState(DEFAULT_SEED);
  const [startingMatch, setStartingMatch] = useState(false);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const autoStartArmedRef = useRef(false);
  const engineRef = useRef<GameEngine | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    engineRef.current = null;

    const load = async () => {
      setBundle(null);
      setCountdown(null);
      setError(null);
      setGameState(null);
      setLoading(true);
      setStartingMatch(false);
      autoStartArmedRef.current = false;

      try {
        const nextBundle = await loadLocalPilotBundle(gameId, assetPath);
        if (cancelled) {
          return;
        }
        setBundle(nextBundle);
        setCountdown(AUTO_START_COUNTDOWN_SECONDS);
      } catch (nextError) {
        if (cancelled) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      engineRef.current = null;
    };
  }, [assetPath, gameId]);

  const startMatch = useCallback(async () => {
    if (!bundle) {
      return;
    }

    unsubscribeRef.current?.();
    unsubscribeRef.current = null;

    const engine = new GameEngine({
      deckProvider: bundle.createDeckProvider(seed),
    });

    setStartingMatch(true);
    setCountdown(null);
    setError(null);

    try {
      await engine.initializeGame({
        enablePhysics: false,
        maxPlayers: playerCount,
        seed,
      });
      engine.loadMechanicsSpec(bundle.spec);

      for (let index = 0; index < playerCount; index += 1) {
        engine.addPlayer({
          id: `p${index + 1}`,
          name: getSeatName(index),
        });
      }

      unsubscribeRef.current = engine.subscribeToUpdates((nextState) => {
        setGameState(cloneGameStateSnapshot(nextState));
      });

      engineRef.current = engine;
      await engine.startGame();
      setGameState(cloneGameStateSnapshot(engine.getGameState()));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setStartingMatch(false);
    }
  }, [bundle, playerCount, seed]);

  const dispatchAction = useCallback((type: string, playerId: string, data?: unknown) => {
    const engine = engineRef.current;
    const state = engine?.getGameState();
    if (!engine || !state) {
      return;
    }

    const result = engine.processPlayerAction({
      data,
      playerId,
      timestamp: new Date(state.lastAction.getTime() + 1000),
      type,
    });

    if (!result?.isValid) {
      setError(result?.errors.join('\n') || 'Action failed.');
      return;
    }

    setError(null);
    setGameState(cloneGameStateSnapshot(engine.getGameState()));
  }, []);

  useEffect(() => {
    if (loading || error || !bundle || gameState || startingMatch || autoStartArmedRef.current) {
      return;
    }

    autoStartArmedRef.current = true;
    setCountdown(AUTO_START_COUNTDOWN_SECONDS);

    const intervalId = window.setInterval(() => {
      setCountdown((current) => {
        if (current === null) {
          return null;
        }
        if (current <= 1) {
          window.clearInterval(intervalId);
          void startMatch();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [bundle, error, gameState, loading, startMatch, startingMatch]);

  const legalActions = useMemo(
    () => (bundle ? getLegalActions(bundle.spec, gameState) : []),
    [bundle, gameState],
  );
  const currentPlayer = gameState ? gameState.players[gameState.currentPlayer] ?? null : null;
  const isGameOver = gameState?.phase === GamePhase.GAME_END;
  useEffect(() => {
    if (!gameState || isGameOver) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [gameState, isGameOver]);

  const activeTurnTimer = useMemo(() => {
    const timerSeconds = bundle?.spec.turnPolicy.timerSeconds;
    if (!gameState || !timerSeconds || timerSeconds <= 0 || isGameOver) {
      return null;
    }

    const elapsedSeconds = Math.max(0, (timerNow - gameState.lastAction.getTime()) / 1000);
    const remainingSeconds = Math.max(0, timerSeconds - elapsedSeconds);
    return {
      label: `${Math.ceil(remainingSeconds)}s`,
      progress: remainingSeconds / timerSeconds,
    };
  }, [bundle?.spec.turnPolicy.timerSeconds, gameState, isGameOver, timerNow]);
  const distinctDeclareSuits = useMemo(
    () => Array.from(new Set(currentPlayer?.hand.map((card) => card.suit) ?? [])),
    [currentPlayer],
  );
  const revealablePlayers = useMemo(() => {
    if (!gameState) {
      return [];
    }

    const revealed = new Set(gameState.mechanicsContext?.revealedPlayerIds ?? []);
    const folded = new Set(gameState.mechanicsContext?.foldedPlayerIds ?? []);
    return gameState.players.filter((player) => !revealed.has(player.id) && !folded.has(player.id));
  }, [gameState]);

  const hudActions = useMemo<LocalPilotHudActionDescriptor[]>(() => buildLocalPilotHudActions({
    currentPlayer,
    distinctDeclareSuits,
    legalActions,
    revealablePlayers,
  }), [currentPlayer, distinctDeclareSuits, legalActions, revealablePlayers]);

  const runtimeHudControls = useMemo(
    () => (bundle ? buildLocalPilotHudControls(document, hudActions) : undefined),
    [bundle, document, hudActions],
  );
  const seatPresentationById = useMemo(
    () => buildLocalPilotSeatPresentation({
      gameState,
      playerCount,
      turnTimerLabel: activeTurnTimer?.label,
      turnTimerProgress: activeTurnTimer?.progress,
    }),
    [activeTurnTimer, gameState, playerCount],
  );
  const zonePresentationById = useMemo(
    () => (bundle ? buildLocalPilotZonePresentation({ deckSize: bundle.deckSize, document, gameState }) : {}),
    [bundle, document, gameState],
  );
  const scoreboardPresentation = useMemo(
    () => (bundle
      ? buildLocalPilotScoreboardPresentation({
          document,
          gameMode: bundle.gameMode,
          gameState,
        })
      : undefined),
    [bundle, document, gameState],
  );
  const cardStripPresentation = useMemo(
    () => (bundle
      ? buildLocalPilotCardStripPresentation({
          document,
          gameMode: bundle.gameMode,
          gameState,
        })
      : undefined),
    [bundle, document, gameState],
  );
  const winnersText = useMemo(
    () => (gameState ? getLocalPilotWinnerText(gameState.players) : null),
    [gameState],
  );
  const displayName = bundle?.displayName ?? gameId;

  const arenaOverlay = useMemo(() => (
    <LocalPilotArenaOverlay
      countdown={countdown}
      displayName={displayName}
      hasGameState={Boolean(gameState)}
      loading={loading}
      playerCount={playerCount}
    />
  ), [countdown, displayName, gameState, loading, playerCount]);

  const stageOverlay = useMemo(() => (
    <LocalPilotStageOverlay
      countdown={countdown}
      error={error}
      isGameOver={Boolean(isGameOver)}
      loading={loading}
      restartDisabled={!bundle || startingMatch}
      startingMatch={startingMatch}
      winnersText={winnersText}
      onRestart={() => {
        autoStartArmedRef.current = true;
        setCountdown(null);
        void startMatch();
      }}
    />
  ), [
    bundle,
    countdown,
    error,
    isGameOver,
    loading,
    startMatch,
    startingMatch,
    winnersText,
  ]);

  const handleHudButtonClick = useCallback((index: number) => {
    const action = hudActions[index];
    if (!action || !currentPlayer) {
      return;
    }

    if (action.kind === 'declare' && action.suit) {
      dispatchAction('declare', currentPlayer.id, { suit: action.suit });
      return;
    }

    if (action.kind === 'pick_up' && action.cardId) {
      dispatchAction('pick_up', currentPlayer.id, { discardCardId: action.cardId });
      return;
    }

    if (action.kind === 'call_showdown') {
      dispatchAction('call_showdown', currentPlayer.id);
      return;
    }

    if (action.kind === 'reveal_hand' && action.playerId) {
      dispatchAction('reveal_hand', action.playerId);
      return;
    }

    if (action.kind === 'pass') {
      dispatchAction('pass', currentPlayer.id);
    }
  }, [currentPlayer, dispatchAction, hudActions]);

  return {
    arenaOverlay,
    cardStripPresentation,
    onHudButtonClick: handleHudButtonClick,
    runtimeHudControls,
    scoreboardPresentation,
    seatPresentationById,
    stageOverlay,
    zonePresentationById,
  };
}
