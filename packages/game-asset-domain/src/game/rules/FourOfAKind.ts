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
  assetType: 'FourOfAKind',
  displayName: 'Four Of A Kind',
  icon: '🎯',
  category: AssetTypeCategory.Game,
})
export class FourOfAKind extends BaseBonusRule {
  @serializable({ label: 'Minimum Cards Required' })
  override minNumberOfCard: number = 4;

  @serializable({ label: 'Default Bonus Value' })
  override bonusValue: number = 135;

  @serializable({ label: 'Pattern Type' })
  override patternType: string = 'four_of_kind';

  @serializable({ label: 'Rule Name' })
  override ruleName: string = 'FourOfAKind';

  @serializable({ label: 'Priority' })
  override priority: number = 93;

  async initialize(gameMode: GameMode): Promise<boolean> {
    if (!(gameMode instanceof CardGameMode)) {
      return false;
    }
    this.gameMode = gameMode;
    this.description = 'Four cards of the same rank.';

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

    if (!HandUtility.isFourOfAKind(hand, trumpCard, this.gameMode?.useTrump)) {
      return null;
    }

    const fourRank = HandUtility.getNOfAKindRank(hand, 4, trumpCard, this.gameMode?.useTrump);
    if (!fourRank) {
      return null;
    }

    let baseBonus: number;
    let calculation: string;

    if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
      const nonTrumpRanks = hand
        .filter(c => c.id !== trumpCard.id)
        .map(c => c.value);
      const pairRank = nonTrumpRanks.length > 0 ? nonTrumpRanks[0] : fourRank;

      baseBonus = this.bonusValue * (pairRank + trumpCard.value);
      calculation = `${this.bonusValue} * (${pairRank} + ${trumpCard.value})`;
    } else {
      baseBonus = this.bonusValue * fourRank * 4;
      calculation = `${this.bonusValue} * (${fourRank} * 4)`;
    }

    let additionalBonus = 0;
    const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
    const rankName = cardRanking ? cardRanking.getRankName(fourRank) : fourRank.toString();
    const descriptions: string[] = [`Four of a Kind: ${rankName}`];

    if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
      const trumpBonus = this.gameMode.trumpBonusValues?.fourOfKindBonus ?? 0;
      additionalBonus += trumpBonus;
      descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
      calculation += ` + ${trumpBonus}`;
    }

    const matchedCards = hand.filter(c => c.value === fourRank);

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
    if (handSize < 4) {
      return [];
    }

    const hand: string[] = [];
    const availableSuits = cardRanking.getAllSuits();
    const fourRank = cardRanking.getRandomRank();

    for (let i = 0; i < 4 && i < handSize; i++) {
      const suit = availableSuits[i % availableSuits.length];
      const symbol = cardRanking.getCardSymbol(suit, fourRank, coloured);
      hand.push(symbol);
    }

    while (hand.length < handSize) {
      const suit = cardRanking.getRandomSuit();
      let rank: number;
      do {
        rank = cardRanking.getRandomRank();
      } while (rank === fourRank);

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


