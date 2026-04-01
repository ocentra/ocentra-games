import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetReference } from '@ocentra/asset-domain/AssetReference';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '@/AssetCreation';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import type { SynthesisContext } from '@ocentra/eventing-domain/types/app-stubs';
import type { IContentSynthesisProvider } from '@/game/gameInfo/GameInfo';
import type { ContentBlock } from '@/game/gameInfo/GameInfo';
import { ContentBlockType } from '@/constants/content-block-type';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
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
  @serializable({ label: 'Card Ranking Asset' })
  cardRankingAsset!: AssetReference | string | null;

  constructor() {
    super();
    this.cardRankingAsset = null;
  }

  protected override awake(): void {
    super.awake();
    void this.initializeDefaultCardRanking();
  }

  private async initializeDefaultCardRanking(): Promise<void> {
    if (this.cardRankingAsset) {
      return;
    }

    try {
      const defaultCardRanking = await CardRanking.getDefault();
      if (defaultCardRanking) {
        this.cardRankingAsset = defaultCardRanking.guid.toString();
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
    const deferred = new OperationDeferred<string>();
    const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
    let guid: AssetGUIDType;
    if (!publishResult.isSuccess) {
      guid = createAssetGuid();
      const log = MainAppLogger.instance;
      log.logWarn('[Scoring] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
        assetType: 'Scoring',
        gameId: context.gameId,
        fallbackGuid: guid,
      });
    } else {
      const result = await deferred.promise;
      const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
      guid = (isAssetGUID(guidString) ? guidString : guidString) as AssetGUIDType;
      if (!result.isSuccess || !result.value) {
        const log = MainAppLogger.instance;
        log.logWarn('[Scoring] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
          assetType: 'Scoring',
          gameId: context.gameId,
          fallbackGuid: guid,
        });
      }
    }
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

