import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
  | 'isolation';

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
      (panel === 'preview' || panel === 'inspector' || panel === 'design-studio' || panel === 'preview-canvas' || panel === 'isolation')
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

  const { assetData, assetRawContent, isLoading, error } = useStandaloneAsset(params?.assetPath ?? null);

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

