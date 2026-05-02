import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory, AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { AssetType } from '@ocentra/asset-domain/types/assetType';
import { PlayingCard } from '@/playingCard/PlayingCard';
import { PlayingCardRanking } from '@/playingCard/PlayingCardRanking';
import { SupportedDeckTripleRecord } from '@/card/deck/Deck';

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'PlayingCardDeck',
  displayName: 'Playing Card Deck',
  category: AssetTypeCategory.Game,
})
export class PlayingCardDeck extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      name: 'NewPlayingCardDeck',
      supportedTriples: [],
      cardTemplates: [],
      playingCardRankingAsset: undefined,
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
  cardTemplates: AssetResourceEntry<PlayingCard>[] = [];

  @required('Playing card ranking asset is required')
  @serializable({ label: 'Playing Card Ranking Asset', elementType: AssetResourceEntry })
  playingCardRankingAsset: AssetResourceEntry<PlayingCardRanking> =
    new AssetResourceEntry<PlayingCardRanking>(PlayingCardRanking.assetType! as AssetType);

  getDistinctCardTemplateRefs(): AssetResourceEntry<PlayingCard>[] {
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
