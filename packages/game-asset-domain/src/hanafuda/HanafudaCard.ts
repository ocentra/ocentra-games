import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory, AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { PieceKind } from '@/pieces/PieceKind';
import { HanafudaGroup } from '@/hanafuda/HanafudaGroup';

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'HanafudaCard',
  displayName: 'Hanafuda Card',
  category: AssetTypeCategory.Game,
})
export class HanafudaCard extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      pieceKind: PieceKind.HanafudaCard,
      month: 1,
      slot: 1,
      group: HanafudaGroup.Chaff,
      points: 0,
      cardId: '',
      imageHash: '',
    };
  }

  @required('Piece kind is required')
  @serializable({ label: 'Piece Kind', readonly: true })
  pieceKind: PieceKind = PieceKind.HanafudaCard;

  @required('Month is required')
  @serializable({ label: 'Month' })
  month: number = 1;

  @required('Slot is required')
  @serializable({ label: 'Slot' })
  slot: number = 1;

  @required('Group is required')
  @serializable({ label: 'Group' })
  group: HanafudaGroup = HanafudaGroup.Chaff;

  @required('Points are required')
  @serializable({ label: 'Points' })
  points: number = 0;

  @required('Card ID is required')
  @serializable({ label: 'Card ID' })
  cardId: string = '';

  @required('Image Hash is required')
  @serializable({ label: 'Image Hash' })
  imageHash: ImageHash = '' as ImageHash;
}
