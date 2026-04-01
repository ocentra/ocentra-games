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
  assetType: 'FullHouse',
  displayName: 'Full House',
  icon: '🏠',
  category: AssetTypeCategory.Game,
})
export class FullHouse extends BaseBonusRule {
  @serializable({ label: 'Minimum Cards Required' })
  override minNumberOfCard: number = 5;

  @serializable({ label: 'Default Bonus Value' })
  override bonusValue: number = 190;

  @serializable({ label: 'Pattern Type' })
  override patternType: string = 'full_house';

  @serializable({ label: 'Rule Name' })
  override ruleName: string = 'FullHouse';

  @serializable({ label: 'Priority' })
  override priority: number = 95;

  async initialize(gameMode: GameMode): Promise<boolean> {
    if (!(gameMode instanceof CardGameMode)) {
      return false;
    }
    this.gameMode = gameMode;
    this.description = 'Three cards of the same rank plus two cards of another rank.';

    const cardRanking = await gameMode.getCardRanking();
    if (!cardRanking) return false;

    const handSize = gameMode.initialNumberOfCards || 5;
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

    if (!HandUtility.isFullHouse(hand, trumpCard, this.gameMode?.useTrump)) {
      return null;
    }

    const threeRank = HandUtility.getNOfAKindRank(hand, 3, trumpCard, this.gameMode?.useTrump);
    const twoRank = HandUtility.getNOfAKindRank(hand, 2, trumpCard, this.gameMode?.useTrump);

    if (!threeRank || !twoRank) {
      return null;
    }

    const baseBonus = this.bonusValue * (threeRank * 3 + twoRank * 2);
    const calculation = `${this.bonusValue} * (${threeRank} * 3 + ${twoRank} * 2)`;

    const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
    if (!cardRanking) {
      return null;
    }
    const threeRankName = cardRanking.getRankName(threeRank);
    const twoRankName = cardRanking.getRankName(twoRank);
    const descriptions: string[] = [
      `Full House: Three ${threeRankName}s, Two ${twoRankName}s`
    ];

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
    if (handSize < 5) {
      return [];
    }

    const hand: string[] = [];
    const availableSuits = cardRanking.getAllSuits();
    const threeRank = cardRanking.getRandomRank();
    let twoRank: number;
    do {
      twoRank = cardRanking.getRandomRank();
    } while (twoRank === threeRank);

    for (let i = 0; i < 3; i++) {
      const suit = availableSuits[i % availableSuits.length];
      const symbol = cardRanking.getCardSymbol(suit, threeRank, coloured);
      hand.push(symbol);
    }

    for (let i = 0; i < 2 && hand.length < handSize; i++) {
      const suit = availableSuits[(i + 3) % availableSuits.length];
      const symbol = cardRanking.getCardSymbol(suit, twoRank, coloured);
      hand.push(symbol);
    }

    while (hand.length < handSize) {
      const suit = cardRanking.getRandomSuit();
      let rank: number;
      do {
        rank = cardRanking.getRandomRank();
      } while (rank === threeRank || rank === twoRank);

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


