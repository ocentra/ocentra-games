import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode';
import { CardGameMechanics } from '@ocentra/game-asset-domain/game/gameMechanics/CardGameMechanics';
import { Deck } from '@ocentra/game-asset-domain/card/deck/Deck';
import type { CardIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import type { IDeckProvider } from '@ocentra/game-domain/interfaces/IDeckProvider';
import type { MechanicsSpec } from '@ocentra/game-domain/engine/mechanics/MechanicsSpec';
import { Suit, type Card, type CardValue, type GameState, type Player } from '@ocentra/game-domain/types/game';
import { getGameMode } from '@/adapters/assets/GameCatalogService';

const SUPPORTED_PILOT_FAMILIES = new Set(['claim', 'briscola', 'three-card-brag']);

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

interface PlayableCardGameMode extends GameMode {
  displayName?: string;
  minPlayers: number;
  maxPlayers: number;
  mechanicsAsset: AssetResourceEntry<CardGameMechanics>;
  deckAsset?: AssetResourceEntry<Deck> | null;
  getDeckAsset?: () => Promise<Deck | null>;
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
  gameMode: PlayableCardGameMode;
  mechanics: CardGameMechanics;
  spec: MechanicsSpec;
  createDeckProvider: (seed: number) => IDeckProvider;
}

export interface LocalPlayableGameLoadResult {
  bundle: LocalPlayableGameBundle | null;
  error: string | null;
}

export async function loadLocalPlayableGame(identifier: string): Promise<LocalPlayableGameLoadResult> {
  const parsed = parseIdentifier(identifier);
  const loaded = await getGameMode(parsed.slug) ?? (parsed.guid ? await getGameMode(parsed.guid) : null);
  if (!loaded) {
    return {
      bundle: null,
      error: `Game "${parsed.slug}" could not be loaded.`,
    };
  }

  const gameMode = loaded as PlayableCardGameMode;
  const mechanics = await gameMode.mechanicsAsset.load(CardGameMechanics);
  if (!mechanics) {
    return {
      bundle: null,
      error: `Game "${parsed.slug}" is missing a mechanics asset.`,
    };
  }

  if (!SUPPORTED_PILOT_FAMILIES.has(mechanics.familyKernel)) {
    return {
      bundle: null,
      error: `Local play is currently enabled for Claim, Briscola, and Three Card Brag only. "${parsed.slug}" uses "${mechanics.familyKernel}".`,
    };
  }

  const runtimeDeck = await buildRuntimeDeck(gameMode, mechanics);
  const spec = toMechanicsSpec(mechanics);
  const playerCount = clamp(
    mechanics.playerConfig.optimalPlayers ?? mechanics.playerConfig.minPlayers,
    mechanics.playerConfig.minPlayers,
    mechanics.playerConfig.maxPlayers,
  );

  return {
    bundle: {
      gameId: parsed.slug,
      displayName: gameMode.displayName || parsed.slug,
      familyKernel: mechanics.familyKernel,
      playerCount,
      gameMode,
      mechanics,
      spec,
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
  if (gameState?.mechanicsContext?.foldedPlayerIds.includes(player.id)) {
    details.push('Folded');
  }
  if (gameState?.mechanicsContext?.revealedPlayerIds.includes(player.id)) {
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

async function buildRuntimeDeck(gameMode: PlayableCardGameMode, mechanics: CardGameMechanics): Promise<Card[]> {
  const deckAsset = gameMode.getDeckAsset ? await gameMode.getDeckAsset() : null;
  if (deckAsset) {
    const cards = await deckAsset.getAllCards();
    const runtimeDeck = cards
      .map((cardAsset) => toRuntimeCard(cardAsset.cardIdentity, cardAsset.getCardId()))
      .filter((card): card is Card => card !== null);

    if (runtimeDeck.length > 0) {
      return runtimeDeck;
    }
  }

  return createCanonicalDeck(mechanics);
}

function toRuntimeCard(cardIdentity: CardIdentity, cardId: string): Card | null {
  if (cardIdentity.family === 'French' && 'suit' in cardIdentity && 'value' in cardIdentity) {
    return {
      id: cardId,
      suit: cardIdentity.suit,
      value: cardIdentity.value,
    };
  }

  const identityId = 'id' in cardIdentity ? cardIdentity.id : cardId;
  const italianMatch = /^italian_(?<suit>[a-z]+)_(?<value>\d+)$/i.exec(identityId);
  if (italianMatch?.groups) {
    const runtimeSuit = ITALIAN_TO_RUNTIME_SUIT[italianMatch.groups.suit as keyof typeof ITALIAN_TO_RUNTIME_SUIT];
    if (!runtimeSuit) {
      return null;
    }
    return {
      id: identityId,
      suit: runtimeSuit,
      value: Number(italianMatch.groups.value) as CardValue,
    };
  }

  const frenchMatch = /^(?<value>\d+)_of_(?<suit>[a-z_]+)$/i.exec(cardId);
  if (frenchMatch?.groups) {
    return {
      id: cardId,
      suit: frenchMatch.groups.suit as Card['suit'],
      value: Number(frenchMatch.groups.value) as CardValue,
    };
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

function toMechanicsSpec(mechanics: CardGameMechanics): MechanicsSpec {
  return {
    familyKernel: mechanics.familyKernel,
    kernelVersion: mechanics.kernelVersion,
    playerConfig: {
      playerMode: mechanics.playerConfig.playerMode,
      minPlayers: mechanics.playerConfig.minPlayers,
      maxPlayers: mechanics.playerConfig.maxPlayers,
      optimalPlayers: mechanics.playerConfig.optimalPlayers ?? null,
      dealerRotates: mechanics.playerConfig.dealerRotates,
    },
    phases: mechanics.phases.map((phase) => ({
      id: phase.id,
      label: phase.label,
      actor: phase.actor,
      legalActions: [...phase.legalActions],
      nextPhase: phase.nextPhase,
      isMandatory: phase.isMandatory,
      loopIndex: phase.loopIndex ?? null,
      totalLoops: phase.totalLoops ?? null,
      conditionalNext: phase.conditionalNext.map((entry) => ({
        condition: entry.condition,
        nextPhase: entry.nextPhase,
      })),
      cardVisibilityChanges: { ...phase.cardVisibilityChanges },
      notes: phase.notes,
    })),
    actions: { ...(mechanics.actions ?? {}) },
    customActions: mechanics.customActions.map((action) => ({
      id: action.id,
      supported: action.supported,
      description: action.description,
      cost: action.cost,
      constraints: action.constraints,
      effectType: action.effectType,
      effectHints: { ...action.effectHints },
      isTerminating: action.isTerminating,
    })),
    zones: mechanics.zones.map((zone) => ({
      id: zone.id,
      type: zone.type,
      owner: zone.owner,
      visibility: zone.visibility,
      capacity: zone.capacity ?? null,
    })),
    turnPolicy: {
      direction: mechanics.turnPolicy.direction,
      startsWith: mechanics.turnPolicy.startsWith,
      timerSeconds: mechanics.turnPolicy.timerSeconds ?? null,
    },
    endConditions: mechanics.endConditions.map((condition) => ({
      id: condition.id,
      description: condition.description,
      appliesToPhase: condition.appliesToPhase ?? null,
    })),
    cardVisibility: { ...(mechanics.cardVisibility ?? {}) },
    drawConfig: mechanics.drawConfig ?? null,
    discardConfig: mechanics.discardConfig ?? null,
    deckType: mechanics.deckType,
    suitSet: mechanics.suitSet,
    rankSet: mechanics.rankSet,
    initialHandSize: mechanics.initialHandSize,
    trumpConfig: mechanics.trumpConfig ?? null,
    meldConfig: mechanics.meldConfig ?? null,
    trickConfig: mechanics.trickConfig ?? null,
    declarationMechanism: mechanics.declarationMechanism ?? null,
    handRanks: mechanics.handRanks ?? null,
    buyCosts: mechanics.buyCosts ?? null,
    marketConfig: mechanics.marketConfig ?? null,
    specialCards: mechanics.specialCards ?? null,
    shedding: mechanics.shedding ?? null,
    fishingConfig: mechanics.fishingConfig ?? null,
    patienceConfig: mechanics.patienceConfig ?? null,
    bankingConfig: mechanics.bankingConfig ?? null,
    roundConfig: mechanics.roundConfig ?? null,
    constants: { ...(mechanics.constants ?? {}) },
    finalHandSize: mechanics.finalHandSize,
    deckCount: mechanics.deckCount,
    implementationHints: mechanics.implementationHints
      ? {
          rngUsed: [...mechanics.implementationHints.rngUsed],
          authoritativeServer: mechanics.implementationHints.authoritativeServer,
          customLogicNeeded: [...mechanics.implementationHints.customLogicNeeded],
        }
      : undefined,
    progression: [...(mechanics.progression ?? [])],
    roles: [...(mechanics.roles ?? [])],
    determinismNotes: mechanics.determinismNotes,
  };
}
