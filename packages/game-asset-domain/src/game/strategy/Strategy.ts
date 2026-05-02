import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { generateAssetGuid } from '@/AssetCreation';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { IContentSynthesisProvider } from '@/game/gameInfo/GameInfo';
import type { ContentBlock } from '@/game/gameInfo/GameInfo';
import { ContentBlockType } from '@/constants/content-block-type';

export interface StrategyTip {
  title: string;
  icon?: string;
  description: string;
  example?: string;
}

@serializableClass({
  assetType: 'Strategy',
  displayName: 'Strategy',
  icon: '💡',
  category: AssetTypeCategory.Game,
})
export class Strategy extends ScriptableObject implements IContentSynthesisProvider {

  static readonly requiresInspector = true;

  static override createTemplate(): Record<string, unknown> {
    return {
      aggressiveness: 0.5,
      riskTolerance: 0.5,
      bluffFrequency: 0.2,
      bluffSettings: {},
      basic: '',
      intermediate: '',
      advanced: '',
    };
  }

  @serializable({ label: 'LLM Strategy Tips' })
  LLM: string = '';

  @serializable({ label: 'Player Strategy Tips' })
  Player: string = '';

  @serializable({ label: 'Basic', group: 'Strategy Section' })
  basic: string = '';

  @serializable({ label: 'Intermediate', group: 'Strategy Section' })
  intermediate: string = '';

  @serializable({ label: 'Advanced', group: 'Strategy Section' })
  advanced: string = '';

  @serializable({ label: 'Tips', elementType: Object })
  tips: StrategyTip[] = [];

  @serializable({ label: 'Aggressiveness' })
  aggressiveness: number = 0.5;

  @serializable({ label: 'Risk Tolerance' })
  riskTolerance: number = 0.5;

  @serializable({ label: 'Bluff Frequency' })
  bluffFrequency: number = 0.2;

  @serializable({ label: 'Bluff Settings' })
  bluffSettings: Record<string, string> = {};

  synthesizeUIContent(_ctx: SynthesisContext): ContentBlock[] {
    void _ctx;
    const blocks: ContentBlock[] = [];

    blocks.push({ type: ContentBlockType.Heading, level: 3, text: 'Strategy Guide' });

    if (this.basic) {
      blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Basic' });
      const paragraphs = this.basic.split('\n\n').filter((p: string) => p.trim());
      for (const paragraph of paragraphs) {
        blocks.push({ type: ContentBlockType.Paragraph, text: paragraph.trim() });
      }
    }
    if (this.intermediate) {
      blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Intermediate' });
      const paragraphs = this.intermediate.split('\n\n').filter((p: string) => p.trim());
      for (const paragraph of paragraphs) {
        blocks.push({ type: ContentBlockType.Paragraph, text: paragraph.trim() });
      }
    }
    if (this.advanced) {
      blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Advanced' });
      const paragraphs = this.advanced.split('\n\n').filter((p: string) => p.trim());
      for (const paragraph of paragraphs) {
        blocks.push({ type: ContentBlockType.Paragraph, text: paragraph.trim() });
      }
    }

    if (this.Player && !this.basic && !this.intermediate && !this.advanced) {
      const paragraphs = this.Player.split('\n\n').filter((p: string) => p.trim());
      for (const paragraph of paragraphs) {
        blocks.push({ type: ContentBlockType.Paragraph, text: paragraph.trim() });
      }
    }

    // Strategy tips as blocks
    for (const tip of this.tips) {
      blocks.push({
        type: ContentBlockType.StrategyBlock,
        title: tip.title,
        icon: tip.icon,
        description: tip.description,
        example: tip.example ? {
          type: ContentBlockType.Example,
          text: tip.example
        } : undefined
      });
    }

    return blocks;
  }

  static async create(context: AssetCreationContext): Promise<CreatedAsset> {
    const guid = await generateAssetGuid('Strategy', context.gameId);
    const assetId = `${context.gameId}-strategy`;
    const data: Record<string, unknown> = {
      LLM: `Strategy tips for ${context.displayName}.`,
      Player: `Strategy tips for ${context.displayName}.`,
      aggressiveness: 0.5,
      riskTolerance: 0.5,
      bluffFrequency: 0.3,
      bluffSettings: {
        profile: 'balanced',
      },
    };

    return {
      assetId,
      fileName: `${context.gameId}Strategy.asset`,
      guid,
      data,
    };
  }
}

