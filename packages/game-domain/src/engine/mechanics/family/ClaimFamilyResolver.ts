import type { IDeckProvider } from '@/interfaces/IDeckProvider';
import type { ValidationResult } from '@/engine/logic/StateValidator';
import { GamePhase, type GameState, type Player, type PlayerAction, type RuntimePiece, type Suit } from '@/types/game';
import { asRuntimeCard, runtimePiecesToCards } from '@/deck/runtimeDeck';
import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';
import type { MechanicsFamilyResolver } from '@/engine/mechanics/family/MechanicsFamilyResolver';
import {
  calculateClaimPlayerScore,
  type ClaimPlayerScore,
} from '@/engine/mechanics/family/ClaimScoring';
import { compileClaimRuntimeConfig, type ClaimBotProfile, type ClaimRuntimeConfig } from '@/schema/claim.schema';

export { calculateClaimPlayerScore } from '@/engine/mechanics/family/ClaimScoring';

const CLAIM_STARTING_BANKROLL = 1352;

interface ClaimTurnState {
  acted: boolean;
  discarded: boolean;
  playerId: string;
  taken: boolean;
}

interface ClaimSettlement {
  bankrollAfter: number;
  bankrollBefore: number;
  payoutDelta: number;
  rawScore: number;
  totalDelta: number;
}

export interface ClaimBotStrategyOptions {
  seed?: number;
}

interface ClaimFamilyState {
  bankrollByPlayerId: Record<string, number>;
  declaredSuitByPlayerId: Record<string, Suit>;
  eliminatedPlayerIds: string[];
  roundScoresByPlayerId: Record<string, ClaimPlayerScore>;
  settlementByPlayerId: Record<string, ClaimSettlement>;
  showdownCallerId: string | null;
  turn: ClaimTurnState | null;
  undeclaredDebtByPlayerId: Record<string, number>;
}

function createResult(isValid: boolean, errors: string[] = [], warnings: string[] = []): ValidationResult {
  return { isValid, errors, warnings };
}

function cloneClaimState(value: unknown, players: Player[], startingBankroll = CLAIM_STARTING_BANKROLL): ClaimFamilyState {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<ClaimFamilyState>
    : {};
  const bankrollByPlayerId: Record<string, number> = {};
  const undeclaredDebtByPlayerId: Record<string, number> = {};

  players.forEach((player) => {
    const bankroll = record.bankrollByPlayerId?.[player.id];
    bankrollByPlayerId[player.id] = typeof bankroll === 'number' ? bankroll : startingBankroll;
    const debt = record.undeclaredDebtByPlayerId?.[player.id];
    undeclaredDebtByPlayerId[player.id] = typeof debt === 'number' ? debt : 0;
  });

  return {
    bankrollByPlayerId,
    declaredSuitByPlayerId: { ...(record.declaredSuitByPlayerId ?? {}) },
    eliminatedPlayerIds: [...(record.eliminatedPlayerIds ?? [])],
    roundScoresByPlayerId: { ...(record.roundScoresByPlayerId ?? {}) },
    settlementByPlayerId: { ...(record.settlementByPlayerId ?? {}) },
    showdownCallerId: record.showdownCallerId ?? null,
    turn: record.turn ? { ...record.turn } : null,
    undeclaredDebtByPlayerId,
  };
}

function setClaimState(gameState: GameState, claimState: ClaimFamilyState): void {
  gameState.mechanicsContext = {
    ...gameState.mechanicsContext!,
    familyState: claimState as unknown as Record<string, unknown>,
  };
}

function getSuit(data: unknown): Suit | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const value = (data as Record<string, unknown>).suit;
  return typeof value === 'string' && value.length > 0 ? value as Suit : null;
}

function getCardId(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const value = (data as Record<string, unknown>).cardId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getActivePlayerIds(gameState: GameState, claimState: ClaimFamilyState): string[] {
  const eliminated = new Set(claimState.eliminatedPlayerIds);
  return gameState.players.filter((player) => !eliminated.has(player.id)).map((player) => player.id);
}

function findPlayerIndex(gameState: GameState, playerId: string): number {
  return gameState.players.findIndex((player) => player.id === playerId);
}

function advanceActivePlayer(gameState: GameState, claimState: ClaimFamilyState): void {
  if (gameState.players.length === 0) {
    gameState.currentPlayer = 0;
    return;
  }

  const eliminated = new Set(claimState.eliminatedPlayerIds);
  for (let offset = 1; offset <= gameState.players.length; offset += 1) {
    const nextIndex = (gameState.currentPlayer + offset) % gameState.players.length;
    const nextPlayer = gameState.players[nextIndex];
    if (nextPlayer && !eliminated.has(nextPlayer.id)) {
      gameState.currentPlayer = nextIndex;
      claimState.turn = createTurnState(nextPlayer.id);
      return;
    }
  }
}

function createTurnState(playerId: string): ClaimTurnState {
  return {
    acted: false,
    discarded: false,
    playerId,
    taken: false,
  };
}

function highestCardValue(pieces: RuntimePiece[]): number {
  return runtimePiecesToCards(pieces).reduce((highest, card) => Math.max(highest, card.value), 0);
}

function scoreAllPlayers(gameState: GameState, claimState: ClaimFamilyState): Record<string, ClaimPlayerScore> {
  return Object.fromEntries(gameState.players.map((player) => [
    player.id,
    calculateClaimPlayerScore(
      player,
      claimState.declaredSuitByPlayerId[player.id] ?? null,
      claimState.undeclaredDebtByPlayerId[player.id] ?? 0,
    ),
  ]));
}

function settleScores(
  gameState: GameState,
  claimState: ClaimFamilyState,
  roundScoresByPlayerId: Record<string, ClaimPlayerScore>,
): Record<string, ClaimSettlement> {
  const activePlayerIds = new Set(getActivePlayerIds(gameState, claimState));
  const activeScores = Object.entries(roundScoresByPlayerId).filter(([playerId]) => activePlayerIds.has(playerId));
  const topScore = activeScores.reduce((highest, [, score]) => Math.max(highest, score.finalScore), -Infinity);
  const winnerIds = topScore > 0
    ? activeScores.filter(([, score]) => score.finalScore === topScore).map(([playerId]) => playerId)
    : [];
  const winnerSet = new Set(winnerIds);
  const sharedPool = topScore > 0
    ? activeScores.reduce((pool, [playerId, score]) => (
        winnerSet.has(playerId) ? pool : pool + (topScore - score.finalScore)
      ), 0)
    : 0;
  const winnerShare = winnerIds.length > 0 ? sharedPool / winnerIds.length : 0;

  return Object.fromEntries(gameState.players.map((player) => {
    const rawScore = activePlayerIds.has(player.id)
      ? roundScoresByPlayerId[player.id]?.finalScore ?? 0
      : 0;
    const bankrollBefore = claimState.bankrollByPlayerId[player.id] ?? player.score;
    const payoutDelta = winnerSet.has(player.id)
      ? winnerShare
      : topScore > 0 && activePlayerIds.has(player.id)
        ? -(topScore - rawScore)
        : 0;
    const totalDelta = rawScore + payoutDelta;
    return [player.id, {
      bankrollAfter: bankrollBefore + totalDelta,
      bankrollBefore,
      payoutDelta,
      rawScore,
      totalDelta,
    }];
  }));
}

function createAction(gameState: GameState, playerId: string, type: string, data?: unknown): PlayerAction {
  return {
    data,
    playerId,
    timestamp: new Date(gameState.lastAction.getTime() + 1000),
    type,
  };
}

function getLegalActionSet(gameState: GameState, spec: MechanicsSpec): Set<string> {
  const phaseId = gameState.mechanicsPhaseId ?? spec.phases[0]?.id ?? null;
  const phase = phaseId ? spec.phases.find((entry) => entry.id === phaseId) : null;
  return new Set(phase?.legalActions ?? []);
}

function seededIndex(seed: number, count: number): number {
  if (count <= 0) {
    return 0;
  }
  const mixed = Math.imul(seed ^ 0x9e3779b9, 2654435761);
  return Math.abs(mixed) % count;
}

function seededRatio(seed: number): number {
  const mixed = Math.imul(seed ^ 0x85ebca6b, 2246822507);
  return (Math.abs(mixed) % 10000) / 10000;
}

function choosePreferredSuit(pieces: RuntimePiece[], seed: number): Suit | null {
  const cards = runtimePiecesToCards(pieces);
  const bySuit = new Map<Suit, { count: number; total: number }>();
  cards.forEach((card) => {
    const current = bySuit.get(card.suit) ?? { count: 0, total: 0 };
    bySuit.set(card.suit, {
      count: current.count + 1,
      total: current.total + card.value,
    });
  });
  const candidates = [...bySuit.entries()].sort((left, right) => (
    right[1].count - left[1].count
      || right[1].total - left[1].total
      || left[0].localeCompare(right[0])
  ));
  const top = candidates[0]?.[1];
  if (!top) {
    return null;
  }
  const tied = candidates.filter(([, value]) => value.count === top.count && value.total === top.total);
  return tied[seededIndex(seed, tied.length)]?.[0] ?? candidates[0]?.[0] ?? null;
}

function chooseDiscardCard(
  player: Player,
  declaredSuit: Suit | null,
  preferredSuit: Suit | null,
  strategy: ClaimBotProfile,
  seed: number,
): RuntimePiece | null {
  const liabilitySuit = declaredSuit ?? preferredSuit;
  const candidates = liabilitySuit
    ? player.hand.filter((piece) => asRuntimeCard(piece)?.suit !== liabilitySuit)
    : player.hand;
  const pool = candidates.length > 0 ? candidates : player.hand;
  if (liabilitySuit && candidates.length > 1 && seededRatio(seed) < strategy.bluffFrequency) {
    return [...candidates].sort((left, right) => (asRuntimeCard(left)?.value ?? 0) - (asRuntimeCard(right)?.value ?? 0) || left.id.localeCompare(right.id))[0] ?? null;
  }
  return [...pool].sort((left, right) => (asRuntimeCard(right)?.value ?? 0) - (asRuntimeCard(left)?.value ?? 0) || left.id.localeCompare(right.id))[0] ?? null;
}

function resolveBotShowdownThreshold(minimum: number, strategy: ClaimBotProfile): number {
  const riskAdjustment = Math.round((0.5 - strategy.riskTolerance) * 8);
  const aggressionAdjustment = Math.round((0.5 - strategy.aggressiveness) * 10);
  return Math.max(minimum, minimum + riskAdjustment + aggressionAdjustment);
}

function shouldDeclareForBot(player: Player, preferredSuit: Suit | null, turn: ClaimTurnState, strategy: ClaimBotProfile): boolean {
  if (!preferredSuit) {
    return false;
  }
  const preferredCount = player.hand.filter((piece) => asRuntimeCard(piece)?.suit === preferredSuit).length;
  return preferredCount >= 2 || turn.acted || strategy.riskTolerance >= 0.5 || strategy.aggressiveness >= 0.7;
}

export function createClaimBotAction(
  gameState: GameState,
  spec: MechanicsSpec,
  playerId: string,
  options: ClaimBotStrategyOptions = {},
): PlayerAction | null {
  const player = gameState.players.find((entry) => entry.id === playerId) ?? null;
  if (!player || gameState.players[gameState.currentPlayer]?.id !== playerId) {
    return null;
  }

  const config = compileClaimRuntimeConfig(spec);
  const claimState = cloneClaimState(gameState.mechanicsContext?.familyState, gameState.players, config.startingBankroll);
  if (claimState.eliminatedPlayerIds.includes(playerId)) {
    return null;
  }

  const turn = claimState.turn ?? createTurnState(playerId);
  const legalActions = getLegalActionSet(gameState, spec);
  const seed = (options.seed ?? 0) + gameState.round + playerId.length + player.hand.length;
  const declaredSuit = claimState.declaredSuitByPlayerId[playerId] ?? player.declaredSuit ?? null;
  const preferredSuit = declaredSuit ?? choosePreferredSuit(player.hand, seed);
  const minimumHandSize = config.minHandSize;
  const showdownMinimum = resolveBotShowdownThreshold(config.showdownMinimum, config.strategy);

  if (declaredSuit && legalActions.has('call_showdown')) {
    const score = calculateClaimPlayerScore(player, declaredSuit, claimState.undeclaredDebtByPlayerId[playerId] ?? 0);
    if (player.hand.length >= minimumHandSize && score.finalScore >= showdownMinimum) {
      return createAction(gameState, playerId, 'call_showdown');
    }
  }

  if (!declaredSuit && legalActions.has('declare_suit') && shouldDeclareForBot(player, preferredSuit, turn, config.strategy)) {
    return createAction(gameState, playerId, 'declare_suit', { suit: preferredSuit });
  }

  if (legalActions.has('discard_card') && !turn.discarded && player.hand.length > minimumHandSize) {
    const cardToDiscard = chooseDiscardCard(player, declaredSuit, preferredSuit, config.strategy, seed);
    if (cardToDiscard) {
      return createAction(gameState, playerId, 'discard_card', { cardId: cardToDiscard.id });
    }
  }

  if (!turn.taken) {
    const discardTopCard = gameState.discardPile[gameState.discardPile.length - 1] ?? null;
    if (
      legalActions.has('take_discard')
      && discardTopCard
      && preferredSuit
      && asRuntimeCard(discardTopCard)?.suit === preferredSuit
    ) {
      return createAction(gameState, playerId, 'take_discard');
    }

    if (legalActions.has('take_stock') && gameState.deck.length > 0) {
      return createAction(gameState, playerId, 'take_stock');
    }

    if (legalActions.has('take_discard') && discardTopCard) {
      return createAction(gameState, playerId, 'take_discard');
    }
  }

  if (legalActions.has('end_turn')) {
    return createAction(gameState, playerId, 'end_turn');
  }

  if (legalActions.has('pass')) {
    return createAction(gameState, playerId, 'pass');
  }

  return null;
}

export class ClaimFamilyResolver implements MechanicsFamilyResolver {
  family = 'claim';
  executorId = 'claim.hoarder.v1';

  supports(spec: MechanicsSpec): boolean {
    return spec.familyKernel === 'claim';
  }

  runSetupRound(gameState: GameState, spec: MechanicsSpec, deckProvider: IDeckProvider): boolean {
    const config = compileClaimRuntimeConfig(spec);
    const currentState = cloneClaimState(gameState.mechanicsContext?.familyState, gameState.players, config.startingBankroll);
    const activePlayerIds = getActivePlayerIds(gameState, currentState);
    const activePlayers = gameState.players.filter((player) => activePlayerIds.includes(player.id));
    const handSize = config.minHandSize;
    const { hands, remainingDeck } = deckProvider.dealInitialHands(gameState.deck, activePlayers.length, handSize);
    let activeHandIndex = 0;

    gameState.players = gameState.players.map((player) => {
      if (!activePlayerIds.includes(player.id)) {
        return {
          ...player,
          declaredSuit: null,
          hand: [],
          intentCard: null,
          score: currentState.bankrollByPlayerId[player.id] ?? player.score,
        };
      }

      const hand = hands[activeHandIndex] ?? [];
      activeHandIndex += 1;
      return {
        ...player,
        declaredSuit: null,
        hand,
        intentCard: null,
          score: currentState.bankrollByPlayerId[player.id] ?? config.startingBankroll,
      };
    });

    const dealerIndex = gameState.mechanicsContext?.dealerIndex ?? 0;
    const nextPlayerIndex = this.resolveFirstActivePlayerIndex(gameState, dealerIndex, currentState);
    const activePlayer = gameState.players[nextPlayerIndex] ?? null;
    const nextState: ClaimFamilyState = {
      ...currentState,
      declaredSuitByPlayerId: {},
      roundScoresByPlayerId: {},
      settlementByPlayerId: {},
      showdownCallerId: null,
      turn: activePlayer ? createTurnState(activePlayer.id) : null,
      undeclaredDebtByPlayerId: Object.fromEntries(gameState.players.map((player) => [player.id, 0])),
    };

    gameState.deck = remainingDeck;
    gameState.discardPile = [];
    gameState.floorCard = null;
    gameState.currentPlayer = nextPlayerIndex;
    gameState.mechanicsContext = {
      ...gameState.mechanicsContext!,
      capturedCardsByPlayerId: {},
      foldedPlayerIds: [...nextState.eliminatedPlayerIds],
      lastMechanicsAction: 'setup_round',
      revealedPlayerIds: [],
      roundPot: 0,
      showdownCallerId: null,
      tableCards: [],
      trumpCard: null,
      familyState: nextState as unknown as Record<string, unknown>,
    };
    return true;
  }

  validateAction(gameState: GameState, action: PlayerAction, spec: MechanicsSpec): ValidationResult | null {
    const player = gameState.players.find((entry) => entry.id === action.playerId);
    if (!player) {
      return createResult(false, [`Player ${action.playerId} not found`]);
    }

    const config = compileClaimRuntimeConfig(spec);
    const claimState = cloneClaimState(gameState.mechanicsContext?.familyState, gameState.players, config.startingBankroll);
    if (claimState.eliminatedPlayerIds.includes(player.id)) {
      return createResult(false, ['Eliminated players cannot act']);
    }

    const turn = claimState.turn ?? createTurnState(player.id);
    const errors: string[] = [];

    switch (action.type) {
      case 'take_stock':
        if (turn.taken) {
          errors.push('Player has already taken a card this turn');
        }
        if (gameState.deck.length === 0) {
          errors.push('Stock is empty');
        }
        break;
      case 'take_discard':
        if (turn.taken) {
          errors.push('Player has already taken a card this turn');
        }
        if (gameState.discardPile.length === 0) {
          errors.push('Discard pile is empty');
        }
        break;
      case 'discard_card':
        this.validateDiscard(player, action, turn, config.minHandSize, errors);
        break;
      case 'declare_suit':
      case 'declare':
        this.validateDeclare(player, action, claimState, errors);
        break;
      case 'call_showdown':
        this.validateShowdown(player, config, claimState, errors);
        break;
      case 'end_turn':
      case 'pass':
      case 'timeout_turn':
        break;
      default:
        return null;
    }

    return createResult(errors.length === 0, errors);
  }

  processAction(gameState: GameState, action: PlayerAction, spec: MechanicsSpec, deckProvider: IDeckProvider): boolean {
    const config = compileClaimRuntimeConfig(spec);
    const claimState = cloneClaimState(gameState.mechanicsContext?.familyState, gameState.players, config.startingBankroll);
    const playerIndex = findPlayerIndex(gameState, action.playerId);
    if (playerIndex < 0) {
      return false;
    }

    claimState.turn = claimState.turn?.playerId === action.playerId
      ? claimState.turn
      : createTurnState(action.playerId);

    switch (action.type) {
      case 'take_stock':
        this.processTakeStock(gameState, playerIndex, claimState, deckProvider);
        break;
      case 'take_discard':
        this.processTakeDiscard(gameState, playerIndex, claimState);
        break;
      case 'discard_card':
        this.processDiscard(gameState, playerIndex, action, claimState);
        break;
      case 'declare_suit':
      case 'declare':
        this.processDeclare(gameState, playerIndex, action, claimState);
        break;
      case 'call_showdown':
        this.processShowdown(gameState, action, claimState);
        break;
      case 'timeout_turn':
        this.processEndTurn(gameState, claimState, true);
        break;
      case 'end_turn':
      case 'pass':
        this.processEndTurn(gameState, claimState, false);
        break;
      default:
        return false;
    }

    setClaimState(gameState, claimState);
    return true;
  }

  onScoreRound(gameState: GameState, spec: MechanicsSpec): boolean {
    const config = compileClaimRuntimeConfig(spec);
    const claimState = cloneClaimState(gameState.mechanicsContext?.familyState, gameState.players, config.startingBankroll);
    const roundScoresByPlayerId = scoreAllPlayers(gameState, claimState);
    const settlementByPlayerId = settleScores(gameState, claimState, roundScoresByPlayerId);
    const eliminatedPlayerIds = new Set(claimState.eliminatedPlayerIds);

    gameState.players = gameState.players.map((player) => {
      const settlement = settlementByPlayerId[player.id];
      if (settlement && settlement.bankrollAfter <= 0) {
        eliminatedPlayerIds.add(player.id);
      }
      return settlement
        ? { ...player, score: settlement.bankrollAfter }
        : player;
    });

    const nextDealerIndex = this.resolveNextDealerIndex(gameState, claimState);
    const nextState: ClaimFamilyState = {
      ...claimState,
      bankrollByPlayerId: Object.fromEntries(gameState.players.map((player) => [player.id, player.score])),
      eliminatedPlayerIds: [...eliminatedPlayerIds],
      roundScoresByPlayerId,
      settlementByPlayerId,
      turn: null,
    };

    gameState.mechanicsContext = {
      ...gameState.mechanicsContext!,
      dealerIndex: nextDealerIndex,
      familyState: nextState as unknown as Record<string, unknown>,
      foldedPlayerIds: [...nextState.eliminatedPlayerIds],
      lastMechanicsAction: 'score_round',
    };
    return true;
  }

  shouldEndGame(gameState: GameState, spec: MechanicsSpec): boolean | null {
    const config = compileClaimRuntimeConfig(spec);
    const claimState = cloneClaimState(gameState.mechanicsContext?.familyState, gameState.players, config.startingBankroll);
    const activePlayerCount = getActivePlayerIds(gameState, claimState).length;
    const maxRounds = config.maxRounds;
    if (activePlayerCount <= 1) {
      return true;
    }
    return gameState.round > maxRounds;
  }

  private validateDiscard(player: Player, action: PlayerAction, turn: ClaimTurnState, minimumHandSize: number, errors: string[]): void {
    const cardId = getCardId(action.data);
    if (!cardId) {
      errors.push('Discard requires cardId');
      return;
    }
    if (turn.discarded) {
      errors.push('Player has already discarded this turn');
    }
    if (player.hand.length <= minimumHandSize) {
      errors.push(`Player must keep at least ${minimumHandSize} cards`);
    }
    if (!player.hand.some((card) => card.id === cardId)) {
      errors.push(`Card ${cardId} is not in player hand`);
    }
  }

  private validateDeclare(player: Player, action: PlayerAction, claimState: ClaimFamilyState, errors: string[]): void {
    const suit = getSuit(action.data);
    if (!suit) {
      errors.push('Declare requires suit');
      return;
    }
    if (claimState.declaredSuitByPlayerId[player.id]) {
      errors.push('Player has already declared this round');
    }
    if (!player.hand.some((piece) => asRuntimeCard(piece)?.suit === suit)) {
      errors.push(`Player does not hold ${suit}`);
    }
  }

  private validateShowdown(player: Player, config: ClaimRuntimeConfig, claimState: ClaimFamilyState, errors: string[]): void {
    const declaredSuit = claimState.declaredSuitByPlayerId[player.id] ?? null;
    if (!declaredSuit) {
      errors.push('Player must declare before calling showdown');
      return;
    }
    if (player.hand.length < config.minHandSize) {
      errors.push(`Player needs at least ${config.minHandSize} cards to call showdown`);
    }
    const minimum = config.showdownMinimum;
    const score = calculateClaimPlayerScore(player, declaredSuit, claimState.undeclaredDebtByPlayerId[player.id] ?? 0);
    if (score.finalScore < minimum) {
      errors.push(`Player final score ${score.finalScore} is below showdown minimum ${minimum}`);
    }
  }

  private processTakeStock(gameState: GameState, playerIndex: number, claimState: ClaimFamilyState, deckProvider: IDeckProvider): void {
    const { piece, remainingDeck } = deckProvider.drawPiece(gameState.deck);
    if (!piece) {
      return;
    }
    gameState.deck = remainingDeck;
    gameState.players[playerIndex] = {
      ...gameState.players[playerIndex],
      hand: [...gameState.players[playerIndex].hand, piece],
    };
    claimState.turn = {
      ...(claimState.turn ?? createTurnState(gameState.players[playerIndex].id)),
      acted: true,
      taken: true,
    };
  }

  private processTakeDiscard(gameState: GameState, playerIndex: number, claimState: ClaimFamilyState): void {
    const nextDiscardPile = [...gameState.discardPile];
    const card = nextDiscardPile.pop();
    if (!card) {
      return;
    }
    gameState.discardPile = nextDiscardPile;
    gameState.players[playerIndex] = {
      ...gameState.players[playerIndex],
      hand: [...gameState.players[playerIndex].hand, card],
    };
    claimState.turn = {
      ...(claimState.turn ?? createTurnState(gameState.players[playerIndex].id)),
      acted: true,
      taken: true,
    };
  }

  private processDiscard(gameState: GameState, playerIndex: number, action: PlayerAction, claimState: ClaimFamilyState): void {
    const cardId = getCardId(action.data);
    if (!cardId) {
      return;
    }
    const hand = [...gameState.players[playerIndex].hand];
    const cardIndex = hand.findIndex((card) => card.id === cardId);
    const [card] = cardIndex >= 0 ? hand.splice(cardIndex, 1) : [];
    if (!card) {
      return;
    }
    gameState.players[playerIndex] = {
      ...gameState.players[playerIndex],
      hand,
    };
    gameState.discardPile = [...gameState.discardPile, card];
    claimState.turn = {
      ...(claimState.turn ?? createTurnState(gameState.players[playerIndex].id)),
      acted: true,
      discarded: true,
    };
  }

  private processDeclare(gameState: GameState, playerIndex: number, action: PlayerAction, claimState: ClaimFamilyState): void {
    const suit = getSuit(action.data);
    if (!suit) {
      return;
    }
    const player = gameState.players[playerIndex];
    claimState.declaredSuitByPlayerId[player.id] = suit;
    gameState.players[playerIndex] = {
      ...player,
      declaredSuit: suit,
    };
  }

  private processShowdown(gameState: GameState, action: PlayerAction, claimState: ClaimFamilyState): void {
    claimState.showdownCallerId = action.playerId;
    gameState.mechanicsContext = {
      ...gameState.mechanicsContext!,
      showdownCallerId: action.playerId,
    };
    gameState.mechanicsPhaseId = 'score_round';
    gameState.phase = GamePhase.SCORING;
  }

  private processEndTurn(gameState: GameState, claimState: ClaimFamilyState, _timedOut: boolean): void {
    const player = gameState.players[gameState.currentPlayer];
    if (!player) {
      return;
    }
    const turn = claimState.turn ?? createTurnState(player.id);
    const hasDeclared = Boolean(claimState.declaredSuitByPlayerId[player.id]);
    if (!hasDeclared && turn.acted) {
      claimState.undeclaredDebtByPlayerId[player.id] = (claimState.undeclaredDebtByPlayerId[player.id] ?? 0) + highestCardValue(player.hand);
    }

    if (gameState.deck.length === 0 && gameState.discardPile.length === 0) {
      this.processShowdown(gameState, { type: 'call_showdown', playerId: player.id, timestamp: gameState.lastAction }, claimState);
      return;
    }

    advanceActivePlayer(gameState, claimState);
  }

  private resolveFirstActivePlayerIndex(gameState: GameState, dealerIndex: number, claimState: ClaimFamilyState): number {
    if (gameState.players.length === 0) {
      return 0;
    }

    const eliminated = new Set(claimState.eliminatedPlayerIds);
    for (let offset = 1; offset <= gameState.players.length; offset += 1) {
      const index = (dealerIndex + offset) % gameState.players.length;
      const player = gameState.players[index];
      if (player && !eliminated.has(player.id)) {
        return index;
      }
    }
    return 0;
  }

  private resolveNextDealerIndex(gameState: GameState, claimState: ClaimFamilyState): number {
    const currentDealer = gameState.mechanicsContext?.dealerIndex ?? 0;
    return this.resolveFirstActivePlayerIndex(gameState, currentDealer, claimState);
  }
}
