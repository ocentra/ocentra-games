import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import type {
  CenterLogoRenderArgs,
  UnifiedHeaderConfigInput,
} from '@ocentra/core-ui/Header/UnifiedHeader.config';
import { mlogoImageUrl } from '@ocentra/app-assets/commons';
import {
  DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS,
  serializeHomeShowcaseFrameControls,
  type HomeShowcaseFrameControls,
  type HomeShowcasePreviewLayoutMode,
} from '@ocentra/core-ui/Common/HomeShowcaseFrame/HomeShowcaseFrame.types';
import type { HomepageLayoutControlsData } from '@ocentra/game-asset-domain/schemas/home-page-games-schema';
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
  DEFAULT_HOMEPAGE_LAYOUT_CONTROLS,
  loadHomepageLayoutControlsFromDisk,
  normalizeHomepageLayoutControls,
  saveHomepageLayoutControlsToDisk,
} from '@/utils/homepageLayoutControlsPersistence';
import './StandalonePanelPage.css';
const log = AssetEditorLogger.instance;
log.register(import.meta.url);
const logInfo = (message: string, data?: unknown) => log.logInfo(message, getStackTrace(), data);
const logError = (message: string, error?: unknown) => log.logError(message, getStackTrace(), error);

type StandalonePanel =
  | 'preview'
  | 'inspector'
  | 'design-studio'
  | 'preview-canvas'
  | 'isolation'
  | 'featured-showcase-controls'
  | 'homepage-layout-controls';

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

function HeaderProfileControlsPanel() {
  const headerConfig = useMemo<UnifiedHeaderConfigInput>(() => ({
    center: {
      modeA: {
        logo: {
          size: 44,
          renderer: ({
            cx,
            cy,
            size,
            aspectCorrection,
            strokeWidth,
            innerOpacity,
            color,
          }: CenterLogoRenderArgs) => {
            const logoH = size;
            const logoW = logoH * aspectCorrection;
            const outerRadius = size / 2;
            const innerRadius = Math.max(
              1,
              outerRadius - Math.max(0.35, size * 0.018) - strokeWidth * 0.5
            );
            return (
              <g transform={`translate(${cx} ${cy}) scale(${aspectCorrection} 1) translate(${-cx} ${-cy})`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={outerRadius}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  opacity={0.95}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={innerRadius}
                  fill={color}
                  opacity={innerOpacity}
                />
                <image
                  href={mlogoImageUrl}
                  x={cx - logoW / 2}
                  y={cy - logoH / 2}
                  width={logoW}
                  height={logoH}
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
            );
          },
        },
      },
    },
    right: {
      isProfile: true,
      isButton: true,
      user: {
        name: 'ocentra ai',
        isLoggedIn: true,
        isAdmin: true,
      },
    },
  }), []);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div
        style={{
          border: '1px solid rgba(103, 232, 249, 0.28)',
          borderRadius: '0.75rem',
          background: 'rgba(2, 6, 23, 0.72)',
          minHeight: '8rem',
          overflow: 'visible',
        }}
      >
        <MemoryRouter initialEntries={['/']}>
          <UnifiedHeader
            config={headerConfig}
            profileName="main_screen"
            includeAdminNavigation
            placement="contained"
            showDebugControls
            defaultShowDebugControlsOpen
          />
        </MemoryRouter>
      </div>
      <div style={{ color: '#bae6fd', fontSize: '0.8rem' }}>
        Header profiles are edited here. Use the profile controls inside this panel to load and save page-matched header profiles.
      </div>
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
        panel === 'homepage-layout-controls'
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
    params.panel !== 'homepage-layout-controls';
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
          <p>Loading card game layout...</p>
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
      <Suspense fallback={<div className="standalone-panel-page__loading">Loading Isolation Hub…</div>}>
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

  return (
    <div className="standalone-panel-page">
      <Suspense fallback={<div className="standalone-panel-page__loading">Loading…</div>}>
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

