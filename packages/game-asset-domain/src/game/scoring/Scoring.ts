import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetReference } from '@ocentra/asset-domain/AssetReference';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { generateAssetGuid } from '@/AssetCreation';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { IContentSynthesisProvider } from '@/game/gameInfo/GameInfo';
import type { ContentBlock } from '@/game/gameInfo/GameInfo';
import { ContentBlockType } from '@/constants/content-block-type';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { CardRanking } from '@/card/cardRanking/CardRanking';

@serializableClass({
  schemaVersion: 1,
  assetType: 'Scoring',
  displayName: 'Scoring',
  icon: '🎯',
  category: AssetTypeCategory.Game,
})
export class Scoring extends ScriptableObject implements IContentSynthesisProvider {

  static override schemaVersion = 1;
  static readonly requiresInspector = true;

  static override createTemplate(): Record<string, unknown> {
    return {};
  }

  @required('Card Ranking Asset is required for scoring to function')
  @serializable({ label: 'Ranking Asset' })
  rankingAsset!: AssetReference | string | null;

  @serializable({ label: 'Card Ranking Asset' })
  cardRankingAsset?: AssetReference | string | null;

  constructor() {
    super();
    this.rankingAsset = null;
    this.cardRankingAsset = null;
  }

  protected override awake(): void {
    super.awake();
    void this.initializeDefaultCardRanking();
  }

  private async initializeDefaultCardRanking(): Promise<void> {
    if (this.rankingAsset || this.cardRankingAsset) {
      return;
    }

    try {
      const defaultCardRanking = await CardRanking.getDefault();
      if (defaultCardRanking) {
        this.rankingAsset = defaultCardRanking.guid.toString();
      }
    } catch (error) {
      MainAppLogger.instance.logError('[Scoring] Failed to load default CardRanking', getStackTrace(), error);
    }
  }

  @serializable({ label: 'Scoring Formula' })
  scoringFormula: string = '';

  @serializable({ label: 'Scoring Rules' })
  scoringRules: Record<string, unknown> | null = null;

  @serializable({ label: 'Description' })
  description: string = '';

  /**
   * Default implementation - generates basic scoring description.
   * CardGameScoring overrides this with detailed multiplier tables.
   */
  synthesizeUIContent(_ctx: SynthesisContext): ContentBlock[] {
    void _ctx;
    return [
      {
        type: ContentBlockType.Heading,
        level: 3,
        text: 'Scoring System'
      },
      {
        type: ContentBlockType.Paragraph,
        text: this.description || 'Standard scoring rules apply.'
      }
    ];
  }

  static async create(context: AssetCreationContext): Promise<CreatedAsset> {
    const guid = await generateAssetGuid('Scoring', context.gameId);
    const assetId = `${context.gameId}-scoring`;
    const data: Record<string, unknown> = {
      scoringRules: {},
    };

    return {
      assetId,
      fileName: `${context.gameId}Scoring.asset`,
      guid,
      data,
    };
  }
}
