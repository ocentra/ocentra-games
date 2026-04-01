import type { Card } from '@ocentra/game-domain/types/game';

export function materializePhysicalCards(cards: Card[]): Card[] {
  const seen = new Map<string, number>();

  return cards.map((card) => {
    const nextCount = (seen.get(card.id) ?? 0) + 1;
    seen.set(card.id, nextCount);

    if (nextCount === 1) {
      return card;
    }

    return {
      ...card,
      id: `${card.id}__copy${nextCount}`,
    };
  });
}
