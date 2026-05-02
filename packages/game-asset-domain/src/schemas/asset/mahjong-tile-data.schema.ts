import { schema } from '@ocentra/schema-domain/effect-builder';
import { PieceKind } from '@/pieces/PieceKind';
import { MahjongTileKind } from '@/mahjong/MahjongTileKind';
import { MahjongSuit } from '@/mahjong/MahjongSuit';
import { MahjongWind, MahjongDragon } from '@/mahjong/MahjongHonor';
import { ImageHashSchema } from '@/schemas/asset/shared/image-hash-schema';
import { ImagePathSchema } from '@/schemas/asset/shared/image-path-schema';

const MahjongTileDataSchemaBase = schema.object({
  pieceKind: schema.literal(PieceKind.MahjongTile),
  tileKind: schema.enum([
    MahjongTileKind.Suit,
    MahjongTileKind.Wind,
    MahjongTileKind.Dragon,
    MahjongTileKind.Flower,
    MahjongTileKind.Season,
    MahjongTileKind.Animal,
    MahjongTileKind.Face,
    MahjongTileKind.Emperor,
    MahjongTileKind.Empress,
    MahjongTileKind.Joker,
  ]),
  tileId: schema.string().min(1),
  imageHash: ImageHashSchema,
  imagePath: ImagePathSchema.optional(),
  suit: schema.enum([MahjongSuit.Characters, MahjongSuit.Bamboos, MahjongSuit.Dots]).optional(),
  rank: schema.number().int().min(1).max(9).optional(),
  wind: schema.enum([MahjongWind.East, MahjongWind.South, MahjongWind.West, MahjongWind.North]).optional(),
  dragon: schema.enum([MahjongDragon.Red, MahjongDragon.Green, MahjongDragon.White]).optional(),
  bonusIndex: schema.number().int().min(1).max(4).optional(),
}).passthrough();

export const MahjongTileDataSchema = MahjongTileDataSchemaBase.superRefine((d, ctx) => {
  if (d.tileKind === MahjongTileKind.Suit) {
    if (!d.suit) ctx.addIssue({ code: 'custom', path: ['suit'], message: 'suit required for Suit tileKind' });
    if (!d.rank) ctx.addIssue({ code: 'custom', path: ['rank'], message: 'rank required for Suit tileKind' });
  }
  if (d.tileKind === MahjongTileKind.Wind) {
    if (!d.wind) ctx.addIssue({ code: 'custom', path: ['wind'], message: 'wind required for Wind tileKind' });
  }
  if (d.tileKind === MahjongTileKind.Dragon) {
    if (!d.dragon) ctx.addIssue({ code: 'custom', path: ['dragon'], message: 'dragon required for Dragon tileKind' });
  }
  if (
    d.tileKind === MahjongTileKind.Flower ||
    d.tileKind === MahjongTileKind.Season ||
    d.tileKind === MahjongTileKind.Animal ||
    d.tileKind === MahjongTileKind.Face ||
    d.tileKind === MahjongTileKind.Emperor ||
    d.tileKind === MahjongTileKind.Empress
  ) {
    if (!d.bonusIndex) ctx.addIssue({ code: 'custom', path: ['bonusIndex'], message: 'bonusIndex required for bonus tileKind' });
  }
});

