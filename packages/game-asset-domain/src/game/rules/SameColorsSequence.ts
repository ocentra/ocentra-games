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
import { Suit } from '@ocentra/game-domain/types/game';
import type { GameRulesContainer } from '@/gameMode/types/GameRulesContainer';

@serializableClass({
  assetType: 'SameColorsSequence',
  displayName: 'Same Colors Sequence',
  icon: '🌈',
  category: AssetTypeCategory.Game,
})
export class SameColorsSequence extends BaseBonusRule {
    @serializable({ label: 'Minimum Cards Required' })
  override minNumberOfCard: number = 3;

  @serializable({ label: 'Default Bonus Value' })
  override bonusValue: number = 120;

  @serializable({ label: 'Pattern Type' })
  override patternType: string = 'same_colors_sequence';

  @serializable({ label: 'Rule Name' })
  override ruleName: string = 'SameColorsSequence';

  @serializable({ label: 'Priority' })
  override priority: number = 90;

  async initialize(gameMode: GameMode): Promise<boolean> {
    if (!(gameMode instanceof CardGameMode)) {
      return false;
    }
    this.gameMode = gameMode;
    this.description = 'Sequence of cards of the same color (Red: Hearts/Diamonds, Black: Spades/Clubs).';

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

  async evaluate(
    hand: Card[],
    _trumpCard?: Card
  ): Promise<BonusDetail | null> {
    if (hand.length < this.minNumberOfCard) {
      return null;
    }

    if (!HandUtility.isSameColorsSequence(hand)) {
      return null;
    }

    const highestValue = HandUtility.getHighestValue(hand);
    const baseBonus = this.bonusValue * highestValue;
    const calculation = `${this.bonusValue} * ${highestValue}`;

    const color = HandUtility.getCardColor(hand[0].suit);
    const descriptions: string[] = [`Same Colors Sequence: ${color}`];

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
    const redSuits: Suit[] = [Suit.HEARTS, Suit.DIAMONDS];
    const blackSuits: Suit[] = [Suit.SPADES, Suit.CLUBS];
    const colorChoice = Math.random() < 0.5 ? 'red' : 'black';
    const suits = colorChoice === 'red' ? redSuits : blackSuits;
    
    const startRank = cardRanking.getRandomRank(2, 14 - handSize + 1);

    for (let i = 0; i < handSize; i++) {
      const rank = startRank + i;
      const suit = suits[i % suits.length];
      const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
      hand.push(symbol);
    }

    return hand;
  }

  override isApplicable(gameMode: GameMode): boolean {
    return gameMode instanceof CardGameMode;
  }
}


