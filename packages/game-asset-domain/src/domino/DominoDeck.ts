import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory, AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { AssetType } from '@ocentra/asset-domain/types/assetType';
import { DominoTile } from '@/domino/DominoTile';
import { DominoRanking } from '@/domino/DominoRanking';
import { SupportedDeckTripleRecord } from '@/card/deck/Deck';

@serializableClass({
  assetType: 'DominoDeckTileMember',
  displayName: 'Domino Deck Tile Member',
  category: AssetTypeCategory.Game,
})
export class DominoDeckTileMemberRecord {
  @required('Tile template is required')
  @serializable({ label: 'Tile Template', elementType: AssetResourceEntry })
  tileTemplate: AssetResourceEntry<DominoTile> = new AssetResourceEntry<DominoTile>(DominoTile.assetType! as AssetType);

  @required('Copies are required')
  @serializable({ label: 'Copies' })
  copies: number = 1;

  @serializable({ label: 'Logical Tile ID' })
  logicalTileId?: string;
}

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'DominoDeck',
  displayName: 'Domino Deck',
  category: AssetTypeCategory.Game,
})
export class DominoDeck extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      name: 'NewDominoDeck',
      supportedTriples: [],
      tileTemplates: [],
      tileComposition: [],
      dominoRankingAsset: undefined,
    };
  }

  @required('Deck name is required')
  @serializable({ label: 'Deck Name' })
  name: string = '';

  @required('Supported triples are required')
  @serializable({ label: 'Supported Triples', elementType: SupportedDeckTripleRecord })
  supportedTriples: SupportedDeckTripleRecord[] = [];

  @serializable({ label: 'Tile Templates', elementType: AssetResourceEntry })
  tileTemplates: AssetResourceEntry<DominoTile>[] = [];

  @serializable({ label: 'Tile Composition', elementType: DominoDeckTileMemberRecord })
  tileComposition: DominoDeckTileMemberRecord[] = [];

  @required('Domino ranking asset is required')
  @serializable({ label: 'Domino Ranking Asset', elementType: AssetResourceEntry })
  dominoRankingAsset: AssetResourceEntry<DominoRanking> =
    new AssetResourceEntry<DominoRanking>(DominoRanking.assetType! as AssetType);

  getExpandedTileTemplateRefs(): AssetResourceEntry<DominoTile>[] {
    if (this.tileComposition.length > 0) {
      return this.tileComposition.flatMap((entry) =>
        Array.from({ length: Math.max(1, entry.copies) }, () => entry.tileTemplate),
      );
    }
    return this.tileTemplates;
  }

  getDistinctTileTemplateRefs(): AssetResourceEntry<DominoTile>[] {
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
