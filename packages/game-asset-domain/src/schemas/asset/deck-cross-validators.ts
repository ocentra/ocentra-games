export type CardSuitEntryLike = {
  SuitName: string;
  SuitSymbol?: string;
  DisplayOrder?: number;
};

export type CardRankingEntryLike = {
  CardName: string;
  CardSymbol: string;
  Value: number;
  DisplayOrder: number;
};

export type ExplicitCardEntryLike = {
  id: string;
  copies?: number;
  suit?: string | null;
  rank?: string | number | null;
  label?: string | null;
  order?: number | null;
  points?: number | null;
  kind?: string | null;
};

export type CardRankingLike = {
  deckFamily?: string;
  deckType?: string;
  expectedCardCount?: number;
  includesJokers?: boolean;
  cardEntries?: ExplicitCardEntryLike[];
  familyPayload?: {
    french?: {
      suits?: CardSuitEntryLike[];
      rankings?: CardRankingEntryLike[];
    };
  };
  suits?: CardSuitEntryLike[];
  rankings?: CardRankingEntryLike[];
};

type SortedCardRankingParts = {
  deckFamily: string;
  deckType: string;
  expectedCardCount?: number;
  includesJokers: boolean;
  explicitEntries: ExplicitCardEntryLike[];
  suits: CardSuitEntryLike[];
  rankings: CardRankingEntryLike[];
};

const FRENCH_FAMILY = 'French';
const TAROT_FAMILY = 'Tarot';
const TAROT_DECK_TYPES = new Set(['Tarot_78', 'Tarot_66', 'Tarot_62', 'Tarot_54', 'Tarot_42', 'Tarot_40']);

function familyPrefix(family: string): string {
  return family.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function sortSuits(suits: CardSuitEntryLike[]): CardSuitEntryLike[] {
  return [...suits].sort((left, right) => {
    const leftOrder = left.DisplayOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.DisplayOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.SuitName.localeCompare(right.SuitName);
  });
}

function sortRankings(rankings: CardRankingEntryLike[]): CardRankingEntryLike[] {
  return [...rankings].sort((left, right) => {
    if (left.DisplayOrder !== right.DisplayOrder) {
      return left.DisplayOrder - right.DisplayOrder;
    }
    return left.CardName.localeCompare(right.CardName);
  });
}

export function getCardRankingParts(ranking: CardRankingLike): SortedCardRankingParts {
  const payload = ranking.familyPayload?.french;
  return {
    deckFamily: ranking.deckFamily ?? FRENCH_FAMILY,
    deckType: ranking.deckType ?? '',
    expectedCardCount: ranking.expectedCardCount,
    includesJokers: ranking.includesJokers ?? false,
    explicitEntries: [...(ranking.cardEntries ?? [])].sort((left, right) => {
      const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.id.localeCompare(right.id);
    }),
    suits: sortSuits(payload?.suits ?? ranking.suits ?? []),
    rankings: sortRankings(payload?.rankings ?? ranking.rankings ?? []),
  };
}

function isTarotRanking(parts: SortedCardRankingParts): boolean {
  return parts.deckFamily === TAROT_FAMILY || TAROT_DECK_TYPES.has(parts.deckType);
}

function isTarotTrumpSymbol(symbol: string): boolean {
  return /^T(\d{1,2})$/i.test(symbol);
}

function getTarotExpectationParts(parts: SortedCardRankingParts): {
  minorRanks: CardRankingEntryLike[];
  trumpNumbers: number[];
  hasFool: boolean;
} {
  const trumpNumbers: number[] = [];
  let hasFool = false;

  for (const ranking of parts.rankings) {
    const symbol = ranking.CardSymbol.toUpperCase();
    if (symbol === 'F') {
      hasFool = true;
      continue;
    }
    const match = /^T(\d{1,2})$/i.exec(symbol);
    if (!match) {
      continue;
    }
    const trumpNumber = Number(match[1]);
    if (trumpNumber >= 1 && trumpNumber <= 21 && !trumpNumbers.includes(trumpNumber)) {
      trumpNumbers.push(trumpNumber);
    }
  }

  return {
    minorRanks: parts.rankings.filter((ranking) => {
      const symbol = ranking.CardSymbol.toUpperCase();
      return symbol !== 'F' && !isTarotTrumpSymbol(symbol);
    }),
    trumpNumbers: trumpNumbers.sort((left, right) => left - right),
    hasFool,
  };
}

export function computeExpectedCardIdentities(ranking: CardRankingLike): string[] {
  const parts = getCardRankingParts(ranking);
  const identities: string[] = [];

  if (parts.explicitEntries.length > 0) {
    for (const entry of parts.explicitEntries) {
      const copies = Math.max(1, entry.copies ?? 1);
      for (let index = 0; index < copies; index++) {
        identities.push(entry.id);
      }
    }
    return identities;
  }

  if (isTarotRanking(parts)) {
    const tarotParts = getTarotExpectationParts(parts);
    for (const suit of parts.suits) {
      for (const card of tarotParts.minorRanks) {
        identities.push(`${String(card.Value).toLowerCase()}_of_${suit.SuitName.toLowerCase()}`);
      }
    }
    for (const trumpNumber of tarotParts.trumpNumbers) {
      identities.push(`tarot_trump_${trumpNumber}`);
    }
    if (tarotParts.hasFool) {
      identities.push('tarot_fool');
    }
    return identities;
  }

  if (parts.deckFamily !== FRENCH_FAMILY) {
    const prefix = familyPrefix(parts.deckFamily);
    if (parts.suits.length === 0) {
      for (const card of parts.rankings) {
        identities.push(`${prefix}_${String(card.Value).toLowerCase()}`);
      }
    } else {
      for (const suit of parts.suits) {
        for (const card of parts.rankings) {
          identities.push(`${prefix}_${suit.SuitName.toLowerCase()}_${String(card.Value).toLowerCase()}`);
        }
      }
    }
    if (parts.includesJokers) {
      identities.push(`${prefix}_joker_1`, `${prefix}_joker_2`);
    }
    return identities;
  }

  for (const suit of parts.suits) {
    for (const card of parts.rankings) {
      identities.push(`${String(card.Value).toLowerCase()}_of_${suit.SuitName.toLowerCase()}`);
    }
  }

  if (parts.includesJokers) {
    identities.push('joker_1', 'joker_2');
  }

  return identities;
}

export function describeCardExpectation(ranking: CardRankingLike): string {
  const parts = getCardRankingParts(ranking);
  const expectedIdentities = computeExpectedCardIdentities(ranking);

  if (parts.explicitEntries.length > 0) {
    const uniqueCards = parts.explicitEntries.length;
    const copies = expectedIdentities.length - uniqueCards;
    const copySuffix = copies > 0 ? ` including ${copies} duplicate physical copies` : '';
    return `${parts.deckFamily}/${parts.deckType || 'unknown'} expects ${uniqueCards} explicit card identities totaling ${expectedIdentities.length}${copySuffix}`;
  }

  if (isTarotRanking(parts)) {
    const tarotParts = getTarotExpectationParts(parts);
    const totalMinorCards = parts.suits.length * tarotParts.minorRanks.length;
    const totalTrumps = tarotParts.trumpNumbers.length;
    const foolCount = tarotParts.hasFool ? 1 : 0;
    return `${parts.deckFamily}/${parts.deckType || 'unknown'} expects ${totalMinorCards} minor cards (${parts.suits.length} suits x ${tarotParts.minorRanks.length} ranks) + ${totalTrumps} trumps + ${foolCount} fool = ${expectedIdentities.length}`;
  }

  if (parts.suits.length === 0) {
    return `${parts.deckFamily}/${parts.deckType || 'unknown'} expects ${parts.rankings.length} rank-only identities = ${expectedIdentities.length}`;
  }

  const jokerSuffix = parts.includesJokers ? ' + 2 jokers' : '';
  return `${parts.deckFamily}/${parts.deckType || 'unknown'} expects ${parts.suits.length} suits x ${parts.rankings.length} ranks${jokerSuffix} = ${expectedIdentities.length}`;
}

export function normalizeCardIdentity(value: string): string {
  return value.trim().toLowerCase();
}
