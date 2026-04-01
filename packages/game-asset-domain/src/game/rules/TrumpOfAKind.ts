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
  assetType: 'TrumpOfAKind',
  displayName: 'Trump Of A Kind',
  icon: '🃏',
  category: AssetTypeCategory.Game,
})
export class TrumpOfAKind extends BaseBonusRule {
  @serializable({ label: 'Minimum Cards Required' })
  override minNumberOfCard: number = 3;

  @serializable({ label: 'Default Bonus Value' })
  override bonusValue: number = 160;

  @serializable({ label: 'Pattern Type' })
  override patternType: string = 'trump_of_kind';

  @serializable({ label: 'Rule Name' })
  override ruleName: string = 'TrumpOfAKind';

  @serializable({ label: 'Priority' })
  override priority: number = 99;

  async initialize(gameMode: GameMode): Promise<boolean> {
    if (!(gameMode instanceof CardGameMode)) {
      return false;
    }
    this.gameMode = gameMode;
    this.description = 'Sets involving trump cards.';

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

    if (!this.gameMode?.useTrump || !trumpCard) {
      return null;
    }

    if (!hand.some(c => c.id === trumpCard.id)) {
      return null;
    }

    const rankCounts = HandUtility.getRankCounts(hand);
    const trumpCount = hand.filter(c => c.id === trumpCard.id).length;

    let bestRank: number | null = null;
    let bestCount = 0;

    for (const [value, count] of Object.entries(rankCounts)) {
      const numValue = Number(value);
      if (numValue === trumpCard.value) continue;

      const effectiveCount = count + trumpCount;
      if (effectiveCount >= 2 && effectiveCount > bestCount) {
        bestCount = effectiveCount;
        bestRank = numValue;
      }
    }

    if (!bestRank || bestCount < 2) {
      return null;
    }

    const baseBonus = this.bonusValue * (bestRank + trumpCard.value) * bestCount;
    const calculation = `${this.bonusValue} * (${bestRank} + ${trumpCard.value}) * ${bestCount}`;

    let additionalBonus = 0;
    const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
    if (!cardRanking) {
      return null;
    }
    const rankName = cardRanking.getRankName(bestRank);
    const descriptions: string[] = [
      `Trump of a Kind: ${bestCount} ${rankName}s (with Trump)`
    ];

    const trumpBonus = this.gameMode.trumpBonusValues?.trumpCardBonus ?? 0;
    additionalBonus += trumpBonus;
    descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
    const updatedCalculation = `${calculation} + ${trumpBonus}`;

    const matchedCards = hand.filter(c => c.value === bestRank || c.id === trumpCard.id);

    return new BonusDetail(
      this.ruleName,
      baseBonus,
      additionalBonus,
      descriptions,
      updatedCalculation,
      this.priority,
      matchedCards
    );
  }

  createExampleHand(
    handSize: number,
    cardRanking: CardRanking,
    trumpCard?: Card,
    coloured: boolean = true
  ): string[] {
    if (handSize < 3) {
      return [];
    }

    const hand: string[] = [];
    const availableSuits = cardRanking.getAllSuits();
    const rank = cardRanking.getRandomRank();

    for (let i = 0; i < 2 && i < handSize - 1; i++) {
      const suit = availableSuits[i % availableSuits.length];
      const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
      hand.push(symbol);
    }

    if (trumpCard) {
      const trumpSymbol = cardRanking.getCardSymbol(trumpCard.suit, trumpCard.value, coloured);
      hand.push(trumpSymbol);
    }

    while (hand.length < handSize) {
      const suit = cardRanking.getRandomSuit();
      let otherRank: number;
      do {
        otherRank = cardRanking.getRandomRank();
      } while (otherRank === rank);

      const symbol = cardRanking.getCardSymbol(suit, otherRank, coloured);
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


