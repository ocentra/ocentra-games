import 'reflect-metadata';
import { BaseBonusRule } from '../../game/rules/BaseBonusRule';
import { BonusDetail } from '../../game/rules/BonusDetail';
import type { Card } from '@ocentra/game-domain/types/game';
import type { CardRanking } from '../../card/cardRanking/CardRanking';
import type { GameMode } from '../../gameMode/core/GameMode';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { ContentBlock } from '../../game/gameInfo/GameInfo';
export declare class ThreeOfAKind extends BaseBonusRule {
    minNumberOfCard: number;
    bonusValue: number;
    patternType: string;
    ruleName: string;
    priority: number;
    initialize(gameMode: GameMode): Promise<boolean>;
    evaluate(hand: Card[], trumpCard?: Card): Promise<BonusDetail | null>;
    createExampleHand(handSize: number, cardRanking: CardRanking, _trumpCard?: Card, coloured?: boolean): string[];
    /**
     * Generates UI blocks for this rule.
     * Uses default implementation from BaseBonusRule.
     */
    synthesizeUIContent(ctx: SynthesisContext): ContentBlock[];
    isApplicable(gameMode: GameMode): boolean;
}
