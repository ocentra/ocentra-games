import 'reflect-metadata';
import { Scoring } from '../../game/scoring/Scoring';
import { CardRanking } from '../../card/cardRanking/CardRanking';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { ContentBlock } from '../../game/gameInfo/GameInfo';
import type { ScoringDirection } from '@ocentra/game-domain/game/scoring';
import type { AssetCreationContext, CreatedAsset } from '../../AssetCreation';
export declare const ScoringType: {
    readonly PokerRanking: "poker_ranking";
    readonly HoardersMultiplier: "hoarders_multiplier";
    readonly Custom: "custom";
};
export type ScoringType = typeof ScoringType[keyof typeof ScoringType];
export declare class CardGameScoring extends Scoring {
    static assetType: string;
    static displayName: string;
    static icon: string;
    static readonly requiresInspector = true;
    scoringType: ScoringType;
    patternMultipliers: Record<string, number> | null;
    priorityOrder: string[];
    winCondition: string;
    cardValues: Record<string, number>;
    penalties: string;
    targetScore: number | null;
    scoringDirection: ScoringDirection;
    synthesizeUIContent(_ctx: SynthesisContext): ContentBlock[];
    getCardRanking(): Promise<CardRanking | null>;
    getMultiplier(patternType: string): number;
    getHighestPriorityPattern(patterns: string[]): string | null;
    static create(context: AssetCreationContext): Promise<CreatedAsset>;
}
