import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { Layout } from '@/ui/layout/Layout';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '@/AssetCreation';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import type { CardGameLayoutDocument, LayoutPreset } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { cloneCardGameLayoutDocument, createDefaultCardGameLayoutDocument } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';

const DEFAULT_DOCUMENT = createDefaultCardGameLayoutDocument();

@serializableClass({
  schemaVersion: 2,
  assetType: 'CardGameLayout',
  displayName: 'Card Game Layout',
  icon: '🎏',
  category: AssetTypeCategory.UI,
})
export class CardGameLayout extends Layout {
  static override schemaVersion = 2;
  static override readonly requiresInspector = false;

  static override createTemplate(): Record<string, unknown> {
    return cloneCardGameLayoutDocument(DEFAULT_DOCUMENT) as unknown as Record<string, unknown>;
  }

  @serializable({ label: 'Default Player Count' })
  defaultPlayerCount: number = DEFAULT_DOCUMENT.defaultPlayerCount;

  @serializable({ label: 'Layout Presets' })
  presets: Record<string, LayoutPreset> = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).presets;

  @serializable({ label: 'Player UI Defaults' })
  playerUiDefaults: CardGameLayoutDocument['playerUiDefaults'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).playerUiDefaults;

  @serializable({ label: 'HUD' })
  hud: CardGameLayoutDocument['hud'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).hud;

  @serializable({ label: 'Scoreboard' })
  scoreboard: CardGameLayoutDocument['scoreboard'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).scoreboard;

  @serializable({ label: 'Card Strip' })
  cardStrip: CardGameLayoutDocument['cardStrip'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).cardStrip;

  @serializable({ label: 'Deck Tray' })
  deckTray: CardGameLayoutDocument['deckTray'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).deckTray;

  @serializable({ label: 'Card Fan' })
  cardFan: CardGameLayoutDocument['cardFan'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).cardFan;

  @serializable({ label: 'Card Visuals' })
  cardVisuals: CardGameLayoutDocument['cardVisuals'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).cardVisuals;

  @serializable({ label: 'Card Frame' })
  cardFrame: CardGameLayoutDocument['cardFrame'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).cardFrame;

  @serializable({ label: 'Render Toggles' })
  renderToggles: CardGameLayoutDocument['renderToggles'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).renderToggles;

  @serializable({ label: 'Table Presentation' })
  tablePresentation: CardGameLayoutDocument['tablePresentation'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).tablePresentation;

  @serializable({ label: 'Table Attachments' })
  tableAttachments: CardGameLayoutDocument['tableAttachments'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).tableAttachments;

  @serializable({ label: 'Views' })
  views: Record<string, LayoutPreset> = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).views;

  @serializable({ label: 'Stage Layout' })
  stageLayout: CardGameLayoutDocument['stageLayout'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).stageLayout;

  @serializable({ label: 'Zones' })
  zones: CardGameLayoutDocument['zones'] = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).zones;

  @serializable({ label: 'Gameplay' })
  gameplay: Record<string, unknown> = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).gameplay;

  @serializable({ label: 'Extensions' })
  extensions: Record<string, unknown> = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT).extensions;

  static async create(context: AssetCreationContext): Promise<CreatedAsset> {
    const deferred = new OperationDeferred<string>();
    const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
    let guid: AssetGUIDType;
    if (!publishResult.isSuccess) {
      guid = createAssetGuid();
      const log = MainAppLogger.instance;
      log.logWarn('[CardGameLayout] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
        assetType: 'CardGameLayout',
        gameId: context.gameId,
        fallbackGuid: guid,
      });
    } else {
      const result = await deferred.promise;
      const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
      guid = (isAssetGUID(guidString) ? guidString : guidString) as AssetGUIDType;
      if (!result.isSuccess || !result.value) {
        const log = MainAppLogger.instance;
        log.logWarn('[CardGameLayout] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
          assetType: 'CardGameLayout',
          gameId: context.gameId,
          fallbackGuid: guid,
        });
      }
    }
    const assetId = `${context.gameId}-layout`;
    const data = cloneCardGameLayoutDocument(DEFAULT_DOCUMENT) as unknown as Record<string, unknown>;

    return {
      assetId,
      fileName: `${context.gameId}Layout.asset`,
      guid,
      data,
    };
  }
}
