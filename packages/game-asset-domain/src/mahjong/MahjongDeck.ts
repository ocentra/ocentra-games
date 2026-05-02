import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory, AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { AssetType } from '@ocentra/asset-domain/types/assetType';
import { MahjongTile } from '@/mahjong/MahjongTile';
import { MahjongRanking } from '@/mahjong/MahjongRanking';
import { SupportedDeckTripleRecord } from '@/card/deck/Deck';

@serializableClass({
  assetType: 'MahjongDeckTileMember',
  displayName: 'Mahjong Deck Tile Member',
  category: AssetTypeCategory.Game,
})
export class MahjongDeckTileMemberRecord {
  @required('Tile is required')
  @serializable({ label: 'Tile', elementType: AssetResourceEntry })
  tile: AssetResourceEntry<MahjongTile> = new AssetResourceEntry<MahjongTile>(MahjongTile.assetType! as AssetType);

  @required('Count is required')
  @serializable({ label: 'Count' })
  count: number = 1;
}

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'MahjongDeck',
  displayName: 'Mahjong Deck',
  category: AssetTypeCategory.Game,
})
export class MahjongDeck extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      name: 'NewMahjongDeck',
      supportedTriples: [],
      tiles: [],
      mahjongRankingAsset: undefined,
    };
  }

  @required('Deck name is required')
  @serializable({ label: 'Deck Name' })
  name: string = '';

  @required('Supported triples are required')
  @serializable({ label: 'Supported Triples', elementType: SupportedDeckTripleRecord })
  supportedTriples: SupportedDeckTripleRecord[] = [];

  @required('Tiles are required')
  @serializable({ label: 'Tiles', elementType: MahjongDeckTileMemberRecord })
  tiles: MahjongDeckTileMemberRecord[] = [];

  @required('Mahjong ranking asset is required')
  @serializable({ label: 'Mahjong Ranking Asset', elementType: AssetResourceEntry })
  mahjongRankingAsset: AssetResourceEntry<MahjongRanking> =
    new AssetResourceEntry<MahjongRanking>(MahjongRanking.assetType! as AssetType);

  getExpandedTileTemplateRefs(): AssetResourceEntry<MahjongTile>[] {
    return this.tiles.flatMap((entry) =>
      Array.from({ length: Math.max(1, entry.count) }, () => entry.tile),
    );
  }

  getDistinctTileTemplateRefs(): AssetResourceEntry<MahjongTile>[] {
    const refs = this.getExpandedTileTemplateRefs();
    const seen = new Set<string>();
    return refs.filter((ref) => {
      const key = ref.guid || ref.path || ref.displayName || '';
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
