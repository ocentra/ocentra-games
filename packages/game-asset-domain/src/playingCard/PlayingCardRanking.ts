import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory, AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';

@serializableClass({
  assetType: 'PlayingCardRankingEntry',
  displayName: 'Playing Card Ranking Entry',
  category: AssetTypeCategory.Game,
})
export class PlayingCardRankingEntry {
  @required('Card ID is required')
  @serializable({ label: 'Card ID' })
  cardId: string = '';
}

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'PlayingCardRanking',
  displayName: 'Playing Card Ranking',
  category: AssetTypeCategory.Game,
})
export class PlayingCardRanking extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      expectedCardCount: 0,
      cards: [],
    };
  }

  @required('Expected card count is required')
  @serializable({ label: 'Expected Card Count' })
  expectedCardCount: number = 0;

  @required('Cards are required')
  @serializable({ label: 'Cards', elementType: PlayingCardRankingEntry })
  cards: PlayingCardRankingEntry[] = [];

  getCardIds(): string[] {
    return this.cards.map((card) => card.cardId).filter(Boolean);
  }

  updateExpectedCardCount(): void {
    this.expectedCardCount = this.cards.length;
  }
}
