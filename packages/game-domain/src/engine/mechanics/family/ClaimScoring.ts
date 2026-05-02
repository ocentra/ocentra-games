import { Suit, type Card, type CardValue, type Player } from '@/types/game';
import { createRuntimeCard, runtimePiecesToCards } from '@/deck/runtimeDeck';

export const CLAIM_RANK_CYCLE = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

const CLAIM_RANK_BY_TOKEN: Readonly<Record<string, CardValue>> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const CLAIM_SUIT_BY_TOKEN: Readonly<Record<string, Suit>> = {
  clubs: Suit.CLUBS,
  diamonds: Suit.DIAMONDS,
  hearts: Suit.HEARTS,
  spades: Suit.SPADES,
};

export interface ClaimScoreGroup {
  cards: Card[];
  score: number;
  sign: 'negative' | 'positive';
  suit: Suit;
}

export interface ClaimPlayerScore {
  debt: number;
  finalScore: number;
  negative: number;
  positive: number;
  groups: ClaimScoreGroup[];
}

export interface ClaimScoringFixture {
  declaredSuit: string | null;
  debt?: number;
  expectedFinalScore: number;
  explanation?: string;
  hand: readonly string[];
  id?: string;
  linkedRuleIds?: readonly string[];
  purpose?: string;
  sourceAsset?: string;
  title?: string;
}

export interface ClaimScoringFixtureResult {
  actualFinalScore: number;
  expectedFinalScore: number;
  fixture: ClaimScoringFixture;
  passed: boolean;
}

function cloneCard(card: Card): Card {
  return { ...card };
}

function getNextValue(value: number): number {
  return value === 14 ? 2 : value + 1;
}

function getPreviousValue(value: number): number {
  return value === 2 ? 14 : value - 1;
}

function scoreCardGroups(cards: Card[], sign: 'negative' | 'positive'): ClaimScoreGroup[] {
  const cardsBySuit = new Map<Suit, Card[]>();
  cards.forEach((card) => {
    const suitCards = cardsBySuit.get(card.suit) ?? [];
    suitCards.push(card);
    cardsBySuit.set(card.suit, suitCards);
  });

  return [...cardsBySuit.entries()].flatMap(([suit, suitCards]) => {
    const cardByValue = new Map<number, Card>();
    suitCards.forEach((card) => {
      cardByValue.set(card.value, card);
    });

    if (cardByValue.size === CLAIM_RANK_CYCLE.length) {
      const runCards = CLAIM_RANK_CYCLE.map((value) => cardByValue.get(value)).filter((card): card is Card => Boolean(card));
      const score = runCards.reduce((total, card) => total + card.value, 0) * runCards.length;
      return [{ cards: runCards.map(cloneCard), score, sign, suit }];
    }

    return CLAIM_RANK_CYCLE.filter((value) => cardByValue.has(value) && !cardByValue.has(getPreviousValue(value)))
      .map((startValue) => {
        const runCards: Card[] = [];
        let currentValue: number = startValue;
        while (cardByValue.has(currentValue)) {
          const card = cardByValue.get(currentValue);
          if (card) {
            runCards.push(card);
          }
          currentValue = getNextValue(currentValue);
        }

        const sum = runCards.reduce((total, card) => total + card.value, 0);
        const score = runCards.length > 1 ? sum * runCards.length : sum;
        return {
          cards: runCards.map(cloneCard),
          score,
          sign,
          suit,
        };
      });
  });
}

export function calculateClaimPlayerScore(player: Player, declaredSuit: Suit | null, debt: number): ClaimPlayerScore {
  const hand = runtimePiecesToCards(player.hand);
  const positiveCards = declaredSuit ? hand.filter((card) => card.suit === declaredSuit) : [];
  const negativeCards = declaredSuit ? hand.filter((card) => card.suit !== declaredSuit) : hand;
  const positiveGroups = scoreCardGroups(positiveCards, 'positive');
  const negativeGroups = scoreCardGroups(negativeCards, 'negative');
  const positive = positiveGroups.reduce((total, group) => total + group.score, 0);
  const negative = negativeGroups.reduce((total, group) => total + group.score, 0);

  return {
    debt,
    finalScore: positive - negative - debt,
    groups: [...positiveGroups, ...negativeGroups],
    negative,
    positive,
  };
}

export function parseClaimFixtureCard(token: string): Card | null {
  const normalized = token.trim();
  const parts = normalized.includes('_of_') ? normalized.split('_of_') : normalized.split('_');
  const rankToken = parts[0]?.toUpperCase();
  const suitToken = parts[1]?.toLowerCase();
  const value = rankToken ? CLAIM_RANK_BY_TOKEN[rankToken] : undefined;
  const suit = suitToken ? CLAIM_SUIT_BY_TOKEN[suitToken] : undefined;

  if (!value || !suit) {
    return null;
  }

  return {
    ...createRuntimeCard({
      id: `${value}_of_${suit}`,
      suit,
      value,
    }),
  };
}

export function parseClaimFixtureSuit(value: string | null): Suit | null {
  return value ? CLAIM_SUIT_BY_TOKEN[value.toLowerCase()] ?? null : null;
}

export function evaluateClaimScoringFixture(fixture: ClaimScoringFixture): ClaimScoringFixtureResult {
  const cards = fixture.hand.map(parseClaimFixtureCard).filter((card): card is Card => Boolean(card));
  const player: Player = {
    aiPersonality: undefined,
    avatar: '',
    declaredSuit: parseClaimFixtureSuit(fixture.declaredSuit),
    hand: cards,
    id: 'fixture-player',
    intentCard: null,
    isAI: false,
    isConnected: true,
    name: 'Fixture Player',
    score: 0,
  };
  const score = calculateClaimPlayerScore(player, player.declaredSuit, fixture.debt ?? 0);

  return {
    actualFinalScore: score.finalScore,
    expectedFinalScore: fixture.expectedFinalScore,
    fixture,
    passed: score.finalScore === fixture.expectedFinalScore,
  };
}

export function validateClaimScoringFixtures(fixtures: readonly ClaimScoringFixture[]): string[] {
  return fixtures.flatMap((fixture, index) => {
    const parsedCards = fixture.hand.map(parseClaimFixtureCard);
    const invalidCards = fixture.hand.filter((_, cardIndex) => !parsedCards[cardIndex]);
    const invalidSuit = fixture.declaredSuit !== null && !parseClaimFixtureSuit(fixture.declaredSuit);
    const result = evaluateClaimScoringFixture(fixture);
    const errors: string[] = [];

    if (invalidCards.length > 0) {
      errors.push(`fixtures.${index}.hand contains invalid cards: ${invalidCards.join(', ')}`);
    }

    if (invalidSuit) {
      errors.push(`fixtures.${index}.declaredSuit is not a Claim suit: ${fixture.declaredSuit}`);
    }

    if (!result.passed) {
      errors.push(`fixtures.${index}.expectedFinalScore expected ${result.expectedFinalScore}, got ${result.actualFinalScore}`);
    }

    return errors;
  });
}
