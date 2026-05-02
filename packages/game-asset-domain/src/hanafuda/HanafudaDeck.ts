import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory, AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { AssetType } from '@ocentra/asset-domain/types/assetType';
import { HanafudaCard } from '@/hanafuda/HanafudaCard';
import { HanafudaRanking } from '@/hanafuda/HanafudaRanking';
import { SupportedDeckTripleRecord } from '@/card/deck/Deck';

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'HanafudaDeck',
  displayName: 'Hanafuda Deck',
  category: AssetTypeCategory.Game,
})
export class HanafudaDeck extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      name: 'NewHanafudaDeck',
      supportedTriples: [],
      cardTemplates: [],
      hanafudaRankingAsset: undefined,
    };
  }

  @required('Deck name is required')
  @serializable({ label: 'Deck Name' })
  name: string = '';

  @required('Supported triples are required')
  @serializable({ label: 'Supported Triples', elementType: SupportedDeckTripleRecord })
  supportedTriples: SupportedDeckTripleRecord[] = [];

  @required('Card templates are required')
  @serializable({ label: 'Card Templates', elementType: AssetResourceEntry })
  cardTemplates: AssetResourceEntry<HanafudaCard>[] = [];

  @required('Hanafuda ranking asset is required')
  @serializable({ label: 'Hanafuda Ranking Asset', elementType: AssetResourceEntry })
  hanafudaRankingAsset: AssetResourceEntry<HanafudaRanking> =
    new AssetResourceEntry<HanafudaRanking>(HanafudaRanking.assetType! as AssetType);

  getDistinctCardTemplateRefs(): AssetResourceEntry<HanafudaCard>[] {
    const seen = new Set<string>();
    return this.cardTemplates.filter((ref) => {
      const key = ref.guid || ref.path || ref.displayName || '';
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
