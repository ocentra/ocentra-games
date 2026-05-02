import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory, AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'DominoRanking',
  displayName: 'Domino Ranking',
  category: AssetTypeCategory.Game,
})
export class DominoRanking extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      maxPip: undefined,
      expectedTileCount: 0,
      tileIds: [],
    };
  }

  @serializable({ label: 'Max Pip' })
  maxPip?: number;

  @required('Expected tile count is required')
  @serializable({ label: 'Expected Tile Count' })
  expectedTileCount: number = 0;

  @serializable({ label: 'Tile IDs' })
  tileIds: string[] = [];

  getTileIds(): string[] {
    if (this.tileIds.length > 0) {
      return this.tileIds;
    }
    if (typeof this.maxPip !== 'number') {
      return [];
    }
    const ids: string[] = [];
    for (let left = 0; left <= this.maxPip; left += 1) {
      for (let right = left; right <= this.maxPip; right += 1) {
        ids.push(`${left}-${right}`);
      }
    }
    return ids;
  }
}
