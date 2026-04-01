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

@serializableClass({
  assetType: 'MultiplePairs',
  displayName: 'Multiple Pairs',
  icon: '👥👥',
  category: AssetTypeCategory.Game,
})
export class MultiplePairs extends BaseBonusRule {
    @serializable({ label: 'Minimum Cards Required' })
  override minNumberOfCard: number = 4;

  @serializable({ label: 'Default Bonus Value' })
  override bonusValue: number = 105;

  @serializable({ label: 'Pattern Type' })
  override patternType: string = 'multiple_pairs';

  @serializable({ label: 'Rule Name' })
  override ruleName: string = 'MultiplePairs';

  @serializable({ label: 'Priority' })
  override priority: number = 92;

  async initialize(gameMode: GameMode): Promise<boolean> {
    if (!(gameMode instanceof CardGameMode)) {
      return false;
    }
    this.gameMode = gameMode;
    this.description = 'Two or more pairs of cards.';

    const cardRanking = await gameMode.getCardRanking();
    if (!cardRanking) return false;

    const handSize = gameMode.initialNumberOfCards || 4;
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

    const multiplePairs = HandUtility.findMultiplePairs(hand, trumpCard, this.gameMode?.useTrump);
    
    if (multiplePairs.length < 2) {
      return null;
    }

    const totalValue = multiplePairs.reduce((sum, rank) => sum + rank, 0);
    const baseBonus = this.bonusValue * totalValue;
    const calculation = `${this.bonusValue} * ${totalValue}`;

    const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
    if (!cardRanking) {
      return null;
    }
    const descriptions: string[] = multiplePairs.map(rank => 
      `Pair of ${cardRanking.getRankName(rank)}s`
    );

    const matchedCards = hand.filter(c => multiplePairs.includes(c.value));

    return new BonusDetail(
      this.ruleName,
      baseBonus,
      0,
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
    if (handSize < 4) {
      return [];
    }

    const hand: string[] = [];
    const availableSuits = cardRanking.getAllSuits();
    const usedCombinations = new Set<string>();

    const pair1Rank = cardRanking.getRandomRank();
    const pair2Rank = cardRanking.getRandomRank();
    
    if (pair1Rank === pair2Rank) {
      return [];
    }

    for (let i = 0; i < 2; i++) {
      const suit = availableSuits[i % availableSuits.length];
      const symbol = cardRanking.getCardSymbol(suit, pair1Rank, coloured);
      hand.push(symbol);
      usedCombinations.add(`${suit}_${pair1Rank}`);
    }

    for (let i = 0; i < 2 && hand.length < handSize; i++) {
      const suit = availableSuits[(i + 2) % availableSuits.length];
      const symbol = cardRanking.getCardSymbol(suit, pair2Rank, coloured);
      hand.push(symbol);
      usedCombinations.add(`${suit}_${pair2Rank}`);
    }

    while (hand.length < handSize) {
      const suit = cardRanking.getRandomSuit();
      let rank: number;
      let attempts = 0;
      
      do {
        rank = cardRanking.getRandomRank();
        attempts++;
        if (attempts > 100) break;
      } while (usedCombinations.has(`${suit}_${rank}`) || rank === pair1Rank || rank === pair2Rank);

      if (attempts > 100) break;

      const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
      hand.push(symbol);
      usedCombinations.add(`${suit}_${rank}`);
    }

    return hand;
  }

  override isApplicable(gameMode: GameMode): boolean {
    return gameMode instanceof CardGameMode;
  }
}


