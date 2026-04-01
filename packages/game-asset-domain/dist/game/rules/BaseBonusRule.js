var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import 'reflect-metadata';
import { serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { BaseRule } from '../../game/rules/BaseRule.js';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { ContentBlockType } from '../../constants/content-block-type.js';
let BaseBonusRule = class BaseBonusRule extends BaseRule {
    static requiresInspector = true;
    gameMode;
    /**
     * DEFAULT implementation - subclasses can override for custom content.
     * Generates basic pattern description with bonus value and example.
     */
    synthesizeUIContent(ctx) {
        const blocks = [];
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
                const handSize = (typeof ctx.handSize === 'number' ? ctx.handSize : null) ?? this.minNumberOfCard ?? 3;
                const example = this.createExampleHand(handSize, ctx.cardRanking, ctx.trumpCard, true);
                if (example.length > 0) {
                    blocks.push({
                        type: ContentBlockType.Example,
                        title: 'Example',
                        text: example.join(', ')
                    });
                }
            }
            catch {
                // Skip example if generation fails
            }
        }
        return blocks;
    }
};
BaseBonusRule = __decorate([
    serializableClass({
        assetType: 'BaseBonusRule',
        displayName: 'Base Bonus Rule',
        icon: '⭐',
        category: AssetTypeCategory.Game,
    })
], BaseBonusRule);
export { BaseBonusRule };
