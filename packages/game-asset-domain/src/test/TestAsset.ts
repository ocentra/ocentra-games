import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { CardRanking } from '../card/cardRanking/CardRanking';

@serializableClass({
  assetType: 'TestAsset',
  displayName: 'Test Asset',
  icon: '🧪',
  category: AssetTypeCategory.Content,
})
export class TestAsset extends ScriptableObject {

  @required('Name is required')
  @serializable({ label: 'Name' })
  name!: string;

  @serializable({ label: 'Test Data' })
  testData?: string;

  @required('Count is required')
  @serializable({ label: 'Count' })
  count!: number;

  @required('Card Ranking Asset is required')
  @serializable({ label: 'Card Ranking Asset', elementType: AssetResourceEntry })
  cardRankingAsset!: AssetResourceEntry<CardRanking>;
}
