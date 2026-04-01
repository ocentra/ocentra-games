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
  assetType: 'Flush',
  displayName: 'Flush',
  icon: '💎',
  category: AssetTypeCategory.Game,
})
export class Flush extends BaseBonusRule {
  @serializable({ label: 'Minimum Cards Required' })
  override minNumberOfCard: number = 3;

  @serializable({ label: 'Default Bonus Value' })
  override bonusValue: number = 110;

  @serializable({ label: 'Pattern Type' })
  override patternType: string = 'flush';

  @serializable({ label: 'Rule Name' })
  override ruleName: string = 'Flush';

  @serializable({ label: 'Priority' })
  override priority: number = 88;

  async initialize(gameMode: GameMode): Promise<boolean> {
    if (!(gameMode instanceof CardGameMode)) {
      return false;
    }
    this.gameMode = gameMode;
    this.description = 'Three or more cards of the same suit, not forming a sequence.';

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

    if (!HandUtility.isFlush(hand)) {
      return null;
    }

    if (HandUtility.isSequence(hand)) {
      return null;
    }

    const highestValue = HandUtility.getHighestValue(hand);
    const baseBonus = this.bonusValue * highestValue;

    let additionalBonus = 0;
    const descriptions: string[] = [`Flush: ${hand[0].suit}`];
    let calculation = `${this.bonusValue} * ${highestValue}`;

    if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
      const trumpBonus = this.gameMode.trumpBonusValues?.flushBonus ?? 0;
      additionalBonus += trumpBonus;
      descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
      calculation += ` + ${trumpBonus}`;
    }

    return new BonusDetail(
      this.ruleName,
      baseBonus,
      additionalBonus,
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
    const usedRanks = new Set<number>();

    while (hand.length < handSize) {
      let rank: number;
      do {
        rank = cardRanking.getRandomRank();
      } while (usedRanks.has(rank));

      usedRanks.add(rank);
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

