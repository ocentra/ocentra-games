import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { GameMode } from '@/gameMode/core/GameMode';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';

@serializableClass({
  assetType: 'BettingGameMode',
  displayName: 'Betting Game Mode',
  category: AssetTypeCategory.Game,
})
export abstract class BettingGameMode extends GameMode {
  @serializable({ label: 'Initial Player Coins', group: 'Betting' })
  initialPlayerCoins: number = 10000;
}
