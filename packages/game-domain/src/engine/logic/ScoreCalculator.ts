import { type Card, type Player, type GameState } from '@/types/game';
import { runtimePiecesToCards } from '@/deck/runtimeDeck';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const LOG_GAME_ENGINE = false;

const logWarn = (
  message: string,
  dataOrEnabled?: unknown | boolean,
  enabled: boolean = LOG_GAME_ENGINE
) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

export interface ScoreBreakdown {
  baseScore: number;
  multiplier: number;
  positivePoints: number;
  penalties: number;
  bonuses: number;
  totalScore: number;
  bonusDetails: {
    cleanSweep: boolean;
    longRuns: number;
  };
  sequences: {
    declaredSuitSequences: SequenceInfo[];
    penaltySequences: SequenceInfo[];
  };
}

export interface SequenceInfo {
  cards: Card[];
  sequenceValue: number;
  sequenceLength: number;
}

export class ScoreCalculator {
  calculatePlayerScore(player: Player): ScoreBreakdown {
    if (!player.declaredSuit) {
      return this.calculateUndeclaredPenalty(player);
    }

    return this.calculateDeclaredScore(player);
  }

  private calculateDeclaredScore(player: Player): ScoreBreakdown {
    const declaredSuit = player.declaredSuit!;
    const hand = runtimePiecesToCards(player.hand);

    const suitCards = hand.filter((card) => card.suit === declaredSuit);
    const penaltyCards = hand.filter((card) => card.suit !== declaredSuit);

    const declaredSuitSequences = this.findSequences(suitCards);
    const penaltySequences = this.findSequences(penaltyCards);

    const sequencePoints = this.calculateSequencePoints(declaredSuitSequences);
    const multiplier = suitCards.length;
    const positivePoints = sequencePoints * multiplier;

    const penaltyPoints = this.calculateSequencePoints(penaltySequences);
    const penalties = penaltyPoints;

    const bonusDetails = this.calculateBonuses(suitCards, penaltyCards);
    const bonuses = this.calculateBonusPoints(bonusDetails);

    const budgetUsage = this.calculateBudgetUsage([
      ...declaredSuitSequences,
      ...penaltySequences,
    ]);

    if (budgetUsage > 1352) {
      if (LOG_GAME_ENGINE) {
        logWarn(
          `⚠️ Player ${player.name} exceeded 1352-point budget: ${budgetUsage}`,
          undefined,
          LOG_GAME_ENGINE
        );
      }
    }

    const totalScore = positivePoints + bonuses - penalties;

    return {
      baseScore: sequencePoints,
      multiplier,
      positivePoints,
      penalties,
      bonuses,
      totalScore,
      bonusDetails,
      sequences: {
        declaredSuitSequences,
        penaltySequences,
      },
    };
  }

  private calculateUndeclaredPenalty(player: Player): ScoreBreakdown {
    const allSequences = this.findSequences(runtimePiecesToCards(player.hand));
    const sequencePoints = this.calculateSequencePoints(allSequences);
    const handSize = player.hand.length;
    const totalScore = -(sequencePoints * handSize);

    return {
      baseScore: 0,
      multiplier: 0,
      positivePoints: 0,
      penalties: sequencePoints * handSize,
      bonuses: 0,
      totalScore,
      bonusDetails: {
        cleanSweep: false,
        longRuns: 0,
      },
      sequences: {
        declaredSuitSequences: [],
        penaltySequences: allSequences,
      },
    };
  }

  private findSequences(cards: Card[]): SequenceInfo[] {
    if (cards.length === 0) return [];

    const cardsBySuit: Record<string, Card[]> = {};
    cards.forEach((card) => {
      if (!cardsBySuit[card.suit]) {
        cardsBySuit[card.suit] = [];
      }
      cardsBySuit[card.suit].push(card);
    });

    const sequences: SequenceInfo[] = [];

    Object.values(cardsBySuit).forEach((suitCards) => {
      const sortedCards = [...suitCards].sort((a, b) => a.value - b.value);

      const hasAce = sortedCards.some((card) => card.value === 14);
      const hasTwo = sortedCards.some((card) => card.value === 2);

      if (hasAce && hasTwo) {
        const aceSequence = sortedCards.filter(
          (card) => card.value >= 13 || card.value === 14
        );
        const twoSequence = sortedCards.filter(
          (card) => card.value <= 3 || card.value === 14
        );

        if (aceSequence.length >= 2) {
          sequences.push(...this.findSequencesInSortedCards(aceSequence));
        }
        if (twoSequence.length >= 2) {
          sequences.push(...this.findSequencesInSortedCards(twoSequence));
        }
      } else {
        sequences.push(...this.findSequencesInSortedCards(sortedCards));
      }
    });

    return sequences;
  }

  private findSequencesInSortedCards(
    sortedCards: Card[]
  ): SequenceInfo[] {
    if (sortedCards.length === 0) return [];

    const sequences: SequenceInfo[] = [];
    let currentSequence: Card[] = [sortedCards[0]];

    for (let i = 1; i < sortedCards.length; i++) {
      const currentCard = sortedCards[i];
      const previousCard = sortedCards[i - 1];

      if (currentCard.value === previousCard.value + 1) {
        currentSequence.push(currentCard);
      } else {
        if (currentSequence.length >= 2) {
          sequences.push({
            cards: currentSequence,
            sequenceValue: currentSequence.reduce(
              (sum, card) => sum + card.value,
              0
            ),
            sequenceLength: currentSequence.length,
          });
        }
        currentSequence = [currentCard];
      }
    }

    if (currentSequence.length >= 2) {
      sequences.push({
        cards: currentSequence,
        sequenceValue: currentSequence.reduce(
          (sum, card) => sum + card.value,
          0
        ),
        sequenceLength: currentSequence.length,
      });
    }

    return sequences;
  }

  private calculateSequencePoints(sequences: SequenceInfo[]): number {
    return sequences.reduce(
      (total, sequence) => total + sequence.sequenceValue,
      0
    );
  }

  private calculateBonuses(
    suitCards: Card[],
    penaltyCards: Card[]
  ): { cleanSweep: boolean; longRuns: number } {
    const cleanSweep = penaltyCards.length === 0;
    const longRuns = this.countLongRuns(suitCards);
    return { cleanSweep, longRuns };
  }

  private calculateBonusPoints(bonusDetails: {
    cleanSweep: boolean;
    longRuns: number;
  }): number {
    let bonuses = 0;

    if (bonusDetails.cleanSweep) {
      bonuses += 50;
    }

    bonuses += bonusDetails.longRuns * 25;

    return bonuses;
  }

  private countLongRuns(cards: Card[]): number {
    if (cards.length < 4) return 0;

    const sortedValues = cards
      .map((card) => card.value)
      .sort((a, b) => a - b);

    let runs = 0;
    let currentRunLength = 1;

    for (let i = 1; i < sortedValues.length; i++) {
      if (sortedValues[i] === sortedValues[i - 1] + 1) {
        currentRunLength++;
      } else if (sortedValues[i] !== sortedValues[i - 1]) {
        if (currentRunLength >= 4) {
          runs++;
        }
        currentRunLength = 1;
      }
    }

    if (currentRunLength >= 4) {
      runs++;
    }

    return runs;
  }

  calculateAllScores(gameState: GameState): Map<string, ScoreBreakdown> {
    const scores = new Map<string, ScoreBreakdown>();

    for (const player of gameState.players) {
      scores.set(player.id, this.calculatePlayerScore(player));
    }

    return scores;
  }

  determineWinners(gameState: GameState): {
    winners: Player[];
    scores: Map<string, ScoreBreakdown>;
  } {
    const scores = this.calculateAllScores(gameState);

    let highestScore = -Infinity;
    for (const scoreBreakdown of scores.values()) {
      if (scoreBreakdown.totalScore > highestScore) {
        highestScore = scoreBreakdown.totalScore;
      }
    }

    const winners = gameState.players.filter((player) => {
      const playerScore = scores.get(player.id);
      return (
        playerScore && playerScore.totalScore === highestScore
      );
    });

    return { winners, scores };
  }

  validateRebuttal(cards: Card[]): { isValid: boolean; runValue: number } {
    if (cards.length !== 3) {
      return { isValid: false, runValue: 0 };
    }

    const suit = cards[0].suit;
    if (!cards.every((card) => card.suit === suit)) {
      return { isValid: false, runValue: 0 };
    }

    const sortedValues = cards
      .map((card) => card.value)
      .sort((a, b) => a - b);
    const isConsecutive =
      sortedValues[1] === sortedValues[0] + 1 &&
      sortedValues[2] === sortedValues[1] + 1;

    if (!isConsecutive) {
      return { isValid: false, runValue: 0 };
    }

    const runValue = sortedValues.reduce((sum, value) => sum + value, 0);

    return { isValid: true, runValue };
  }

  calculateBudgetUsage(sequences: SequenceInfo[]): number {
    return sequences.reduce(
      (total, sequence) => total + sequence.sequenceValue,
      0
    );
  }
}
