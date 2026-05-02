import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { GameRules } from '@/game/gameRules/GameRules';
import { TrumpBonusValues } from '@/game/gameRules/TrumpBonusValues';
import type { BaseBonusRule } from '@/game/rules/BaseBonusRule';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetAssetTypeInfoEvent } from '@ocentra/eventing-domain/events/assets/GetAssetTypeInfoEvent';
import { GetAssetTypeByGuidEvent } from '@ocentra/eventing-domain/events/game/GetAssetTypeByGuidEvent';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { AssetTypeInfo } from '@/constants/asset-type-info';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { IContentSynthesisProvider } from '@/game/gameInfo/GameInfo';
import { isContentSynthesisProvider } from '@/game/gameInfo/GameInfo';
import type { ContentBlock } from '@/game/gameInfo/GameInfo';
import { ContentBlockType } from '@/constants/content-block-type';
import { ListStyleType } from '@/constants/list-style-type';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import { generateAssetGuid } from '@/AssetCreation';

@serializableClass({
  assetType: 'CardGameRules',
  displayName: 'Card Game Rules',
  icon: '🃏',
  category: AssetTypeCategory.Game,
})
export class CardGameRules extends GameRules implements IContentSynthesisProvider {
  static override assetType = 'CardGameRules';
  static override displayName = 'Card Game Rules';
  static override icon = '🃏';
  static override readonly requiresInspector = true;

  @serializable({ label: 'Bonus Rules (GUIDs)' })
  bonusRuleGuids!: string[];

  @serializable({ label: 'Use Trump Cards' })
  useTrump!: boolean;

  @serializable({ label: 'Trump Bonus Values' })
  trumpBonusValues?: TrumpBonusValues;

  private loadedBonusRules?: BaseBonusRule[];

  synthesizeUIContent(_ctx: SynthesisContext): ContentBlock[] {
    void _ctx;
    const blocks: ContentBlock[] = [];

    if (this.objective) {
      blocks.push({ type: ContentBlockType.Heading, level: 3, text: 'Objective' });
      blocks.push({ type: ContentBlockType.Paragraph, text: this.objective });
    }

    const gameplayText = this.gameplay || this.Player;
    if (gameplayText) {
      blocks.push({ type: ContentBlockType.Heading, level: 3, text: 'Gameplay Rules' });
      const paragraphs = gameplayText.split('\n\n').filter(p => p.trim());
      for (const paragraph of paragraphs) {
        blocks.push({ type: ContentBlockType.Paragraph, text: paragraph.trim() });
      }
    }

    if (this.keyRules && this.keyRules.length > 0) {
      blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Key Rules' });
      blocks.push({
        type: ContentBlockType.List,
        style: ListStyleType.Unordered,
        items: this.keyRules.map(text => ({ text })),
      });
    }

    return blocks;
  }

  /**
   * Synthesize content from all bonus rules.
   * Called separately to allow page-level organization.
   */
  async synthesizeBonusRulesContent(ctx: SynthesisContext): Promise<ContentBlock[]> {
    const blocks: ContentBlock[] = [];
    const bonusRules = await this.loadBonusRules();

    blocks.push({
      type: ContentBlockType.Heading,
      level: 3,
      text: 'Bonus Patterns'
    });

    for (const rule of bonusRules) {
      if (isContentSynthesisProvider(rule)) {
        const ruleBlocks = rule.synthesizeUIContent(ctx);
        blocks.push({
          type: ContentBlockType.RuleBlock,
          title: (rule as unknown as { ruleName: string }).ruleName,
          content: ruleBlocks
        });
      }
    }

    return blocks;
  }

  async loadBonusRules(): Promise<BaseBonusRule[]> {
    if (this.loadedBonusRules) return this.loadedBonusRules;

    this.loadedBonusRules = await Promise.all(
      this.bonusRuleGuids.map(async (guid) => {
        const getAssetTypeDeferred = new OperationDeferred<string | null>();
        await EventBus.instance.publishAsync(new GetAssetTypeByGuidEvent(guid, getAssetTypeDeferred));
        const assetTypeResult = await getAssetTypeDeferred.promise;

        if (!assetTypeResult.isSuccess || !assetTypeResult.value) {
          throw new Error(`Failed to get asset type for GUID: ${guid}`);
        }

        const assetType = assetTypeResult.value;

        const getTypeInfoDeferred = new OperationDeferred<AssetTypeInfo | null>();
        await EventBus.instance.publishAsync(new GetAssetTypeInfoEvent(assetType, getTypeInfoDeferred));
        const typeInfoResult = await getTypeInfoDeferred.promise;

        if (!typeInfoResult.isSuccess || !typeInfoResult.value || !typeInfoResult.value.constructor) {
          throw new Error(`Failed to get asset type info for type: ${assetType}`);
        }

        const assetGUID = AssetGUID.from(guid);
        const asset = await ScriptableObject.loadByGuid(typeInfoResult.value.constructor, assetGUID);
        if (!asset) {
          throw new Error(`Failed to load bonus rule with GUID: ${guid}`);
        }
        return asset as BaseBonusRule;
      })
    );

    return this.loadedBonusRules;
  }

  getBonusRule<T extends BaseBonusRule>(ruleType: new () => T): T | null {
    return (this.loadedBonusRules?.find(r => r instanceof ruleType) as T) ?? null;
  }

  static async create(context: AssetCreationContext): Promise<CreatedAsset> {
    const guid = await generateAssetGuid('CardGameRules', context.gameId);

    return {
      assetId: `${context.gameId}-rules`,
      fileName: `${context.gameId}Rules.asset`,
      guid,
      data: {
        LLM: `Rules summary for ${context.displayName}.`,
        Player: `Learn how to play ${context.displayName}.`,
        objective: `Win the game of ${context.displayName} according to its scoring conditions.`,
        gameplay: `Follow the turn order and legal actions defined for ${context.displayName}.`,
        keyRules: [],
        bonusRuleGuids: [],
        useTrump: false,
        trumpBonusValues: null,
      },
    };
  }
}
