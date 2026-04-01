import { MahjongSuit } from '@/mahjong/MahjongSuit';
import { MahjongTileKind } from '@/mahjong/MahjongTileKind';
import type { MahjongWind, MahjongDragon } from '@/mahjong/MahjongHonor';

export type MahjongTileId = string & { readonly __brand: 'MahjongTileId' };

export function computeMahjongSuitTileId(suit: MahjongSuit, rank: number): MahjongTileId {
  return `${MahjongTileKind.Suit}:${suit}:${rank}` as MahjongTileId;
}

export function computeMahjongWindTileId(wind: MahjongWind): MahjongTileId {
  return `${MahjongTileKind.Wind}:${wind}` as MahjongTileId;
}

export function computeMahjongDragonTileId(dragon: MahjongDragon): MahjongTileId {
  return `${MahjongTileKind.Dragon}:${dragon}` as MahjongTileId;
}

export function computeMahjongBonusTileId(kind: 'Flower' | 'Season', index: number): MahjongTileId {
  return `${kind}:${index}` as MahjongTileId;
}

export function computeMahjongSpecialTileId(
  kind: 'Animal' | 'Face' | 'Emperor' | 'Empress',
  index: number,
): MahjongTileId {
  return `${kind}:${index}` as MahjongTileId;
}

export function computeMahjongJokerTileId(): MahjongTileId {
  return MahjongTileKind.Joker as MahjongTileId;
}

