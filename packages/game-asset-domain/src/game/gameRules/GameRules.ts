import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import { generateAssetGuid } from '@/AssetCreation';

@serializableClass({
  assetType: 'GameRules',
  displayName: 'Game Rules',
  icon: '📜',
  category: AssetTypeCategory.Game,
})
export class GameRules extends ScriptableObject {

  static readonly requiresInspector = true;
  static override createTemplate(): Record<string, unknown> {
    return {
      LLM: '',
      Player: '',
      objective: '',
      gameplay: '',
      keyRules: [],
    };
  }

  @serializable({ label: 'LLM Rules' })
  LLM: string = '';

  @serializable({ label: 'Player Rules' })
  Player: string = '';

  @serializable({ label: 'Objective', group: 'Rules Section' })
  objective: string = '';

  @serializable({ label: 'Gameplay', group: 'Rules Section' })
  gameplay: string = '';

  @serializable({ label: 'Key Rules', group: 'Rules Section', elementType: String })
  keyRules: string[] = [];

  @serializable({ label: 'Move Validity Conditions' })
  moveValidityConditions: Record<string, string> | null = null;

  @serializable({ label: 'Example Hands' })
  exampleHands: string[] = [];

  @serializable({ label: 'Bonus Rules' })
  bonusRules: string = '';

  static async create(context: AssetCreationContext): Promise<CreatedAsset> {
    const guid = await generateAssetGuid('GameRules', context.gameId);
    const assetId = `${context.gameId}-rules`;
    const data: Record<string, unknown> = {
      LLM: `Rules for ${context.displayName}.`,
      Player: `Rules for ${context.displayName}.`,
    };

    return {
      assetId,
      fileName: `${context.gameId}Rules.asset`,
      guid,
      data,
    };
  }
}
