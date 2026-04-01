import { describe, it, expect } from 'vitest';
import { materializePhysicalCards } from '../physical-card-instance';

describe('materializePhysicalCards', () => {
  it('adds stable copy suffixes when the same physical card id repeats', () => {
    const deck = materializePhysicalCards([
      { suit: 'spades', value: 14, id: '14_of_spades' },
      { suit: 'spades', value: 14, id: '14_of_spades' },
      { suit: 'spades', value: 14, id: '14_of_spades' },
      { suit: 'hearts', value: 13, id: '13_of_hearts' },
    ]);

    expect(deck.map((card) => card.id)).toEqual([
      '14_of_spades',
      '14_of_spades__copy2',
      '14_of_spades__copy3',
      '13_of_hearts',
    ]);
  });
});
