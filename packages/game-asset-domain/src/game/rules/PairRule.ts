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
  assetType: 'PairRule',
  displayName: 'Pair Rule',
  icon: '👥',
  category: AssetTypeCategory.Game,
})
export class PairRule extends BaseBonusRule {
  @serializable({ label: 'Minimum Cards Required' })
  override minNumberOfCard: number = 3;

  @serializable({ label: 'Default Bonus Value' })
  override bonusValue: number = 100;

  @serializable({ label: 'Pattern Type' })
  override patternType: string = 'pair';

  @serializable({ label: 'Rule Name' })
  override ruleName: string = 'PairRule';

  @serializable({ label: 'Priority' })
  override priority: number = 87;

  async initialize(gameMode: GameMode): Promise<boolean> {
    if (!(gameMode instanceof CardGameMode)) {
      return false;
    }
    this.gameMode = gameMode;
    this.description = 'Exactly one pair of cards with the same rank (2 to A), valid only for hands of 3 to 9 cards, when no trump card is present, no other pairs or higher combinations exist, and the hand is not a potential sequence.';

    const cardRanking = await gameMode.getCardRanking();
    if (!cardRanking) return false;

    const playerExamples: string[] = [];
    const llmExamples: string[] = [];

    const handSize = gameMode.initialNumberOfCards || 3;
    const exampleHand = this.createExampleHand(handSize, cardRanking, undefined, false);

    if (exampleHand.length > 0) {
      const exampleString = exampleHand.join(', ');
      const llmExample = `${this.ruleName}: ${exampleString} - Bonus: ${this.bonusValue}`;
      const playerExample = `${this.description}\n${this.ruleName} Bonus: ${this.bonusValue}\nExample: ${exampleString}`;

      llmExamples.push(llmExample);
      playerExamples.push(playerExample);
    }

    this.examples = {
      LLM: llmExamples.join('\n'),
      Player: playerExamples.join('\n\n'),
    } as GameRulesContainer;

    return true;
  }

  async evaluate(hand: Card[], trumpCard?: Card): Promise<BonusDetail | null> {
    if (hand.length < this.minNumberOfCard) {
      return null;
    }

    if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
      return null;
    }

    const pairRanks = HandUtility.findPairs(hand, trumpCard, this.gameMode?.useTrump);

    if (pairRanks.length !== 1) {
      return null;
    }

    if (HandUtility.isSequence(hand)) {
      return null;
    }

    const pairRank = pairRanks[0];
    const baseBonus = this.bonusValue * pairRank * 2;
    const calculation = `${this.bonusValue} * (${pairRank} * 2)`;

    let additionalBonus = 0;
    const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
    if (!cardRanking) {
      return null;
    }
    const rankName = cardRanking.getRankName(pairRank);
    const descriptions: string[] = [`Pair of ${rankName}s`];

    if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
      const trumpBonus = this.gameMode.trumpBonusValues?.pairBonus ?? 0;
      additionalBonus += trumpBonus;
      descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
    }

    const matchedCards = hand.filter(c => c.value === pairRank);

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
    if (handSize < 3 || handSize > 9) {
      return [];
    }

    const hand: string[] = [];
    const availableSuits = cardRanking.getAllSuits();
    const usedCombinations = new Set<string>();

    const pairRank = cardRanking.getRandomRank();

    for (let i = 0; i < 2; i++) {
      const suit = availableSuits[i % availableSuits.length];
      const symbol = cardRanking.getCardSymbol(suit, pairRank, coloured);
      hand.push(symbol);
      usedCombinations.add(`${suit}_${pairRank}`);
    }

    while (hand.length < handSize) {
      const suit = cardRanking.getRandomSuit();
      let rank: number;
      let attempts = 0;

      do {
        rank = cardRanking.getRandomRank();
        attempts++;
        if (attempts > 100) break;
      } while (usedCombinations.has(`${suit}_${rank}`) || rank === pairRank);

      if (attempts > 100) break;

      const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
      hand.push(symbol);
      usedCombinations.add(`${suit}_${rank}`);
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


