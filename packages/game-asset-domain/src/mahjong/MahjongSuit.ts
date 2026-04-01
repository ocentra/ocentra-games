export const MahjongSuit = {
  Characters: 'Characters',
  Bamboos: 'Bamboos',
  Dots: 'Dots',
} as const;

export type MahjongSuit = typeof MahjongSuit[keyof typeof MahjongSuit];

