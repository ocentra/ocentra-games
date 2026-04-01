import 'reflect-metadata';
import { serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { BaseRule } from '@/game/rules/BaseRule';
import { BonusDetail } from '@/game/rules/BonusDetail';
import type { Card } from '@ocentra/game-domain/types/game';
import type { CardRanking } from '@/card/cardRanking/CardRanking';
import { CardGameMode } from '@/gameMode/cardGameMode/CardGameMode';
import type { GameMode } from '@/gameMode/core/GameMode';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { IContentSynthesisProvider } from '@/game/gameInfo/GameInfo';
import type { ContentBlock } from '@/game/gameInfo/GameInfo';
import { ContentBlockType } from '@/constants/content-block-type';

@serializableClass({
  assetType: 'BaseBonusRule',
  displayName: 'Base Bonus Rule',
  icon: '⭐',
  category: AssetTypeCategory.Game,
})
export abstract class BaseBonusRule extends BaseRule implements IContentSynthesisProvider {
  static readonly requiresInspector = true;

  abstract minNumberOfCard: number;

  abstract bonusValue: number;

  abstract patternType: string;

  protected gameMode?: CardGameMode;

  abstract override initialize(gameMode: GameMode): Promise<boolean>;

  abstract evaluate(hand: Card[], trumpCard?: Card): Promise<BonusDetail | null>;

  abstract createExampleHand(
    handSize: number,
    cardRanking: CardRanking,
    trumpCard?: Card,
    coloured?: boolean
  ): string[];

  /**
   * DEFAULT implementation - subclasses can override for custom content.
   * Generates basic pattern description with bonus value and example.
   */
  synthesizeUIContent(ctx: SynthesisContext): ContentBlock[] {
    const blocks: ContentBlock[] = [];

    // Heading with pattern name
    blocks.push({
      type: ContentBlockType.Heading,
      level: 4,
      text: this.ruleName || this.patternType || 'Bonus Pattern'
    });

    // Description
    if (this.description) {
      blocks.push({
        type: ContentBlockType.Paragraph,
        text: this.description
      });
    }

    // Bonus value highlight
    blocks.push({
      type: ContentBlockType.Highlight,
      text: `Base Bonus: ${this.bonusValue} points`,
      emphasis: true
    });

    // Minimum cards info
    if (this.minNumberOfCard > 0) {
      blocks.push({
        type: ContentBlockType.Paragraph,
        text: `Requires at least ${this.minNumberOfCard} cards.`
      });
    }

    // Generate example if card ranking available
    if (ctx.cardRanking) {
      try {
        const handSize: number = (typeof ctx.handSize === 'number' ? ctx.handSize : null) ?? this.minNumberOfCard ?? 3;
        const example = this.createExampleHand(handSize, ctx.cardRanking as CardRanking, ctx.trumpCard as Card | undefined, true);
        if (example.length > 0) {
          blocks.push({
            type: ContentBlockType.Example,
            title: 'Example',
            text: example.join(', ')
          });
        }
      } catch {
        // Skip example if generation fails
      }
    }

    return blocks;
  }
}

