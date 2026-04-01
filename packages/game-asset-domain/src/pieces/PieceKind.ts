export const PieceKind = {
  Card: 'Card',
  PlayingCard: 'PlayingCard',
  DominoTile: 'DominoTile',
  HanafudaCard: 'HanafudaCard',
  MahjongTile: 'MahjongTile',
  Custom: 'Custom',
} as const;

export type PieceKind = typeof PieceKind[keyof typeof PieceKind];

