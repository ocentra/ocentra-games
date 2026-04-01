import 'reflect-metadata';
import { GameRules } from '../../game/gameRules/GameRules';
import { TrumpBonusValues } from '../../game/gameRules/TrumpBonusValues';
import type { BaseBonusRule } from '../../game/rules/BaseBonusRule';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { IContentSynthesisProvider } from '../../game/gameInfo/GameInfo';
import type { ContentBlock } from '../../game/gameInfo/GameInfo';
import type { AssetCreationContext, CreatedAsset } from '../../AssetCreation';
export declare class CardGameRules extends GameRules implements IContentSynthesisProvider {
    static assetType: string;
    static displayName: string;
    static icon: string;
    static readonly requiresInspector = true;
    bonusRuleGuids: string[];
    useTrump: boolean;
    trumpBonusValues?: TrumpBonusValues;
    private loadedBonusRules?;
    synthesizeUIContent(_ctx: SynthesisContext): ContentBlock[];
    /**
     * Synthesize content from all bonus rules.
     * Called separately to allow page-level organization.
     */
    synthesizeBonusRulesContent(ctx: SynthesisContext): Promise<ContentBlock[]>;
    loadBonusRules(): Promise<BaseBonusRule[]>;
    getBonusRule<T extends BaseBonusRule>(ruleType: new () => T): T | null;
    static create(context: AssetCreationContext): Promise<CreatedAsset>;
}
