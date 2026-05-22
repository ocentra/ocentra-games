import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import JSON5 from 'json5';
import { MemoryRouter } from 'react-router-dom';
import { PreviewPanel } from '@/pages/PreviewPanel/PreviewPanel';
import { InspectorPanel } from '@/pages/InspectorPanel/InspectorPanel';
import { loadAssetFromNetwork } from '@/pages/MainPage/loadAssetFromNetwork';
import {
  ASSET_SELECTION_CHANNEL,
  CARD_GAME_LAYOUT_DRAFT_CHANNEL,
  createPanelWindow,
} from '@/utils/createPanelWindow';
import type { AssetData } from '@/types/assets';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import {
  buildLoadedLayoutAssetFromRaw,
  loadLayoutPlayerRange,
  type LayoutPlayerRange,
  saveLayoutAsset,
  type LayoutAssetDocument,
} from '@/adapters/layout/LayoutAssetService';
import { syncSavedLayoutAssetToR2 } from '@/utils/layoutEditorSync';
import {
  readStoredLayoutEditorOverlayPreferences,
  readStoredLayoutEditorPlayerCount,
  writeStoredLayoutEditorOverlayPreferences,
  writeStoredLayoutEditorPlayerCount,
} from '@/utils/layoutEditorPreferences';
import { CardGameDesignStudio } from '@ocentra/card-game-ui/CardGameDesignStudio';
import { CardGameTemplatePage, type CardGameTemplatePageProps } from '@ocentra/card-game-ui/CardGameTemplatePage';
import { HudButtonEditorModal } from '@ocentra/card-game-ui/HudButtonEditorModal';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { useResolveImageUrl } from '@/hooks/useResolveImageUrl';
import { uploadEditorImageFile } from '@/utils/uploadEditorImageFile';
import { LayoutClasses } from '@ocentra/core-ui/constants/layout';
import type {
  CardGameEditorOverlayVisibility,
  CardGameLayerVisibility,
  CardGameLayoutDocument,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import {
  cloneCardGameLayoutDocument,
  createLayoutPreset,
  seedLayoutPresetFromSource,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import type { CardGameLayoutDraftMessage } from '@ocentra/game-layout-domain/draftChannel';
import {
  ISOLATION_REQUEST_CHANNEL,
  type IsolationRequestMessage,
} from '@ocentra/game-layout-domain/draftChannel';
import { createDraftSessionId } from '@ocentra/game-layout-domain/draftSession';
import { isolationStore } from '@/services/IsolationStore';
import { useLocalPilotRuntimePreview } from '@/pages/StandalonePanelPage.localPilot';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isInspectableAssetSelection } from '@/utils/isInspectableAssetSelection';
import {
  StandaloneEditorCanvas,
  type ResolutionOption,
} from '@/pages/StandaloneCanvas/StandaloneEditorCanvas';
import { FeaturedGameShowcaseControls } from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameShowcaseControls';
import {
  DEFAULT_FEATURED_SHOWCASE_CONTROLS,
  serializeFeaturedShowcaseControls,
  type FeaturedGameShowcasePreviewLayoutMode,
  type FeaturedShowcaseControls,
} from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameShowcase.types';
import { HomeShowcaseFrameControlsPanel } from '@ocentra/core-ui/Common/HomeShowcaseFrame/HomeShowcaseFrameControls';
import { DEFAULT_SELECTED_GAME_SHOWCASE_CONFIG } from '@ocentra/core-ui/Common/SelectedGameShowcase/SelectedGameShowcase.config';
import {
  DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS,
  type GamesCatalogSvgLayoutControls,
} from '@ocentra/core-ui/GamesExplorer/GamesCatalogSvgShowcaseControls';
import {
  DEFAULT_APP_PAGE_SVG_CONTROLS,
  normalizeAppPageSvgControls,
  type AppPageSvgControls,
} from '@ocentra/core-ui/AppPages/AppPageSvgSurfaceControls';
import { LobbyPageSvgControlsPanel } from '@ocentra/core-ui/AppPages/Lobby/LobbyPageSvgControlsPanel';
import {
  DEFAULT_LOBBY_PAGE_SVG_CONTROLS,
  normalizeLobbyPageSvgControls,
  type LobbyPageSvgControls,
} from '@ocentra/core-ui/AppPages/Lobby/LobbyPageSvgSurfaceControls';
import { LeaderboardPageSvgControlsPanel } from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgControlsPanel';
import {
  DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS,
  normalizeLeaderboardPageSvgControls,
  type LeaderboardPageSvgControls,
} from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgSurfaceControls';
import { ShopPageSvgControlsPanel } from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgControlsPanel';
import { ShopPageContentControlsPanel } from '@ocentra/core-ui/AppPages/Shop/ShopPageContentControlsPanel';
import {
  DEFAULT_SHOP_PAGE_CONTENT,
  normalizeShopPageContent,
  type ShopPageContentData,
} from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgContent';
import {
  DEFAULT_SHOP_PAGE_SVG_CONTROLS,
  normalizeShopPageSvgControls,
  type ShopPageSvgControls,
} from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgSurfaceControls';
import { AuthPageSvgControlsPanel } from '@ocentra/core-ui/Auth/AuthPageSvgControlsPanel';
import {
  DEFAULT_AUTH_PAGE_SVG_CONTROLS,
  normalizeAuthPageSvgControls,
  type AuthPageSvgControls,
} from '@ocentra/core-ui/Auth/CyberAuthSurface';
import { BrandedLoadingSpinner } from '@ocentra/core-ui/Loading/BrandedLoadingSpinner';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import type {
  SerializedUnifiedHeaderConfig,
  UnifiedHeaderConfig,
  UnifiedHeaderConfigInput,
} from '@ocentra/core-ui/Header/UnifiedHeader.config';
import { parseSerializedUnifiedHeaderConfig } from '@ocentra/core-ui/Header/UnifiedHeader.config';
import {
  DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS,
  serializeHomeShowcaseFrameControls,
  type HomeShowcaseFrameControls,
  type HomeShowcasePreviewLayoutMode,
} from '@ocentra/core-ui/Common/HomeShowcaseFrame/HomeShowcaseFrame.types';
import type { HomepageLayoutControlsData } from '@ocentra/game-asset-domain/schemas/home-page-games-schema';
import {
  DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS,
  DEFAULT_SELECTED_GAME_CONTENT_PLAN,
  DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS,
  type SelectedGameContentPlan,
  type SelectedGameLayoutControls,
  type SelectedGameTabId,
} from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation';
import {
  FEATURED_SHOWCASE_CONTROLS_CHANNEL,
  type FeaturedShowcaseControlsMessage,
} from '@/utils/featuredShowcaseControlsChannel';
import { COMING_SOON_SHOWCASE_CONTROLS_CHANNEL } from '@/utils/comingSoonShowcaseControlsChannel';
import {
  loadComingSoonShowcaseControlsFromDisk,
  loadFeaturedShowcaseControlsFromDisk,
  saveComingSoonShowcaseControlsToDisk,
  saveFeaturedShowcaseControlsToDisk,
} from '@/utils/featuredShowcaseControlsPersistence';
import {
  HOME_SHOWCASE_FRAME_CONTROLS_CHANNEL,
  type HomeShowcaseFrameControlsMessage,
} from '@/utils/homeShowcaseFrameControlsChannel';
import {
  loadHomeShowcaseFrameControlsFromDisk,
  saveHomeShowcaseFrameControlsToDisk,
} from '@/utils/homeShowcaseFrameControlsPersistence';
import {
  HOMEPAGE_LAYOUT_CONTROLS_CHANNEL,
  type HomepageLayoutControlsMessage,
} from '@/utils/homepageLayoutControlsChannel';
import {
  GAMES_CATALOG_LAYOUT_CONTROLS_CHANNEL,
  type GamesCatalogLayoutControlsMessage,
} from '@/utils/gamesCatalogLayoutControlsChannel';
import {
  HEADER_PROFILE_CONTROLS_CHANNEL,
  type HeaderProfileControlsMessage,
} from '@/utils/headerProfileControlsChannel';
import {
  DEFAULT_HOMEPAGE_LAYOUT_CONTROLS,
  loadHomepageLayoutControlsFromDisk,
  normalizeHomepageLayoutControls,
  saveHomepageLayoutControlsToDisk,
} from '@/utils/homepageLayoutControlsPersistence';
import {
  GAMES_CATALOG_LAYOUT_CONTROLS_RESOURCE_PATH,
  loadGamesCatalogLayoutControlsFromDisk,
  normalizeGamesCatalogLayoutControls,
  saveGamesCatalogLayoutControlsToDisk,
} from '@/utils/gamesCatalogLayoutControlsPersistence';
import {
  LOBBY_PAGE_LAYOUT_CONTROLS_CHANNEL,
  type LobbyPageLayoutControlsMessage,
} from '@/utils/lobbyPageLayoutControlsChannel';
import {
  loadLobbyPageLayoutControlsFromDisk,
  saveLobbyPageLayoutControlsToDisk,
} from '@/utils/lobbyPageLayoutControlsPersistence';
import {
  LEADERBOARD_PAGE_LAYOUT_CONTROLS_CHANNEL,
  type LeaderboardPageLayoutControlsMessage,
} from '@/utils/leaderboardPageLayoutControlsChannel';
import {
  loadLeaderboardPageLayoutControlsFromDisk,
  saveLeaderboardPageLayoutControlsToDisk,
} from '@/utils/leaderboardPageLayoutControlsPersistence';
import {
  SHOP_PAGE_LAYOUT_CONTROLS_CHANNEL,
  type ShopPageLayoutControlsMessage,
} from '@/utils/shopPageLayoutControlsChannel';
import {
  loadShopPageLayoutControlsFromDisk,
  saveShopPageLayoutControlsToDisk,
} from '@/utils/shopPageLayoutControlsPersistence';
import {
  AUTH_PAGE_LAYOUT_CONTROLS_CHANNEL,
  type AuthPageLayoutControlsMessage,
} from '@/utils/authPageLayoutControlsChannel';
import {
  loadAuthPageLayoutControlsFromDisk,
  saveAuthPageLayoutControlsToDisk,
} from '@/utils/authPageLayoutControlsPersistence';
import {
  SELECTED_GAME_LAYOUT_CONTROLS_CHANNEL,
  type SelectedGameLayoutControlsMessage,
  type SelectedGamePreviewLayoutMode,
} from '@/utils/selectedGameLayoutControlsChannel';
import {
  loadSelectedGameLayoutFromDisk,
  normalizeSelectedGameLayoutConfig,
  saveSelectedGameLayoutToDisk,
  type SelectedGameLayoutConfig,
} from '@/utils/selectedGameLayoutPersistence';
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter';
import './StandalonePanelPage.css';
const log = AssetEditorLogger.instance;
log.register(import.meta.url);
const logInfo = (message: string, data?: unknown) => log.logInfo(message, getStackTrace(), data);
const logError = (message: string, error?: unknown) => log.logError(message, getStackTrace(), error);

function inferGameIdFromPageLayoutAssetPath(assetPath: string): string | null {
  const normalized = assetPath.replace(/\\/g, '/');
  const match = normalized.match(/Resources\/GameMode\/[^/]+\/Games\/([^/]+)\//);
  return match?.[1] ? match[1].toLowerCase() : null;
}

function formatGameIdLabel(gameId: string): string {
  return gameId
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

type StandalonePanel =
  | 'preview'
  | 'inspector'
  | 'design-studio'
  | 'preview-canvas'
  | 'isolation'
  | 'featured-showcase-controls'
  | 'homepage-layout-controls'
  | 'lobby-page-layout-controls'
  | 'leaderboard-page-layout-controls'
  | 'shop-page-layout-controls'
  | 'auth-page-layout-controls'
  | 'selected-game-layout-controls'
  | 'games-catalog-layout-controls'
  | 'page-layout-controls';

const StandalonePanelLoading: React.FC<{ label?: string }> = ({ label = 'Loading' }) => (
  <div className="standalone-panel-page__loading" role="status" aria-label={label}>
    <BrandedLoadingSpinner size="medium" />
  </div>
);

function useStandaloneAsset(assetPath: string | null) {
  const [assetData, setAssetData] = useState<AssetData | null>(null);
  const [assetRawContent, setAssetRawContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetPath) {
      return;
    }
    loadAssetFromNetwork(
      assetPath,
      setAssetData,
      () => {},
      setAssetRawContent,
      setError,
      setIsLoading,
    );
  }, [assetPath]);

  return {
    assetData: assetPath ? assetData : null,
    assetRawContent: assetPath ? assetRawContent : null,
    isLoading: assetPath ? isLoading : false,
    error: assetPath ? error : null,
  };
}

const StandalonePreview: React.FC<{ assetPath: string }> = ({ assetPath }) => {
  const { assetData, assetRawContent, isLoading, error } = useStandaloneAsset(assetPath);
  const noop = useCallback(() => {}, []);

  return (
    <PreviewPanel
      assetPath={assetPath}
      assetData={assetData}
      assetRawContent={assetRawContent}
      assetInstance={null}
      isLoading={isLoading}
      error={error}
      onNavigateToAsset={noop}
      navigationHistory={[]}
      onBack={noop}
      onContentChange={async () => {}}
      onAssetUpdate={noop}
    />
  );
};

const StandaloneInspector: React.FC<{ assetPath: string }> = ({ assetPath }) => {
  const { assetData, isLoading, error } = useStandaloneAsset(assetPath);
  const noop = useCallback(() => {}, []);
  const handleAssetUpdate = useCallback((_data: AssetData) => {
    noop();
  }, [noop]);

  if (!assetData && !isLoading && !error) return null;
  if (!isInspectableAssetSelection(assetPath, assetData)) {
    return (
      <div className="standalone-inspector-placeholder">
        No inspector for this asset type.
      </div>
    );
  }

  return (
    <InspectorPanel
      assetPath={assetPath}
      assetData={assetData}
      isLoading={isLoading}
      error={error}
      onAssetUpdate={handleAssetUpdate}
      onNavigateToAsset={noop}
      onCreateAsset={noop}
      onDeleteGameMode={noop}
      syncStatus={null}
    />
  );
};

const StandaloneCardGameDesignStudio: React.FC<{ assetPath: string; assetData: AssetData }> = ({
  assetPath,
  assetData,
}) => {
  const loadedAsset = useMemo(
    () => buildLoadedLayoutAssetFromRaw(assetPath, assetData as Record<string, unknown>),
    [assetData, assetPath],
  );
  const [document, setDocument] = useState<LayoutAssetDocument>(() => loadedAsset.document);
  const [activePlayerCount, setActivePlayerCount] = useState<number>(
    () => readStoredLayoutEditorPlayerCount(assetPath, loadedAsset.document.defaultPlayerCount),
  );
  const [editorLayerVisibility, setEditorLayerVisibility] = useState<CardGameLayerVisibility>(() =>
    readStoredLayoutEditorOverlayPreferences(assetPath).isolationVisibility,
  );
  const [editorOverlayVisibility, setEditorOverlayVisibility] = useState<CardGameEditorOverlayVisibility>(() =>
    readStoredLayoutEditorOverlayPreferences(assetPath).boundsVisibility,
  );
  const [playerRange, setPlayerRange] = useState<LayoutPlayerRange | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const draftSessionIdRef = useRef(createDraftSessionId('editor-standalone-studio'));

  useEffect(() => {
    let cancelled = false;
    const loadRange = async () => {
      try {
        const range = await loadLayoutPlayerRange(loadedAsset.gameId);
        if (!cancelled) {
          setPlayerRange(range);
        }
      } catch {
        if (!cancelled) {
          setPlayerRange(null);
        }
      }
    };

    void loadRange();
    return () => {
      cancelled = true;
    };
  }, [loadedAsset.gameId]);

  useEffect(() => {
    writeStoredLayoutEditorPlayerCount(assetPath, activePlayerCount);
  }, [activePlayerCount, assetPath]);

  useEffect(() => {
    const stored = readStoredLayoutEditorOverlayPreferences(assetPath);
    writeStoredLayoutEditorOverlayPreferences(assetPath, {
      showHandles: stored.showHandles,
      showArenaGuide: stored.showArenaGuide,
      isolationVisibility: editorLayerVisibility,
      boundsVisibility: editorOverlayVisibility,
    });
  }, [assetPath, editorLayerVisibility, editorOverlayVisibility]);

  useEffect(() => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    const handler = (event: MessageEvent<CardGameLayoutDraftMessage>) => {
      if (event.data?.assetPath !== assetPath || !event.data.document) {
        return;
      }
      if (event.data.draftSessionId === draftSessionIdRef.current) {
        return;
      }
      setDocument(event.data.document);
      if (event.data.editorLayerVisibility) {
        setEditorLayerVisibility(event.data.editorLayerVisibility);
      }
      if (event.data.editorOverlayVisibility) {
        setEditorOverlayVisibility(event.data.editorOverlayVisibility);
      }
      if (typeof event.data.playerCount === 'number') {
        setActivePlayerCount(event.data.playerCount);
      }
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, [assetPath]);

  useEffect(() => {
    const channel = new BroadcastChannel(ISOLATION_REQUEST_CHANNEL);
    const handler = (event: MessageEvent<IsolationRequestMessage>) => {
      if (event.data?.assetPath !== assetPath) {
        return;
      }
      const { type, label, config } = event.data;
      isolationStore.isolateComponent(type, label, config, assetPath);
      if (isolationStore.getState().items.length === 1) {
        void createPanelWindow('isolation', assetPath, 'Isolation Hub', true);
      }
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, [assetPath]);

  const broadcast = useCallback((
    nextDocument: LayoutAssetDocument,
    playerCount: number,
    nextEditorLayerVisibility: CardGameLayerVisibility = editorLayerVisibility,
    nextEditorOverlayVisibility: CardGameEditorOverlayVisibility = editorOverlayVisibility,
  ) => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    channel.postMessage({
      assetPath,
      document: nextDocument,
      playerCount,
      editorLayerVisibility: nextEditorLayerVisibility,
      editorOverlayVisibility: nextEditorOverlayVisibility,
      draftSessionId: draftSessionIdRef.current,
      sourceSurface: 'editorIsolation',
      viewerPerspective: {
        mode: 'canonical',
        localSeatId: 0,
      },
    });
    channel.close();
  }, [assetPath, editorLayerVisibility, editorOverlayVisibility]);

  const handleChange = useCallback((nextDocument: LayoutAssetDocument) => {
    setDocument(nextDocument);
    broadcast(nextDocument, activePlayerCount);
  }, [activePlayerCount, broadcast]);

  const handleActivePlayerCountChange = useCallback((count: number) => {
    setActivePlayerCount(count);
    broadcast(document, count);
  }, [broadcast, document]);

  const handleEditorLayerVisibilityChange = useCallback((next: CardGameLayerVisibility) => {
    setEditorLayerVisibility(next);
    broadcast(document, activePlayerCount, next, editorOverlayVisibility);
  }, [activePlayerCount, broadcast, document, editorOverlayVisibility]);

  const handleEditorOverlayVisibilityChange = useCallback((next: CardGameEditorOverlayVisibility) => {
    setEditorOverlayVisibility(next);
    broadcast(document, activePlayerCount, editorLayerVisibility, next);
  }, [activePlayerCount, broadcast, document, editorLayerVisibility]);

  const handleSave = useCallback(async () => {
    logInfo('[StandalonePanelPage] handleSave started');
    setStatus('Saving...');
    try {
      const saved = await saveLayoutAsset(loadedAsset, document);
      logInfo('[StandalonePanelPage] saveLayoutAsset completed', { path: saved.path });
      
      setDocument(saved.document);
      broadcast(saved.document, activePlayerCount);
      
      try {
        logInfo('[handleSave] triggering targeted R2 sync', { path: saved.path });
        const syncResult = await syncSavedLayoutAssetToR2(saved.path);
        setStatus(syncResult.message);
        logInfo('[handleSave] targeted R2 sync complete', { syncResult });
      } catch (syncError) {
        logError('[handleSave] targeted R2 sync failed', { syncError });
        setStatus(`Saved locally; ${syncError instanceof Error ? syncError.message : 'sync failed'}`);
      }
    } catch (error) {
      logError('[StandalonePanelPage] saveLayoutAsset failed', error);
      setStatus(error instanceof Error ? error.message : 'Failed to save layout');
    }
  }, [activePlayerCount, broadcast, document, loadedAsset]);

  const handleOpenPreviewCanvas = useCallback(() => {
    void createPanelWindow('preview-canvas', assetPath, loadedAsset.displayName, true);
  }, [assetPath, loadedAsset.displayName]);

  return (
    <div className="standalone-panel-page standalone-panel-page--card-game">
      <div className="card-game-layout-preview__toolbar" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '0.5rem 1rem' }}>
         <button type="button" className="card-game-layout-preview__button" onClick={handleSave}>
           Save Layout
         </button>
         <button type="button" className="card-game-layout-preview__button" onClick={handleOpenPreviewCanvas}>
           Open Canvas
         </button>
         {status ? <span className="card-game-layout-preview__status" style={{ marginLeft: '1rem', color: 'var(--text-dim)' }}>{status}</span> : null}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <CardGameDesignStudio
          embedded
          document={document}
          onChange={handleChange}
          activePlayerCount={activePlayerCount}
          onActivePlayerCountChange={handleActivePlayerCountChange}
          minPlayerCount={playerRange?.minPlayers}
          maxPlayerCount={playerRange?.maxPlayers}
          editorLayerVisibility={editorLayerVisibility}
          onEditorLayerVisibilityChange={handleEditorLayerVisibilityChange}
          editorOverlayVisibility={editorOverlayVisibility}
          onEditorOverlayVisibilityChange={handleEditorOverlayVisibilityChange}
        />
      </div>
    </div>
  );
};

const StandaloneCardGamePreviewCanvas: React.FC<{
  assetPath: string;
  assetData: AssetData;
  hideTools?: boolean;
  reflectionOnly?: boolean;
}> = ({
  assetPath,
  assetData,
  hideTools,
  reflectionOnly = false,
}) => {
  const headProps = useCoreUIHeaderProps();
  const loadedAsset = useMemo(
    () => buildLoadedLayoutAssetFromRaw(assetPath, assetData as Record<string, unknown>),
    [assetData, assetPath],
  );
  const [document, setDocument] = useState<LayoutAssetDocument>(() => loadedAsset.document);
  const [editorLayerVisibility, setEditorLayerVisibility] = useState<CardGameLayerVisibility>(() =>
    readStoredLayoutEditorOverlayPreferences(assetPath).isolationVisibility,
  );
  const [editorOverlayVisibility, setEditorOverlayVisibility] = useState<CardGameEditorOverlayVisibility>(() =>
    readStoredLayoutEditorOverlayPreferences(assetPath).boundsVisibility,
  );
  const [playerCount, setPlayerCount] = useState<number>(() => {
    const urlCount = new URLSearchParams(window.location.search).get('playerCount');
    const fromUrl = urlCount !== null ? parseInt(urlCount, 10) : NaN;
    const stored = readStoredLayoutEditorPlayerCount(assetPath, loadedAsset.document.defaultPlayerCount);
    return Number.isFinite(fromUrl) ? fromUrl : stored;
  });
  const [playerRange, setPlayerRange] = useState<LayoutPlayerRange | null>(null);
  const [showHandles, setShowHandles] = useState(() =>
    readStoredLayoutEditorOverlayPreferences(assetPath).showHandles,
  );
  const [showArenaGuide, setShowArenaGuide] = useState(() =>
    readStoredLayoutEditorOverlayPreferences(assetPath).showArenaGuide,
  );
  const [resolution, setResolution] = useState('fit');
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [resolutions, setResolutions] = useState<ResolutionOption[]>([]);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [showHudEditor, setShowHudEditor] = useState(false);
  const draftSessionIdRef = useRef(createDraftSessionId('editor-canvas'));

  useEffect(() => {
    fetch('/Resources/devices.json')
      .then((res) => res.json())
      .then((data) => setResolutions(data))
      .catch((err) => {
        logError('Failed to load devices.json', err);
        setResolutions([
          { label: 'Fit Window', value: 'fit' },
          { label: 'Desktop Full HD (1920x1080)', value: '1920x1080' },
          { label: 'Custom...', value: 'custom' },
        ]);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadRange = async () => {
      try {
        const range = await loadLayoutPlayerRange(loadedAsset.gameId);
        if (!cancelled) {
          setPlayerRange(range);
        }
      } catch {
        if (!cancelled) {
          setPlayerRange(null);
        }
      }
    };

    void loadRange();
    return () => {
      cancelled = true;
    };
  }, [loadedAsset.gameId]);

  useEffect(() => {
    writeStoredLayoutEditorPlayerCount(assetPath, playerCount);
  }, [assetPath, playerCount]);

  useEffect(() => {
    writeStoredLayoutEditorOverlayPreferences(assetPath, {
      showHandles,
      showArenaGuide,
      isolationVisibility: editorLayerVisibility,
      boundsVisibility: editorOverlayVisibility,
    });
  }, [assetPath, editorLayerVisibility, editorOverlayVisibility, showArenaGuide, showHandles]);


  useEffect(() => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    const handler = (event: MessageEvent<CardGameLayoutDraftMessage>) => {
      if (event.data?.assetPath !== assetPath || !event.data.document) {
        return;
      }
      if (event.data.draftSessionId === draftSessionIdRef.current) {
        return;
      }
      setDocument(event.data.document);
      if (event.data.editorLayerVisibility) {
        setEditorLayerVisibility(event.data.editorLayerVisibility);
      }
      if (event.data.editorOverlayVisibility) {
        setEditorOverlayVisibility(event.data.editorOverlayVisibility);
      }
      if (typeof event.data.playerCount === 'number') {
        setPlayerCount(event.data.playerCount);
      }
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, [assetPath]);

  const broadcast = useCallback((
    nextDocument: LayoutAssetDocument,
    nextPlayerCount: number,
    nextEditorLayerVisibility: CardGameLayerVisibility = editorLayerVisibility,
    nextEditorOverlayVisibility: CardGameEditorOverlayVisibility = editorOverlayVisibility,
  ) => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    channel.postMessage({
      assetPath,
      document: nextDocument,
      playerCount: nextPlayerCount,
      editorLayerVisibility: nextEditorLayerVisibility,
      editorOverlayVisibility: nextEditorOverlayVisibility,
      draftSessionId: draftSessionIdRef.current,
      sourceSurface: 'editorCanvas',
      viewerPerspective: {
        mode: 'canonical',
        localSeatId: 0,
      },
    } satisfies CardGameLayoutDraftMessage);
    channel.close();
  }, [assetPath, editorLayerVisibility, editorOverlayVisibility]);

  const handleChange = useCallback((nextDocument: LayoutAssetDocument) => {
    setDocument(nextDocument);
    broadcast(nextDocument, playerCount);
  }, [broadcast, playerCount]);

  const handleEditorLayerVisibilityChange = useCallback((next: CardGameLayerVisibility) => {
    setEditorLayerVisibility(next);
    broadcast(document, playerCount, next, editorOverlayVisibility);
  }, [broadcast, document, editorOverlayVisibility, playerCount]);

  const handleEditorOverlayVisibilityChange = useCallback((next: CardGameEditorOverlayVisibility) => {
    setEditorOverlayVisibility(next);
    broadcast(document, playerCount, editorLayerVisibility, next);
  }, [broadcast, document, editorLayerVisibility, playerCount]);

  const updateActivePreset = useCallback((
    updater: (nextDocument: LayoutAssetDocument, preset: LayoutAssetDocument['presets'][string]) => void,
    nextPlayerCount = playerCount,
  ) => {
    setDocument((current) => {
      const next = cloneCardGameLayoutDocument(current);
      const key = String(nextPlayerCount);
      if (!next.presets[key]) {
        next.presets[key] = createLayoutPreset(nextPlayerCount);
      }
      updater(next, next.presets[key]);
      broadcast(next, nextPlayerCount);
      return next;
    });
  }, [broadcast, playerCount]);


  const handleAddCustomDevice = useCallback((name: string, width: number, height: number) => {
    const newOption: ResolutionOption = { label: name, value: `${width}x${height}` };
    setResolutions((current) => {
      const customIdx = current.findIndex(r => r.value === 'custom');
      const next = [...current];
      if (customIdx !== -1) {
        next.splice(customIdx, 0, newOption);
      } else {
        next.push(newOption);
      }
      
      const content = new TextEncoder().encode(JSON.stringify(next, null, 2));
      invoke('write_asset', { path: 'devices.json', content: Array.from(content) })
        .then(() => logInfo('Persisted new device to devices.json'))
        .catch((err) => logError('Failed to persist to devices.json', err));
        
      return next;
    });
    setResolution(`${width}x${height}`);
  }, []);

  const minPlayerCount = playerRange?.minPlayers ?? 2;
  const handlePlayerCountChange = useCallback((nextPlayerCount: number) => {
    setDocument((current) => {
      const next = cloneCardGameLayoutDocument(current);
      const key = String(nextPlayerCount);
      if (!next.presets[key]) {
        const sourceCount = next.presets[String(playerCount)] ? playerCount : Math.max(minPlayerCount, nextPlayerCount - 1);
        next.presets[key] = seedLayoutPresetFromSource(next.presets[String(sourceCount)] ?? null, nextPlayerCount);
      }
      broadcast(next, nextPlayerCount);
      return next;
    });
    setPlayerCount(nextPlayerCount);
  }, [broadcast, minPlayerCount, playerCount]);

  const handleCopyPreset = useCallback((sourceCount: number) => {
    updateActivePreset((next, preset) => {
      const sourcePreset = next.presets[String(sourceCount)] ?? null;
      const seededPreset = seedLayoutPresetFromSource(sourcePreset, playerCount);
      preset.table = { ...seededPreset.table };
      preset.seats = seededPreset.seats.map((seat) => ({
        ...seat,
        position: { ...seat.position },
        playerOverrides: seat.playerOverrides ? { ...seat.playerOverrides } : undefined,
      }));
    });
  }, [playerCount, updateActivePreset]);

  const handleSeatsChange = useCallback((seats: CardGameLayoutDocument['presets'][string]['seats']) => {
    updateActivePreset((_next, preset) => {
      preset.seats = seats.map((seat) => ({
        ...seat,
        position: { ...seat.position },
        playerOverrides: seat.playerOverrides ? { ...seat.playerOverrides } : undefined,
      }));
    });
  }, [updateActivePreset]);

  const handleIsolateRequest = useCallback(
    (type: IsolationRequestMessage['type'], label: string, config: unknown) => {
      isolationStore.isolateComponent(type, label, config, assetPath);
      void createPanelWindow('isolation', assetPath, 'Isolation Hub', true);
    },
    [assetPath],
  );

  const headerProps: NonNullable<CardGameTemplatePageProps['headerProps']> = {
    user: headProps.user ? {
      email: headProps.user.email ?? '',
      displayName: headProps.user.displayName ?? 'Editor',
      photoURL: headProps.user.photoURL ? headProps.getImageUrl(headProps.user.photoURL) : undefined,
    } : null,
    onLogout: headProps.onLogout,
  };
  const runtimePreviewTitle = useMemo(() => {
    const displayName = loadedAsset.displayName?.trim();
    if (displayName) {
      return displayName.replace(/\s+layout$/i, '');
    }
    const gameId = loadedAsset.gameId?.trim();
    if (gameId) {
      return gameId.charAt(0).toUpperCase() + gameId.slice(1);
    }
    return 'Preview';
  }, [loadedAsset.displayName, loadedAsset.gameId]);

  const getOrientedDimensions = useCallback((rawW: number, rawH: number) => {
    let w = rawW;
    let h = rawH;
    if (isPortrait && w > h) {
      [w, h] = [h, w];
    } else if (!isPortrait && h > w) {
      [w, h] = [h, w];
    }
    return { w, h };
  }, [isPortrait]);

  const authoredViewport = document.stageLayout?.authoredViewport;
  const simulationViewport = useMemo(() => {
    let rawW = authoredViewport?.width ?? 1920;
    let rawH = authoredViewport?.height ?? 1080;

    if (resolution === 'custom') {
      rawW = customWidth;
      rawH = customHeight;
    } else if (resolution !== 'fit') {
      const matches = resolution.match(/(\d+)\D+(\d+)/);
      if (matches) {
        rawW = parseInt(matches[1], 10);
        rawH = parseInt(matches[2], 10);
      }
    }

    return getOrientedDimensions(rawW, rawH);
  }, [authoredViewport?.height, authoredViewport?.width, customHeight, customWidth, getOrientedDimensions, resolution]);

  const previewRuntime = useLocalPilotRuntimePreview({
    assetPath,
    document: document as unknown as CardGameLayoutDocument,
    gameId: loadedAsset.gameId,
    playerCount,
  });

  const resolutionLabel = useMemo(() => {
    if (resolution === 'fit') {
      return `${simulationViewport.w} x ${simulationViewport.h}`;
    }
    if (resolution === 'custom') {
      return `${simulationViewport.w} x ${simulationViewport.h}`;
    }
    return resolution.replace(/[()]/g, '').replace('x', ' x ');
  }, [resolution, simulationViewport.h, simulationViewport.w]);
  const showEditorBounds = useMemo(
    () => Object.values(editorOverlayVisibility).some(Boolean),
    [editorOverlayVisibility],
  );
  const showEditorGuides = showHandles || showArenaGuide || showEditorBounds;

  const stageContent = (
    <CardGameTemplatePage
      embedded
      document={document as unknown as CardGameLayoutDocument}
      playerCount={playerCount}
      surfaceMode={showEditorGuides ? (reflectionOnly ? 'editorEmbedded' : 'editorCanvas') : 'play'}
      viewerPerspective={{ mode: 'rotateToLocal', localSeatId: 0 }}
      headerProps={headerProps}
      headerTitle={runtimePreviewTitle}
      headerTagline="Local Pilot"
      footerVersion="1.0.0-dev"
      showLocalSeat
      seatPresentationById={previewRuntime.seatPresentationById}
      zonePresentationById={previewRuntime.zonePresentationById}
      scoreboardPresentation={previewRuntime.scoreboardPresentation}
      cardStripPresentation={previewRuntime.cardStripPresentation}
      hudControlsOverride={previewRuntime.runtimeHudControls}
      onHudButtonClick={previewRuntime.onHudButtonClick}
      arenaOverlay={previewRuntime.arenaOverlay}
      stageOverlay={previewRuntime.stageOverlay}
      editableSeats={!reflectionOnly && showHandles}
      onSeatsChange={handleSeatsChange}
      showArenaGuide={showArenaGuide}
      showAuthoringGuides={showEditorGuides}
      assetPath={assetPath}
      showHeaderDebugControls={false}
      onIsolateRequest={handleIsolateRequest}
      editorIsolationVisibility={editorLayerVisibility}
      editorOverlayVisibility={editorOverlayVisibility}
    />
  );

  if (reflectionOnly) {
    return (
      <div
        className={`standalone-panel-page standalone-panel-page--card-game-preview standalone-panel-page--reflection-only ${LayoutClasses.EDITOR_PREVIEW}`}
      >
        <div className="standalone-panel-page__reflection-frame">
          {stageContent}
        </div>
      </div>
    );
  }

  return (
    <div className={`standalone-panel-page ${LayoutClasses.EDITOR_PREVIEW}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <StandaloneEditorCanvas
        assetPath={assetPath}
        playerCount={playerCount}
        minPlayerCount={playerRange?.minPlayers ?? 2}
        maxPlayerCount={playerRange?.maxPlayers ?? 10}
        showHandles={showHandles}
        onPlayerCountChange={handlePlayerCountChange}
        onShowHandlesChange={setShowHandles}
        onCopyPreset={handleCopyPreset}
        showArenaGuide={showArenaGuide}
        onShowArenaGuideChange={setShowArenaGuide}
        resolution={resolution}
        onResolutionChange={setResolution}
        showStudio={showStudio}
        onShowStudioChange={setShowStudio}
        isPortrait={isPortrait}
        onIsPortraitChange={setIsPortrait}
        customWidth={customWidth}
        onCustomWidthChange={setCustomWidth}
        customHeight={customHeight}
        onCustomHeightChange={setCustomHeight}
        resolutions={resolutions}
        onAddCustomDevice={handleAddCustomDevice}
        onShowEditorView={() => setShowHudEditor(true)}
        viewport={simulationViewport}
        resolutionLabel={resolutionLabel}
        hideTools={hideTools}
      >
        {stageContent}
      </StandaloneEditorCanvas>

      <Suspense fallback={null}>
        {showHudEditor && (
          <HudButtonEditorModal
            open={showHudEditor}
            onClose={() => setShowHudEditor(false)}
            document={document as unknown as CardGameLayoutDocument}
            onChange={handleChange}
            initialWorkspaceSection="layerSplit"
            editorLayerVisibility={editorLayerVisibility}
            onEditorLayerVisibilityChange={handleEditorLayerVisibilityChange}
            editorOverlayVisibility={editorOverlayVisibility}
            onEditorOverlayVisibilityChange={handleEditorOverlayVisibilityChange}
          />
        )}
      </Suspense>

    </div>
  );
};

const LazyIsolationHubPage = React.lazy(async () => {
  const m = await import('./IsolationHub/IsolationHubPage');
  return { default: m.IsolationHubPage };
});

type FeaturedShowcaseControlsSurfaceProps = {
  channelName?: string;
  loadControls?: () => Promise<FeaturedShowcaseControls>;
  saveControls?: (controls: FeaturedShowcaseControls) => Promise<FeaturedShowcaseControls>;
  logLabel?: string;
  controlScope?: 'featured' | 'comingSoon';
  title?: string;
  description?: string;
};

const FeaturedShowcaseControlsSurface: React.FC<FeaturedShowcaseControlsSurfaceProps> = ({
  channelName = FEATURED_SHOWCASE_CONTROLS_CHANNEL,
  loadControls = loadFeaturedShowcaseControlsFromDisk,
  saveControls = saveFeaturedShowcaseControlsToDisk,
  logLabel = 'StandaloneFeaturedShowcaseControls',
  controlScope = 'featured',
  title = 'Featured Showcase Controls',
  description = 'Shared SVG layout tuning for the homepage featured block.',
}) => {
  const [controls, setControls] = useState<FeaturedShowcaseControls>(
    DEFAULT_FEATURED_SHOWCASE_CONTROLS
  );
  const [previewLayoutMode, setPreviewLayoutMode] =
    useState<FeaturedGameShowcasePreviewLayoutMode>('auto');
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadControls().then((nextControls) => {
      if (!cancelled) {
        setControls(nextControls);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadControls]);

  useEffect(() => {
    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;
    const handler = (event: MessageEvent<FeaturedShowcaseControlsMessage>) => {
      if (event.data.type === 'state') {
        setControls(event.data.controls);
        setPreviewLayoutMode(event.data.previewLayoutMode);
        return;
      }

      if (event.data.type === 'update') {
        setControls(event.data.controls);
        return;
      }

      if (event.data.type === 'preview-layout-mode') {
        setPreviewLayoutMode(event.data.previewLayoutMode);
      }
    };
    channel.addEventListener('message', handler);
    channel.postMessage({ type: 'request-state' } satisfies FeaturedShowcaseControlsMessage);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
      channelRef.current = null;
    };
  }, [channelName]);

  const handleControlsChange = useCallback<React.Dispatch<React.SetStateAction<FeaturedShowcaseControls>>>((value) => {
    setControls((previousControls) => {
      const nextControls =
        typeof value === 'function' ? value(previousControls) : value;
      channelRef.current?.postMessage({
        type: 'update',
        controls: nextControls,
      } satisfies FeaturedShowcaseControlsMessage);
      return nextControls;
    });
  }, []);

  const handlePreviewLayoutModeChange = useCallback((mode: FeaturedGameShowcasePreviewLayoutMode) => {
    setPreviewLayoutMode(mode);
    channelRef.current?.postMessage({
      type: 'preview-layout-mode',
      previewLayoutMode: mode,
    } satisfies FeaturedShowcaseControlsMessage);
  }, []);

  const handleSaveControls = useCallback(async (nextControls: FeaturedShowcaseControls) => {
    try {
      const savedControls = await saveControls(nextControls);
      setControls(savedControls);
      channelRef.current?.postMessage({
        type: 'update',
        controls: savedControls,
      } satisfies FeaturedShowcaseControlsMessage);
      const syncResult = await syncSavedLayoutAssetToR2();
      return syncResult.message;
    } catch (error) {
      logError(`[${logLabel}] save failed`, error);
      throw error;
    }
  }, [logLabel, saveControls]);

  return (
    <FeaturedGameShowcaseControls
      title={title}
      description={description}
      controls={controls}
      onControlsChange={handleControlsChange}
      onSave={handleSaveControls}
      previewLayoutMode={previewLayoutMode}
      onPreviewLayoutModeChange={handlePreviewLayoutModeChange}
      responsiveVariant={previewLayoutMode === 'narrow' ? 'narrow' : 'wide'}
      controlScope={controlScope}
    />
  );
};

const standaloneHomepageTabButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(103, 232, 249, 0.35)',
  borderRadius: '0.55rem',
  background: 'rgba(8, 47, 73, 0.72)',
  color: '#cffafe',
  padding: '0.65rem 0.85rem',
  fontWeight: 800,
  cursor: 'pointer',
};

const standaloneHomepageActiveTabButtonStyle: React.CSSProperties = {
  ...standaloneHomepageTabButtonStyle,
  background: '#67e8f9',
  color: '#020617',
};

const standaloneHomepageToolbarStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.5rem',
  border: '1px solid rgba(103, 232, 249, 0.22)',
  borderRadius: '0.75rem',
  background: 'rgba(2, 6, 23, 0.72)',
  padding: '0.75rem',
};

const standaloneHomepageToolbarSpacerStyle: React.CSSProperties = {
  flex: '1 1 8rem',
};

const standaloneHomepageToolbarButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(103, 232, 249, 0.38)',
  borderRadius: '0.5rem',
  background: 'rgba(8, 47, 73, 0.72)',
  color: '#cffafe',
  padding: '0.55rem 0.8rem',
  fontWeight: 800,
  cursor: 'pointer',
};

const standaloneHomepageSavedButtonStyle: React.CSSProperties = {
  ...standaloneHomepageToolbarButtonStyle,
  background: 'rgba(21, 128, 61, 0.82)',
  borderColor: 'rgba(134, 239, 172, 0.72)',
  color: '#f0fdf4',
};

const standaloneHomepageDangerButtonStyle: React.CSSProperties = {
  ...standaloneHomepageToolbarButtonStyle,
  borderColor: 'rgba(251, 113, 133, 0.5)',
  color: '#fecdd3',
};

const standaloneHomepageToggleLabelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.45rem',
  border: '1px solid rgba(168, 85, 247, 0.42)',
  borderRadius: '0.5rem',
  background: 'rgba(88, 28, 135, 0.34)',
  color: '#f3e8ff',
  padding: '0.55rem 0.75rem',
  fontWeight: 800,
};

const standaloneHomepageSegmentedControlStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  border: '1px solid rgba(103, 232, 249, 0.22)',
  borderRadius: '0.65rem',
  padding: '0.25rem',
  background: 'rgba(2, 6, 23, 0.54)',
};

const StandaloneFeaturedShowcaseControls: React.FC = () => (
  <div className="standalone-panel-page standalone-panel-page--featured-showcase-controls">
    <FeaturedShowcaseControlsSurface />
  </div>
);

type GamesCatalogControlTab = 'overall' | 'header' | 'sidebar' | 'cards' | 'detail' | 'visibility';

type GamesCatalogNumericControlKey = {
  [Key in keyof GamesCatalogSvgLayoutControls]:
    GamesCatalogSvgLayoutControls[Key] extends number ? Key : never
}[keyof GamesCatalogSvgLayoutControls];

type GamesCatalogBooleanControlKey = {
  [Key in keyof GamesCatalogSvgLayoutControls]:
    GamesCatalogSvgLayoutControls[Key] extends boolean ? Key : never
}[keyof GamesCatalogSvgLayoutControls];

type GamesCatalogColorControlKey = {
  [Key in keyof GamesCatalogSvgLayoutControls]:
    GamesCatalogSvgLayoutControls[Key] extends string ? Key : never
}[keyof GamesCatalogSvgLayoutControls];

const gamesCatalogControlTabs: Array<{ key: GamesCatalogControlTab; label: string }> = [
  { key: 'overall', label: 'Overall' },
  { key: 'header', label: 'Header' },
  { key: 'sidebar', label: 'Side Panel' },
  { key: 'cards', label: 'Cards' },
  { key: 'detail', label: 'Popup' },
  { key: 'visibility', label: 'Bounds' },
];

const gamesCatalogNumberControls: Array<{
  key: GamesCatalogNumericControlKey;
  label: string;
  min: number;
  max: number;
  step: number;
  tab: GamesCatalogControlTab;
}> = [
  { key: 'outerInset', label: 'Outer Inset', min: 0, max: 64, step: 1, tab: 'overall' },
  { key: 'gamesAreaPadding', label: 'Content Padding', min: 0, max: 80, step: 1, tab: 'overall' },
  { key: 'cardGap', label: 'Grid Gap', min: 8, max: 96, step: 1, tab: 'overall' },
  { key: 'cardTopClearance', label: 'Card Top Clearance', min: 0, max: 80, step: 1, tab: 'overall' },
  { key: 'topBarInsetX', label: 'Header Side Inset', min: 0, max: 96, step: 1, tab: 'header' },
  { key: 'topBarTopInset', label: 'Header Top Inset', min: 0, max: 64, step: 1, tab: 'header' },
  { key: 'topBarHeight', label: 'Header Height', min: 0, max: 120, step: 1, tab: 'header' },
  { key: 'toolbarButtonHeight', label: 'Control Height', min: 24, max: 64, step: 1, tab: 'header' },
  { key: 'searchWidth', label: 'Search Width', min: 160, max: 520, step: 5, tab: 'header' },
  { key: 'statsBoxWidth', label: 'Stat Box Width', min: 64, max: 150, step: 1, tab: 'header' },
  { key: 'defaultSidebarWidth', label: 'Default Width', min: 180, max: 760, step: 5, tab: 'sidebar' },
  { key: 'minSidebarWidth', label: 'Minimum Width', min: 140, max: 520, step: 5, tab: 'sidebar' },
  { key: 'maxSidebarWidth', label: 'Maximum Width', min: 240, max: 900, step: 5, tab: 'sidebar' },
  { key: 'sidebarHeaderHeight', label: 'Header Height', min: 36, max: 96, step: 1, tab: 'sidebar' },
  { key: 'playerModeRowHeight', label: 'Player Row Height', min: 42, max: 82, step: 1, tab: 'sidebar' },
  { key: 'categoryRowHeight', label: 'Category Row Height', min: 34, max: 72, step: 1, tab: 'sidebar' },
  { key: 'subcategoryRowHeight', label: 'Subcategory Row Height', min: 22, max: 48, step: 1, tab: 'sidebar' },
  { key: 'minCardWidthPx', label: 'Minimum Card Width', min: 180, max: 520, step: 5, tab: 'cards' },
  { key: 'maxCardWidthPx', label: 'Maximum Card Width', min: 220, max: 680, step: 5, tab: 'cards' },
  { key: 'maxGridColumns', label: 'Maximum Columns', min: 1, max: 8, step: 1, tab: 'cards' },
  { key: 'cardHeight', label: 'Card Height', min: 360, max: 820, step: 5, tab: 'cards' },
  { key: 'cardPadding', label: 'Card Padding', min: 0, max: 36, step: 1, tab: 'cards' },
  { key: 'cardImageHeight', label: 'Image Height', min: 0, max: 340, step: 1, tab: 'cards' },
  { key: 'cardRadius', label: 'Card Radius', min: 0, max: 36, step: 1, tab: 'cards' },
  { key: 'cardTitleFont', label: 'Title Font', min: 12, max: 28, step: 0.5, tab: 'cards' },
  { key: 'cardDescriptionFont', label: 'Description Font', min: 10, max: 20, step: 0.5, tab: 'cards' },
  { key: 'cardMetaPillHeight', label: 'Meta Pill Height', min: 20, max: 44, step: 1, tab: 'cards' },
  { key: 'cardMetaGap', label: 'Meta Gap', min: 2, max: 24, step: 1, tab: 'cards' },
  { key: 'detailPanelWidth', label: 'Popup Width', min: 720, max: 1680, step: 10, tab: 'detail' },
  { key: 'detailPanelHeight', label: 'Popup Height', min: 420, max: 1000, step: 10, tab: 'detail' },
  { key: 'topBarFillOpacity', label: 'Header Fill Opacity', min: 0, max: 1, step: 0.01, tab: 'header' },
  { key: 'topBarStrokeWidth', label: 'Header Edge Width', min: 0, max: 6, step: 0.1, tab: 'header' },
  { key: 'topBarBackdropBlur', label: 'Header Backdrop Blur', min: 0, max: 32, step: 1, tab: 'header' },
  { key: 'controlFillOpacity', label: 'Control Fill Opacity', min: 0, max: 1, step: 0.01, tab: 'header' },
  { key: 'controlStrokeWidth', label: 'Control Edge Width', min: 0, max: 6, step: 0.1, tab: 'header' },
  { key: 'controlGlowBlur', label: 'Control Glow Blur', min: 0, max: 24, step: 1, tab: 'header' },
  { key: 'controlGlowOpacity', label: 'Control Glow Opacity', min: 0, max: 1, step: 0.01, tab: 'header' },
  { key: 'sidebarFillOpacity', label: 'Panel Fill Opacity', min: 0, max: 1, step: 0.01, tab: 'sidebar' },
  { key: 'sidebarStrokeWidth', label: 'Panel Edge Width', min: 0, max: 6, step: 0.1, tab: 'sidebar' },
  { key: 'sidebarHeaderFillOpacity', label: 'Header Fill Opacity', min: 0, max: 1, step: 0.01, tab: 'sidebar' },
  { key: 'sidebarRowFillOpacity', label: 'Row Fill Opacity', min: 0, max: 1, step: 0.01, tab: 'sidebar' },
  { key: 'sidebarRowActiveFillOpacity', label: 'Active Row Opacity', min: 0, max: 1, step: 0.01, tab: 'sidebar' },
  { key: 'sidebarBackdropBlur', label: 'Panel Backdrop Blur', min: 0, max: 32, step: 1, tab: 'sidebar' },
  { key: 'gamesAreaFillOpacity', label: 'Main Panel Opacity', min: 0, max: 1, step: 0.01, tab: 'overall' },
  { key: 'gamesAreaStrokeWidth', label: 'Main Panel Edge Width', min: 0, max: 6, step: 0.1, tab: 'overall' },
  { key: 'gamesAreaBackdropBlur', label: 'Main Panel Backdrop Blur', min: 0, max: 32, step: 1, tab: 'overall' },
  { key: 'cardFillOpacity', label: 'Card Fill Opacity', min: 0, max: 1, step: 0.01, tab: 'cards' },
  { key: 'cardStrokeWidth', label: 'Card Edge Width', min: 0, max: 8, step: 0.1, tab: 'cards' },
  { key: 'cardRingStrokeWidth', label: 'Card Inner Ring Width', min: 0, max: 6, step: 0.1, tab: 'cards' },
  { key: 'cardRingOpacity', label: 'Card Inner Ring Opacity', min: 0, max: 1, step: 0.01, tab: 'cards' },
  { key: 'cardGlowBlur', label: 'Card Glow Blur', min: 0, max: 24, step: 1, tab: 'cards' },
  { key: 'cardGlowOpacity', label: 'Card Glow Opacity', min: 0, max: 1, step: 0.01, tab: 'cards' },
  { key: 'cardBackdropBlur', label: 'Card Backdrop Blur', min: 0, max: 32, step: 1, tab: 'cards' },
  { key: 'cardImageOverlayOpacity', label: 'Image Dark Overlay', min: 0, max: 1, step: 0.01, tab: 'cards' },
  { key: 'cardImageCurveOpacity', label: 'Image Curve Opacity', min: 0, max: 1, step: 0.01, tab: 'cards' },
  { key: 'cardCategoryBadgeOpacity', label: 'Category Badge Opacity', min: 0, max: 1, step: 0.01, tab: 'cards' },
  { key: 'cardMetaFillOpacity', label: 'Meta Pill Opacity', min: 0, max: 1, step: 0.01, tab: 'cards' },
  { key: 'cardTopClampHeight', label: 'Top Clamp Height', min: 0, max: 28, step: 1, tab: 'cards' },
  { key: 'cardTopClampFillOpacity', label: 'Top Clamp Opacity', min: 0, max: 1, step: 0.01, tab: 'cards' },
  { key: 'cardTopClampStrokeWidth', label: 'Top Clamp Edge Width', min: 0, max: 8, step: 0.1, tab: 'cards' },
  { key: 'detailOverlayOpacity', label: 'Overlay Opacity', min: 0, max: 1, step: 0.01, tab: 'detail' },
  { key: 'detailPanelFillOpacity', label: 'Panel Fill Opacity', min: 0, max: 1, step: 0.01, tab: 'detail' },
  { key: 'detailPanelStrokeWidth', label: 'Panel Edge Width', min: 0, max: 8, step: 0.1, tab: 'detail' },
  { key: 'detailHeaderFillOpacity', label: 'Header Fill Opacity', min: 0, max: 1, step: 0.01, tab: 'detail' },
  { key: 'detailCardFillOpacity', label: 'Body Card Opacity', min: 0, max: 1, step: 0.01, tab: 'detail' },
  { key: 'detailBackdropBlur', label: 'Popup Backdrop Blur', min: 0, max: 32, step: 1, tab: 'detail' },
  { key: 'debugBoundsStrokeWidth', label: 'Bounds Edge Width', min: 0.5, max: 8, step: 0.5, tab: 'visibility' },
  { key: 'debugBoundsFillOpacity', label: 'Bounds Fill Opacity', min: 0, max: 0.5, step: 0.01, tab: 'visibility' },
];

const gamesCatalogBooleanControls: Array<{
  key: GamesCatalogBooleanControlKey;
  label: string;
  tab: GamesCatalogControlTab;
}> = [
  { key: 'showToolbar', label: 'Show header controls', tab: 'header' },
  { key: 'showSearch', label: 'Show search', tab: 'header' },
  { key: 'showViewButtons', label: 'Show Grid/List/A-Z', tab: 'header' },
  { key: 'showQualityFilter', label: 'Show quality filter', tab: 'header' },
  { key: 'showSortFilter', label: 'Show sort filter', tab: 'header' },
  { key: 'showStats', label: 'Show stat boxes', tab: 'header' },
  { key: 'showSidebar', label: 'Show side panel', tab: 'sidebar' },
  { key: 'showPlayerModes', label: 'Show player filters', tab: 'sidebar' },
  { key: 'showCategoryList', label: 'Show category rows', tab: 'sidebar' },
  { key: 'showCardImages', label: 'Show card images', tab: 'cards' },
  { key: 'showCardCategoryBadge', label: 'Show category badge', tab: 'cards' },
  { key: 'showCardStatusBadge', label: 'Show status badge', tab: 'cards' },
  { key: 'showCardMeta', label: 'Show card meta pills', tab: 'cards' },
  { key: 'showCardTopClamp', label: 'Show top glow clamp', tab: 'cards' },
  { key: 'enableDetailOverlay', label: 'Enable click popup', tab: 'detail' },
  { key: 'showDetailReadiness', label: 'Show popup readiness', tab: 'detail' },
  { key: 'showDetailActions', label: 'Show popup actions', tab: 'detail' },
  { key: 'showDebugBounds', label: 'Show layout bounds', tab: 'visibility' },
  { key: 'showPageBounds', label: 'Show page bounds', tab: 'visibility' },
  { key: 'showHeaderBounds', label: 'Show header bounds', tab: 'visibility' },
  { key: 'showSidebarBounds', label: 'Show side panel bounds', tab: 'visibility' },
  { key: 'showGamesAreaBounds', label: 'Show game area bounds', tab: 'visibility' },
  { key: 'showCardBounds', label: 'Show card bounds', tab: 'visibility' },
  { key: 'showDetailBounds', label: 'Show popup bounds', tab: 'visibility' },
];

const gamesCatalogColorControls: Array<{
  key: GamesCatalogColorControlKey;
  label: string;
  tab: GamesCatalogControlTab;
}> = [
  { key: 'gamesAreaFillColor', label: 'Main Panel Fill', tab: 'overall' },
  { key: 'gamesAreaStrokeColor', label: 'Main Panel Edge', tab: 'overall' },
  { key: 'topBarFillColor', label: 'Header Fill', tab: 'header' },
  { key: 'topBarStrokeColor', label: 'Header Edge', tab: 'header' },
  { key: 'controlFillColor', label: 'Control Fill', tab: 'header' },
  { key: 'controlStrokeColor', label: 'Control Edge', tab: 'header' },
  { key: 'controlGlowColor', label: 'Control Glow', tab: 'header' },
  { key: 'activeControlStartColor', label: 'Active Gradient Start', tab: 'header' },
  { key: 'activeControlEndColor', label: 'Active Gradient End', tab: 'header' },
  { key: 'sidebarFillColor', label: 'Panel Fill', tab: 'sidebar' },
  { key: 'sidebarStrokeColor', label: 'Panel Edge', tab: 'sidebar' },
  { key: 'sidebarHeaderFillColor', label: 'Header Fill', tab: 'sidebar' },
  { key: 'sidebarDividerColor', label: 'Divider', tab: 'sidebar' },
  { key: 'sidebarRowFillColor', label: 'Row Fill', tab: 'sidebar' },
  { key: 'sidebarRowActiveFillColor', label: 'Active Row Fill', tab: 'sidebar' },
  { key: 'cardOuterFillColor', label: 'Outer Fill', tab: 'cards' },
  { key: 'cardFillColor', label: 'Inner Fill', tab: 'cards' },
  { key: 'cardStrokeColor', label: 'Selected Edge', tab: 'cards' },
  { key: 'cardRingColor', label: 'Inner Ring', tab: 'cards' },
  { key: 'cardGlowColor', label: 'Glow', tab: 'cards' },
  { key: 'cardEdgeStartColor', label: 'Edge Start', tab: 'cards' },
  { key: 'cardEdgeMiddleColor', label: 'Edge Middle', tab: 'cards' },
  { key: 'cardEdgeEndColor', label: 'Edge End', tab: 'cards' },
  { key: 'cardTextColor', label: 'Title Text', tab: 'cards' },
  { key: 'cardDescriptionColor', label: 'Description Text', tab: 'cards' },
  { key: 'cardImageOverlayColor', label: 'Image Overlay', tab: 'cards' },
  { key: 'cardCategoryBadgeFillColor', label: 'Category Badge Fill', tab: 'cards' },
  { key: 'cardCategoryBadgeStrokeColor', label: 'Category Badge Edge', tab: 'cards' },
  { key: 'cardMetaFillColor', label: 'Meta Pill Fill', tab: 'cards' },
  { key: 'cardMetaStrokeColor', label: 'Meta Pill Edge', tab: 'cards' },
  { key: 'cardTopClampStrokeColor', label: 'Top Clamp Edge', tab: 'cards' },
  { key: 'detailOverlayColor', label: 'Overlay Color', tab: 'detail' },
  { key: 'detailPanelFillColor', label: 'Panel Fill', tab: 'detail' },
  { key: 'detailPanelStrokeColor', label: 'Panel Edge', tab: 'detail' },
  { key: 'detailHeaderFillColor', label: 'Header Fill', tab: 'detail' },
  { key: 'detailCardFillColor', label: 'Body Card Fill', tab: 'detail' },
  { key: 'detailCardStrokeColor', label: 'Body Card Edge', tab: 'detail' },
  { key: 'debugPageBoundsColor', label: 'Page Bounds', tab: 'visibility' },
  { key: 'debugHeaderBoundsColor', label: 'Header Bounds', tab: 'visibility' },
  { key: 'debugSidebarBoundsColor', label: 'Side Bounds', tab: 'visibility' },
  { key: 'debugGamesBoundsColor', label: 'Game Area Bounds', tab: 'visibility' },
  { key: 'debugCardBoundsColor', label: 'Card Bounds', tab: 'visibility' },
];

const gamesCatalogPanelStyle: React.CSSProperties = {
  display: 'grid',
  gap: '1rem',
  padding: '1rem',
};

const gamesCatalogPanelGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
  gap: '0.75rem',
};

const gamesCatalogPanelCardStyle: React.CSSProperties = {
  border: '1px solid rgba(103, 232, 249, 0.22)',
  borderRadius: '0.75rem',
  background: 'rgba(2, 6, 23, 0.72)',
  padding: '0.85rem',
};

const gamesCatalogPanelInputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid rgba(103, 232, 249, 0.32)',
  borderRadius: '0.45rem',
  background: 'rgba(2, 6, 23, 0.8)',
  color: '#e0f2fe',
  padding: '0.5rem',
};

const gamesCatalogResetMiniButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(125, 211, 252, 0.35)',
  borderRadius: '0.35rem',
  background: 'rgba(8, 47, 73, 0.62)',
  color: '#bae6fd',
  cursor: 'pointer',
  fontSize: '0.68rem',
  padding: '0.22rem 0.45rem',
};

const StandaloneGamesCatalogLayoutControls: React.FC = () => {
  const [controls, setControls] = useState<GamesCatalogSvgLayoutControls>(
    DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS
  );
  const [activeTab, setActiveTab] = useState<GamesCatalogControlTab>('overall');
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedValue, setCopiedValue] = useState('');
  const channelRef = useRef<BroadcastChannel | null>(null);
  const controlsRef = useRef<GamesCatalogSvgLayoutControls>(
    DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS
  );

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    let cancelled = false;
    void loadGamesCatalogLayoutControlsFromDisk().then((nextControls) => {
      if (cancelled) {
        return;
      }
      const normalized = normalizeGamesCatalogLayoutControls(nextControls);
      setControls(normalized);
      channelRef.current?.postMessage({
        type: 'update',
        controls: normalized,
      } satisfies GamesCatalogLayoutControlsMessage);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel(GAMES_CATALOG_LAYOUT_CONTROLS_CHANNEL);
    channelRef.current = channel;

    const handler = (event: MessageEvent<GamesCatalogLayoutControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          controls: controlsRef.current,
        } satisfies GamesCatalogLayoutControlsMessage);
        return;
      }

      if (event.data.type === 'state' || event.data.type === 'update') {
        setControls(normalizeGamesCatalogLayoutControls(event.data.controls));
      }
    };

    channel.addEventListener('message', handler);
    channel.postMessage({ type: 'request-state' } satisfies GamesCatalogLayoutControlsMessage);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const updateControls = useCallback((value: React.SetStateAction<GamesCatalogSvgLayoutControls>) => {
    setControls((previousControls) => {
      const nextControls = normalizeGamesCatalogLayoutControls(
        typeof value === 'function' ? value(previousControls) : value
      );
      channelRef.current?.postMessage({
        type: 'update',
        controls: nextControls,
      } satisfies GamesCatalogLayoutControlsMessage);
      return nextControls;
    });
  }, []);

  const updateNumberControl = useCallback((
    key: GamesCatalogNumericControlKey,
    value: number
  ) => {
    updateControls((previousControls) => ({
      ...previousControls,
      [key]: value,
    }));
  }, [updateControls]);

  const updateBooleanControl = useCallback((
    key: GamesCatalogBooleanControlKey,
    value: boolean
  ) => {
    updateControls((previousControls) => ({
      ...previousControls,
      [key]: value,
    }));
  }, [updateControls]);

  const updateColorControl = useCallback((
    key: GamesCatalogColorControlKey,
    value: string
  ) => {
    updateControls((previousControls) => ({
      ...previousControls,
      [key]: value,
    }));
  }, [updateControls]);

  const resetControl = useCallback((key: keyof GamesCatalogSvgLayoutControls) => {
    updateControls((previousControls) => ({
      ...previousControls,
      [key]: DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS[key],
    }));
  }, [updateControls]);

  const copyValue = useMemo(() => JSON.stringify(controls, null, 2), [controls]);
  const isCopyCurrent = copiedValue === copyValue;

  const handleCopy = useCallback(async () => {
    await copyTextToClipboard(copyValue);
    setCopiedValue(copyValue);
  }, [copyValue]);

  const handleSave = useCallback(async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setStatus('Saving...');
    try {
      const savedControls = await saveGamesCatalogLayoutControlsToDisk(controls);
      updateControls(savedControls);
      const syncResult = await syncSavedLayoutAssetToR2(GAMES_CATALOG_LAYOUT_CONTROLS_RESOURCE_PATH);
      setStatus(syncResult.message);
    } catch (error) {
      logError('[StandaloneGamesCatalogLayoutControls] save failed', error);
      setStatus(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [controls, isSaving, updateControls]);

  const handleReset = useCallback(() => {
    updateControls(DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS);
  }, [updateControls]);

  const handleResetTab = useCallback(() => {
    const tabKeys = [
      ...gamesCatalogNumberControls.filter(field => field.tab === activeTab).map(field => field.key),
      ...gamesCatalogBooleanControls.filter(field => field.tab === activeTab).map(field => field.key),
      ...gamesCatalogColorControls.filter(field => field.tab === activeTab).map(field => field.key),
    ];
    updateControls((previousControls) => ({
      ...previousControls,
      ...Object.fromEntries(tabKeys.map(key => [
        key,
        DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS[key],
      ])),
    }));
  }, [activeTab, updateControls]);

  const visibleNumberControls = gamesCatalogNumberControls.filter(field => field.tab === activeTab);
  const visibleBooleanControls = gamesCatalogBooleanControls.filter(field => field.tab === activeTab);
  const visibleColorControls = gamesCatalogColorControls.filter(field => field.tab === activeTab);

  return (
    <div className="standalone-panel-page standalone-panel-page--featured-showcase-controls">
      <div style={gamesCatalogPanelStyle}>
        <div style={standaloneHomepageToolbarStyle}>
          <strong style={{ color: '#cffafe', fontSize: '0.88rem' }}>Games Catalog SVG</strong>
          <span style={standaloneHomepageToolbarSpacerStyle} />
          <button
            type="button"
            style={isCopyCurrent ? standaloneHomepageSavedButtonStyle : standaloneHomepageToolbarButtonStyle}
            onClick={() => void handleCopy()}
          >
            {isCopyCurrent ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            style={standaloneHomepageSavedButtonStyle}
            disabled={isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? 'Saving...' : 'Save + Sync'}
          </button>
          <button
            type="button"
            style={standaloneHomepageDangerButtonStyle}
            onClick={handleResetTab}
          >
            Reset Tab
          </button>
          <button
            type="button"
            style={standaloneHomepageDangerButtonStyle}
            onClick={handleReset}
          >
            Reset All
          </button>
        </div>
        {status ? (
          <div style={{ color: '#bbf7d0', fontSize: '0.75rem' }}>
            {status}
          </div>
        ) : null}
        <div style={standaloneHomepageSegmentedControlStyle}>
          {gamesCatalogControlTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              style={
                activeTab === tab.key
                  ? standaloneHomepageActiveTabButtonStyle
                  : standaloneHomepageTabButtonStyle
              }
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={gamesCatalogPanelGridStyle}>
          {visibleNumberControls.map((field) => (
            <label key={field.key} style={gamesCatalogPanelCardStyle}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem', color: '#cffafe', fontWeight: 800 }}>
                <span>{field.label}</span>
                <button type="button" style={gamesCatalogResetMiniButtonStyle} onClick={() => resetControl(field.key)}>
                  Reset
                </button>
              </span>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={controls[field.key]}
                onChange={(event) => updateNumberControl(field.key, Number(event.target.value))}
              />
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={controls[field.key]}
                style={gamesCatalogPanelInputStyle}
                onChange={(event) => updateNumberControl(field.key, Number(event.target.value))}
              />
            </label>
          ))}
          {visibleBooleanControls.map((field) => (
            <label key={field.key} style={{
              ...gamesCatalogPanelCardStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}>
              <span style={{ color: '#cffafe', fontWeight: 800 }}>
                {field.label}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button type="button" style={gamesCatalogResetMiniButtonStyle} onClick={() => resetControl(field.key)}>
                  Reset
                </button>
                <input
                  type="checkbox"
                  checked={controls[field.key]}
                  onChange={(event) => updateBooleanControl(field.key, event.target.checked)}
                />
              </span>
            </label>
          ))}
          {visibleColorControls.map((field) => (
            <label key={field.key} style={gamesCatalogPanelCardStyle}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem', color: '#cffafe', fontWeight: 800 }}>
                <span>{field.label}</span>
                <button type="button" style={gamesCatalogResetMiniButtonStyle} onClick={() => resetControl(field.key)}>
                  Reset
                </button>
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '3.5rem 1fr', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={controls[field.key]}
                  onChange={(event) => updateColorControl(field.key, event.target.value)}
                  style={{ width: '100%', height: '2.4rem', border: '1px solid rgba(103, 232, 249, 0.32)', borderRadius: '0.45rem', background: 'transparent' }}
                />
                <input
                  type="text"
                  value={controls[field.key]}
                  style={gamesCatalogPanelInputStyle}
                  onChange={(event) => updateColorControl(field.key, event.target.value)}
                />
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

function serializeHeaderConfigForPreview(config: UnifiedHeaderConfig): SerializedUnifiedHeaderConfig {
  const serializedCandidate: UnifiedHeaderConfigInput = {
    ...config,
    left: {
      ...config.left,
      onClick: undefined,
      customRenderer: undefined,
    },
    right: {
      ...config.right,
      user: undefined,
      isProfile: undefined,
      onClick: undefined,
      onLogout: undefined,
      onUpgradeGuestClick: undefined,
      onAdminDashboardClick: undefined,
      onViewProfileClick: undefined,
      onSettingsClick: undefined,
      onSecurityClick: undefined,
      onUpdatePhoto: undefined,
      getAvatars: undefined,
      customRenderer: undefined,
    },
    center: {
      ...config.center,
      customRenderer: undefined,
      modeA: {
        ...config.center.modeA,
        logo: {
          ...config.center.modeA.logo,
          renderer: undefined,
        },
      },
      modeB: {
        ...config.center.modeB,
        logo: typeof config.center.modeB.logo === 'string' ? config.center.modeB.logo : undefined,
        icons: config.center.modeB.icons?.filter((icon): icon is string => typeof icon === 'string'),
        leftIcons: config.center.modeB.leftIcons?.filter((icon): icon is string => typeof icon === 'string'),
        rightIcons: config.center.modeB.rightIcons?.filter((icon): icon is string => typeof icon === 'string'),
      },
    },
  };

  return parseSerializedUnifiedHeaderConfig(
    JSON.parse(JSON.stringify(serializedCandidate))
  );
}

function HeaderProfileControlsPanel() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const latestConfigRef = useRef<SerializedUnifiedHeaderConfig | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel(HEADER_PROFILE_CONTROLS_CHANNEL);
    const handleMessage = (event: MessageEvent<HeaderProfileControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          config: latestConfigRef.current,
        } satisfies HeaderProfileControlsMessage);
      }
    };
    channelRef.current = channel;
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const handleResolvedConfigChange = useCallback((config: UnifiedHeaderConfig) => {
    const serializedConfig = serializeHeaderConfigForPreview(config);
    latestConfigRef.current = serializedConfig;
    channelRef.current?.postMessage({
      type: 'update',
      config: serializedConfig,
    } satisfies HeaderProfileControlsMessage);
  }, []);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <MemoryRouter initialEntries={['/']}>
        <UnifiedHeader
          profileName="main_screen"
          includeAdminNavigation
          placement="contained"
          debugControlsOnly
          onResolvedConfigChange={handleResolvedConfigChange}
        />
      </MemoryRouter>
    </div>
  );
}

type HomepageLayoutControlTab = 'header' | 'about' | 'featured' | 'comingSoon';

const copyTextToClipboard = async (value: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const StandaloneHomepageLayoutControls: React.FC = () => {
  const [tab, setTab] = useState<HomepageLayoutControlTab>('header');
  const [aboutControls, setAboutControls] = useState<HomeShowcaseFrameControls>(
    DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS
  );
  const [featuredControls, setFeaturedControls] = useState<FeaturedShowcaseControls>(
    DEFAULT_FEATURED_SHOWCASE_CONTROLS
  );
  const [comingSoonControls, setComingSoonControls] = useState<FeaturedShowcaseControls>(
    DEFAULT_FEATURED_SHOWCASE_CONTROLS
  );
  const [homepageLayoutControls, setHomepageLayoutControls] =
    useState<HomepageLayoutControlsData>(DEFAULT_HOMEPAGE_LAYOUT_CONTROLS);
  const [aboutPreviewLayoutMode, setAboutPreviewLayoutMode] =
    useState<HomeShowcasePreviewLayoutMode>('auto');
  const [featuredPreviewLayoutMode, setFeaturedPreviewLayoutMode] =
    useState<FeaturedGameShowcasePreviewLayoutMode>('auto');
  const [comingSoonPreviewLayoutMode, setComingSoonPreviewLayoutMode] =
    useState<FeaturedGameShowcasePreviewLayoutMode>('auto');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const aboutChannelRef = useRef<BroadcastChannel | null>(null);
  const featuredChannelRef = useRef<BroadcastChannel | null>(null);
  const comingSoonChannelRef = useRef<BroadcastChannel | null>(null);
  const homepageLayoutChannelRef = useRef<BroadcastChannel | null>(null);
  const aboutControlsRef = useRef(aboutControls);
  const featuredControlsRef = useRef(featuredControls);
  const comingSoonControlsRef = useRef(comingSoonControls);
  const homepageLayoutControlsRef = useRef(homepageLayoutControls);
  const aboutPreviewLayoutModeRef = useRef(aboutPreviewLayoutMode);
  const featuredPreviewLayoutModeRef = useRef(featuredPreviewLayoutMode);
  const comingSoonPreviewLayoutModeRef = useRef(comingSoonPreviewLayoutMode);

  const tabs: { id: HomepageLayoutControlTab; label: string }[] = [
    { id: 'header', label: 'Header' },
    { id: 'about', label: 'About Us' },
    { id: 'featured', label: 'Featured' },
    { id: 'comingSoon', label: 'Coming Soon' },
  ];

  useEffect(() => {
    aboutControlsRef.current = aboutControls;
  }, [aboutControls]);

  useEffect(() => {
    featuredControlsRef.current = featuredControls;
  }, [featuredControls]);

  useEffect(() => {
    comingSoonControlsRef.current = comingSoonControls;
  }, [comingSoonControls]);

  useEffect(() => {
    homepageLayoutControlsRef.current = homepageLayoutControls;
  }, [homepageLayoutControls]);

  useEffect(() => {
    aboutPreviewLayoutModeRef.current = aboutPreviewLayoutMode;
  }, [aboutPreviewLayoutMode]);

  useEffect(() => {
    featuredPreviewLayoutModeRef.current = featuredPreviewLayoutMode;
  }, [featuredPreviewLayoutMode]);

  useEffect(() => {
    comingSoonPreviewLayoutModeRef.current = comingSoonPreviewLayoutMode;
  }, [comingSoonPreviewLayoutMode]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadHomeShowcaseFrameControlsFromDisk('about'),
      loadFeaturedShowcaseControlsFromDisk(),
      loadComingSoonShowcaseControlsFromDisk(),
      loadHomepageLayoutControlsFromDisk(),
    ]).then(([nextAboutControls, nextFeaturedControls, nextComingSoonControls, nextHomepageControls]) => {
      if (cancelled) {
        return;
      }
      setAboutControls(nextAboutControls);
      setFeaturedControls(nextFeaturedControls);
      setComingSoonControls(nextComingSoonControls);
      setHomepageLayoutControls(nextHomepageControls);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const aboutChannel = new BroadcastChannel(HOME_SHOWCASE_FRAME_CONTROLS_CHANNEL);
    const featuredChannel = new BroadcastChannel(FEATURED_SHOWCASE_CONTROLS_CHANNEL);
    const comingSoonChannel = new BroadcastChannel(COMING_SOON_SHOWCASE_CONTROLS_CHANNEL);
    const homepageLayoutChannel = new BroadcastChannel(HOMEPAGE_LAYOUT_CONTROLS_CHANNEL);
    aboutChannelRef.current = aboutChannel;
    featuredChannelRef.current = featuredChannel;
    comingSoonChannelRef.current = comingSoonChannel;
    homepageLayoutChannelRef.current = homepageLayoutChannel;

    const handleAboutMessage = (event: MessageEvent<HomeShowcaseFrameControlsMessage>) => {
      if (event.data.kind !== 'about') {
        return;
      }

      if (event.data.type === 'request-state') {
        aboutChannel.postMessage({
          type: 'state',
          kind: 'about',
          controls: aboutControlsRef.current,
          previewLayoutMode: aboutPreviewLayoutModeRef.current,
        } satisfies HomeShowcaseFrameControlsMessage);
        return;
      }

      if (event.data.type === 'state') {
        setAboutControls(event.data.controls);
        setAboutPreviewLayoutMode(event.data.previewLayoutMode);
        return;
      }

      if (event.data.type === 'update') {
        setAboutControls(event.data.controls);
        return;
      }

      if (event.data.type === 'preview-layout-mode') {
        setAboutPreviewLayoutMode(event.data.previewLayoutMode);
      }
    };

    const handleFeaturedMessage = (event: MessageEvent<FeaturedShowcaseControlsMessage>) => {
      if (event.data.type === 'request-state') {
        featuredChannel.postMessage({
          type: 'state',
          controls: featuredControlsRef.current,
          previewLayoutMode: featuredPreviewLayoutModeRef.current,
        } satisfies FeaturedShowcaseControlsMessage);
        return;
      }

      if (event.data.type === 'state') {
        setFeaturedControls(event.data.controls);
        setFeaturedPreviewLayoutMode(event.data.previewLayoutMode);
        return;
      }

      if (event.data.type === 'update') {
        setFeaturedControls(event.data.controls);
        return;
      }

      if (event.data.type === 'preview-layout-mode') {
        setFeaturedPreviewLayoutMode(event.data.previewLayoutMode);
      }
    };

    const handleComingSoonMessage = (event: MessageEvent<FeaturedShowcaseControlsMessage>) => {
      if (event.data.type === 'request-state') {
        comingSoonChannel.postMessage({
          type: 'state',
          controls: comingSoonControlsRef.current,
          previewLayoutMode: comingSoonPreviewLayoutModeRef.current,
        } satisfies FeaturedShowcaseControlsMessage);
        return;
      }

      if (event.data.type === 'state') {
        setComingSoonControls(event.data.controls);
        setComingSoonPreviewLayoutMode(event.data.previewLayoutMode);
        return;
      }

      if (event.data.type === 'update') {
        setComingSoonControls(event.data.controls);
        return;
      }

      if (event.data.type === 'preview-layout-mode') {
        setComingSoonPreviewLayoutMode(event.data.previewLayoutMode);
      }
    };

    const handleHomepageLayoutMessage = (event: MessageEvent<HomepageLayoutControlsMessage>) => {
      if (event.data.type === 'request-state') {
        homepageLayoutChannel.postMessage({
          type: 'state',
          controls: homepageLayoutControlsRef.current,
        } satisfies HomepageLayoutControlsMessage);
        return;
      }

      if (event.data.type === 'state' || event.data.type === 'update') {
        setHomepageLayoutControls(event.data.controls);
      }
    };

    aboutChannel.addEventListener('message', handleAboutMessage);
    featuredChannel.addEventListener('message', handleFeaturedMessage);
    comingSoonChannel.addEventListener('message', handleComingSoonMessage);
    homepageLayoutChannel.addEventListener('message', handleHomepageLayoutMessage);
    aboutChannel.postMessage({ type: 'request-state', kind: 'about' } satisfies HomeShowcaseFrameControlsMessage);
    featuredChannel.postMessage({ type: 'request-state' } satisfies FeaturedShowcaseControlsMessage);
    comingSoonChannel.postMessage({ type: 'request-state' } satisfies FeaturedShowcaseControlsMessage);
    homepageLayoutChannel.postMessage({ type: 'request-state' } satisfies HomepageLayoutControlsMessage);

    return () => {
      aboutChannel.removeEventListener('message', handleAboutMessage);
      featuredChannel.removeEventListener('message', handleFeaturedMessage);
      comingSoonChannel.removeEventListener('message', handleComingSoonMessage);
      homepageLayoutChannel.removeEventListener('message', handleHomepageLayoutMessage);
      aboutChannel.close();
      featuredChannel.close();
      comingSoonChannel.close();
      homepageLayoutChannel.close();
      aboutChannelRef.current = null;
      featuredChannelRef.current = null;
      comingSoonChannelRef.current = null;
      homepageLayoutChannelRef.current = null;
    };
  }, []);

  const updateAboutControls = useCallback<React.Dispatch<React.SetStateAction<HomeShowcaseFrameControls>>>((value) => {
    setAboutControls((previousControls) => {
      const nextControls =
        typeof value === 'function' ? value(previousControls) : value;
      aboutChannelRef.current?.postMessage({
        type: 'update',
        kind: 'about',
        controls: nextControls,
      } satisfies HomeShowcaseFrameControlsMessage);
      return nextControls;
    });
  }, []);

  const updateFeaturedControls = useCallback<React.Dispatch<React.SetStateAction<FeaturedShowcaseControls>>>((value) => {
    setFeaturedControls((previousControls) => {
      const nextControls =
        typeof value === 'function' ? value(previousControls) : value;
      featuredChannelRef.current?.postMessage({
        type: 'update',
        controls: nextControls,
      } satisfies FeaturedShowcaseControlsMessage);
      return nextControls;
    });
  }, []);

  const updateComingSoonControls = useCallback<React.Dispatch<React.SetStateAction<FeaturedShowcaseControls>>>((value) => {
    setComingSoonControls((previousControls) => {
      const nextControls =
        typeof value === 'function' ? value(previousControls) : value;
      comingSoonChannelRef.current?.postMessage({
        type: 'update',
        controls: nextControls,
      } satisfies FeaturedShowcaseControlsMessage);
      return nextControls;
    });
  }, []);

  const updateHomepageLayoutControls = useCallback((value: React.SetStateAction<HomepageLayoutControlsData>) => {
    setHomepageLayoutControls((previousControls) => {
      const nextControls = normalizeHomepageLayoutControls(
        typeof value === 'function' ? value(previousControls) : value
      );
      homepageLayoutChannelRef.current?.postMessage({
        type: 'update',
        controls: nextControls,
      } satisfies HomepageLayoutControlsMessage);
      return nextControls;
    });
  }, []);

  const combinedControls = useMemo(() => ({
    homepageLayoutControls: normalizeHomepageLayoutControls(homepageLayoutControls),
    aboutShowcaseControls: serializeHomeShowcaseFrameControls(aboutControls),
    featuredShowcaseControls: serializeFeaturedShowcaseControls(featuredControls),
    comingSoonShowcaseControls: serializeFeaturedShowcaseControls(comingSoonControls),
  }), [aboutControls, comingSoonControls, featuredControls, homepageLayoutControls]);

  const copyValue = useMemo(
    () => JSON.stringify(combinedControls, null, 2),
    [combinedControls]
  );

  const isCopyCurrent = copiedValue === copyValue;

  const handleCopy = useCallback(async () => {
    await copyTextToClipboard(copyValue);
    setCopiedValue(copyValue);
  }, [copyValue]);

  const handleSaveAll = useCallback(async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setStatus('Saving...');
    try {
      const [
        savedHomepageControls,
        savedAboutControls,
        savedFeaturedControls,
        savedComingSoonControls,
      ] = await Promise.all([
        saveHomepageLayoutControlsToDisk(combinedControls.homepageLayoutControls),
        saveHomeShowcaseFrameControlsToDisk('about', combinedControls.aboutShowcaseControls),
        saveFeaturedShowcaseControlsToDisk(combinedControls.featuredShowcaseControls),
        saveComingSoonShowcaseControlsToDisk(combinedControls.comingSoonShowcaseControls),
      ]);

      setHomepageLayoutControls(savedHomepageControls);
      setAboutControls(savedAboutControls);
      setFeaturedControls(savedFeaturedControls);
      setComingSoonControls(savedComingSoonControls);
      homepageLayoutChannelRef.current?.postMessage({
        type: 'update',
        controls: savedHomepageControls,
      } satisfies HomepageLayoutControlsMessage);
      aboutChannelRef.current?.postMessage({
        type: 'update',
        kind: 'about',
        controls: savedAboutControls,
      } satisfies HomeShowcaseFrameControlsMessage);
      featuredChannelRef.current?.postMessage({
        type: 'update',
        controls: savedFeaturedControls,
      } satisfies FeaturedShowcaseControlsMessage);
      comingSoonChannelRef.current?.postMessage({
        type: 'update',
        controls: savedComingSoonControls,
      } satisfies FeaturedShowcaseControlsMessage);
      const syncResult = await syncSavedLayoutAssetToR2();
      setStatus(syncResult.message);
    } catch (error) {
      logError('[StandaloneHomepageLayoutControls] save failed', error);
      setStatus(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [combinedControls, isSaving]);

  const handleFeaturedPreviewLayoutModeChange = useCallback((mode: FeaturedGameShowcasePreviewLayoutMode) => {
    setFeaturedPreviewLayoutMode(mode);
    featuredChannelRef.current?.postMessage({
      type: 'preview-layout-mode',
      previewLayoutMode: mode,
    } satisfies FeaturedShowcaseControlsMessage);
  }, []);

  const handleComingSoonPreviewLayoutModeChange = useCallback((mode: FeaturedGameShowcasePreviewLayoutMode) => {
    setComingSoonPreviewLayoutMode(mode);
    comingSoonChannelRef.current?.postMessage({
      type: 'preview-layout-mode',
      previewLayoutMode: mode,
    } satisfies FeaturedShowcaseControlsMessage);
  }, []);

  const handleAboutPreviewLayoutModeChange = useCallback((mode: HomeShowcasePreviewLayoutMode) => {
    setAboutPreviewLayoutMode(mode);
    aboutChannelRef.current?.postMessage({
      type: 'preview-layout-mode',
      kind: 'about',
      previewLayoutMode: mode,
    } satisfies HomeShowcaseFrameControlsMessage);
  }, []);

  const handleHomepagePreviewLayoutModeChange = useCallback((mode: HomeShowcasePreviewLayoutMode) => {
    handleAboutPreviewLayoutModeChange(mode);
    handleFeaturedPreviewLayoutModeChange(mode);
    handleComingSoonPreviewLayoutModeChange(mode);
  }, [
    handleAboutPreviewLayoutModeChange,
    handleComingSoonPreviewLayoutModeChange,
    handleFeaturedPreviewLayoutModeChange,
  ]);

  const handleResetBlock = useCallback(() => {
    if (tab === 'header') {
      return;
    }
    if (tab === 'about') {
      updateAboutControls(DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS);
      return;
    }
    if (tab === 'featured') {
      updateFeaturedControls(DEFAULT_FEATURED_SHOWCASE_CONTROLS);
      return;
    }
    updateComingSoonControls(DEFAULT_FEATURED_SHOWCASE_CONTROLS);
  }, [tab, updateAboutControls, updateComingSoonControls, updateFeaturedControls]);

  const handleResetAll = useCallback(() => {
    updateHomepageLayoutControls(DEFAULT_HOMEPAGE_LAYOUT_CONTROLS);
    updateAboutControls(DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS);
    updateFeaturedControls(DEFAULT_FEATURED_SHOWCASE_CONTROLS);
    updateComingSoonControls(DEFAULT_FEATURED_SHOWCASE_CONTROLS);
    handleHomepagePreviewLayoutModeChange('auto');
  }, [
    handleHomepagePreviewLayoutModeChange,
    updateAboutControls,
    updateComingSoonControls,
    updateFeaturedControls,
    updateHomepageLayoutControls,
  ]);

  const homepagePreviewLayoutMode: HomeShowcasePreviewLayoutMode =
    aboutPreviewLayoutMode === featuredPreviewLayoutMode &&
    aboutPreviewLayoutMode === comingSoonPreviewLayoutMode
      ? aboutPreviewLayoutMode
      : 'auto';
  const aboutImageData = useMemo(() => ({
    featureBannerItems: aboutControls.items ?? [],
  }), [aboutControls.items]);
  const { resolveImageUrl: resolveAboutImageUrl } = useResolveImageUrl(aboutImageData);
  const resolveAboutBannerImageUrl = useCallback((hash: string) => {
    if (!isImageHash(hash)) {
      return null;
    }
    return resolveAboutImageUrl(hash as ImageHash);
  }, [resolveAboutImageUrl]);
  const handleAboutBannerImageUpload = useCallback(async (file: File) => uploadEditorImageFile(file), []);
  const responsiveVariant = homepagePreviewLayoutMode === 'narrow' ? 'narrow' : 'wide';
  const previewModes: { id: HomeShowcasePreviewLayoutMode; label: string }[] = [
    { id: 'auto', label: 'Auto' },
    { id: 'wide', label: 'Wide' },
    { id: 'narrow', label: 'Narrow' },
  ];

  return (
    <div className="standalone-panel-page standalone-panel-page--featured-showcase-controls">
      <div style={{ display: 'grid', gap: '1rem', padding: '1rem' }}>
        <div style={standaloneHomepageToolbarStyle}>
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              style={tab === item.id ? standaloneHomepageActiveTabButtonStyle : standaloneHomepageTabButtonStyle}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
          <label style={standaloneHomepageToggleLabelStyle}>
            <input
              type="checkbox"
              checked={homepageLayoutControls.contentBoundsOverlay}
              onChange={(event) => updateHomepageLayoutControls({
                contentBoundsOverlay: event.target.checked,
              })}
            />
            Home Bounds
          </label>
          <div style={standaloneHomepageSegmentedControlStyle}>
            {previewModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                style={homepagePreviewLayoutMode === mode.id ? standaloneHomepageActiveTabButtonStyle : standaloneHomepageTabButtonStyle}
                onClick={() => handleHomepagePreviewLayoutModeChange(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <span style={standaloneHomepageToolbarSpacerStyle} />
          <button
            type="button"
            style={standaloneHomepageToolbarButtonStyle}
            onClick={handleResetBlock}
          >
            Reset Block
          </button>
          <button
            type="button"
            style={isCopyCurrent ? standaloneHomepageSavedButtonStyle : standaloneHomepageToolbarButtonStyle}
            onClick={() => void handleCopy()}
          >
            {isCopyCurrent ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            style={standaloneHomepageSavedButtonStyle}
            disabled={isSaving}
            onClick={() => void handleSaveAll()}
          >
            {isSaving ? 'Saving...' : 'Save + Sync'}
          </button>
          <button
            type="button"
            style={standaloneHomepageDangerButtonStyle}
            onClick={handleResetAll}
          >
            Reset All
          </button>
        </div>
        {status ? (
          <div style={{ color: '#bbf7d0', fontSize: '0.75rem' }}>
            {status}
          </div>
        ) : null}
        {tab === 'header' ? (
          <HeaderProfileControlsPanel />
        ) : null}
        {tab === 'about' ? (
          <HomeShowcaseFrameControlsPanel
            title="About Us Showcase Controls"
            description="Shared frame, A/B split, footer, and B-side copy tuning for the About block."
            controls={aboutControls}
            onControlsChange={updateAboutControls}
            previewLayoutMode={aboutPreviewLayoutMode}
            responsiveVariant={responsiveVariant}
            resolveImageUrl={resolveAboutBannerImageUrl}
            onImageUpload={handleAboutBannerImageUpload}
            showActions={false}
          />
        ) : null}
        {tab === 'featured' ? (
          <FeaturedGameShowcaseControls
            title="Featured Showcase Controls"
            description="Shared SVG layout tuning for the homepage featured block."
            controls={featuredControls}
            onControlsChange={updateFeaturedControls}
            previewLayoutMode={featuredPreviewLayoutMode}
            responsiveVariant={responsiveVariant}
            controlScope="featured"
            showActions={false}
          />
        ) : null}
        {tab === 'comingSoon' ? (
          <FeaturedGameShowcaseControls
            title="Coming Soon Showcase Controls"
            description="Same SVG shell as Featured, tuned for Coming Soon / Available Now cards and catalog montage."
            controls={comingSoonControls}
            onControlsChange={updateComingSoonControls}
            previewLayoutMode={comingSoonPreviewLayoutMode}
            responsiveVariant={responsiveVariant}
            controlScope="comingSoon"
            showActions={false}
          />
        ) : null}
      </div>
    </div>
  );
};

type SelectedGameLayoutControlTab =
  | 'header'
  | 'visibility'
  | 'layout'
  | 'sideA'
  | 'sideB'
  | 'tabs'
  | 'quickStrip'
  | 'tip'
  | 'action'
  | 'visuals'
  | 'glow'
  | 'colors'
  | 'contentPlan';

const selectedGameControlTabs: { id: SelectedGameLayoutControlTab; label: string }[] = [
  { id: 'header', label: 'Header' },
  { id: 'visibility', label: 'Visibility' },
  { id: 'layout', label: 'Layout / SVG' },
  { id: 'sideA', label: 'Side A' },
  { id: 'sideB', label: 'Side B' },
  { id: 'tabs', label: 'Tabs' },
  { id: 'quickStrip', label: 'Quick Strip' },
  { id: 'tip', label: 'Tip' },
  { id: 'action', label: 'Action' },
  { id: 'visuals', label: 'Visuals' },
  { id: 'glow', label: 'Glow' },
  { id: 'colors', label: 'Colors' },
  { id: 'contentPlan', label: 'Content Plan' },
];

type SelectedGameNumberControl = {
  path: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  section?: string;
};

type SelectedGameBooleanControl = {
  path: string;
  label: string;
  defaultValue?: boolean;
  section?: string;
};

type SelectedGameColorControl = {
  path: string;
  label: string;
  defaultValue?: string;
  section?: string;
};

function getSelectedGameDefaultValue(path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => (
    current && typeof current === 'object'
      ? (current as Record<string, unknown>)[part]
      : undefined
  ), DEFAULT_SELECTED_GAME_SHOWCASE_CONFIG);
}

function getSelectedGameDefaultNumber(path: string, fallback = 0): number {
  const value = getSelectedGameDefaultValue(path);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getSelectedGameDefaultBoolean(path: string, fallback = false): boolean {
  const value = getSelectedGameDefaultValue(path);
  return typeof value === 'boolean' ? value : fallback;
}

function getSelectedGameDefaultString(path: string, fallback = ''): string {
  const value = getSelectedGameDefaultValue(path);
  return typeof value === 'string' ? value : fallback;
}

const selectedGameNumberControls: Record<SelectedGameLayoutControlTab, SelectedGameNumberControl[]> = {
  header: [],
  visibility: [],
  layout: [
    { section: 'Canvas', path: 'canvas.vw', label: 'ViewBox Width', min: 720, max: 2400, step: 1 },
    { section: 'Canvas', path: 'canvas.vh', label: 'ViewBox Height', min: 720, max: 1400, step: 1 },
    { section: 'Canvas', path: 'canvas.pad', label: 'Canvas Pad', min: 0, max: 64, step: 1 },
    { section: 'Canvas', path: 'canvas.svgBgOpacity', label: 'SVG Background Opacity', min: 0, max: 1, step: 0.01 },
    { section: 'Page Frame', path: 'page.x', label: 'Page X', min: 0, max: 200, step: 1 },
    { section: 'Page Frame', path: 'page.y', label: 'Page Y', min: 0, max: 220, step: 1 },
    { section: 'Page Frame', path: 'page.width', label: 'Page Width', min: 560, max: 1900, step: 1 },
    { section: 'Page Frame', path: 'page.height', label: 'Page Height', min: 600, max: 1200, step: 1 },
    { section: 'Page Frame', path: 'page.radius', label: 'Page Radius', min: 0, max: 40, step: 1 },
    { section: 'Page Frame', path: 'page.strokeWidth', label: 'Page Stroke Width', min: 0, max: 6, step: 0.1 },
    { section: 'Page Frame', path: 'page.shadowBlur', label: 'Shadow Blur', min: 0, max: 40, step: 1 },
    { section: 'Page Frame', path: 'page.shadowY', label: 'Shadow Y', min: -20, max: 40, step: 1 },
    { section: 'Page Frame', path: 'page.shadowOpacity', label: 'Shadow Opacity', min: 0, max: 1, step: 0.01 },
    { section: 'A/B Split', path: 'body.leftWidth', label: 'Side A Fixed Width', min: 220, max: 900, step: 1 },
    { section: 'A/B Split', path: 'body.aRatio', label: 'A/B Ratio', min: 0.15, max: 0.55, step: 0.01 },
    { section: 'A/B Split', path: 'body.bottomInset', label: 'Body Bottom Inset', min: 0, max: 100, step: 1 },
    { section: 'A/B Split', path: 'body.rowGap', label: 'Body Gap', min: 0, max: 60, step: 1 },
    { section: 'Divider', path: 'body.dividerWidth', label: 'Divider Width', min: 0, max: 8, step: 0.1 },
    { section: 'Divider', path: 'body.dividerConnectorWidth', label: 'Connector Width', min: 0, max: 8, step: 0.1 },
    { section: 'Divider', path: 'body.dividerConnectorOpacity', label: 'Connector Opacity', min: 0, max: 1, step: 0.01 },
    { section: 'Overlay', path: 'body.overlayRadius', label: 'Overlay Radius', min: 0, max: 50, step: 1 },
    { section: 'Overlay', path: 'body.overlayDitherOpacity', label: 'Dither Opacity', min: 0, max: 0.12, step: 0.005 },
    { section: 'Overlay', path: 'body.overlayDitherScale', label: 'Dither Scale', min: 0.1, max: 14, step: 0.1 },
    { section: 'Overlay', path: 'body.overlayMidStop', label: 'Gradient Mid Stop', min: 0.1, max: 0.75, step: 0.01 },
    { section: 'Overlay', path: 'body.overlaySoftStop', label: 'Gradient Soft Stop', min: 0.3, max: 0.95, step: 0.01 },
  ],
  sideA: [
    { section: 'Logo / Text', path: 'sideA.logoXPad', label: 'Logo X Pad', min: 0, max: 80, step: 1 },
    { section: 'Logo / Text', path: 'sideA.logoY', label: 'Logo Y', min: 0, max: 180, step: 1 },
    { section: 'Logo / Text', path: 'sideA.logoFont', label: 'Logo Font', min: 20, max: 100, step: 1 },
    { section: 'Logo / Text', path: 'sideA.taglineFont', label: 'Tagline Font', min: 8, max: 36, step: 1 },
    { section: 'Logo / Text', path: 'sideA.taglineGap', label: 'Tagline Gap', min: 8, max: 80, step: 1 },
    { section: 'Stats', path: 'sideA.statsY', label: 'Stats Y', min: 80, max: 320, step: 1 },
    { section: 'Stats', path: 'sideA.statsH', label: 'Stats Height', min: 30, max: 110, step: 1 },
    { section: 'Stats', path: 'sideA.statsGap', label: 'Stats Gap', min: 0, max: 30, step: 1 },
    { section: 'Stats', path: 'sideA.statRadius', label: 'Stats Radius', min: 0, max: 30, step: 1 },
    { section: 'Image / Fade', path: 'sideA.artY', label: 'Media Y', min: 160, max: 460, step: 1 },
    { section: 'Image / Fade', path: 'sideA.artBottomPad', label: 'Media Bottom Pad', min: 0, max: 560, step: 1 },
    { section: 'Image / Fade', path: 'sideA.artTopFade', label: 'Top Fade Stop', min: 0, max: 0.5, step: 0.01 },
    { section: 'Image / Fade', path: 'sideA.artBottomFade', label: 'Bottom Fade Stop', min: 0.5, max: 1, step: 0.01 },
  ],
  sideB: [
    { section: 'Overview Text', path: 'overview.xPad', label: 'Overview X Pad', min: 0, max: 80, step: 1 },
    { section: 'Overview Text', path: 'overview.textX', label: 'Text X', min: 0, max: 100, step: 1 },
    { section: 'Overview Text', path: 'overview.titleY', label: 'Title Y', min: 10, max: 100, step: 1 },
    { section: 'Overview Text', path: 'overview.titleFont', label: 'Title Font', min: 10, max: 40, step: 1 },
    { section: 'Overview Text', path: 'overview.titleLetterSpacing', label: 'Title Spacing', min: 0, max: 10, step: 0.1 },
    { section: 'Overview Text', path: 'overview.bodyY', label: 'Body Y', min: 40, max: 160, step: 1 },
    { section: 'Overview Text', path: 'overview.bodyFont', label: 'Body Font', min: 8, max: 30, step: 1 },
    { section: 'Overview Text', path: 'overview.lineGap', label: 'Line Gap', min: 12, max: 50, step: 1 },
    { section: 'Overview Text', path: 'overview.paraGap', label: 'Paragraph Gap', min: 20, max: 100, step: 1 },
    { section: 'Overview Image', path: 'overview.imageRatio', label: 'Image Width Ratio', min: 0.1, max: 0.8, step: 0.01 },
    { section: 'Overview Image', path: 'overview.imageBottomHowToRatio', label: 'Image Bottom Ratio', min: 0.1, max: 1.25, step: 0.01 },
    { section: 'Overview Image', path: 'overview.imageCornerFadeCx', label: 'Fade Center X', min: -0.5, max: 1.5, step: 0.01 },
    { section: 'Overview Image', path: 'overview.imageCornerFadeCy', label: 'Fade Center Y', min: -0.5, max: 1.5, step: 0.01 },
    { section: 'Overview Image', path: 'overview.imageCornerFadeInner', label: 'Fade Solid Radius', min: 0, max: 1, step: 0.01 },
    { section: 'Overview Image', path: 'overview.imageCornerFadeSoft1', label: 'Fade Soft Stop 1', min: 0, max: 1.5, step: 0.01 },
    { section: 'Overview Image', path: 'overview.imageCornerFadeSoft2', label: 'Fade Soft Stop 2', min: 0, max: 1.5, step: 0.01 },
    { section: 'Overview Image', path: 'overview.imageCornerFadeOuter', label: 'Fade Outer Radius', min: 0.05, max: 1.8, step: 0.01 },
    { section: 'Overview Image', path: 'overview.imageCornerFadeMidOpacity', label: 'Mid Fade Opacity', min: 0, max: 1, step: 0.01 },
    { section: 'Overview Image', path: 'overview.imageCornerFadeSoftOpacity', label: 'Soft Fade Opacity', min: 0, max: 1, step: 0.01 },
    { section: 'Overview Image', path: 'overview.imageMaskBlur', label: 'Image Mask Blur', min: 0, max: 60, step: 1 },
    { section: 'How To Container', path: 'howTo.yOffset', label: 'How To Y Offset', min: -140, max: 180, step: 1 },
    { section: 'How To Container', path: 'howTo.topGap', label: 'How To Top Gap', min: 0, max: 100, step: 1 },
    { section: 'How To Container', path: 'howTo.height', label: 'How To Height', min: 120, max: 420, step: 1 },
    { section: 'How To Container', path: 'howTo.xPad', label: 'How To X Pad', min: 0, max: 80, step: 1 },
    { section: 'How To Container', path: 'howTo.headerH', label: 'Header Height', min: 20, max: 90, step: 1 },
    { section: 'How To Container', path: 'howTo.bodyPadX', label: 'Body Pad X', min: 0, max: 50, step: 1 },
    { section: 'How To Container', path: 'howTo.bodyPadBottom', label: 'Body Pad Bottom', min: 0, max: 50, step: 1 },
    { section: 'How To Container', path: 'howTo.boxRadius', label: 'Box Radius', min: 0, max: 30, step: 1 },
    { section: 'How To Cards', path: 'howTo.arrowW', label: 'Step Arrow Width', min: 0, max: 80, step: 1 },
    { section: 'How To Cards', path: 'howTo.titleFont', label: 'Title Font', min: 10, max: 40, step: 1 },
    { section: 'How To Cards', path: 'howTo.titleLetterSpacing', label: 'Title Spacing', min: 0, max: 10, step: 0.1 },
    { section: 'How To Cards', path: 'howTo.stepRadius', label: 'Step Radius', min: 0, max: 30, step: 1 },
    { section: 'How To Cards', path: 'howTo.stepCircleMaxR', label: 'Circle Max Radius', min: 10, max: 70, step: 1 },
    { section: 'How To Cards', path: 'howTo.stepIconScale', label: 'Icon Scale', min: 0.2, max: 1.5, step: 0.01 },
    { section: 'How To Cards', path: 'howTo.stepTitleFont', label: 'Step Title Font', min: 8, max: 28, step: 1 },
    { section: 'How To Cards', path: 'howTo.stepBodyFont', label: 'Step Body Font', min: 6, max: 22, step: 0.5 },
    { section: 'How To Pager', path: 'howTo.stepsPerPage', label: 'Steps Per Page', min: 1, max: 5, step: 1 },
    { section: 'How To Pager', path: 'howTo.pagerArrowWidth', label: 'Pager Arrow Width', min: 12, max: 72, step: 1 },
    { section: 'How To Pager', path: 'howTo.pagerArrowHeight', label: 'Pager Arrow Height', min: 24, max: 240, step: 1 },
    { section: 'How To Pager', path: 'howTo.pagerSideInset', label: 'Pager Arrow Outside Gap', min: -40, max: 120, step: 1 },
    { section: 'How To Pager', path: 'howTo.pagerPillW', label: 'Pager Pill Width', min: 4, max: 40, step: 1 },
    { section: 'How To Pager', path: 'howTo.pagerActivePillW', label: 'Active Pill Width', min: 8, max: 80, step: 1 },
    { section: 'How To Pager', path: 'howTo.pagerPillH', label: 'Pager Pill Height', min: 2, max: 20, step: 1 },
    { section: 'How To Pager', path: 'howTo.pagerPillGap', label: 'Pager Pill Gap', min: 0, max: 24, step: 1 },
  ],
  tabs: [
    { section: 'Placement / Size', path: 'tabGroup.y', label: 'Tab Y', min: 0, max: 160, step: 1 },
    { section: 'Placement / Size', path: 'tabGroup.tabW', label: 'Tab Width', min: 60, max: 260, step: 1 },
    { section: 'Placement / Size', path: 'tabGroup.tabH', label: 'Tab Height', min: 24, max: 90, step: 1 },
    { section: 'Placement / Size', path: 'tabGroup.tabGap', label: 'Tab Gap', min: 0, max: 30, step: 1 },
    { section: 'Placement / Size', path: 'tabGroup.bgPadX', label: 'Outer Pad X', min: 0, max: 40, step: 1 },
    { section: 'Placement / Size', path: 'tabGroup.bgPadY', label: 'Outer Pad Y', min: 0, max: 30, step: 1 },
    { section: 'Shape / Text', path: 'tabGroup.radius', label: 'Group Radius', min: 0, max: 30, step: 1 },
    { section: 'Shape / Text', path: 'tabGroup.tabTopRadius', label: 'Tab Top Radius', min: 0, max: 30, step: 1 },
    { section: 'Shape / Text', path: 'tabGroup.tabBottomRadius', label: 'Tab Bottom Radius', min: 0, max: 30, step: 1 },
    { section: 'Shape / Text', path: 'tabGroup.fontSize', label: 'Tab Font', min: 8, max: 28, step: 1 },
    { section: 'Shape / Text', path: 'tabGroup.activeLineH', label: 'Active Line Height', min: 0, max: 10, step: 1 },
    { section: 'Shape / Text', path: 'tabGroup.shineH', label: 'Shine Height', min: 0, max: 40, step: 1 },
  ],
  quickStrip: [
    { section: 'Overall Placement', path: 'strip.yOffset', label: 'Strip Y Offset', min: -140, max: 180, step: 1 },
    { section: 'Overall Placement', path: 'strip.topGap', label: 'Top Gap', min: 0, max: 100, step: 1 },
    { section: 'Overall Placement', path: 'strip.insetX', label: 'Inset X', min: 0, max: 160, step: 1 },
    { section: 'Overall Placement', path: 'strip.height', label: 'Height', min: 96, max: 360, step: 1 },
    { section: 'Overall Placement', path: 'strip.radius', label: 'Strip Radius', min: 0, max: 40, step: 1 },
    { section: 'Overall Placement', path: 'strip.fillOpacity', label: 'Fill Opacity', min: 0, max: 1, step: 0.01 },
    { section: 'Overall Placement', path: 'strip.shineH', label: 'Top Shine Height', min: 0, max: 80, step: 1 },
    { section: 'Viewport / Arrows', path: 'strip.carouselPadTop', label: 'Card Top Pad', min: 0, max: 90, step: 1 },
    { section: 'Viewport / Arrows', path: 'strip.carouselPadBottom', label: 'Footer Bottom Pad', min: 0, max: 100, step: 1 },
    { section: 'Viewport / Arrows', path: 'strip.carouselSidePad', label: 'Side Pad', min: 0, max: 80, step: 1 },
    { section: 'Viewport / Arrows', path: 'strip.arrowWidth', label: 'Arrow Width', min: 20, max: 140, step: 1 },
    { section: 'Viewport / Arrows', path: 'strip.arrowHeight', label: 'Arrow Height', min: 20, max: 260, step: 1 },
    { section: 'Viewport / Arrows', path: 'strip.arrowOutsideGap', label: 'Arrow Outside Gap', min: -30, max: 80, step: 1 },
    { section: 'Viewport / Arrows', path: 'strip.arrowYOffset', label: 'Arrow Y Offset', min: -60, max: 60, step: 1 },
    { section: 'Viewport / Arrows', path: 'strip.arrowRadius', label: 'Arrow Radius', min: 0, max: 40, step: 1 },
    { section: 'Cards', path: 'strip.cardGap', label: 'Card Gap', min: 0, max: 50, step: 1 },
    { section: 'Cards', path: 'strip.uniformCardWidth', label: 'Manual Card Width', min: 120, max: 620, step: 1 },
    { section: 'Cards', path: 'strip.cardMinWidth', label: 'Auto Min Width', min: 80, max: 360, step: 1 },
    { section: 'Cards', path: 'strip.cardMaxWidth', label: 'Auto Max Width', min: 160, max: 620, step: 1 },
    { section: 'Cards', path: 'strip.cardRadius', label: 'Card Radius', min: 0, max: 40, step: 1 },
    { section: 'Cards', path: 'strip.cardTextPadRight', label: 'Text Right Pad', min: 0, max: 80, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.headerStripHeight', label: 'Header Strip Height', min: 16, max: 90, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.headerIconSize', label: 'Icon Size', min: 8, max: 50, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.headerIconInsetX', label: 'Icon X', min: 0, max: 70, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.headerTitleFont', label: 'Title Font', min: 8, max: 34, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.headerTitleInsetX', label: 'Title X', min: 20, max: 120, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.headerLetterSpacing', label: 'Title Spacing', min: 0, max: 10, step: 0.1 },
    { section: 'Header / Bullets / Footer', path: 'strip.headerTextExtraPad', label: 'Header Extra Pad', min: 0, max: 100, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.bulletTop', label: 'Bullet Top', min: 30, max: 160, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.bulletFont', label: 'Bullet Font', min: 7, max: 24, step: 0.5 },
    { section: 'Header / Bullets / Footer', path: 'strip.bulletGap', label: 'Bullet Gap', min: 0, max: 30, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.bulletInsetX', label: 'Bullet X', min: 0, max: 70, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.bulletDotSize', label: 'Dot Size', min: 1, max: 10, step: 0.1 },
    { section: 'Header / Bullets / Footer', path: 'strip.bodyLineHeight', label: 'Line Height', min: 10, max: 32, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.footerLineOffset', label: 'Footer Line Y', min: -40, max: 30, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.footerPillY', label: 'Footer Pill Y', min: -20, max: 40, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.footerPillW', label: 'Inactive Pill Width', min: 4, max: 50, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.footerActivePillW', label: 'Active Pill Width', min: 10, max: 90, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.footerPillH', label: 'Pill Height', min: 3, max: 24, step: 1 },
    { section: 'Header / Bullets / Footer', path: 'strip.footerPillGap', label: 'Pill Gap', min: 0, max: 30, step: 1 },
  ],
  tip: [
    { section: 'Tip Box', path: 'tip.yOffset', label: 'Tip Y Offset', min: -140, max: 160, step: 1 },
    { section: 'Tip Box', path: 'tip.topGap', label: 'Tip Top Gap', min: 0, max: 60, step: 1 },
    { section: 'Tip Box', path: 'tip.height', label: 'Height', min: 30, max: 140, step: 1 },
    { section: 'Tip Box', path: 'tip.sideInset', label: 'Side Inset', min: 0, max: 700, step: 1 },
    { section: 'Tip Box', path: 'tip.radius', label: 'Radius', min: 0, max: 30, step: 1 },
    { section: 'Tip Box', path: 'tip.iconX', label: 'Icon X', min: 0, max: 100, step: 1 },
    { section: 'Tip Box', path: 'tip.textX', label: 'Text X', min: 50, max: 260, step: 1 },
    { section: 'Tip Box', path: 'tip.iconFont', label: 'Icon Font', min: 10, max: 40, step: 1 },
    { section: 'Tip Box', path: 'tip.textFont', label: 'Text Font', min: 10, max: 32, step: 1 },
  ],
  action: [
    { section: 'Rail / Button', path: 'button.yOffsetFromBottom', label: 'Button Bottom Offset', min: 0, max: 120, step: 1 },
    { section: 'Rail / Button', path: 'button.edgeOffsetY', label: 'Rail Edge Y Offset', min: -90, max: 90, step: 1 },
    { section: 'Rail / Button', path: 'button.railHeight', label: 'Rail Height', min: 40, max: 180, step: 1 },
    { section: 'Rail / Button', path: 'button.railInsetX', label: 'Rail Side Inset', min: 0, max: 600, step: 1 },
    { section: 'Rail / Button', path: 'button.width', label: 'Button Width', min: 160, max: 600, step: 1 },
    { section: 'Rail / Button', path: 'button.height', label: 'Button Height', min: 30, max: 120, step: 1 },
    { section: 'Rail / Button', path: 'button.radius', label: 'Button Radius', min: 0, max: 30, step: 1 },
    { section: 'Rail / Button', path: 'button.fontSize', label: 'Font Size', min: 10, max: 40, step: 1 },
    { section: 'Rail / Button', path: 'button.letterSpacing', label: 'Letter Spacing', min: 0, max: 10, step: 0.1 },
    { section: 'Rail / Button', path: 'button.strokeOpacity', label: 'Stroke Opacity', min: 0, max: 1, step: 0.01 },
    { section: 'Rail / Button', path: 'button.shineH', label: 'Top Shine Height', min: 0, max: 40, step: 1 },
    { section: 'Arrow Box', path: 'button.innerBoxW', label: 'Arrow Box Width', min: 16, max: 120, step: 1 },
    { section: 'Arrow Box', path: 'button.innerBoxInset', label: 'All Side Inset', min: 0, max: 20, step: 1 },
    { section: 'Arrow Box', path: 'button.innerBoxInsetLeft', label: 'Inset Left', min: 0, max: 30, step: 1 },
    { section: 'Arrow Box', path: 'button.innerBoxInsetTop', label: 'Inset Top', min: 0, max: 30, step: 1 },
    { section: 'Arrow Box', path: 'button.innerBoxInsetRight', label: 'Inset Right', min: 0, max: 30, step: 1 },
    { section: 'Arrow Box', path: 'button.innerBoxInsetBottom', label: 'Inset Bottom', min: 0, max: 30, step: 1 },
    { section: 'Arrow Box', path: 'button.innerBoxRadius', label: 'Arrow Box Radius', min: 0, max: 20, step: 1 },
    { section: 'Arrow Box', path: 'button.innerBoxStrokeWidth', label: 'Arrow Box Stroke Width', min: 0, max: 5, step: 0.1 },
    { section: 'Arrow Box', path: 'button.innerBoxStrokeOpacity', label: 'Arrow Box Stroke Opacity', min: 0, max: 1, step: 0.01 },
    { section: 'Arrow Box', path: 'button.innerBoxShineH', label: 'Arrow Box Shine Height', min: 0, max: 40, step: 1 },
    { section: 'Arrow Box', path: 'button.innerBoxShineOpacity', label: 'Arrow Box Shine Opacity', min: 0, max: 0.5, step: 0.01 },
    { section: 'Arrow Box', path: 'button.arrowSize', label: 'Triangle Size', min: 4, max: 30, step: 1 },
    { section: 'Arrow Box', path: 'button.arrowOffsetX', label: 'Triangle X Offset', min: -20, max: 20, step: 1 },
    { section: 'Arrow Box', path: 'button.arrowOffsetY', label: 'Triangle Y Offset', min: -20, max: 20, step: 1 },
  ],
  visuals: [
    {
      section: 'Deck Preview',
      path: 'visuals.deck.cardTrackMin',
      label: 'Card Track Min',
      min: 28,
      max: 92,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS.cardTrackMin,
    },
    {
      section: 'Deck Preview',
      path: 'visuals.deck.cardWidth',
      label: 'Card Width',
      min: 24,
      max: 84,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS.cardWidth,
    },
    {
      section: 'Deck Preview',
      path: 'visuals.deck.cardCellMinHeight',
      label: 'Card Cell Height',
      min: 34,
      max: 120,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS.cardCellMinHeight,
    },
    {
      section: 'Deck Preview',
      path: 'visuals.deck.axisColumnWidth',
      label: 'Suit Column Width',
      min: 20,
      max: 70,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS.axisColumnWidth,
    },
    {
      section: 'Deck Preview',
      path: 'visuals.deck.matrixGap',
      label: 'Deck Matrix Gap',
      min: 0,
      max: 18,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS.matrixGap,
    },
    {
      section: 'Deck Preview',
      path: 'visuals.deck.rowGap',
      label: 'Deck Row Gap',
      min: 0,
      max: 18,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS.rowGap,
    },
    {
      section: 'Deck Preview',
      path: 'visuals.deck.axisGlyphSize',
      label: 'Suit Glyph Size',
      min: 10,
      max: 34,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS.axisGlyphSize,
    },
    {
      section: 'Deck Preview',
      path: 'visuals.deck.axisImageSize',
      label: 'Suit Image Size',
      min: 10,
      max: 34,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS.axisImageSize,
    },
    {
      section: 'Deck Detail Popup',
      path: 'visuals.deck.detailImageMaxWidth',
      label: 'Popup Image Max Width',
      min: 80,
      max: 260,
      step: 2,
      defaultValue: DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS.detailImageMaxWidth,
    },
    {
      section: 'Deck Detail Popup',
      path: 'visuals.deck.detailImageMaxHeight',
      label: 'Popup Image Max Height',
      min: 110,
      max: 360,
      step: 2,
      defaultValue: DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS.detailImageMaxHeight,
    },
    {
      section: 'Ranking Suit Icons',
      path: 'visuals.ranking.suitIconGap',
      label: 'Icon Card Gap',
      min: 0,
      max: 18,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.suitIconGap,
    },
    {
      section: 'Ranking Suit Icons',
      path: 'visuals.ranking.suitIconGlyphSize',
      label: 'Icon Glyph Box',
      min: 14,
      max: 42,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.suitIconGlyphSize,
    },
    {
      section: 'Ranking Suit Icons',
      path: 'visuals.ranking.suitIconGlyphFont',
      label: 'Icon Glyph Font',
      min: 10,
      max: 30,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.suitIconGlyphFont,
    },
    {
      section: 'Ranking Suit Icons',
      path: 'visuals.ranking.suitIconLabelFont',
      label: 'Icon Label Font',
      min: 8,
      max: 22,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.suitIconLabelFont,
    },
    {
      section: 'Ranking Suit Icons',
      path: 'visuals.ranking.suitIconPadY',
      label: 'Icon Pad Y',
      min: 1,
      max: 16,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.suitIconPadY,
    },
    {
      section: 'Ranking Suit Icons',
      path: 'visuals.ranking.suitIconPadX',
      label: 'Icon Pad X',
      min: 2,
      max: 22,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.suitIconPadX,
    },
    {
      section: 'Ranking Suit Icons',
      path: 'visuals.ranking.suitIconRadius',
      label: 'Icon Radius',
      min: 0,
      max: 18,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.suitIconRadius,
    },
    {
      section: 'Ranking Summary',
      path: 'visuals.ranking.summaryGap',
      label: 'Summary Gap',
      min: 0,
      max: 18,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.summaryGap,
    },
    {
      section: 'Ranking Summary',
      path: 'visuals.ranking.summaryLabelFont',
      label: 'Summary Label Font',
      min: 8,
      max: 22,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.summaryLabelFont,
    },
    {
      section: 'Ranking Summary',
      path: 'visuals.ranking.summaryValueFont',
      label: 'Summary Value Font',
      min: 9,
      max: 28,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.summaryValueFont,
    },
    {
      section: 'Ranking Summary',
      path: 'visuals.ranking.summaryPadY',
      label: 'Summary Pad Y',
      min: 1,
      max: 16,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.summaryPadY,
    },
    {
      section: 'Ranking Summary',
      path: 'visuals.ranking.summaryPadX',
      label: 'Summary Pad X',
      min: 2,
      max: 22,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.summaryPadX,
    },
    {
      section: 'Ranking Matrix',
      path: 'visuals.ranking.matrixRowHeight',
      label: 'Matrix Row Height',
      min: 24,
      max: 72,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.matrixRowHeight,
    },
    {
      section: 'Ranking Matrix',
      path: 'visuals.ranking.matrixRankColumnWidth',
      label: 'Rank Column Width',
      min: 42,
      max: 120,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.matrixRankColumnWidth,
    },
    {
      section: 'Ranking Matrix',
      path: 'visuals.ranking.matrixCellFont',
      label: 'Matrix Cell Font',
      min: 9,
      max: 30,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.matrixCellFont,
    },
    {
      section: 'Ranking Matrix',
      path: 'visuals.ranking.matrixHeaderFont',
      label: 'Matrix Header Font',
      min: 10,
      max: 34,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.matrixHeaderFont,
    },
    {
      section: 'Ranking Matrix',
      path: 'visuals.ranking.matrixCellPadY',
      label: 'Matrix Pad Y',
      min: 0,
      max: 14,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.matrixCellPadY,
    },
    {
      section: 'Ranking Matrix',
      path: 'visuals.ranking.matrixCellPadX',
      label: 'Matrix Pad X',
      min: 0,
      max: 20,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.matrixCellPadX,
    },
    {
      section: 'Ranking Matrix',
      path: 'visuals.ranking.matrixRadius',
      label: 'Matrix Radius',
      min: 0,
      max: 20,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.matrixRadius,
    },
    {
      section: 'Ranking Matrix',
      path: 'visuals.ranking.matrixScrollbarSize',
      label: 'Scrollbar Size',
      min: 4,
      max: 16,
      step: 1,
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.matrixScrollbarSize,
    },
  ],
  glow: [
    { section: 'Page / Tabs Glow', path: 'glow.pageBlur', label: 'Page Glow Blur', min: 0, max: 30, step: 1 },
    { section: 'Page / Tabs Glow', path: 'glow.pageOpacity', label: 'Page Glow Opacity', min: 0, max: 1, step: 0.01 },
    { section: 'Page / Tabs Glow', path: 'glow.tabsBlur', label: 'Top Tab Glow Blur', min: 0, max: 30, step: 1 },
    { section: 'Page / Tabs Glow', path: 'glow.tabsOpacity', label: 'Top Tab Glow Opacity', min: 0, max: 1, step: 0.01 },
    { section: 'Panels / Strip / Button Glow', path: 'glow.panelsBlur', label: 'Panel Glow Blur', min: 0, max: 30, step: 1 },
    { section: 'Panels / Strip / Button Glow', path: 'glow.panelsOpacity', label: 'Panel Glow Opacity', min: 0, max: 1, step: 0.01 },
    { section: 'Panels / Strip / Button Glow', path: 'glow.stripBlur', label: 'Strip Glow Blur', min: 0, max: 30, step: 1 },
    { section: 'Panels / Strip / Button Glow', path: 'glow.stripOpacity', label: 'Strip Glow Opacity', min: 0, max: 1, step: 0.01 },
    { section: 'Panels / Strip / Button Glow', path: 'glow.buttonBlur', label: 'Button Glow Blur', min: 0, max: 30, step: 1 },
    { section: 'Panels / Strip / Button Glow', path: 'glow.buttonOpacity', label: 'Button Glow Opacity', min: 0, max: 1, step: 0.01 },
  ],
  colors: [],
  contentPlan: [],
};

const selectedGameBooleanControls: Record<SelectedGameLayoutControlTab, SelectedGameBooleanControl[]> = {
  header: [],
  visibility: [
    { section: 'Top Level', path: 'visibility.tabGroup', label: 'Tab Group' },
    { section: 'Top Level', path: 'visibility.pageFrame', label: 'Page Frame' },
    { section: 'Top Level', path: 'visibility.bodyOverlay', label: 'Body Overlay' },
    { section: 'A Side', path: 'visibility.sideA', label: 'A Side Group' },
    { section: 'A Side', path: 'visibility.hero', label: 'Hero / Logo' },
    { section: 'A Side', path: 'visibility.stats', label: 'Stats Cards' },
    { section: 'A Side', path: 'visibility.sideAImage', label: 'A Side Image' },
    { section: 'B Side', path: 'visibility.sideB', label: 'B Side Group' },
    { section: 'B Side', path: 'visibility.divider', label: 'A/B Divider' },
    { section: 'B Side', path: 'visibility.overview', label: 'Overview Block' },
    { section: 'B Side', path: 'visibility.overviewImage', label: 'Overview Image' },
    { section: 'B Side', path: 'visibility.howTo', label: 'How To Block' },
    { section: 'B Side', path: 'visibility.howToCards', label: 'How To Cards' },
    { section: 'Bottom', path: 'visibility.strip', label: 'Quick Strip' },
    { section: 'Bottom', path: 'visibility.tip', label: 'Tip Box' },
    { section: 'Bottom', path: 'visibility.button', label: 'Action Buttons' },
  ],
  layout: [
    { section: 'Canvas', path: 'canvas.whitePreviewBg', label: 'White Preview Background' },
    { section: 'Canvas', path: 'canvas.showDebugLabels', label: 'Show Debug Labels' },
    { section: 'A/B Split', path: 'body.useABRatio', label: 'Use A/B Ratio' },
    { section: 'Divider', path: 'body.dividerConnectToStrip', label: 'Divider Touches Strip' },
    { section: 'Overlay', path: 'body.overlayDither', label: 'Anti-band Dither' },
  ],
  sideA: [],
  sideB: [],
  tabs: [],
  quickStrip: [
    { section: 'Cards', path: 'strip.forceUniformCardWidth', label: 'Force Same Card Width' },
  ],
  tip: [],
  action: [],
  visuals: [
    {
      section: 'Ranking Suit Icons',
      path: 'visuals.ranking.showSuitIcons',
      label: 'Show Ranking Suit Icon Row',
      defaultValue: DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS.showSuitIcons,
    },
  ],
  glow: [
    { section: 'Page / Tabs Glow', path: 'glow.page', label: 'Page Glow' },
    { section: 'Page / Tabs Glow', path: 'glow.tabs', label: 'Top Tab Glow' },
    { section: 'Panels / Strip / Button Glow', path: 'glow.panels', label: 'Panel Glow' },
    { section: 'Panels / Strip / Button Glow', path: 'glow.strip', label: 'Strip Glow' },
    { section: 'Panels / Strip / Button Glow', path: 'glow.button', label: 'Button Glow' },
  ],
  colors: [],
  contentPlan: [],
};

const selectedGameColorControls: Record<SelectedGameLayoutControlTab, SelectedGameColorControl[]> = {
  header: [],
  visibility: [],
  layout: [],
  sideA: [],
  sideB: [],
  tabs: [],
  quickStrip: [],
  tip: [],
  action: [],
  visuals: [],
  glow: [
    { section: 'Global Glow Colors', path: 'glow.color', label: 'Glow Color' },
    { section: 'Global Glow Colors', path: 'glow.activeColor', label: 'Active Glow Color' },
  ],
  colors: [
    { section: 'Page / Tabs / Body', path: 'colors.pageStroke', label: 'Page Stroke' },
    { section: 'Page / Tabs / Body', path: 'colors.tabStroke', label: 'Tab Stroke' },
    { section: 'Page / Tabs / Body', path: 'colors.tabInactiveFill', label: 'Tab Inactive Fill' },
    { section: 'Page / Tabs / Body', path: 'colors.tabActiveTop', label: 'Tab Active Top' },
    { section: 'Page / Tabs / Body', path: 'colors.tabActiveMid', label: 'Tab Active Middle' },
    { section: 'Page / Tabs / Body', path: 'colors.tabActiveBottom', label: 'Tab Active Bottom' },
    { section: 'Page / Tabs / Body', path: 'colors.tabActiveLine', label: 'Active Line' },
    { section: 'Page / Tabs / Body', path: 'colors.bodyOverlayTop', label: 'Overlay Top' },
    { section: 'Page / Tabs / Body', path: 'colors.bodyOverlayMid', label: 'Overlay Middle' },
    { section: 'Page / Tabs / Body', path: 'colors.bodyOverlayBottom', label: 'Overlay Bottom' },
    { section: 'Panels / Text / Strip', path: 'colors.cardPanelFill', label: 'Panel Fill' },
    { section: 'Panels / Text / Strip', path: 'colors.panelStroke', label: 'Panel Stroke' },
    { section: 'Panels / Text / Strip', path: 'colors.textPrimary', label: 'Text Primary' },
    { section: 'Panels / Text / Strip', path: 'colors.textMuted', label: 'Text Muted' },
    { section: 'Panels / Text / Strip', path: 'colors.titlePurple', label: 'Title Purple' },
    { section: 'Panels / Text / Strip', path: 'colors.iconPurple', label: 'Icon Purple' },
    { section: 'Panels / Text / Strip', path: 'colors.success', label: 'Success' },
    { section: 'Panels / Text / Strip', path: 'colors.tipGold', label: 'Tip Gold' },
    { section: 'Panels / Text / Strip', path: 'colors.stripStroke', label: 'Strip Stroke' },
    { section: 'Panels / Text / Strip', path: 'colors.stripCardStroke', label: 'Strip Card Stroke' },
    { section: 'Panels / Text / Strip', path: 'colors.stripActiveStroke', label: 'Strip Active Stroke' },
    { section: 'Panels / Text / Strip', path: 'colors.arrowHover', label: 'Arrow Hover' },
    { section: 'Button Gradient', path: 'colors.buttonLeft', label: 'Button Left' },
    { section: 'Button Gradient', path: 'colors.buttonMid', label: 'Button Middle' },
    { section: 'Button Gradient', path: 'colors.buttonRight', label: 'Button Right' },
  ],
  contentPlan: [],
};

function getNestedNumber(
  value: SelectedGameLayoutControls,
  path: string,
  fallback = 0
): number {
  const entry = path.split('.').reduce<unknown>((current, part) => (
    current && typeof current === 'object'
      ? (current as Record<string, unknown>)[part]
      : undefined
  ), value);
  return typeof entry === 'number' && Number.isFinite(entry) ? entry : fallback;
}

function getNestedBoolean(
  value: SelectedGameLayoutControls,
  path: string,
  fallback = false
): boolean {
  const entry = path.split('.').reduce<unknown>((current, part) => (
    current && typeof current === 'object'
      ? (current as Record<string, unknown>)[part]
      : undefined
  ), value);
  return typeof entry === 'boolean' ? entry : fallback;
}

function getNestedString(
  value: SelectedGameLayoutControls,
  path: string,
  fallback = ''
): string {
  const entry = path.split('.').reduce<unknown>((current, part) => (
    current && typeof current === 'object'
      ? (current as Record<string, unknown>)[part]
      : undefined
  ), value);
  return typeof entry === 'string' ? entry : fallback;
}

function setNestedControlValue(
  controls: SelectedGameLayoutControls,
  path: string,
  value: number | boolean | string
): SelectedGameLayoutControls {
  const next = JSON.parse(JSON.stringify(controls)) as Record<string, unknown>;
  const parts = path.split('.');
  let cursor = next;
  parts.slice(0, -1).forEach((part) => {
    const existing = cursor[part];
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  });
  cursor[parts[parts.length - 1] ?? path] = value;
  return next;
}

const selectedGamePanelStyle: React.CSSProperties = {
  display: 'grid',
  gap: '1rem',
  padding: '1rem',
};

const selectedGamePanelGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
  gap: '0.75rem',
};

const selectedGamePanelCardStyle: React.CSSProperties = {
  border: '1px solid rgba(103, 232, 249, 0.22)',
  borderRadius: '0.75rem',
  background: 'rgba(2, 6, 23, 0.72)',
  padding: '0.85rem',
};

const selectedGamePanelInputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid rgba(103, 232, 249, 0.32)',
  borderRadius: '0.45rem',
  background: 'rgba(2, 6, 23, 0.8)',
  color: '#e0f2fe',
  padding: '0.5rem',
};

const selectedGameToolbarInputStyle: React.CSSProperties = {
  width: '7.5rem',
  border: '1px solid rgba(103, 232, 249, 0.32)',
  borderRadius: '0.45rem',
  background: 'rgba(2, 6, 23, 0.8)',
  color: '#e0f2fe',
  padding: '0.38rem 0.55rem',
};

const selectedGameToolbarFieldStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.45rem',
  color: '#cffafe',
  fontSize: '0.75rem',
  fontWeight: 800,
};

const selectedGameTabOrder: SelectedGameTabId[] = [
  'about',
  'rules',
  'deck',
  'ranking',
  'scoring',
  'strategy',
  'systems',
];

const StandaloneSelectedGameLayoutControls: React.FC<{ assetPath: string }> = ({ assetPath }) => {
  const lockedGameId = useMemo(() => inferGameIdFromPageLayoutAssetPath(assetPath), [assetPath]);
  const defaultPreviewSampleGameId = lockedGameId ?? 'claim';
  const [tab, setTab] = useState<SelectedGameLayoutControlTab>('layout');
  const [layoutControls, setLayoutControls] = useState<SelectedGameLayoutControls>({});
  const [contentPlan, setContentPlan] =
    useState<SelectedGameContentPlan>(DEFAULT_SELECTED_GAME_CONTENT_PLAN);
  const [previewSampleGameId, setPreviewSampleGameId] = useState(defaultPreviewSampleGameId);
  const [previewLayoutMode, setPreviewLayoutMode] =
    useState<SelectedGamePreviewLayoutMode>('auto');
  const [debugBounds, setDebugBounds] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const config = useMemo<SelectedGameLayoutConfig>(() => ({
    layoutControls,
    contentPlan,
    previewSampleGameId: lockedGameId ?? previewSampleGameId,
    debugBounds,
  }), [contentPlan, debugBounds, layoutControls, lockedGameId, previewSampleGameId]);

  const copyValue = useMemo(() => JSON.stringify(config, null, 2), [config]);
  const isCopyCurrent = copiedValue === copyValue;

  const broadcastUpdate = useCallback((nextConfig: SelectedGameLayoutConfig) => {
    channelRef.current?.postMessage({
      type: 'update',
      layoutControls: nextConfig.layoutControls,
      contentPlan: nextConfig.contentPlan,
      previewSampleGameId: nextConfig.previewSampleGameId,
      debugBounds: nextConfig.debugBounds,
    } satisfies SelectedGameLayoutControlsMessage);
  }, []);

  const applyConfig = useCallback((nextConfig: SelectedGameLayoutConfig) => {
    const effectiveConfig = lockedGameId
      ? { ...nextConfig, previewSampleGameId: lockedGameId }
      : nextConfig;
    setLayoutControls(effectiveConfig.layoutControls);
    setContentPlan(effectiveConfig.contentPlan);
    setPreviewSampleGameId(effectiveConfig.previewSampleGameId);
    setDebugBounds(effectiveConfig.debugBounds);
    broadcastUpdate(effectiveConfig);
  }, [broadcastUpdate, lockedGameId]);

  useEffect(() => {
    let cancelled = false;
    void loadSelectedGameLayoutFromDisk(assetPath).then(({ config: loadedConfig }) => {
      if (!cancelled) {
        applyConfig(loadedConfig);
      }
    }).catch((error) => {
      if (!cancelled) {
        setStatus(error instanceof Error ? error.message : 'Failed to load selected-game layout');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [applyConfig, assetPath]);

  useEffect(() => {
    const channel = new BroadcastChannel(SELECTED_GAME_LAYOUT_CONTROLS_CHANNEL);
    channelRef.current = channel;
    const handler = (event: MessageEvent<SelectedGameLayoutControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          layoutControls,
          contentPlan,
          previewSampleGameId,
          previewLayoutMode,
          debugBounds,
        } satisfies SelectedGameLayoutControlsMessage);
        return;
      }
      if (event.data.type === 'state') {
        setLayoutControls(event.data.layoutControls);
        setContentPlan(event.data.contentPlan);
        setPreviewSampleGameId(event.data.previewSampleGameId);
        setPreviewLayoutMode(event.data.previewLayoutMode);
        setDebugBounds(event.data.debugBounds);
      }
    };
    channel.addEventListener('message', handler);
    channel.postMessage({ type: 'request-state' } satisfies SelectedGameLayoutControlsMessage);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
      channelRef.current = null;
    };
  }, [contentPlan, debugBounds, layoutControls, previewLayoutMode, previewSampleGameId]);

  const updateLayoutControl = useCallback((path: string, value: number | boolean | string) => {
    setLayoutControls((previous) => {
      const nextControls = setNestedControlValue(previous, path, value);
      broadcastUpdate({ ...config, layoutControls: nextControls });
      return nextControls;
    });
  }, [broadcastUpdate, config]);

  const updateContentPlanTab = useCallback((
    tabId: SelectedGameTabId,
    patch: Partial<SelectedGameContentPlan['tabs'][number]>
  ) => {
    setContentPlan((previous) => {
      const nextPlan = {
        tabs: selectedGameTabOrder.map((id) => {
          const existing =
            previous.tabs.find((item) => item.id === id) ??
            DEFAULT_SELECTED_GAME_CONTENT_PLAN.tabs.find((item) => item.id === id)!;
          return existing.id === tabId ? { ...existing, ...patch } : existing;
        }),
      };
      broadcastUpdate({ ...config, contentPlan: nextPlan });
      return nextPlan;
    });
  }, [broadcastUpdate, config]);

  const updatePreviewSample = useCallback((value: string) => {
    const nextValue = lockedGameId ?? value;
    setPreviewSampleGameId(nextValue);
    broadcastUpdate({ ...config, previewSampleGameId: nextValue });
  }, [broadcastUpdate, config, lockedGameId]);

  const updateDebugBounds = useCallback((value: boolean) => {
    setDebugBounds(value);
    broadcastUpdate({ ...config, debugBounds: value });
  }, [broadcastUpdate, config]);

  const handlePreviewLayoutModeChange = useCallback((mode: SelectedGamePreviewLayoutMode) => {
    setPreviewLayoutMode(mode);
    channelRef.current?.postMessage({
      type: 'preview-layout-mode',
      previewLayoutMode: mode,
    } satisfies SelectedGameLayoutControlsMessage);
  }, []);

  const handleCopy = useCallback(async () => {
    await copyTextToClipboard(copyValue);
    setCopiedValue(copyValue);
  }, [copyValue]);

  const handleSave = useCallback(async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setStatus('Saving...');
    try {
      const savedDocument = await saveSelectedGameLayoutToDisk(config, assetPath);
      const savedConfig = normalizeSelectedGameLayoutConfig(savedDocument);
      applyConfig(savedConfig);
      const syncResult = await syncSavedLayoutAssetToR2(assetPath);
      setStatus(syncResult.message);
    } catch (error) {
      logError('[StandaloneSelectedGameLayoutControls] save failed', error);
      setStatus(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [applyConfig, assetPath, config, isSaving]);

  const handleResetBlock = useCallback(() => {
    if (tab === 'contentPlan') {
      applyConfig({ ...config, contentPlan: DEFAULT_SELECTED_GAME_CONTENT_PLAN });
      return;
    }
    if (tab !== 'header') {
      const resetGroupsByTab: Partial<Record<SelectedGameLayoutControlTab, string[]>> = {
        visibility: ['visibility'],
        layout: ['canvas', 'page', 'body'],
        sideA: ['sideA'],
        sideB: ['overview', 'howTo'],
        tabs: ['tabGroup'],
        quickStrip: ['strip'],
        tip: ['tip'],
        action: ['button'],
        visuals: ['visuals'],
        glow: ['glow'],
        colors: ['colors'],
      };
      const groups = resetGroupsByTab[tab] ?? [tab];
      const nextControls = { ...layoutControls };
      groups.forEach((group) => delete (nextControls as Record<string, unknown>)[group]);
      applyConfig({ ...config, layoutControls: nextControls });
    }
  }, [applyConfig, config, layoutControls, tab]);

  const handleResetAll = useCallback(() => {
    applyConfig({
      layoutControls: {},
      contentPlan: DEFAULT_SELECTED_GAME_CONTENT_PLAN,
      previewSampleGameId: defaultPreviewSampleGameId,
      debugBounds: false,
    });
    handlePreviewLayoutModeChange('auto');
  }, [applyConfig, defaultPreviewSampleGameId, handlePreviewLayoutModeChange]);

  const previewModes: { id: SelectedGamePreviewLayoutMode; label: string }[] = [
    { id: 'auto', label: 'Auto' },
    { id: 'wide', label: 'Wide' },
    { id: 'narrow', label: 'Narrow' },
  ];

  const numberControls = selectedGameNumberControls[tab];
  const booleanControls = selectedGameBooleanControls[tab];
  const colorControls = selectedGameColorControls[tab];

  return (
    <div className="standalone-panel-page standalone-panel-page--featured-showcase-controls">
      <div style={selectedGamePanelStyle}>
        <div style={standaloneHomepageToolbarStyle}>
          {selectedGameControlTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              style={tab === item.id ? standaloneHomepageActiveTabButtonStyle : standaloneHomepageTabButtonStyle}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
          {lockedGameId ? (
            <span style={selectedGameToolbarFieldStyle}>
              Game
              <strong>{formatGameIdLabel(lockedGameId)}</strong>
            </span>
          ) : (
            <label style={selectedGameToolbarFieldStyle}>
              Sample
              <input
                type="text"
                value={previewSampleGameId}
                style={selectedGameToolbarInputStyle}
                onChange={(event) => updatePreviewSample(event.target.value)}
              />
            </label>
          )}
          <label style={standaloneHomepageToggleLabelStyle}>
            <input
              type="checkbox"
              checked={debugBounds}
              onChange={(event) => updateDebugBounds(event.target.checked)}
            />
            Bounds
          </label>
          <div style={standaloneHomepageSegmentedControlStyle}>
            {previewModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                style={previewLayoutMode === mode.id ? standaloneHomepageActiveTabButtonStyle : standaloneHomepageTabButtonStyle}
                onClick={() => handlePreviewLayoutModeChange(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <span style={standaloneHomepageToolbarSpacerStyle} />
          <button type="button" style={standaloneHomepageToolbarButtonStyle} onClick={handleResetBlock}>
            Reset Block
          </button>
          <button
            type="button"
            style={isCopyCurrent ? standaloneHomepageSavedButtonStyle : standaloneHomepageToolbarButtonStyle}
            onClick={() => void handleCopy()}
          >
            {isCopyCurrent ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            style={standaloneHomepageSavedButtonStyle}
            disabled={isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? 'Saving...' : 'Save + Sync'}
          </button>
          <button type="button" style={standaloneHomepageDangerButtonStyle} onClick={handleResetAll}>
            Reset All
          </button>
        </div>
        {status ? (
          <div style={{ color: '#bbf7d0', fontSize: '0.75rem' }}>
            {status}
          </div>
        ) : null}
        {tab === 'header' ? (
          <HeaderProfileControlsPanel />
        ) : null}
        {numberControls.length > 0 ? (
          <div style={selectedGamePanelGridStyle}>
            {numberControls.flatMap((field, index) => {
              const defaultValue = getSelectedGameDefaultNumber(field.path, field.defaultValue ?? 0);
              const value = getNestedNumber(layoutControls, field.path, defaultValue);
              const showSection = Boolean(field.section && field.section !== numberControls[index - 1]?.section);
              return [
                showSection ? (
                  <div
                    key={`${field.section}-heading`}
                    style={{
                      gridColumn: '1 / -1',
                      color: '#67e8f9',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {field.section}
                  </div>
                ) : null,
                <div key={field.path} style={selectedGamePanelCardStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem', color: '#cffafe', fontWeight: 800 }}>
                    <span>{field.label}</span>
                    <button
                      type="button"
                      style={gamesCatalogResetMiniButtonStyle}
                      onClick={() => updateLayoutControl(field.path, defaultValue)}
                    >
                      Reset
                    </button>
                  </span>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    value={value}
                    onChange={(event) => updateLayoutControl(field.path, Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    value={value}
                    style={selectedGamePanelInputStyle}
                    onChange={(event) => updateLayoutControl(field.path, Number(event.target.value))}
                  />
                </div>,
              ];
            })}
          </div>
        ) : null}
        {booleanControls.length > 0 ? (
          <div style={selectedGamePanelGridStyle}>
            {booleanControls.flatMap((field, index) => {
              const defaultValue = getSelectedGameDefaultBoolean(field.path, field.defaultValue ?? false);
              const value = getNestedBoolean(layoutControls, field.path, defaultValue);
              const showSection = Boolean(field.section && field.section !== booleanControls[index - 1]?.section);
              return [
                showSection ? (
                  <div
                    key={`${field.section}-boolean-heading`}
                    style={{
                      gridColumn: '1 / -1',
                      color: '#67e8f9',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {field.section}
                  </div>
                ) : null,
                <div key={field.path} style={selectedGamePanelCardStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', color: '#cffafe', fontWeight: 800 }}>
                    <label style={standaloneHomepageToggleLabelStyle}>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(event) => updateLayoutControl(field.path, event.target.checked)}
                      />
                      {field.label}
                    </label>
                    <button
                      type="button"
                      style={gamesCatalogResetMiniButtonStyle}
                      onClick={() => updateLayoutControl(field.path, defaultValue)}
                    >
                      Reset
                    </button>
                  </span>
                </div>,
              ];
            })}
          </div>
        ) : null}
        {colorControls.length > 0 ? (
          <div style={selectedGamePanelGridStyle}>
            {colorControls.flatMap((field, index) => {
              const defaultValue = getSelectedGameDefaultString(field.path, field.defaultValue ?? '#ffffff');
              const value = getNestedString(layoutControls, field.path, defaultValue);
              const showSection = Boolean(field.section && field.section !== colorControls[index - 1]?.section);
              return [
                showSection ? (
                  <div
                    key={`${field.section}-color-heading`}
                    style={{
                      gridColumn: '1 / -1',
                      color: '#67e8f9',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {field.section}
                  </div>
                ) : null,
                <div key={field.path} style={selectedGamePanelCardStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem', color: '#cffafe', fontWeight: 800 }}>
                    <span>{field.label}</span>
                    <button
                      type="button"
                      style={gamesCatalogResetMiniButtonStyle}
                      onClick={() => updateLayoutControl(field.path, defaultValue)}
                    >
                      Reset
                    </button>
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '3.5rem 1fr', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={value}
                      onChange={(event) => updateLayoutControl(field.path, event.target.value)}
                    />
                    <input
                      type="text"
                      value={value}
                      style={selectedGamePanelInputStyle}
                      onChange={(event) => updateLayoutControl(field.path, event.target.value)}
                    />
                  </div>
                </div>,
              ];
            })}
          </div>
        ) : null}
        {tab === 'contentPlan' ? (
          <div style={selectedGamePanelGridStyle}>
            {selectedGameTabOrder.map((id) => {
              const defaultPlanTab = DEFAULT_SELECTED_GAME_CONTENT_PLAN.tabs.find((item) => item.id === id)!;
              const planTab =
                contentPlan.tabs.find((item) => item.id === id) ??
                defaultPlanTab;
              return (
                <div key={id} style={selectedGamePanelCardStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem' }}>
                    <label style={standaloneHomepageToggleLabelStyle}>
                      <input
                        type="checkbox"
                        checked={planTab.enabled}
                        onChange={(event) => updateContentPlanTab(id, { enabled: event.target.checked })}
                      />
                      {id}
                    </label>
                    <button
                      type="button"
                      style={gamesCatalogResetMiniButtonStyle}
                      onClick={() => updateContentPlanTab(id, defaultPlanTab)}
                    >
                      Reset
                    </button>
                  </span>
                  <input
                    type="text"
                    value={planTab.label}
                    style={selectedGamePanelInputStyle}
                    onChange={(event) => updateContentPlanTab(id, { label: event.target.value })}
                  />
                  <input
                    type="text"
                    value={planTab.source}
                    style={selectedGamePanelInputStyle}
                    onChange={(event) => updateContentPlanTab(id, { source: event.target.value })}
                  />
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={planTab.maxChunks}
                    style={selectedGamePanelInputStyle}
                    onChange={(event) => updateContentPlanTab(id, { maxChunks: Number(event.target.value) })}
                  />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

type PageLayoutControlsEnvelope = {
  system: Record<string, unknown>;
  data: Record<string, unknown> & {
    pageControls?: Partial<AppPageSvgControls>;
  };
};

const pageLayoutControlRows: Array<{
  key: keyof AppPageSvgControls;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  type: 'number' | 'color' | 'boolean';
}> = [
  { key: 'accentColor', label: 'Accent Color', type: 'color' },
  { key: 'panelOpacity', label: 'Panel Opacity', min: 0.35, max: 1, step: 0.01, type: 'number' },
  { key: 'density', label: 'Panel Density', min: 0.72, max: 1.35, step: 0.01, type: 'number' },
  { key: 'stageScale', label: 'Stage Scale', min: 0.82, max: 1.16, step: 0.01, type: 'number' },
  { key: 'heroOffsetY', label: 'Hero Offset Y', min: -90, max: 140, step: 1, type: 'number' },
  { key: 'showGuides', label: 'Show Guides', type: 'boolean' },
];

function normalizePageLayoutControlsEnvelope(value: unknown): PageLayoutControlsEnvelope {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const data = record.data && typeof record.data === 'object' && !Array.isArray(record.data)
    ? record.data as Record<string, unknown>
    : {};
  return {
    system: record.system && typeof record.system === 'object' && !Array.isArray(record.system)
      ? record.system as Record<string, unknown>
      : {},
    data,
  };
}

const StandaloneLobbyPageLayoutControls: React.FC<{ assetPath: string }> = ({ assetPath }) => {
  const [controls, setControls] = useState<LobbyPageSvgControls>(DEFAULT_LOBBY_PAGE_SVG_CONTROLS);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLobbyPageLayoutControlsFromDisk(assetPath)
      .then(result => {
        if (cancelled) return;
        setControls(result.controls);
      })
      .catch(error => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : 'Load failed');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const channel = new BroadcastChannel(LOBBY_PAGE_LAYOUT_CONTROLS_CHANNEL);
    channelRef.current = channel;
    const handler = (event: MessageEvent<LobbyPageLayoutControlsMessage>) => {
      if (event.data.type === 'state' || event.data.type === 'update') {
        setControls(normalizeLobbyPageSvgControls(event.data.controls));
      }
    };
    channel.addEventListener('message', handler);
    channel.postMessage({ type: 'request-state' } satisfies LobbyPageLayoutControlsMessage);

    return () => {
      cancelled = true;
      channel.removeEventListener('message', handler);
      channel.close();
      channelRef.current = null;
    };
  }, [assetPath]);

  const updateControls = useCallback<React.Dispatch<React.SetStateAction<LobbyPageSvgControls>>>((value) => {
    setControls((previous: LobbyPageSvgControls) => {
      const next = normalizeLobbyPageSvgControls(
        typeof value === 'function' ? value(previous) : value
      );
      channelRef.current?.postMessage({
        type: 'update',
        controls: next,
      } satisfies LobbyPageLayoutControlsMessage);
      return next;
    });
  }, []);

  const handleSave = useCallback(async (nextControls: LobbyPageSvgControls) => {
    const savedControls = await saveLobbyPageLayoutControlsToDisk(nextControls, assetPath);
    setControls(savedControls);
    channelRef.current?.postMessage({
      type: 'update',
      controls: savedControls,
    } satisfies LobbyPageLayoutControlsMessage);
    const syncResult = await syncSavedLayoutAssetToR2(assetPath);
    return syncResult.message;
  }, [assetPath]);

  if (isLoading) {
    return <StandalonePanelLoading label="Loading lobby layout controls" />;
  }

  return (
    <main className="standalone-panel-page standalone-panel-page--homepage-layout">
      <LobbyPageSvgControlsPanel
        controls={controls}
        onControlsChange={updateControls}
        onSave={handleSave}
      />
      {status && (
        <p className="standalone-panel-page__status">{status}</p>
      )}
    </main>
  );
};

const StandaloneLeaderboardPageLayoutControls: React.FC<{ assetPath: string }> = ({ assetPath }) => {
  const [controls, setControls] = useState<LeaderboardPageSvgControls>(DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaderboardPageLayoutControlsFromDisk(assetPath)
      .then(result => {
        if (cancelled) return;
        setControls(result.controls);
      })
      .catch(error => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : 'Load failed');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const channel = new BroadcastChannel(LEADERBOARD_PAGE_LAYOUT_CONTROLS_CHANNEL);
    channelRef.current = channel;
    const handler = (event: MessageEvent<LeaderboardPageLayoutControlsMessage>) => {
      if (event.data.type === 'state' || event.data.type === 'update') {
        setControls(normalizeLeaderboardPageSvgControls(event.data.controls));
      }
    };
    channel.addEventListener('message', handler);
    channel.postMessage({ type: 'request-state' } satisfies LeaderboardPageLayoutControlsMessage);

    return () => {
      cancelled = true;
      channel.removeEventListener('message', handler);
      channel.close();
      channelRef.current = null;
    };
  }, [assetPath]);

  const updateControls = useCallback<React.Dispatch<React.SetStateAction<LeaderboardPageSvgControls>>>((value) => {
    setControls((previous: LeaderboardPageSvgControls) => {
      const next = normalizeLeaderboardPageSvgControls(
        typeof value === 'function' ? value(previous) : value
      );
      channelRef.current?.postMessage({
        type: 'update',
        controls: next,
      } satisfies LeaderboardPageLayoutControlsMessage);
      return next;
    });
  }, []);

  const handleSave = useCallback(async (nextControls: LeaderboardPageSvgControls) => {
    const savedControls = await saveLeaderboardPageLayoutControlsToDisk(nextControls, assetPath);
    setControls(savedControls);
    channelRef.current?.postMessage({
      type: 'update',
      controls: savedControls,
    } satisfies LeaderboardPageLayoutControlsMessage);
    const syncResult = await syncSavedLayoutAssetToR2(assetPath);
    return syncResult.message;
  }, [assetPath]);

  if (isLoading) {
    return <StandalonePanelLoading label="Loading leaderboard layout controls" />;
  }

  return (
    <main className="standalone-panel-page standalone-panel-page--homepage-layout">
      <LeaderboardPageSvgControlsPanel
        controls={controls}
        onControlsChange={updateControls}
        onSave={handleSave}
      />
      {status && (
        <p className="standalone-panel-page__status">{status}</p>
      )}
    </main>
  );
};

const StandaloneShopPageLayoutControls: React.FC<{ assetPath: string }> = ({ assetPath }) => {
  const [controls, setControls] = useState<ShopPageSvgControls>(DEFAULT_SHOP_PAGE_SVG_CONTROLS);
  const [content, setContent] = useState<ShopPageContentData>(DEFAULT_SHOP_PAGE_CONTENT);
  const [activePane, setActivePane] = useState<'layout' | 'content'>('layout');
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const channelRef = useRef<BroadcastChannel | null>(null);
  const controlsRef = useRef<ShopPageSvgControls>(DEFAULT_SHOP_PAGE_SVG_CONTROLS);
  const contentRef = useRef<ShopPageContentData>(DEFAULT_SHOP_PAGE_CONTENT);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    let cancelled = false;
    loadShopPageLayoutControlsFromDisk(assetPath)
      .then(result => {
        if (cancelled) return;
        controlsRef.current = result.controls;
        contentRef.current = result.content;
        setControls(result.controls);
        setContent(result.content);
      })
      .catch(error => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : 'Load failed');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const channel = new BroadcastChannel(SHOP_PAGE_LAYOUT_CONTROLS_CHANNEL);
    channelRef.current = channel;
    const handler = (event: MessageEvent<ShopPageLayoutControlsMessage>) => {
      if (event.data.type === 'state' || event.data.type === 'update') {
        const nextControls = normalizeShopPageSvgControls(event.data.controls);
        controlsRef.current = nextControls;
        setControls(nextControls);
        if (event.data.content) {
          const nextContent = normalizeShopPageContent(event.data.content);
          contentRef.current = nextContent;
          setContent(nextContent);
        }
      }
    };
    channel.addEventListener('message', handler);
    channel.postMessage({ type: 'request-state' } satisfies ShopPageLayoutControlsMessage);

    return () => {
      cancelled = true;
      channel.removeEventListener('message', handler);
      channel.close();
      channelRef.current = null;
    };
  }, [assetPath]);

  const updateControls = useCallback<React.Dispatch<React.SetStateAction<ShopPageSvgControls>>>((value) => {
    setControls((previous: ShopPageSvgControls) => {
      const next = normalizeShopPageSvgControls(
        typeof value === 'function' ? value(previous) : value
      );
      controlsRef.current = next;
      channelRef.current?.postMessage({
        type: 'update',
        controls: next,
        content: contentRef.current,
      } satisfies ShopPageLayoutControlsMessage);
      return next;
    });
  }, []);

  const updateContent = useCallback<React.Dispatch<React.SetStateAction<ShopPageContentData>>>((value) => {
    setContent((previous: ShopPageContentData) => {
      const next = normalizeShopPageContent(
        typeof value === 'function' ? value(previous) : value
      );
      contentRef.current = next;
      channelRef.current?.postMessage({
        type: 'update',
        controls: controlsRef.current,
        content: next,
      } satisfies ShopPageLayoutControlsMessage);
      return next;
    });
  }, []);

  const handleSave = useCallback(async (nextControls: ShopPageSvgControls) => {
    const savedControls = await saveShopPageLayoutControlsToDisk(nextControls, contentRef.current, assetPath);
    controlsRef.current = savedControls;
    setControls(savedControls);
    channelRef.current?.postMessage({
      type: 'update',
      controls: savedControls,
      content: contentRef.current,
    } satisfies ShopPageLayoutControlsMessage);
    const syncResult = await syncSavedLayoutAssetToR2(assetPath);
    return syncResult.message;
  }, [assetPath]);

  const handleContentSave = useCallback(async (nextContent: ShopPageContentData) => {
    const normalizedContent = normalizeShopPageContent(nextContent);
    const savedControls = await saveShopPageLayoutControlsToDisk(controlsRef.current, normalizedContent, assetPath);
    controlsRef.current = savedControls;
    contentRef.current = normalizedContent;
    setControls(savedControls);
    setContent(normalizedContent);
    channelRef.current?.postMessage({
      type: 'update',
      controls: savedControls,
      content: normalizedContent,
    } satisfies ShopPageLayoutControlsMessage);
    const syncResult = await syncSavedLayoutAssetToR2(assetPath);
    return syncResult.message;
  }, [assetPath]);

  if (isLoading) {
    return <StandalonePanelLoading label="Loading shop layout controls" />;
  }

  return (
    <main className="standalone-panel-page standalone-panel-page--shop-authoring">
      <header className="standalone-panel-page__shop-authoring-header">
        <div>
          <span className="standalone-panel-page__shop-authoring-kicker">Shop Page</span>
          <h1>Authoring Controls</h1>
          <p>Layout tunes the SVG surface. Content authors cards, packs, passes, vault groups, quests, and right-panel data.</p>
        </div>
      </header>
      <nav className="standalone-panel-page__shop-authoring-tabs" aria-label="Shop authoring panes">
        <button
          type="button"
          className={activePane === 'layout' ? 'is-active' : ''}
          aria-pressed={activePane === 'layout'}
          onClick={() => setActivePane('layout')}
        >
          Layout
        </button>
        <button
          type="button"
          className={activePane === 'content' ? 'is-active' : ''}
          aria-pressed={activePane === 'content'}
          onClick={() => setActivePane('content')}
        >
          Content
        </button>
      </nav>
      <section className="standalone-panel-page__shop-authoring-body">
        {activePane === 'layout' ? (
          <ShopPageSvgControlsPanel
            controls={controls}
            onControlsChange={updateControls}
            onSave={handleSave}
          />
        ) : (
          <ShopPageContentControlsPanel
            content={content}
            onContentChange={updateContent}
            onSave={handleContentSave}
          />
        )}
      </section>
      {status && (
        <p className="standalone-panel-page__status">{status}</p>
      )}
    </main>
  );
};

const StandaloneAuthPageLayoutControls: React.FC<{ assetPath: string }> = ({ assetPath }) => {
  const [controls, setControls] = useState<AuthPageSvgControls>(DEFAULT_AUTH_PAGE_SVG_CONTROLS);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAuthPageLayoutControlsFromDisk(assetPath)
      .then(result => {
        if (cancelled) return;
        setControls(result.controls);
      })
      .catch(error => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : 'Load failed');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const channel = new BroadcastChannel(AUTH_PAGE_LAYOUT_CONTROLS_CHANNEL);
    channelRef.current = channel;
    const handler = (event: MessageEvent<AuthPageLayoutControlsMessage>) => {
      if (event.data.type === 'state' || event.data.type === 'update') {
        setControls(normalizeAuthPageSvgControls(event.data.controls));
      }
    };
    channel.addEventListener('message', handler);
    channel.postMessage({ type: 'request-state' } satisfies AuthPageLayoutControlsMessage);

    return () => {
      cancelled = true;
      channel.removeEventListener('message', handler);
      channel.close();
      channelRef.current = null;
    };
  }, [assetPath]);

  const updateControls = useCallback<React.Dispatch<React.SetStateAction<AuthPageSvgControls>>>((value) => {
    setControls((previous: AuthPageSvgControls) => {
      const next = normalizeAuthPageSvgControls(
        typeof value === 'function' ? value(previous) : value
      );
      channelRef.current?.postMessage({
        type: 'update',
        controls: next,
      } satisfies AuthPageLayoutControlsMessage);
      return next;
    });
  }, []);

  const handleSave = useCallback(async (nextControls: AuthPageSvgControls) => {
    const savedControls = await saveAuthPageLayoutControlsToDisk(nextControls, assetPath);
    setControls(savedControls);
    channelRef.current?.postMessage({
      type: 'update',
      controls: savedControls,
    } satisfies AuthPageLayoutControlsMessage);
    const syncResult = await syncSavedLayoutAssetToR2(assetPath);
    return syncResult.message;
  }, [assetPath]);

  if (isLoading) {
    return <StandalonePanelLoading label="Loading auth layout controls" />;
  }

  return (
    <main className="standalone-panel-page standalone-panel-page--homepage-layout">
      <AuthPageSvgControlsPanel
        controls={controls}
        onControlsChange={updateControls}
        onSave={handleSave}
      />
      {status && (
        <p className="standalone-panel-page__status">{status}</p>
      )}
    </main>
  );
};

const StandalonePageLayoutControls: React.FC<{ assetPath: string }> = ({ assetPath }) => {
  const [envelope, setEnvelope] = useState<PageLayoutControlsEnvelope | null>(null);
  const [controls, setControls] = useState<AppPageSvgControls>(DEFAULT_APP_PAGE_SVG_CONTROLS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    readAsset(assetPath)
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Failed to load ${assetPath}`);
        }
        const nextEnvelope = normalizePageLayoutControlsEnvelope(JSON5.parse(await response.text()));
        if (cancelled) return;
        setEnvelope(nextEnvelope);
        setControls(normalizeAppPageSvgControls(nextEnvelope.data.pageControls));
      })
      .catch(error => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : 'Load failed');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assetPath]);

  const updateControl = useCallback((
    key: keyof AppPageSvgControls,
    value: string | number | boolean,
  ) => {
    setControls(previous => normalizeAppPageSvgControls({
      ...previous,
      [key]: value,
    }));
    setStatus('Unsaved changes');
  }, []);

  const handleReset = useCallback(() => {
    setControls(DEFAULT_APP_PAGE_SVG_CONTROLS);
    setStatus('Unsaved changes');
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard?.writeText(JSON.stringify(controls, null, 2));
    setStatus('Copied controls JSON');
  }, [controls]);

  const handleSave = useCallback(async () => {
    if (!envelope) return;
    setIsSaving(true);
    try {
      const nextEnvelope: PageLayoutControlsEnvelope = {
        ...envelope,
        data: {
          ...envelope.data,
          pageControls: controls,
        },
      };
      const payload = new TextEncoder().encode(`${JSON.stringify(nextEnvelope, null, 2)}\n`);
      await writeAsset(assetPath, payload);
      setEnvelope(nextEnvelope);
      setStatus('Saved');
    } catch (error) {
      logError('[StandalonePageLayoutControls] save failed', error);
      setStatus(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [assetPath, controls, envelope]);

  return (
    <div className="standalone-panel-page standalone-panel-page--featured-showcase-controls">
      <div style={selectedGamePanelStyle}>
        <div style={standaloneHomepageToolbarStyle}>
          <strong style={{ color: '#cffafe', fontSize: '0.88rem' }}>Page SVG Controls</strong>
          <span style={standaloneHomepageToolbarSpacerStyle} />
          <button type="button" style={standaloneHomepageToolbarButtonStyle} onClick={() => void handleCopy()}>
            Copy
          </button>
          <button type="button" style={standaloneHomepageSavedButtonStyle} disabled={isSaving || isLoading} onClick={() => void handleSave()}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" style={standaloneHomepageDangerButtonStyle} onClick={handleReset}>
            Reset
          </button>
        </div>
        <div style={selectedGamePanelCardStyle}>
          <div style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>{assetPath}</div>
          {status ? <div style={{ color: status === 'Saved' ? '#bbf7d0' : '#fef3c7', fontSize: '0.82rem' }}>{status}</div> : null}
        </div>
        <div style={selectedGamePanelGridStyle}>
          {pageLayoutControlRows.map(row => (
            <label key={row.key} style={selectedGamePanelCardStyle}>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{row.label}</span>
              {row.type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={Boolean(controls[row.key])}
                  onChange={event => updateControl(row.key, event.target.checked)}
                />
              ) : row.type === 'color' ? (
                <input
                  type="color"
                  value={String(controls[row.key])}
                  style={selectedGamePanelInputStyle}
                  onChange={event => updateControl(row.key, event.target.value)}
                />
              ) : (
                <>
                  <input
                    type="range"
                    min={row.min}
                    max={row.max}
                    step={row.step}
                    value={Number(controls[row.key])}
                    onChange={event => updateControl(row.key, Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min={row.min}
                    max={row.max}
                    step={row.step}
                    value={Number(controls[row.key])}
                    style={selectedGamePanelInputStyle}
                    onChange={event => updateControl(row.key, Number(event.target.value))}
                  />
                </>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export const StandalonePanelPage: React.FC = () => {
  const [params, setParams] = useState<{
    panel: StandalonePanel;
    assetPath: string;
    locked: boolean;
    hideTools: boolean;
    reflectionOnly: boolean;
  } | null>(() => {
    const search = new URLSearchParams(window.location.search);
    const panel = search.get('standalone') as StandalonePanel;
    const assetPath = search.get('assetPath');
    const locked = search.get('locked') === 'true';
    const hideTools = search.get('hideTools') === 'true';
    const reflectionOnly = search.get('reflectionOnly') === 'true';
    if (
      panel &&
      assetPath &&
      (
        panel === 'preview' ||
        panel === 'inspector' ||
        panel === 'design-studio' ||
        panel === 'preview-canvas' ||
        panel === 'isolation' ||
        panel === 'featured-showcase-controls' ||
        panel === 'homepage-layout-controls' ||
        panel === 'lobby-page-layout-controls' ||
        panel === 'leaderboard-page-layout-controls' ||
        panel === 'shop-page-layout-controls' ||
        panel === 'auth-page-layout-controls' ||
        panel === 'selected-game-layout-controls' ||
        panel === 'games-catalog-layout-controls' ||
        panel === 'page-layout-controls'
      )
    ) {
      return { panel, assetPath, locked, hideTools, reflectionOnly };
    }
    return null;
  });


  const isLocked = params?.locked;
  const hasParams = !!params;
  useEffect(() => {
    if (!hasParams || isLocked) return;
    const channel = new BroadcastChannel(ASSET_SELECTION_CHANNEL);
    const handler = (event: MessageEvent<{ assetPath: string }>) => {
      const next = event.data?.assetPath;
      if (!next) return;
      setParams((current) => (current ? { ...current, assetPath: next } : current));
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, [hasParams, isLocked]);

  const shouldLoadStandaloneAsset =
    params !== null &&
    params.panel !== 'isolation' &&
    params.panel !== 'featured-showcase-controls' &&
    params.panel !== 'homepage-layout-controls' &&
    params.panel !== 'lobby-page-layout-controls' &&
    params.panel !== 'leaderboard-page-layout-controls' &&
    params.panel !== 'shop-page-layout-controls' &&
    params.panel !== 'auth-page-layout-controls' &&
    params.panel !== 'selected-game-layout-controls' &&
    params.panel !== 'games-catalog-layout-controls';
  const { assetData, assetRawContent, isLoading, error } = useStandaloneAsset(
    shouldLoadStandaloneAsset ? params.assetPath : null
  );

  if (!params) {
    return (
      <div className="standalone-panel-page standalone-panel-page--empty">
        <p>Missing standalone or assetPath. Open a panel from the main Asset Editor.</p>
      </div>
    );
  }

  if (params.panel === 'design-studio' || params.panel === 'preview-canvas') {
    if (!assetData && !isLoading && !error) {
      return (
        <div className="standalone-panel-page standalone-panel-page--empty">
          <StandalonePanelLoading label="Loading card game layout" />
        </div>
      );
    }
    if (assetData?.system?.assetType !== 'CardGameLayout') {
      return (
        <div className="standalone-panel-page standalone-panel-page--empty">
          <p>Open a CardGameLayout asset to use this mode.</p>
        </div>
      );
    }
    return params.panel === 'design-studio'
      ? <StandaloneCardGameDesignStudio key={`design-studio:${params.assetPath}`} assetPath={params.assetPath} assetData={assetData} />
      : <StandaloneCardGamePreviewCanvas key={`preview-canvas:${params.assetPath}`} assetPath={params.assetPath} assetData={assetData} hideTools={params.hideTools} reflectionOnly={params.reflectionOnly} />;
  }

  if (params.panel === 'isolation') {
    return (
      <Suspense fallback={<StandalonePanelLoading label="Loading Isolation Hub" />}>
        <LazyIsolationHubPage />
      </Suspense>
    );
  }

  if (params.panel === 'featured-showcase-controls') {
    return <StandaloneFeaturedShowcaseControls />;
  }

  if (params.panel === 'homepage-layout-controls') {
    return <StandaloneHomepageLayoutControls />;
  }

  if (params.panel === 'lobby-page-layout-controls') {
    return <StandaloneLobbyPageLayoutControls assetPath={params.assetPath} />;
  }

  if (params.panel === 'leaderboard-page-layout-controls') {
    return <StandaloneLeaderboardPageLayoutControls assetPath={params.assetPath} />;
  }

  if (params.panel === 'shop-page-layout-controls') {
    return <StandaloneShopPageLayoutControls assetPath={params.assetPath} />;
  }

  if (params.panel === 'auth-page-layout-controls') {
    return <StandaloneAuthPageLayoutControls assetPath={params.assetPath} />;
  }

  if (params.panel === 'selected-game-layout-controls') {
    return <StandaloneSelectedGameLayoutControls assetPath={params.assetPath} />;
  }

  if (params.panel === 'games-catalog-layout-controls') {
    return <StandaloneGamesCatalogLayoutControls />;
  }

  if (params.panel === 'page-layout-controls') {
    return <StandalonePageLayoutControls assetPath={params.assetPath} />;
  }

  return (
    <div className="standalone-panel-page">
      <Suspense fallback={<StandalonePanelLoading />}>
        {params.panel === 'preview' ? (
          <StandalonePreview assetPath={params.assetPath} />
        ) : (
          <StandaloneInspector assetPath={params.assetPath} />
        )}
      </Suspense>
      {assetRawContent && isLoading ? null : null}
    </div>
  );
};

