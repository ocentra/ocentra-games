export const MahjongTileKind = {
  Suit: 'Suit',
  Wind: 'Wind',
  Dragon: 'Dragon',
  Flower: 'Flower',
  Season: 'Season',
  Animal: 'Animal',
  Face: 'Face',
  Emperor: 'Emperor',
  Empress: 'Empress',
  Joker: 'Joker',
} as const;

export type MahjongTileKind = typeof MahjongTileKind[keyof typeof MahjongTileKind];

