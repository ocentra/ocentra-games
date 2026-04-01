import 'reflect-metadata';
import { serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { GameRulesContainer } from '@/gameMode/types/GameRulesContainer';
import type { GameMode } from '@/gameMode/core/GameMode';

@serializableClass({
  assetType: 'BaseRule',
  displayName: 'Base Rule',
  icon: '📋',
  category: AssetTypeCategory.Game,
})
export abstract class BaseRule extends ScriptableObject {


  abstract ruleName: string;

  description!: string;

  abstract priority: number;

  examples!: GameRulesContainer;

  abstract initialize(gameMode: GameMode): Promise<boolean>;

  abstract isApplicable(gameMode: GameMode): boolean;
}

