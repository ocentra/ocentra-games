import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { BaseBonusRule } from '@/game/rules/BaseBonusRule';
import { BonusDetail } from '@/game/rules/BonusDetail';
import type { Card } from '@ocentra/game-domain/types/game';
import type { CardRanking } from '@/card/cardRanking/CardRanking';
import { CardGameMode } from '@/gameMode/cardGameMode/CardGameMode';
import type { GameMode } from '@/gameMode/core/GameMode';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { ContentBlock } from '@/game/gameInfo/GameInfo';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { HandUtility } from '@ocentra/game-domain/engine/logic/HandUtility';
import type { GameRulesContainer } from '@/gameMode/types/GameRulesContainer';

@serializableClass({
  assetType: 'RoyalFlush',
  displayName: 'Royal Flush',
  icon: '👑',
  category: AssetTypeCategory.Game,
})
export class RoyalFlush extends BaseBonusRule {
  @serializable({ label: 'Minimum Cards Required' })
  override minNumberOfCard: number = 3;

  @serializable({ label: 'Default Bonus Value' })
  override bonusValue: number = 200;

  @serializable({ label: 'Pattern Type' })
  override patternType: string = 'royal_flush';

  @serializable({ label: 'Rule Name' })
  override ruleName: string = 'RoyalFlush';

  @serializable({ label: 'Priority' })
  override priority: number = 100;

  async initialize(gameMode: GameMode): Promise<boolean> {
    if (!(gameMode instanceof CardGameMode)) {
      return false;
    }
    this.gameMode = gameMode;
    this.description = 'Ace, King, and Queen of the same suit.';

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

    if (!HandUtility.isRoyalFlush(hand)) {
      return null;
    }

    const baseBonus = this.bonusValue * 14;
    const calculation = `${this.bonusValue} * 14`;

    const descriptions: string[] = [`Royal Flush: ${hand[0].suit}`];

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
    const royalRanks = [14, 13, 12];

    for (let i = 0; i < Math.min(handSize, royalRanks.length); i++) {
      const symbol = cardRanking.getCardSymbol(suit, royalRanks[i], coloured);
      hand.push(symbol);
    }

    while (hand.length < handSize) {
      const rank = cardRanking.getRandomRank(2, 11);
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


