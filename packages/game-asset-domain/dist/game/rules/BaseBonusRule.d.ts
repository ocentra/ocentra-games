import 'reflect-metadata';
import { BaseRule } from '../../game/rules/BaseRule';
import { BonusDetail } from '../../game/rules/BonusDetail';
import type { Card } from '@ocentra/game-domain/types/game';
import type { CardRanking } from '../../card/cardRanking/CardRanking';
import { CardGameMode } from '../../gameMode/cardGameMode/CardGameMode';
import type { GameMode } from '../../gameMode/core/GameMode';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { IContentSynthesisProvider } from '../../game/gameInfo/GameInfo';
import type { ContentBlock } from '../../game/gameInfo/GameInfo';
export declare abstract class BaseBonusRule extends BaseRule implements IContentSynthesisProvider {
    static readonly requiresInspector = true;
    abstract minNumberOfCard: number;
    abstract bonusValue: number;
    abstract patternType: string;
    protected gameMode?: CardGameMode;
    abstract initialize(gameMode: GameMode): Promise<boolean>;
    abstract evaluate(hand: Card[], trumpCard?: Card): Promise<BonusDetail | null>;
    abstract createExampleHand(handSize: number, cardRanking: CardRanking, trumpCard?: Card, coloured?: boolean): string[];
    /**
     * DEFAULT implementation - subclasses can override for custom content.
     * Generates basic pattern description with bonus value and example.
     */
    synthesizeUIContent(ctx: SynthesisContext): ContentBlock[];
}
