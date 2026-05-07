import React, { Suspense, useState, useEffect } from 'react';
import type { PreviewPanelProps } from '@/lib/core/inspector/types';
import { AssetSummaryPreview } from './AssetSummaryPreview';
import { ImagePreview } from './ImagePreview';
import { PreviewPanelHeader } from './PreviewPanelHeader';
import { usePreviewPanel } from './usePreviewPanel';
import { ASSET_TYPE } from './constants';
import type { ImageListEntry } from '@ocentra/game-asset-domain/content/imageList/ImageList';
import type { PageSection } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import type { Card } from '@ocentra/game-asset-domain/card/cardBase/Card';
import type { CardRanking } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import type { MetaData } from '@ocentra/eventing-domain/types/meta';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetSelectedGamePageInfosEvent } from '@ocentra/eventing-domain/events/game/GetSelectedGamePageInfosEvent';
import type { ViewMode } from './types';
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { assetTypeMap } from '@/lib/core/registry/assetTypeMap.generated';
import './PreviewPanel.css';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const GAME_INFO_TIMEOUT_MS = 6000;
const PREVIEW_ASSET_TYPE = {
  assetCatalog: 'AssetCatalog',
  pageLayout: 'PageLayout',
  gameRegistry: 'GameRegistry',
  deckManager: 'DeckManager',
  deck: assetTypeMap.Deck.assetType,
  playingCardDeck: assetTypeMap.PlayingCardDeck.assetType,
  dominoDeck: assetTypeMap.DominoDeck.assetType,
  hanafudaDeck: assetTypeMap.HanafudaDeck.assetType,
  mahjongDeck: assetTypeMap.MahjongDeck.assetType,
  card: assetTypeMap.Card.assetType,
  cardRanking: assetTypeMap.CardRanking.assetType,
  deckRanking: assetTypeMap.DeckRanking.assetType,
  gameInfo: assetTypeMap.GameInfo.assetType,
  imageList: assetTypeMap.ImageList.assetType,
  imageCarousel: assetTypeMap.ImageCarousel.assetType,
  cardGameLayout: assetTypeMap.CardGameLayout.assetType,
  cardGameMechanics: assetTypeMap.CardGameMechanics.assetType,
} as const;

const DECK_PREVIEW_ASSET_TYPES = new Set<string>([
  PREVIEW_ASSET_TYPE.deck,
  PREVIEW_ASSET_TYPE.playingCardDeck,
  PREVIEW_ASSET_TYPE.dominoDeck,
  PREVIEW_ASSET_TYPE.hanafudaDeck,
  PREVIEW_ASSET_TYPE.mahjongDeck,
]);

const CARD_RANKING_PREVIEW_ASSET_TYPES = new Set<string>([
  PREVIEW_ASSET_TYPE.cardRanking,
  PREVIEW_ASSET_TYPE.deckRanking,
]);

const LazyAssetCatalogPreview = React.lazy(async () => ({
  default: (await import('./AssetCatalogPreview')).AssetCatalogPreview,
}));

const LazyGameRegistryPreview = React.lazy(async () => ({
  default: (await import('./GameRegistryPreview')).GameRegistryPreview,
}));

const LazyDeckManagerPreview = React.lazy(async () => ({
  default: (await import('@/lib/assets/deck/DeckManagerPreview')).DeckManagerPreview,
}));

const LazyDeckPreview = React.lazy(async () => ({
  default: (await import('@/lib/assets/card/deck/DeckPreview')).DeckPreview,
}));

const LazyCardPreview = React.lazy(async () => ({
  default: (await import('@/lib/assets/card/cardBase/CardPreview')).CardPreview,
}));

const LazyCardRankingPreview = React.lazy(async () => ({
  default: (await import('@/lib/assets/card/cardRanking/CardRankingPreview'))
    .CardRankingPreview,
}));

const LazyImageListPreview = React.lazy(async () => ({
  default: (await import('./ImageListPreview')).ImageListPreview,
}));

const LazyImageCarouselPreview = React.lazy(async () => ({
  default: (await import('./ImageCarouselPreview')).ImageCarouselPreview,
}));

const LazyCardGameLayoutPreview = React.lazy(async () => ({
  default: (await import('./CardGameLayoutPreview')).CardGameLayoutPreview,
}));

const LazyCardGameMechanicsPreview = React.lazy(async () => ({
  default: (await import('./CardGameMechanicsPreview')).CardGameMechanicsPreview,
}));

const LazyGameInfoTabs = React.lazy(async () => ({
  default: (await import('@/ui/components/GameInfo/GameInfoTabs')).GameInfoTabs,
}));

const PreviewPanelLoading: React.FC<{ message: string }> = ({ message }) => (
  <div className="preview-panel__placeholder">
    <div className="preview-panel__loading">
      <div className="preview-panel__spinner"></div>
    </div>
    <p className="preview-panel__placeholder-subtitle">{message}</p>
  </div>
);

const GameInfoPreview: React.FC<{
  assetData: { system?: { gameId?: string; guid?: string }; data?: Record<string, unknown> };
  assetId: string;
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  navigationHistory: Array<{ path: string; name: string }>;
  onBack?: () => void;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
}> = ({ assetData, assetId, viewMode, setViewMode, navigationHistory, onBack, onNavigateToAsset }) => {
  const [sections, setSections] = useState<PageSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGameInfo() {
      setIsLoading(true);
      setError(null);

      const system = assetData.system as { gameId?: string; guid?: string } | undefined;
      const data = assetData.data as Record<string, unknown> | undefined;
      
      const gameId = system?.gameId || (data?.gameId as string) || system?.guid || null;

      if (!gameId) {
        setError('Cannot determine gameId from GameInfo asset');
        setIsLoading(false);
        return;
      }

      try {
        const getSelectedGamePageInfosDeferred = new OperationDeferred<{ sections?: PageSection[] } | null>();
        await EventBus.instance.publishAsync(new GetSelectedGamePageInfosEvent(gameId, getSelectedGamePageInfosDeferred));
        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`GetSelectedGamePageInfosEvent timed out after ${GAME_INFO_TIMEOUT_MS}ms`)), GAME_INFO_TIMEOUT_MS);
        });
        const result = await Promise.race([getSelectedGamePageInfosDeferred.promise, timeout]);

        if (result.isSuccess && result.value && Array.isArray(result.value.sections) && result.value.sections.length > 0) {
          setSections(result.value.sections as PageSection[]);
        } else {
          const inlineSections = Array.isArray(data?.sections) ? (data?.sections as PageSection[]) : [];
          if (inlineSections.length > 0) {
            setSections(inlineSections);
          } else if (result.isSuccess) {
            // If event succeeded but returned nothing, and no inline sections, show generic error
            setError('No sections available in this GameInfo asset');
          } else {
            setError(result.errorMessage || 'Failed to load game info');
          }
        }
      } catch (err) {
        const inlineSections = Array.isArray(data?.sections) ? (data?.sections as PageSection[]) : [];
        if (inlineSections.length > 0) {
          setSections(inlineSections);
        } else {
          const message = err instanceof Error ? err.message : 'Error loading game info';
          setError(message);
          log.logError('[PreviewPanel] GameInfo load failed', getStackTrace(), { gameId, message, err });
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadGameInfo();
  }, [assetData]);

  if (isLoading) {
    return (
      <div className="preview-panel">
        <PreviewPanelHeader
          assetId={assetId}
          viewMode={viewMode}
          setViewMode={setViewMode}
          navigationHistory={navigationHistory}
          onBack={onBack}
          onNavigateToAsset={onNavigateToAsset}
          isNonAssetFile={false}
        />
        <div className="preview-panel__content preview-panel__content--game-info">
          <PreviewPanelLoading message="Loading game info..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="preview-panel">
        <PreviewPanelHeader
          assetId={assetId}
          viewMode={viewMode}
          setViewMode={setViewMode}
          navigationHistory={navigationHistory}
          onBack={onBack}
          onNavigateToAsset={onNavigateToAsset}
          isNonAssetFile={false}
        />
        <div className="preview-panel__content preview-panel__content--game-info">
          <div className="preview-panel__placeholder">
            <p className="preview-panel__error">Error loading game info</p>
            <p className="preview-panel__placeholder-subtitle preview-panel__error-message">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-panel">
      <PreviewPanelHeader
        assetId={assetId}
        viewMode={viewMode}
        setViewMode={setViewMode}
        navigationHistory={navigationHistory}
        onBack={onBack}
        onNavigateToAsset={onNavigateToAsset}
        isNonAssetFile={false}
      />
      <div className="preview-panel__content preview-panel__content--game-info">
        <Suspense fallback={<PreviewPanelLoading message="Loading game info preview..." />}>
          <LazyGameInfoTabs sections={sections} />
        </Suspense>
      </div>
    </div>
  );
};

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  assetPath,
  assetData,
  assetRawContent,
  assetInstance,
  isLoading = false,
  error = null,
  onNavigateToAsset,
  navigationHistory = [],
  onBack,
  onAssetUpdate,
}) => {
  const {
    viewMode,
    setViewMode,
  } = usePreviewPanel({
    assetPath,
    onNavigateToAsset,
  });


  if (error) {
    return (
      <div className="preview-panel preview-panel--empty">
        <div className="preview-panel__placeholder">
          <p className="preview-panel__error">Error loading asset</p>
          <p className="preview-panel__placeholder-subtitle preview-panel__error-message">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="preview-panel preview-panel--empty">
        <PreviewPanelLoading message="Loading asset..." />
      </div>
    );
  }

  if (!assetPath || !assetData) {
    return (
      <div className="preview-panel preview-panel--empty">
        <div className="preview-panel__placeholder">
          <p>No asset selected</p>
          <p className="preview-panel__placeholder-subtitle">
            Select an asset from the hierarchy to preview it
          </p>
        </div>
      </div>
    );
  }

  const system = assetData.system as { assetType?: string; displayName?: string } | undefined;
  const assetType = system?.assetType || assetData.metadata?.assetType || 'Unknown';
  const assetId = system?.displayName || assetData.metadata?.assetId || 'Unknown';

  const isNonAssetFile = assetType === ASSET_TYPE.TextAsset;

  if (viewMode === 'raw' && assetType !== PREVIEW_ASSET_TYPE.assetCatalog) {
    return (
      <div className="preview-panel">
        <PreviewPanelHeader
          assetId={assetId}
          viewMode={viewMode}
          setViewMode={setViewMode}
          navigationHistory={navigationHistory}
          onBack={onBack}
          onNavigateToAsset={onNavigateToAsset}
          isNonAssetFile={isNonAssetFile}
        />
        <div className="preview-panel__content preview-panel__content--json">
          <pre className="preview-panel__raw-content">
            {assetRawContent || (assetData ? JSON.stringify(assetData, null, 2) : '')}
          </pre>
        </div>
      </div>
    );
  }

  if (!isNonAssetFile) {
    const data = assetData.data as Record<string, unknown> | undefined;

    if (assetType === PREVIEW_ASSET_TYPE.assetCatalog) {
      return (
        <Suspense fallback={<div className="preview-panel"><PreviewPanelLoading message="Loading asset catalog..." /></div>}>
          <LazyAssetCatalogPreview
            key="asset-catalog-preview"
            assetId={assetId}
            assetData={assetData}
            viewMode={viewMode}
            setViewMode={setViewMode}
            navigationHistory={navigationHistory}
            onBack={onBack}
            onNavigateToAsset={onNavigateToAsset}
            mode="catalog"
          />
        </Suspense>
      );
    }

    if (assetType === PREVIEW_ASSET_TYPE.pageLayout) {
      return (
        <Suspense fallback={<div className="preview-panel"><PreviewPanelLoading message="Loading page layout..." /></div>}>
          <LazyAssetCatalogPreview
            key={`page-layout-preview:${assetPath}`}
            assetId={assetId}
            assetData={assetData}
            viewMode={viewMode}
            setViewMode={setViewMode}
            navigationHistory={navigationHistory}
            onBack={onBack}
            onNavigateToAsset={onNavigateToAsset}
            mode="pageLayout"
          />
        </Suspense>
      );
    }

    if (assetType === PREVIEW_ASSET_TYPE.gameRegistry) {
      return (
        <div className="preview-panel">
          <Suspense fallback={<PreviewPanelLoading message="Loading game registry..." />}>
            <LazyGameRegistryPreview assetId={assetId} onNavigateToAsset={onNavigateToAsset} />
          </Suspense>
        </div>
      );
    }

    if (assetType === PREVIEW_ASSET_TYPE.deckManager) {
      return (
        <div className="preview-panel">
          <PreviewPanelHeader
            assetId={assetId}
            viewMode={viewMode}
            setViewMode={setViewMode}
            navigationHistory={navigationHistory}
            onBack={onBack}
            onNavigateToAsset={onNavigateToAsset}
            isNonAssetFile={false}
          />
          <div className="preview-panel__content preview-panel__content--preview">
            <Suspense fallback={<PreviewPanelLoading message="Loading deck manager..." />}>
              <LazyDeckManagerPreview assetId={assetId} onNavigateToAsset={onNavigateToAsset} />
            </Suspense>
          </div>
        </div>
      );
    }

    if (DECK_PREVIEW_ASSET_TYPES.has(assetType)) {
      return (
        <div className="preview-panel">
          <PreviewPanelHeader
            assetId={assetId}
            viewMode={viewMode}
            setViewMode={setViewMode}
            navigationHistory={navigationHistory}
            onBack={onBack}
            onNavigateToAsset={onNavigateToAsset}
            isNonAssetFile={false}
          />
          <Suspense fallback={<PreviewPanelLoading message="Loading deck preview..." />}>
            <LazyDeckPreview
              assetId={assetId}
              assetInstance={assetInstance}
              assetData={assetData}
            />
          </Suspense>
        </div>
      );
    }

    if (assetType === PREVIEW_ASSET_TYPE.card) {
      return (
        <div className="preview-panel">
          <PreviewPanelHeader
            assetId={assetId}
            viewMode={viewMode}
            setViewMode={setViewMode}
            navigationHistory={navigationHistory}
            onBack={onBack}
            onNavigateToAsset={onNavigateToAsset}
            isNonAssetFile={false}
          />
          <Suspense fallback={<PreviewPanelLoading message="Loading card preview..." />}>
            <LazyCardPreview
              assetId={assetId}
              assetInstance={assetInstance as Card | null}
              assetData={assetData}
            />
          </Suspense>
        </div>
      );
    }

    // Generic Image Preview for assets that are images or have image hash but no specific preview
    const hasImageHash = assetData.data && typeof assetData.data === 'object' &&
      ((assetData.data as { imageHash?: string; hash?: string })?.imageHash ||
        (assetData.data as { imageHash?: string; hash?: string })?.hash);

    if (hasImageHash || assetType === 'Image') {
      const data = assetData.data as { imageHash?: string; hash?: string } | undefined;
      const system = assetData.system as { guid?: string } | undefined;
      const imageGuidOrHash = data?.imageHash || data?.hash || system?.guid || null;
      const meta = (assetData as { _meta?: MetaData })._meta;
      return (
        <div className="preview-panel">
          <PreviewPanelHeader
            assetId={assetId}
            viewMode={viewMode}
            setViewMode={setViewMode}
            navigationHistory={navigationHistory}
            onBack={onBack}
            onNavigateToAsset={onNavigateToAsset}
            isNonAssetFile={false}
          />
          <ImagePreview
            imageGuidOrHash={imageGuidOrHash}
            assetId={assetId}
            meta={meta}
          />
        </div>
      );
    }

    if (CARD_RANKING_PREVIEW_ASSET_TYPES.has(assetType)) {
      return (
        <div className="preview-panel">
          <PreviewPanelHeader
            assetId={assetId}
            viewMode={viewMode}
            setViewMode={setViewMode}
            navigationHistory={navigationHistory}
            onBack={onBack}
            onNavigateToAsset={onNavigateToAsset}
            isNonAssetFile={false}
          />
          <Suspense fallback={<PreviewPanelLoading message="Loading card ranking preview..." />}>
            <LazyCardRankingPreview
              assetId={assetId}
              assetInstance={assetInstance as CardRanking | null}
              assetData={assetData}
            />
          </Suspense>
        </div>
      );
    }

    if (assetType === PREVIEW_ASSET_TYPE.gameInfo && data) {
      return (
        <GameInfoPreview
          assetData={assetData}
          assetId={assetId}
          viewMode={viewMode}
          setViewMode={setViewMode}
          navigationHistory={navigationHistory}
          onBack={onBack}
          onNavigateToAsset={onNavigateToAsset}
        />
      );
    }

    if (
      assetType === PREVIEW_ASSET_TYPE.imageList &&
      data?.images &&
      Array.isArray(data.images)
    ) {
      return (
        <div className="preview-panel">
          <PreviewPanelHeader
            assetId={assetId}
            viewMode={viewMode}
            setViewMode={setViewMode}
            navigationHistory={navigationHistory}
            onBack={onBack}
            onNavigateToAsset={onNavigateToAsset}
            isNonAssetFile={false}
          />
          <Suspense fallback={<PreviewPanelLoading message="Loading image list preview..." />}>
            <LazyImageListPreview
              images={data.images as ImageListEntry[]}
              assetId={assetId}
            />
          </Suspense>
        </div>
      );
    }

    if (
      assetType === PREVIEW_ASSET_TYPE.imageCarousel &&
      data?.slides &&
      Array.isArray(data.slides)
    ) {
      return (
        <div className="preview-panel">
          <PreviewPanelHeader
            assetId={assetId}
            viewMode={viewMode}
            setViewMode={setViewMode}
            navigationHistory={navigationHistory}
            onBack={onBack}
            onNavigateToAsset={onNavigateToAsset}
            isNonAssetFile={false}
          />
          <Suspense fallback={<PreviewPanelLoading message="Loading image carousel preview..." />}>
            <LazyImageCarouselPreview
              assetId={assetId}
              assetData={assetData}
              onAssetUpdate={onAssetUpdate}
            />
          </Suspense>
        </div>
      );
    }

    if (assetType === PREVIEW_ASSET_TYPE.cardGameLayout) {
      return (
        <div className="preview-panel">
          <PreviewPanelHeader
            assetId={assetId}
            viewMode={viewMode}
            setViewMode={setViewMode}
            navigationHistory={navigationHistory}
            onBack={onBack}
            onNavigateToAsset={onNavigateToAsset}
            isNonAssetFile={false}
          />
          <div className="preview-panel__content preview-panel__content--preview">
            <Suspense fallback={<PreviewPanelLoading message="Loading layout preview..." />}>
              <LazyCardGameLayoutPreview
                key={`card-game-layout-preview:${assetPath}`}
                assetPath={assetPath}
                assetData={assetData}
                onAssetUpdate={onAssetUpdate}
              />
            </Suspense>
          </div>
        </div>
      );
    }

    if (assetType === PREVIEW_ASSET_TYPE.cardGameMechanics) {
      return (
        <div className="preview-panel">
          <PreviewPanelHeader
            assetId={assetId}
            viewMode={viewMode}
            setViewMode={setViewMode}
            navigationHistory={navigationHistory}
            onBack={onBack}
            onNavigateToAsset={onNavigateToAsset}
            isNonAssetFile={false}
          />
          <div className="preview-panel__content preview-panel__content--preview">
            <Suspense fallback={<PreviewPanelLoading message="Loading mechanics preview..." />}>
              <LazyCardGameMechanicsPreview assetData={assetData} />
            </Suspense>
          </div>
        </div>
      );
    }

    return (
      <div className="preview-panel">
        <PreviewPanelHeader
          assetId={assetId}
          viewMode={viewMode}
          setViewMode={setViewMode}
          navigationHistory={navigationHistory}
          onBack={onBack}
          onNavigateToAsset={onNavigateToAsset}
          isNonAssetFile={false}
        />
        <div className="preview-panel__content preview-panel__content--preview">
          <AssetSummaryPreview
            assetData={assetData}
            assetType={assetType}
            assetInstance={assetInstance}
            onNavigateToAsset={onNavigateToAsset}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="preview-panel">
      <PreviewPanelHeader
        assetId={assetId}
        viewMode={viewMode}
        setViewMode={setViewMode}
        navigationHistory={navigationHistory}
        onBack={onBack}
        onNavigateToAsset={onNavigateToAsset}
        isNonAssetFile={isNonAssetFile}
      />
      <div className="preview-panel__content preview-panel__content--json">
        <pre className="preview-panel__raw-content">
          {assetRawContent || (assetData ? JSON.stringify(assetData, null, 2) : '')}
        </pre>
      </div>
    </div>
  );
};
