import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';

@serializableClass({
  assetType: 'TrumpBonusValues',
  displayName: 'Trump Bonus Values',
})
export class TrumpBonusValues {
  @serializable()
  cardInMiddleBonus: number = 5;

  @serializable()
  fiveOfKindBonus: number = 25;

  @serializable()
  flushBonus: number = 20;

  @serializable()
  fourOfKindBonus: number = 20;

  @serializable()
  threeOfKindBonus: number = 15;

  @serializable()
  pairBonus: number = 5;

  @serializable()
  trumpCardBonus: number = 10;

  @serializable()
  wildCardBonus: number = 10;

  @serializable()
  rankAdjacentBonus: number = 5;

  getBonusForSet(size: number): number {
    switch (size) {
      case 5: return this.fiveOfKindBonus;
      case 4: return this.fourOfKindBonus;
      case 3: return this.threeOfKindBonus;
      case 2: return this.pairBonus;
      default: return 0;
    }
  }
}

