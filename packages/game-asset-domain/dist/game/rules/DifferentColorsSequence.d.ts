import 'reflect-metadata';
import { BaseBonusRule } from '../../game/rules/BaseBonusRule';
import { BonusDetail } from '../../game/rules/BonusDetail';
import type { Card } from '@ocentra/game-domain/types/game';
import type { CardRanking } from '../../card/cardRanking/CardRanking';
import type { GameMode } from '../../gameMode/core/GameMode';
export declare class DifferentColorsSequence extends BaseBonusRule {
    minNumberOfCard: number;
    bonusValue: number;
    patternType: string;
    ruleName: string;
    priority: number;
    initialize(gameMode: GameMode): Promise<boolean>;
    evaluate(hand: Card[], _trumpCard?: Card): Promise<BonusDetail | null>;
    createExampleHand(handSize: number, cardRanking: CardRanking, _trumpCard?: Card, coloured?: boolean): string[];
    isApplicable(gameMode: GameMode): boolean;
}
