import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { Scoring } from '@/game/scoring/Scoring';
import { CardRanking } from '@/card/cardRanking/CardRanking';
import { DeckRanking } from '@/deck/DeckRanking';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { ContentBlock } from '@/game/gameInfo/GameInfo';
import { ContentBlockType } from '@/constants/content-block-type';
import { ListStyleType } from '@/constants/list-style-type';
import type { ScoringDirection } from '@ocentra/game-domain/game/scoring';
import { generateAssetGuid } from '@/AssetCreation';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';

export const ScoringType = {
  PokerRanking: 'poker_ranking',
  HoardersMultiplier: 'hoarders_multiplier',
  Custom: 'custom'
} as const;

export type ScoringType = typeof ScoringType[keyof typeof ScoringType];

@serializableClass({
  assetType: 'CardGameScoring',
  displayName: 'Card Game Scoring',
  icon: '🎯',
  category: AssetTypeCategory.Game,
})
export class CardGameScoring extends Scoring {
  static override assetType = 'CardGameScoring';
  static override displayName = 'Card Game Scoring';
  static override icon = '🎯';
  static override readonly requiresInspector = true;

  @serializable({ label: 'Scoring Type' })
  scoringType: ScoringType = ScoringType.PokerRanking;

  @serializable({ label: 'Pattern Multipliers' })
  patternMultipliers: Record<string, number> | null = null;

  @serializable({ label: 'Priority Order' })
  priorityOrder: string[] = [];

  @serializable({ label: 'Win Condition', group: 'Scoring Section' })
  winCondition: string = '';

  @serializable({ label: 'Card Values', group: 'Scoring Section' })
  cardValues: Record<string, number> = {};

  @serializable({ label: 'Penalties', group: 'Scoring Section' })
  penalties: string = '';

  @serializable({ label: 'Target Score', group: 'Scoring Section' })
  targetScore: number | null = null;

  @serializable({ label: 'Scoring Direction', group: 'Scoring Section' })
  scoringDirection: ScoringDirection = null;

  override synthesizeUIContent(_ctx: SynthesisContext): ContentBlock[] {
    void _ctx;
    const blocks: ContentBlock[] = [];

    blocks.push({
      type: ContentBlockType.Heading,
      level: 3,
      text: 'Scoring System'
    });

    // Scoring type explanation
    const scoringDescriptions: Record<string, string> = {
      [ScoringType.HoardersMultiplier]: "Hoarder's Multiplier: (Sum of card values) × (Number of cards)",
      [ScoringType.PokerRanking]: 'Poker Ranking: Standard poker hand rankings apply',
      [ScoringType.Custom]: 'Custom scoring rules apply'
    };

    const desc = this.description || scoringDescriptions[this.scoringType] || 'Standard scoring applies.';
    blocks.push({ type: ContentBlockType.Paragraph, text: desc });

    if (this.winCondition) {
      blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Win Condition' });
      blocks.push({ type: ContentBlockType.Paragraph, text: this.winCondition });
    }

    if (this.cardValues && Object.keys(this.cardValues).length > 0) {
      blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Card Values' });
      const items = Object.entries(this.cardValues).map(([card, value]) => ({ text: `${card}: ${value}` }));
      blocks.push({ type: ContentBlockType.List, style: ListStyleType.Unordered, items });
    }

    if (this.penalties) {
      blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Penalties' });
      blocks.push({ type: ContentBlockType.Paragraph, text: this.penalties });
    }

    // Pattern multipliers table
    if (this.patternMultipliers && Object.keys(this.patternMultipliers).length > 0) {
      blocks.push({
        type: ContentBlockType.Heading,
        level: 4,
        text: 'Pattern Multipliers'
      });

      const items = Object.entries(this.patternMultipliers)
        .sort(([, a], [, b]) => b - a)  // Sort by multiplier descending
        .map(([pattern, multiplier]) => ({
          text: `${pattern}: ${multiplier}×`
        }));

      blocks.push({
        type: ContentBlockType.List,
        style: ListStyleType.Unordered,
        items
      });
    }

    return blocks;
  }

  async getCardRanking(): Promise<CardRanking | null> {
    const rankingAsset = this.rankingAsset ?? this.cardRankingAsset;
    if (!rankingAsset) return null;

    let guid: string;
    if (typeof rankingAsset === 'string') {
      guid = rankingAsset;
    } else if (rankingAsset.assetRef) {
      guid = rankingAsset.guid;
    } else {
      return null;
    }

    const assetGUID = AssetGUID.from(guid);
    return await ScriptableObject.loadByGuid(DeckRanking, assetGUID);
  }

  getMultiplier(patternType: string): number {
    return this.patternMultipliers?.[patternType] ?? 0;
  }

  getHighestPriorityPattern(patterns: string[]): string | null {
    if (!this.priorityOrder) return null;

    for (const priority of this.priorityOrder) {
      if (patterns.includes(priority)) return priority;
    }

    return patterns[0] ?? null;
  }

  static async create(context: AssetCreationContext): Promise<CreatedAsset> {
    const guid = await generateAssetGuid('CardGameScoring', context.gameId);

    return {
      assetId: `${context.gameId}-scoring`,
      fileName: `${context.gameId}Scoring.asset`,
      guid,
      data: {
        scoringRules: {},
        scoringType: ScoringType.Custom,
        patternMultipliers: null,
        priorityOrder: [],
        winCondition: '',
        cardValues: {},
        penalties: '',
        targetScore: null,
        scoringDirection: null,
      },
    };
  }
}
