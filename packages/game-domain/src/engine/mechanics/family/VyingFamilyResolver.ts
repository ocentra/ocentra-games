import type { ValidationResult } from '@/engine/logic/StateValidator';
import type { Card, GameState, PlayerAction } from '@/types/game';
import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';
import type { MechanicsFamilyResolver } from '@/engine/mechanics/family/MechanicsFamilyResolver';

type BragRank =
  | 'trail'
  | 'pure_sequence'
  | 'sequence'
  | 'flush'
  | 'pair'
  | 'high_card';

interface BragHandValue {
  rank: BragRank;
  score: number;
  tiebreak: number[];
}

function createResult(isValid: boolean, errors: string[] = [], warnings: string[] = []): ValidationResult {
  return { isValid, errors, warnings };
}

function getBetAmount(action: PlayerAction): number {
  if (!action.data || typeof action.data !== 'object') {
    return 1;
  }
  const amount = (action.data as Record<string, unknown>).amount;
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? amount : 1;
}

function sortDescending(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => b.value - a.value);
}

function isSequence(values: number[]): boolean {
  const sorted = [...values].sort((a, b) => a - b);
  const basic = sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1;
  const wheel = sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 14;
  return basic || wheel;
}

function evaluateBragHand(cards: Card[]): BragHandValue {
  const sorted = sortDescending(cards);
  const values = sorted.map((card) => card.value);
  const sameSuit = sorted.every((card) => card.suit === sorted[0].suit);
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const distinctCounts = [...counts.values()].sort((a, b) => b - a);
  const sequence = isSequence(values);

  if (distinctCounts[0] === 3) {
    return { rank: 'trail', score: 6, tiebreak: values };
  }
  if (sameSuit && sequence) {
    return { rank: 'pure_sequence', score: 5, tiebreak: values };
  }
  if (sequence) {
    return { rank: 'sequence', score: 4, tiebreak: values };
  }
  if (sameSuit) {
    return { rank: 'flush', score: 3, tiebreak: values };
  }
  if (distinctCounts[0] === 2) {
    const pairValue = [...counts.entries()].find(([, count]) => count === 2)?.[0] ?? 0;
    const kicker = [...counts.entries()].find(([, count]) => count === 1)?.[0] ?? 0;
    return { rank: 'pair', score: 2, tiebreak: [pairValue, kicker] };
  }
  return { rank: 'high_card', score: 1, tiebreak: values };
}

export class VyingFamilyResolver implements MechanicsFamilyResolver {
  family = 'vying';

  supports(spec: MechanicsSpec): boolean {
    return spec.familyKernel === 'three-card-brag' || spec.familyKernel === 'teen-patti';
  }

  onSetupRound(gameState: GameState): void {
    gameState.mechanicsContext = {
      ...gameState.mechanicsContext!,
      roundPot: gameState.players.length,
      foldedPlayerIds: [],
      revealedPlayerIds: [],
      showdownCallerId: null,
      tableCards: [],
      capturedCardsByPlayerId: {},
      trumpCard: null,
      lastMechanicsAction: 'setup_round',
    };
  }

  validateAction(gameState: GameState, action: PlayerAction): ValidationResult | null {
    switch (action.type) {
      case 'bet':
        return createResult(getBetAmount(action) > 0, getBetAmount(action) > 0 ? [] : ['Bet amount must be positive']);
      case 'fold':
        if (gameState.mechanicsContext?.foldedPlayerIds.includes(action.playerId)) {
          return createResult(false, ['Player already folded']);
        }
        return createResult(true);
      case 'call_showdown':
        return createResult(
          (gameState.players.length - (gameState.mechanicsContext?.foldedPlayerIds.length ?? 0)) >= 2,
          (gameState.players.length - (gameState.mechanicsContext?.foldedPlayerIds.length ?? 0)) >= 2 ? [] : ['Not enough active players for showdown'],
        );
      case 'reveal_hand':
        return createResult(true);
      default:
        return null;
    }
  }

  processAction(gameState: GameState, action: PlayerAction): boolean {
    const activePlayers = gameState.players.filter((player) => !gameState.mechanicsContext?.foldedPlayerIds.includes(player.id));
    switch (action.type) {
      case 'bet':
        gameState.mechanicsContext!.roundPot += getBetAmount(action);
        gameState.mechanicsContext!.lastMechanicsAction = 'bet';
        gameState.currentPlayer = this.nextActivePlayer(gameState, action.playerId);
        return true;
      case 'fold':
        gameState.mechanicsContext!.foldedPlayerIds = [
          ...gameState.mechanicsContext!.foldedPlayerIds,
          action.playerId,
        ];
        gameState.mechanicsContext!.lastMechanicsAction = 'fold';
        if (activePlayers.length - 1 <= 1) {
          gameState.mechanicsPhaseId = 'score_round';
        } else {
          gameState.currentPlayer = this.nextActivePlayer(gameState, action.playerId);
        }
        return true;
      case 'call_showdown':
        gameState.mechanicsContext!.showdownCallerId = action.playerId;
        gameState.mechanicsContext!.revealedPlayerIds = [];
        gameState.mechanicsContext!.lastMechanicsAction = 'call_showdown';
        gameState.mechanicsPhaseId = 'showdown';
        return true;
      case 'reveal_hand':
        gameState.mechanicsContext!.revealedPlayerIds = Array.from(
          new Set([...gameState.mechanicsContext!.revealedPlayerIds, action.playerId]),
        );
        gameState.mechanicsContext!.lastMechanicsAction = 'reveal_hand';
        return true;
      default:
        return false;
    }
  }

  onScoreRound(gameState: GameState): boolean {
    const activePlayers = gameState.players.filter((player) => !gameState.mechanicsContext?.foldedPlayerIds.includes(player.id));
    const winner = activePlayers.reduce((best, current) => {
      if (!best) {
        return current;
      }
      const bestScore = evaluateBragHand(best.hand);
      const currentScore = evaluateBragHand(current.hand);
      if (currentScore.score !== bestScore.score) {
        return currentScore.score > bestScore.score ? current : best;
      }
      for (let index = 0; index < currentScore.tiebreak.length; index += 1) {
        if ((currentScore.tiebreak[index] ?? 0) !== (bestScore.tiebreak[index] ?? 0)) {
          return (currentScore.tiebreak[index] ?? 0) > (bestScore.tiebreak[index] ?? 0) ? current : best;
        }
      }
      return best;
    }, activePlayers[0] ?? null);

    if (!winner) {
      return true;
    }

    gameState.players = gameState.players.map((player) => player.id === winner.id
      ? { ...player, score: player.score + (gameState.mechanicsContext?.roundPot ?? 0) }
      : player);
    return true;
  }

  shouldEndGame(gameState: GameState, spec: MechanicsSpec): boolean | null {
    const activePlayers = gameState.players.filter((player) => !gameState.mechanicsContext?.foldedPlayerIds.includes(player.id));
    if (activePlayers.length <= 1) {
      return true;
    }
    const maxRounds = typeof spec.roundConfig?.maxRounds === 'number' ? spec.roundConfig.maxRounds : 1;
    if (gameState.round >= maxRounds) {
      return true;
    }
    return null;
  }

  private nextActivePlayer(gameState: GameState, currentPlayerId: string): number {
    const currentIndex = gameState.players.findIndex((player) => player.id === currentPlayerId);
    for (let offset = 1; offset <= gameState.players.length; offset += 1) {
      const nextIndex = (currentIndex + offset) % gameState.players.length;
      const nextPlayer = gameState.players[nextIndex];
      if (!gameState.mechanicsContext?.foldedPlayerIds.includes(nextPlayer.id)) {
        return nextIndex;
      }
    }
    return currentIndex >= 0 ? currentIndex : 0;
  }
}
