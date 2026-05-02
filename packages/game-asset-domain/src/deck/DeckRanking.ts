import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { AssetSchemaVersion, AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { CardRanking, CardRankingExplicitEntry } from '@/card/cardRanking/CardRanking';

export const DeckRankingFamily = {
  FrenchCards: 'french_cards',
  Tarot: 'tarot',
  Domino: 'domino',
  Hanafuda: 'hanafuda',
  Mahjong: 'mahjong',
  Custom: 'custom',
} as const;

export type DeckRankingFamily = typeof DeckRankingFamily[keyof typeof DeckRankingFamily];

@serializableClass({
  assetType: 'DeckRankingAxisEntry',
  displayName: 'Deck Ranking Axis Entry',
  category: AssetTypeCategory.Game,
})
export class DeckRankingAxisEntry {
  @serializable({ label: 'Key' })
  key: string = '';

  @serializable({ label: 'Label' })
  label: string = '';

  @serializable({ label: 'Symbol' })
  symbol: string = '';

  @serializable({ label: 'Icon' })
  icon: string = '';

  @serializable({ label: 'Image Hash' })
  imageHash: string = '';

  @serializable({ label: 'Image Path' })
  imagePath: string = '';

  @serializable({ label: 'Color' })
  color: string = '';

  @serializable({ label: 'Order' })
  order: number = 0;
}

@serializableClass({
  assetType: 'DeckRankingLayoutCell',
  displayName: 'Deck Ranking Layout Cell',
  category: AssetTypeCategory.Game,
})
export class DeckRankingLayoutCell {
  @serializable({ label: 'Piece ID' })
  pieceId: string = '';

  @serializable({ label: 'Row Key' })
  rowKey: string = '';

  @serializable({ label: 'Column Key' })
  columnKey: string = '';
}

@serializableClass({
  assetType: 'DeckRankingLayoutSection',
  displayName: 'Deck Ranking Layout Section',
  category: AssetTypeCategory.Game,
})
export class DeckRankingLayoutSection {
  @serializable({ label: 'ID' })
  id: string = '';

  @serializable({ label: 'Title' })
  title: string = '';

  @serializable({ label: 'Kind' })
  kind: 'matrix' | 'grid' = 'grid';

  @serializable({ label: 'Rows', elementType: DeckRankingAxisEntry })
  rows: DeckRankingAxisEntry[] = [];

  @serializable({ label: 'Columns', elementType: DeckRankingAxisEntry })
  columns: DeckRankingAxisEntry[] = [];

  @serializable({ label: 'Piece IDs' })
  pieceIds: string[] = [];

  @serializable({ label: 'Cells', elementType: DeckRankingLayoutCell })
  cells: DeckRankingLayoutCell[] = [];
}

@serializableClass({
  assetType: 'DeckRanking',
  displayName: 'Deck Ranking',
  icon: 'ðŸ“Š',
  category: AssetTypeCategory.Game,
  schemaVersion: AssetSchemaVersion.V1,
})
export class DeckRanking extends CardRanking {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      ...CardRanking.createTemplate(),
      rankingFamily: DeckRankingFamily.FrenchCards,
      expectedPieceCount: 0,
      layout: [],
      order: [],
      scoringHints: {},
      legacyPayload: {},
    };
  }

  @serializable({ label: 'Ranking Family' })
  rankingFamily: DeckRankingFamily = DeckRankingFamily.FrenchCards;

  @serializable({ label: 'Expected Piece Count' })
  expectedPieceCount: number = 0;

  @serializable({ label: 'Layout', elementType: DeckRankingLayoutSection })
  layout: DeckRankingLayoutSection[] = [];

  @serializable({ label: 'Canonical Order', elementType: CardRankingExplicitEntry })
  order: CardRankingExplicitEntry[] = [];

  @serializable({ label: 'Scoring Hints' })
  scoringHints: Record<string, unknown> = {};

  @serializable({ label: 'Legacy Payload' })
  legacyPayload: Record<string, unknown> = {};

  override updateExpectedCardCount(): void {
    super.updateExpectedCardCount();
    this.expectedPieceCount = this.order.length > 0 ? this.order.length : this.expectedCardCount;
  }
}
