import { describe, it, expect } from 'vitest';
import { getCardIds } from './cardIds';

describe('getCardIds', () => {
  it('Standard 52 French Standard_52 returns 52 card ids in rank_suit order', () => {
    const ids = getCardIds('Standard 52', 'French', 'Standard_52');
    expect(ids).toHaveLength(52);
    expect(ids[0]).toBe('A_spades');
    expect(ids[51]).toBe('2_clubs');
  });

  it('Standard 52 + Joker(s) French Standard_52 returns 52 cards plus joker_1 joker_2', () => {
    const ids = getCardIds('Standard 52 + Joker(s)', 'French', 'Standard_52');
    expect(ids).toHaveLength(54);
    expect(ids.slice(0, 52)).toEqual(getCardIds('Standard 52', 'French', 'Standard_52'));
    expect(ids[52]).toBe('joker_1');
    expect(ids[53]).toBe('joker_2');
  });

  it('unknown triple returns empty array', () => {
    const ids = getCardIds('Tarot 78', 'Tarot_minor', 'Tarot_78');
    expect(ids).toEqual([]);
  });
});
