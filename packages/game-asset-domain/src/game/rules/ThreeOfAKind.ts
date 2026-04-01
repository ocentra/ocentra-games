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
  assetType: 'ThreeOfAKind',
  displayName: 'Three Of A Kind',
  icon: '🎲',
  category: AssetTypeCategory.Game,
})
export class ThreeOfAKind extends BaseBonusRule {
  @serializable({ label: 'Minimum Cards Required' })
  override minNumberOfCard: number = 3;

  @serializable({ label: 'Default Bonus Value' })
  override bonusValue: number = 125;

  @serializable({ label: 'Pattern Type' })
  override patternType: string = 'three_of_kind';

  @serializable({ label: 'Rule Name' })
  override ruleName: string = 'ThreeOfAKind';

  @serializable({ label: 'Priority' })
  override priority: number = 91;

  async initialize(gameMode: GameMode): Promise<boolean> {
    if (!(gameMode instanceof CardGameMode)) {
      return false;
    }
    this.gameMode = gameMode;
    this.description = 'Three cards of the same rank (2 to K), optionally using one Trump card as a wild card.';

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

    if (!HandUtility.isThreeOfAKind(hand, trumpCard, this.gameMode?.useTrump)) {
      return null;
    }

    const threeRank = HandUtility.getNOfAKindRank(hand, 3, trumpCard, this.gameMode?.useTrump);
    if (!threeRank) {
      return null;
    }

    let baseBonus: number;
    let calculation: string;

    if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
      const nonTrumpRanks = hand
        .filter(c => c.id !== trumpCard.id)
        .map(c => c.value);
      const pairRank = nonTrumpRanks.length > 0 ? nonTrumpRanks[0] : threeRank;

      baseBonus = this.bonusValue * (pairRank + trumpCard.value);
      calculation = `${this.bonusValue} * (${pairRank} + ${trumpCard.value})`;
    } else {
      baseBonus = this.bonusValue * threeRank * 3;
      calculation = `${this.bonusValue} * (${threeRank} * 3)`;
    }

    let additionalBonus = 0;
    const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
    if (!cardRanking) {
      return null;
    }
    const rankName = cardRanking.getRankName(threeRank);
    const descriptions: string[] = [`Three of a Kind: ${rankName}`];

    if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
      const trumpBonus = this.gameMode.trumpBonusValues?.threeOfKindBonus ?? 0;
      additionalBonus += trumpBonus;
      descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
      calculation += ` + ${trumpBonus}`;
    }

    const matchedCards = hand.filter(c => c.value === threeRank);

    return new BonusDetail(
      this.ruleName,
      baseBonus,
      additionalBonus,
      descriptions,
      calculation,
      this.priority,
      matchedCards
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
    const availableSuits = cardRanking.getAllSuits();
    const threeRank = cardRanking.getRandomRank();

    for (let i = 0; i < 3 && i < handSize; i++) {
      const suit = availableSuits[i % availableSuits.length];
      const symbol = cardRanking.getCardSymbol(suit, threeRank, coloured);
      hand.push(symbol);
    }

    while (hand.length < handSize) {
      const suit = cardRanking.getRandomSuit();
      let rank: number;
      do {
        rank = cardRanking.getRandomRank();
      } while (rank === threeRank);

      const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
      hand.push(symbol);
    }

    return hand;
  }

  /**
   * Generates UI blocks for this rule.
   * Uses default implementation from BaseBonusRule.
   */
  override synthesizeUIContent(ctx: SynthesisContext): ContentBlock[] {
    return super.synthesizeUIContent(ctx);
  }

  override isApplicable(gameMode: GameMode): boolean {
    return gameMode instanceof CardGameMode;
  }
}


