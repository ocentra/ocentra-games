import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { BaseBonusRule } from '@/game/rules/BaseBonusRule';
import { BonusDetail } from '@/game/rules/BonusDetail';
import type { Card } from '@ocentra/game-domain/types/game';
import type { CardRanking } from '@/card/cardRanking/CardRanking';
import { CardGameMode } from '@/gameMode/cardGameMode/CardGameMode';
import type { GameMode } from '@/gameMode/core/GameMode';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { HandUtility } from '@ocentra/game-domain/engine/logic/HandUtility';
import type { GameRulesContainer } from '@/gameMode/types/GameRulesContainer';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { ContentBlock } from '@/game/gameInfo/GameInfo';

@serializableClass({
  assetType: 'StraightFlush',
  displayName: 'Straight Flush',
  icon: '🔥',
  category: AssetTypeCategory.Game,
})
export class StraightFlush extends BaseBonusRule {
  @serializable({ label: 'Minimum Cards Required' })
  override minNumberOfCard: number = 3;

  @serializable({ label: 'Default Bonus Value' })
  override bonusValue: number = 180;

  @serializable({ label: 'Pattern Type' })
  override patternType: string = 'straight_flush';

  @serializable({ label: 'Rule Name' })
  override ruleName: string = 'StraightFlush';

  @serializable({ label: 'Priority' })
  override priority: number = 98;

  async initialize(gameMode: GameMode): Promise<boolean> {
    if (!(gameMode instanceof CardGameMode)) {
      return false;
    }
    this.gameMode = gameMode;
    this.description = 'Three or more cards in sequence of the same suit.';

    const cardRanking = await gameMode.getCardRanking();
    if (!cardRanking) return false;

    const handSize = gameMode.initialNumberOfCards || 3;
    const exampleHand = this.createExampleHand(handSize, cardRanking, undefined, false);

    if (exampleHand.length > 0) {
      const exampleString = exampleHand.join(', ');
      const llmExample = `${this.ruleName}: ${exampleString} - Bonus: ${this.bonusValue}`;
      const playerExample = `${this.description}\n${this.ruleName} Bonus: ${this.bonusValue}\nExample: ${exampleString}`;

      this.examples = {
        LLM: llmExample,
        Player: playerExample,
      } as GameRulesContainer;
    }

    return true;
  }

  async evaluate(hand: Card[], trumpCard?: Card): Promise<BonusDetail | null> {
    if (hand.length < this.minNumberOfCard) {
      return null;
    }

    if (!HandUtility.isStraightFlush(hand)) {
      return null;
    }

    const highestValue = HandUtility.getHighestValue(hand);
    const baseBonus = this.bonusValue * highestValue;
    const calculation = `${this.bonusValue} * ${highestValue}`;

    const descriptions: string[] = [`Straight Flush: ${hand[0].suit}`];

    if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
      const trumpBonus = this.gameMode.trumpBonusValues?.flushBonus ?? 0;
      const additionalBonus = trumpBonus;
      descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
      const updatedCalculation = `${calculation} + ${trumpBonus}`;

      return new BonusDetail(
        this.ruleName,
        baseBonus,
        additionalBonus,
        descriptions,
        updatedCalculation,
        this.priority,
        hand
      );
    }

    return new BonusDetail(
      this.ruleName,
      baseBonus,
      0,
      descriptions,
      calculation,
      this.priority,
      hand
    );
  }

  createExampleHand(
    handSize: number,
    cardRanking: CardRanking,
    _trumpCard?: Card,
    coloured: boolean = true
  ): string[] {
    if (handSize < 3) {
      return [];
    }

    const hand: string[] = [];
    const suit = cardRanking.getRandomSuit();
    const startRank = cardRanking.getRandomRank(2, 14 - handSize + 1);

    for (let i = 0; i < handSize; i++) {
      const rank = startRank + i;
      const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
      hand.push(symbol);
    }

    return hand;
  }

  override synthesizeUIContent(ctx: SynthesisContext): ContentBlock[] {
    return super.synthesizeUIContent(ctx);
  }

  override isApplicable(gameMode: GameMode): boolean {
    return gameMode instanceof CardGameMode;
  }
}


