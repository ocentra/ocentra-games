import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory, AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { PieceKind } from '@/pieces/PieceKind';

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'DominoTile',
  displayName: 'Domino Tile',
  category: AssetTypeCategory.Game,
})
export class DominoTile extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      pieceKind: PieceKind.DominoTile,
      leftPips: undefined,
      rightPips: undefined,
      tileId: '',
      imageHash: '',
      imagePath: '',
    };
  }

  @required('Piece kind is required')
  @serializable({ label: 'Piece Kind', readonly: true })
  pieceKind: PieceKind = PieceKind.DominoTile;

  @serializable({ label: 'Left Pips' })
  leftPips?: number;

  @serializable({ label: 'Right Pips' })
  rightPips?: number;

  @required('Tile ID is required')
  @serializable({ label: 'Tile ID' })
  tileId: string = '';

  @required('Image Hash is required')
  @serializable({ label: 'Image Hash' })
  imageHash: ImageHash = '' as ImageHash;

  @serializable({ label: 'Image Path' })
  imagePath?: string;
}
