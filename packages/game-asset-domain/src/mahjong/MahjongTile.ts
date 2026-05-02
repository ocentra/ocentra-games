import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory, AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { PieceKind } from '@/pieces/PieceKind';
import { MahjongTileKind } from '@/mahjong/MahjongTileKind';
import type { MahjongSuit } from '@/mahjong/MahjongSuit';
import type { MahjongWind, MahjongDragon } from '@/mahjong/MahjongHonor';

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'MahjongTile',
  displayName: 'Mahjong Tile',
  category: AssetTypeCategory.Game,
})
export class MahjongTile extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      pieceKind: PieceKind.MahjongTile,
      tileKind: MahjongTileKind.Suit,
      tileId: '',
      imageHash: '',
      imagePath: '',
      suit: undefined,
      rank: undefined,
      wind: undefined,
      dragon: undefined,
      bonusIndex: undefined,
    };
  }

  @required('Piece kind is required')
  @serializable({ label: 'Piece Kind', readonly: true })
  pieceKind: PieceKind = PieceKind.MahjongTile;

  @required('Tile kind is required')
  @serializable({ label: 'Tile Kind' })
  tileKind: MahjongTileKind = MahjongTileKind.Suit;

  @required('Tile ID is required')
  @serializable({ label: 'Tile ID' })
  tileId: string = '';

  @required('Image Hash is required')
  @serializable({ label: 'Image Hash' })
  imageHash: ImageHash = '' as ImageHash;

  @serializable({ label: 'Image Path' })
  imagePath?: string;

  @serializable({ label: 'Suit' })
  suit?: MahjongSuit;

  @serializable({ label: 'Rank' })
  rank?: number;

  @serializable({ label: 'Wind' })
  wind?: MahjongWind;

  @serializable({ label: 'Dragon' })
  dragon?: MahjongDragon;

  @serializable({ label: 'Bonus Index' })
  bonusIndex?: number;
}
