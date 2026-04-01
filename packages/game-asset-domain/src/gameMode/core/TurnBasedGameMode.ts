import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { BettingGameMode } from '@/gameMode/core/BettingGameMode';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';

@serializableClass({
  assetType: 'TurnBasedGameMode',
  displayName: 'Turn Based Game Mode',
  category: AssetTypeCategory.Game,
})
export abstract class TurnBasedGameMode extends BettingGameMode {
  @serializable({ label: 'Min Rounds', group: 'Turn Settings' })
  minRounds: number = 1;

  @serializable({ label: 'Max Rounds', group: 'Turn Settings' })
  maxRounds: number | null = null;

  @serializable({ label: 'Turn Duration (seconds)', group: 'Turn Settings' })
  turnDuration: number = 60;
}
