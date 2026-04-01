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
  assetType: 'FiveOfAKind',
  displayName: 'Five Of A Kind',
  icon: '⭐',
  category: AssetTypeCategory.Game,
})
export class FiveOfAKind extends BaseBonusRule {
    @serializable({ label: 'Minimum Cards Required' })
  override minNumberOfCard: number = 5;

  @serializable({ label: 'Default Bonus Value' })
  override bonusValue: number = 140;

  @serializable({ label: 'Pattern Type' })
  override patternType: string = 'five_of_kind';

  @serializable({ label: 'Rule Name' })
  override ruleName: string = 'FiveOfAKind';

  @serializable({ label: 'Priority' })
  override priority: number = 94;

  async initialize(gameMode: GameMode): Promise<boolean> {
    if (!(gameMode instanceof CardGameMode)) {
      return false;
    }
    this.gameMode = gameMode;
    this.description = 'Five cards of the same rank (requires wildcards or multiple decks).';

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

    if (!HandUtility.isFiveOfAKind(hand, trumpCard, this.gameMode?.useTrump)) {
      return null;
    }

    const fiveRank = HandUtility.getNOfAKindRank(hand, 5, trumpCard, this.gameMode?.useTrump);
    if (!fiveRank) {
      return null;
    }

    const baseBonus = this.bonusValue * fiveRank * 5;

    let additionalBonus = 0;
    const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
    if (!cardRanking) {
      return null;
    }
    const rankName = cardRanking.getRankName(fiveRank);
    const descriptions: string[] = [`Five of a Kind: ${rankName}`];
    let calculation = `${this.bonusValue} * (${fiveRank} * 5)`;

    if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
      const trumpBonus = this.gameMode.trumpBonusValues?.fiveOfKindBonus ?? 0;
      additionalBonus += trumpBonus;
      descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
      calculation += ` + ${trumpBonus}`;
    }

    const matchedCards = hand.filter(c => c.value === fiveRank);

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
    if (handSize < 5) {
      return [];
    }

    const hand: string[] = [];
    const availableSuits = cardRanking.getAllSuits();
    const fiveRank = cardRanking.getRandomRank();

    for (let i = 0; i < 5 && i < handSize; i++) {
      const suit = availableSuits[i % availableSuits.length];
      const symbol = cardRanking.getCardSymbol(suit, fiveRank, coloured);
      hand.push(symbol);
    }

    while (hand.length < handSize) {
      const suit = cardRanking.getRandomSuit();
      let rank: number;
      do {
        rank = cardRanking.getRandomRank();
      } while (rank === fiveRank);

      const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
      hand.push(symbol);
    }

    return hand;
  }

  override isApplicable(gameMode: GameMode): boolean {
    return gameMode instanceof CardGameMode;
  }
}

