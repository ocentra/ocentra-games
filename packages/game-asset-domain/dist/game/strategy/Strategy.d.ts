import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetCreationContext, CreatedAsset } from '../../AssetCreation';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { IContentSynthesisProvider } from '../../game/gameInfo/GameInfo';
import type { ContentBlock } from '../../game/gameInfo/GameInfo';
export interface StrategyTip {
    title: string;
    icon?: string;
    description: string;
    example?: string;
}
export declare class Strategy extends ScriptableObject implements IContentSynthesisProvider {
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    LLM: string;
    Player: string;
    basic: string;
    intermediate: string;
    advanced: string;
    tips: StrategyTip[];
    aggressiveness: number;
    riskTolerance: number;
    bluffFrequency: number;
    bluffSettings: Record<string, string>;
    synthesizeUIContent(_ctx: SynthesisContext): ContentBlock[];
    static create(context: AssetCreationContext): Promise<CreatedAsset>;
}
