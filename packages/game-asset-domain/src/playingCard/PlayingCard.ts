import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory, AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { AssetType } from '@ocentra/asset-domain/types/assetType';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { PieceKind } from '@/pieces/PieceKind';
import { PlayingCardRanking } from '@/playingCard/PlayingCardRanking';

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'PlayingCard',
  displayName: 'Playing Card',
  category: AssetTypeCategory.Game,
})
export class PlayingCard extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      pieceKind: PieceKind.PlayingCard,
      cardId: '',
      imageHash: '',
      playingCardRankingAsset: undefined,
    };
  }

  @required('Piece kind is required')
  @serializable({ label: 'Piece Kind', readonly: true })
  pieceKind: PieceKind = PieceKind.PlayingCard;

  @required('Card ID is required')
  @serializable({ label: 'Card ID' })
  cardId: string = '';

  @required('Image Hash is required')
  @serializable({ label: 'Image Hash' })
  imageHash: ImageHash = '' as ImageHash;

  @required('Playing card ranking asset is required')
  @serializable({ label: 'Playing Card Ranking Asset', elementType: AssetResourceEntry })
  playingCardRankingAsset: AssetResourceEntry<PlayingCardRanking> =
    new AssetResourceEntry<PlayingCardRanking>(PlayingCardRanking.assetType! as AssetType);
}
