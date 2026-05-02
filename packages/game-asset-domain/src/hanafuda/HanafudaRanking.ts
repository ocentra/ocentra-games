import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory, AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';

@serializableClass({
  assetType: 'HanafudaRankingSlot',
  displayName: 'Hanafuda Ranking Slot',
  category: AssetTypeCategory.Game,
})
export class HanafudaRankingSlotRecord {
  @required('Slot is required')
  @serializable({ label: 'Slot' })
  slot: number = 1;

  @required('Card ID is required')
  @serializable({ label: 'Card ID' })
  cardId: string = '';
}

@serializableClass({
  assetType: 'HanafudaRankingMonth',
  displayName: 'Hanafuda Ranking Month',
  category: AssetTypeCategory.Game,
})
export class HanafudaRankingMonthRecord {
  @required('Month is required')
  @serializable({ label: 'Month' })
  month: number = 1;

  @required('Slots are required')
  @serializable({ label: 'Slots', elementType: HanafudaRankingSlotRecord })
  slots: HanafudaRankingSlotRecord[] = [];
}

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'HanafudaRanking',
  displayName: 'Hanafuda Ranking',
  category: AssetTypeCategory.Game,
})
export class HanafudaRanking extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      expectedCardCount: 0,
      months: [],
    };
  }

  @required('Expected card count is required')
  @serializable({ label: 'Expected Card Count' })
  expectedCardCount: number = 0;

  @required('Months are required')
  @serializable({ label: 'Months', elementType: HanafudaRankingMonthRecord })
  months: HanafudaRankingMonthRecord[] = [];

  getCardIds(): string[] {
    return this.months.flatMap((month) => month.slots.map((slot) => slot.cardId)).filter(Boolean);
  }
}
