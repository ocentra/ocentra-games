import { describe, expect, it } from 'vitest';
import { getExpectedGenericDeckCardCount } from '@/schemas/asset/deck-name-expectations';

describe('deck name expectations', () => {
  it('returns canonical physical counts for repaired French multipack decks', () => {
    expect(getExpectedGenericDeckCardCount('Standard 24')).toBe(24);
    expect(getExpectedGenericDeckCardCount('Double 24')).toBe(48);
    expect(getExpectedGenericDeckCardCount('Standard 32 + Joker(s)')).toBe(34);
    expect(getExpectedGenericDeckCardCount('Quad 40')).toBe(160);
    expect(getExpectedGenericDeckCardCount('Double 52 + 4 Jokers')).toBe(108);
    expect(getExpectedGenericDeckCardCount('Triple 52 + 6 Jokers')).toBe(162);
    expect(getExpectedGenericDeckCardCount('Quad 52 + 8 Jokers')).toBe(216);
    expect(getExpectedGenericDeckCardCount('Treikort 27')).toBe(27);
  });

  it('returns null for unsupported names', () => {
    expect(getExpectedGenericDeckCardCount('Not A Deck')).toBeNull();
  });
});
