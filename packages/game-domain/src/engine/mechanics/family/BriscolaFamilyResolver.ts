import type { IDeckProvider } from '@/interfaces/IDeckProvider';
import type { ValidationResult } from '@/engine/logic/StateValidator';
import type { GameState, PlayerAction, Suit, RuntimePiece } from '@/types/game';
import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';
import type { MechanicsFamilyResolver } from '@/engine/mechanics/family/MechanicsFamilyResolver';
import { asRuntimeCard } from '@/deck/runtimeDeck';

const BRISCOLA_POINTS: Record<number, number> = {
  14: 11,
  3: 10,
  13: 4,
  12: 3,
  11: 2,
};

const BRISCOLA_ORDER: Record<number, number> = {
  14: 10,
  3: 9,
  13: 8,
  12: 7,
  11: 6,
  7: 5,
  6: 4,
  5: 3,
  4: 2,
  2: 1,
};

function createResult(isValid: boolean, errors: string[] = [], warnings: string[] = []): ValidationResult {
  return { isValid, errors, warnings };
}

function getCardId(action: PlayerAction): string | null {
  if (!action.data || typeof action.data !== 'object') {
    return null;
  }
  const value = (action.data as Record<string, unknown>).cardId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function determineTrickWinner(
  leadSuit: Suit,
  trumpSuit: Suit | null,
  trickCards: Array<{ playerId: string; card: RuntimePiece }>,
): string {
  const winningEntry = trickCards.reduce((best, current) => {
    const bestCard = asRuntimeCard(best.card);
    const currentCard = asRuntimeCard(current.card);
    if (!bestCard || !currentCard) {
      return best;
    }
    const bestTrump = trumpSuit !== null && bestCard.suit === trumpSuit;
    const currentTrump = trumpSuit !== null && currentCard.suit === trumpSuit;

    if (currentTrump && !bestTrump) {
      return current;
    }
    if (!currentTrump && bestTrump) {
      return best;
    }

    if (currentCard.suit === bestCard.suit) {
      return BRISCOLA_ORDER[currentCard.value] > BRISCOLA_ORDER[bestCard.value] ? current : best;
    }

    if (!bestTrump && currentCard.suit === leadSuit && bestCard.suit !== leadSuit) {
      return current;
    }

    return best;
  });

  return winningEntry.playerId;
}

function nextPlayerIndex(gameState: GameState, currentIndex: number): number {
  if (gameState.players.length === 0) {
    return 0;
  }
  return (currentIndex + 1) % gameState.players.length;
}

export class BriscolaFamilyResolver implements MechanicsFamilyResolver {
  family = 'briscola';
  executorId = 'briscola.trick.v1';

  supports(spec: MechanicsSpec): boolean {
    return spec.familyKernel === 'briscola' || spec.trickConfig?.hasTricks === true;
  }

  onSetupRound(gameState: GameState, _spec: MechanicsSpec, deckProvider: IDeckProvider): void {
    const { piece, remainingDeck } = deckProvider.drawPiece(gameState.deck);
    gameState.floorCard = piece;
    gameState.deck = remainingDeck;
    gameState.mechanicsContext = {
      ...gameState.mechanicsContext!,
      trumpCard: piece,
      tableCards: [],
      capturedCardsByPlayerId: Object.fromEntries(gameState.players.map((player) => [player.id, []])),
      foldedPlayerIds: [],
      roundPot: 0,
      revealedPlayerIds: [],
      showdownCallerId: null,
      lastMechanicsAction: 'setup_round',
    };
  }

  validateAction(gameState: GameState, action: PlayerAction, _spec: MechanicsSpec): ValidationResult | null {
    if (action.type !== 'play_card') {
      return null;
    }
    const cardId = getCardId(action);
    if (!cardId) {
      return createResult(false, ['play_card requires cardId']);
    }
    const player = gameState.players.find((entry) => entry.id === action.playerId);
    if (!player) {
      return createResult(false, [`Player ${action.playerId} not found`]);
    }
    if (!player.hand.some((card) => card.id === cardId)) {
      return createResult(false, [`Card ${cardId} is not in player hand`]);
    }
    return createResult(true);
  }

  processAction(gameState: GameState, action: PlayerAction, _spec: MechanicsSpec, deckProvider: IDeckProvider): boolean {
    if (action.type !== 'play_card') {
      return false;
    }

    const cardId = getCardId(action);
    if (!cardId) {
      return true;
    }

    const playerIndex = gameState.players.findIndex((entry) => entry.id === action.playerId);
    if (playerIndex < 0) {
      return true;
    }

    const hand = [...gameState.players[playerIndex].hand];
    const cardIndex = hand.findIndex((card) => card.id === cardId);
    if (cardIndex < 0) {
      return true;
    }

    const [playedCard] = hand.splice(cardIndex, 1);
    gameState.players[playerIndex] = {
      ...gameState.players[playerIndex],
      hand,
    };
    gameState.mechanicsContext!.tableCards = [
      ...gameState.mechanicsContext!.tableCards,
      { playerId: action.playerId, card: playedCard },
    ];
    gameState.mechanicsContext!.lastMechanicsAction = 'play_card';

    if (gameState.mechanicsContext!.tableCards.length < gameState.players.length) {
      gameState.currentPlayer = nextPlayerIndex(gameState, playerIndex);
      return true;
    }

    const leadSuit = asRuntimeCard(gameState.mechanicsContext!.tableCards[0]?.card)?.suit;
    const trumpSuit = asRuntimeCard(gameState.mechanicsContext!.trumpCard)?.suit ?? null;
    if (!leadSuit) {
      return true;
    }

    const winnerId = determineTrickWinner(leadSuit, trumpSuit, gameState.mechanicsContext!.tableCards);
    const winnerIndex = gameState.players.findIndex((entry) => entry.id === winnerId);
    const capturedCards = gameState.mechanicsContext!.capturedCardsByPlayerId[winnerId] ?? [];
    gameState.mechanicsContext!.capturedCardsByPlayerId[winnerId] = [
      ...capturedCards,
      ...gameState.mechanicsContext!.tableCards.map((entry) => entry.card),
    ];
    gameState.mechanicsContext!.tableCards = [];
    gameState.currentPlayer = winnerIndex >= 0 ? winnerIndex : playerIndex;

    for (let drawOffset = 0; drawOffset < gameState.players.length; drawOffset += 1) {
      if (gameState.deck.length === 0 && !gameState.floorCard) {
        break;
      }
      const drawIndex = (gameState.currentPlayer + drawOffset) % gameState.players.length;
      if (gameState.deck.length > 0) {
        const { piece, remainingDeck } = deckProvider.drawPiece(gameState.deck);
        gameState.deck = remainingDeck;
        if (piece) {
          gameState.players[drawIndex] = {
            ...gameState.players[drawIndex],
            hand: [...gameState.players[drawIndex].hand, piece],
          };
        }
      } else if (gameState.floorCard) {
        gameState.players[drawIndex] = {
          ...gameState.players[drawIndex],
          hand: [...gameState.players[drawIndex].hand, gameState.floorCard],
        };
        gameState.floorCard = null;
        gameState.mechanicsContext!.trumpCard = null;
      }
    }

    const allHandsEmpty = gameState.players.every((player) => player.hand.length === 0);
    if (allHandsEmpty && gameState.deck.length === 0 && gameState.floorCard === null && gameState.mechanicsContext!.tableCards.length === 0) {
      gameState.mechanicsPhaseId = 'score_round';
    }

    return true;
  }

  onScoreRound(gameState: GameState): boolean {
    const captured = gameState.mechanicsContext?.capturedCardsByPlayerId ?? {};
    gameState.players = gameState.players.map((player) => {
      const points = (captured[player.id] ?? []).reduce((total, piece) => total + (BRISCOLA_POINTS[asRuntimeCard(piece)?.value ?? 0] ?? 0), 0);
      return {
        ...player,
        score: player.score + points,
      };
    });
    return true;
  }

  shouldEndGame(gameState: GameState): boolean | null {
    const allHandsEmpty = gameState.players.every((player) => player.hand.length === 0);
    if (allHandsEmpty && gameState.deck.length === 0 && gameState.floorCard === null && (gameState.mechanicsContext?.tableCards.length ?? 0) === 0) {
      return true;
    }
    return null;
  }
}
