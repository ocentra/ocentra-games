import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory, AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';

@serializableClass({
  assetType: 'MahjongRankingExtraTile',
  displayName: 'Mahjong Ranking Extra Tile',
  category: AssetTypeCategory.Game,
})
export class MahjongRankingExtraTileRecord {
  @required('Tile ID is required')
  @serializable({ label: 'Tile ID' })
  tileId: string = '';

  @required('Count is required')
  @serializable({ label: 'Count' })
  count: number = 1;
}

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'MahjongRanking',
  displayName: 'Mahjong Ranking',
  category: AssetTypeCategory.Game,
})
export class MahjongRanking extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      includeBonusTiles: false,
      expectedTileCount: 136,
      extraTiles: [],
    };
  }

  @required('Include bonus tiles flag is required')
  @serializable({ label: 'Include Bonus Tiles' })
  includeBonusTiles: boolean = false;

  @required('Expected tile count is required')
  @serializable({ label: 'Expected Tile Count' })
  expectedTileCount: number = 136;

  @serializable({ label: 'Extra Tiles', elementType: MahjongRankingExtraTileRecord })
  extraTiles: MahjongRankingExtraTileRecord[] = [];
}
