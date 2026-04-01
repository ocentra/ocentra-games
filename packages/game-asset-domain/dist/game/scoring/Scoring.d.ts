import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetReference } from '@ocentra/asset-domain/AssetReference';
import type { AssetCreationContext, CreatedAsset } from '../../AssetCreation';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { IContentSynthesisProvider } from '../../game/gameInfo/GameInfo';
import type { ContentBlock } from '../../game/gameInfo/GameInfo';
export declare class Scoring extends ScriptableObject implements IContentSynthesisProvider {
    static schemaVersion: number;
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    cardRankingAsset: AssetReference | string | null;
    constructor();
    protected awake(): void;
    private initializeDefaultCardRanking;
    scoringFormula: string;
    scoringRules: Record<string, unknown> | null;
    description: string;
    /**
     * Default implementation - generates basic scoring description.
     * CardGameScoring overrides this with detailed multiplier tables.
     */
    synthesizeUIContent(_ctx: SynthesisContext): ContentBlock[];
    static create(context: AssetCreationContext): Promise<CreatedAsset>;
}
