import { MahjongSuit } from '@/mahjong/MahjongSuit';
import { MahjongTileKind } from '@/mahjong/MahjongTileKind';
import type { MahjongWind, MahjongDragon } from '@/mahjong/MahjongHonor';
import { Schema } from '@ocentra/schema-domain/effect';

export const MahjongTileIdSchema = Schema.String.pipe(Schema.minLength(1), Schema.brand('MahjongTileId'));
export type MahjongTileId = typeof MahjongTileIdSchema.Type;
export const decodeMahjongTileId = Schema.decodeUnknownSync(MahjongTileIdSchema);

export function computeMahjongSuitTileId(suit: MahjongSuit, rank: number): MahjongTileId {
  return decodeMahjongTileId(`${MahjongTileKind.Suit}:${suit}:${rank}`);
}

export function computeMahjongWindTileId(wind: MahjongWind): MahjongTileId {
  return decodeMahjongTileId(`${MahjongTileKind.Wind}:${wind}`);
}

export function computeMahjongDragonTileId(dragon: MahjongDragon): MahjongTileId {
  return decodeMahjongTileId(`${MahjongTileKind.Dragon}:${dragon}`);
}

export function computeMahjongBonusTileId(kind: 'Flower' | 'Season', index: number): MahjongTileId {
  return decodeMahjongTileId(`${kind}:${index}`);
}

export function computeMahjongSpecialTileId(
  kind: 'Animal' | 'Face' | 'Emperor' | 'Empress',
  index: number,
): MahjongTileId {
  return decodeMahjongTileId(`${kind}:${index}`);
}

export function computeMahjongJokerTileId(): MahjongTileId {
  return decodeMahjongTileId(MahjongTileKind.Joker);
}

