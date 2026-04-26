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
  readStoredLayoutEditorPlayerCount,
  writeStoredLayoutEditorPlayerCount,
} from '@/utils/layoutEditorPreferences';
import { CardGameDesignStudio } from '@ocentra/card-game-ui/CardGameDesignStudio';
import { CardGameTemplatePage, type CardGameTemplatePageProps } from '@ocentra/card-game-ui/CardGameTemplatePage';
import { HudButtonEditorModal } from '@ocentra/card-game-ui/HudButtonEditorModal';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { LayoutClasses } from '@ocentra/core-ui/constants/layout';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
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
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
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

interface StandaloneCanvasMenuBarProps {
  playerCount: number;
  minPlayerCount: number;
  maxPlayerCount: number;
  showHandles: boolean;
  onPlayerCountChange: (count: number) => void;
  onShowHandlesChange: (value: boolean) => void;
  onCopyPreset: (sourceCount: number) => void;
  showArenaGuide: boolean;
  onShowArenaGuideChange: (value: boolean) => void;
  resolution: string;
  onResolutionChange: (value: string) => void;
  showStudio: boolean;
  onShowStudioChange: (value: boolean) => void;
  isPortrait: boolean;
  onIsPortraitChange: (value: boolean) => void;
  customWidth: number;
  onCustomWidthChange: (value: number) => void;
  customHeight: number;
  onCustomHeightChange: (value: number) => void;
  resolutions: ResolutionOption[];
  onAddCustomDevice: (name: string, width: number, height: number) => void;
  onShowLayers: () => void;
}

interface ResolutionOption {
  label: string;
  value: string;
  disabled?: boolean;
}

function resolveCopySourceCount(
  requestedCount: number,
  playerCount: number,
  minPlayerCount: number,
  maxPlayerCount: number,
): number {
  const clampedRequested = Math.max(minPlayerCount, Math.min(maxPlayerCount, requestedCount));
  const fallback = Math.max(minPlayerCount, Math.min(maxPlayerCount, playerCount - 1));
  if (clampedRequested !== playerCount) {
    return clampedRequested;
  }
  return fallback === playerCount ? minPlayerCount : fallback;
}

const StandaloneCanvasMenuBar: React.FC<StandaloneCanvasMenuBarProps> = ({
  playerCount,
  minPlayerCount,
  maxPlayerCount,
  showHandles,
  onPlayerCountChange,
  onShowHandlesChange,
  onCopyPreset,
  showArenaGuide,
  onShowArenaGuideChange,
  resolution,
  onResolutionChange,
  showStudio,
  onShowStudioChange,
  isPortrait,
  onIsPortraitChange,
  customWidth,
  onCustomWidthChange,
  customHeight,
  onCustomHeightChange,
  resolutions,
  onAddCustomDevice,
  onShowLayers,
}) => {
  const counts = useMemo(
    () => Array.from({ length: maxPlayerCount - minPlayerCount + 1 }, (_, index) => minPlayerCount + index),
    [maxPlayerCount, minPlayerCount],
  );
  const sourceCounts = useMemo(
    () => counts.filter((count) => count !== playerCount),
    [counts, playerCount],
  );
  
  const [copySourceCount, setCopySourceCount] = useState<number>(
    Math.max(minPlayerCount, Math.min(maxPlayerCount, playerCount - 1)),
  );
  
  const resolvedCopySourceCount = useMemo(
    () => resolveCopySourceCount(copySourceCount, playerCount, minPlayerCount, maxPlayerCount),
    [copySourceCount, maxPlayerCount, minPlayerCount, playerCount],
  );

  const handleCopy = useCallback(() => {
    if (resolvedCopySourceCount !== playerCount) {
      onCopyPreset(resolvedCopySourceCount);
    }
  }, [onCopyPreset, playerCount, resolvedCopySourceCount]);



  return (
    <div className="standalone-canvas-menu-bar">
      <div className="standalone-canvas-menu-bar__group">
        <div className="standalone-canvas-menu-bar__logo">Layout Studio</div>
        
        <div className="standalone-canvas-menu-bar__menu">
          <span className="standalone-canvas-menu-bar__menu-label">View</span>
          <div className="standalone-canvas-menu-bar__menu-dropdown">
            <button 
              className={`standalone-canvas-menu-bar__menu-item ${showArenaGuide ? 'is-active' : ''}`}
              onClick={() => onShowArenaGuideChange(!showArenaGuide)}
            >
              Show Arena Guide
            </button>
            <button 
              className={`standalone-canvas-menu-bar__menu-item ${showHandles ? 'is-active' : ''}`}
              onClick={() => onShowHandlesChange(!showHandles)}
            >
              Show Interaction Handles
            </button>
          </div>
        </div>

        <div className="standalone-canvas-menu-bar__menu">
          <span className="standalone-canvas-menu-bar__menu-label">Window</span>
          <div className="standalone-canvas-menu-bar__menu-dropdown">
            <button 
              className={`standalone-canvas-menu-bar__menu-item ${showStudio ? 'is-active' : ''}`}
              onClick={() => onShowStudioChange(!showStudio)}
            >
              Design Studio (Inspector)
            </button>
            <button 
              className="standalone-canvas-menu-bar__menu-item"
              onClick={onShowLayers}
            >
              Layer Management...
            </button>
          </div>
        </div>
      </div>

      <div className="standalone-canvas-menu-bar__group">
        <label className="standalone-canvas-menu-bar__field">
          <span className="standalone-canvas-menu-bar__label">Players</span>
          <select 
            className="standalone-canvas-menu-bar__select"
            value={playerCount}
            onChange={(e) => onPlayerCountChange(Number(e.target.value))}
          >
            {counts.map((count) => (
              <option key={count} value={count}>
                {count} Players
              </option>
            ))}
          </select>
        </label>

        <div className="standalone-canvas-menu-bar__separator" />

        <label className="standalone-canvas-menu-bar__field">
          <span className="standalone-canvas-menu-bar__label">Viewport</span>
          <select 
            className="standalone-canvas-menu-bar__select"
            value={resolution}
            onChange={(e) => onResolutionChange(e.target.value)}
          >
            {resolutions.map((r, idx) => (
              <option key={`${r.value}-${idx}`} value={r.value} disabled={r.disabled}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`standalone-canvas-menu-bar__orientation-btn ${isPortrait ? 'is-active' : ''}`}
          onClick={() => onIsPortraitChange(!isPortrait)}
          disabled={resolution === 'fit'}
          title={isPortrait ? "Switch to Landscape" : "Switch to Portrait"}
        >
          {isPortrait ? 'Portrait ⭥' : 'Landscape ⭤'}
        </button>
        
        {resolution === 'custom' && (
          <div className="standalone-canvas-menu-bar__custom-group">
            <input 
              type="number" 
              className="standalone-canvas-menu-bar__input" 
              value={customWidth}
              onChange={(e) => onCustomWidthChange(Number(e.target.value))}
              placeholder="W"
            />
            <span className="standalone-canvas-menu-bar__x">×</span>
            <input 
              type="number" 
              className="standalone-canvas-menu-bar__input" 
              value={customHeight}
              onChange={(e) => onCustomHeightChange(Number(e.target.value))}
              placeholder="H"
            />
            <button 
              className="standalone-canvas-menu-bar__save"
              onClick={() => {
                const name = prompt('Device Name:', 'Custom Mobile');
                if (name) onAddCustomDevice(name, customWidth, customHeight);
              }}
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="standalone-canvas-menu-bar__group" style={{ marginLeft: 'auto' }}>
        {sourceCounts.length > 0 && (
          <div className="standalone-canvas-menu-bar__copy-group">
            <select
              className="standalone-canvas-menu-bar__select"
              value={copySourceCount}
              onChange={(e) => setCopySourceCount(Number(e.target.value))}
            >
              {sourceCounts.map((count) => (
                <option key={count} value={count}>
                  From {count}P
                </option>
              ))}
            </select>
            <button 
              className="standalone-canvas-menu-bar__btn"
              onClick={handleCopy}
            >
              Copy Layout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

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

function isInspectable(assetPath: string, assetData: AssetData | null): boolean {
  if (assetPath.startsWith('virtual:AssetCatalog')) return false;
  const type = assetData?.system?.assetType;
  if (type === 'AssetCatalog') return false;
  return true;
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
  if (!isInspectable(assetPath, assetData)) {
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
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    const handler = (event: MessageEvent<CardGameLayoutDraftMessage>) => {
      if (event.data?.assetPath !== assetPath || !event.data.document) {
        return;
      }
      if (event.data.draftSessionId === draftSessionIdRef.current) {
        return;
      }
      setDocument(event.data.document);
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

  const broadcast = useCallback((nextDocument: LayoutAssetDocument, playerCount: number) => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    channel.postMessage({
      assetPath,
      document: nextDocument,
      playerCount,
      draftSessionId: draftSessionIdRef.current,
      sourceSurface: 'editorIsolation',
      viewerPerspective: {
        mode: 'canonical',
        localSeatId: 0,
      },
    });
    channel.close();
  }, [assetPath]);

  const handleChange = useCallback((nextDocument: LayoutAssetDocument) => {
    setDocument(nextDocument);
    broadcast(nextDocument, activePlayerCount);
  }, [activePlayerCount, broadcast]);

  const handleActivePlayerCountChange = useCallback((count: number) => {
    setActivePlayerCount(count);
    broadcast(document, count);
  }, [broadcast, document]);

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
        />
      </div>
    </div>
  );
};

const StandaloneCardGamePreviewCanvas: React.FC<{
  assetPath: string;
  assetData: AssetData;
  hideTools?: boolean;
}> = ({
  assetPath,
  assetData,
  hideTools,
}) => {
  const headProps = useCoreUIHeaderProps();
  const loadedAsset = useMemo(
    () => buildLoadedLayoutAssetFromRaw(assetPath, assetData as Record<string, unknown>),
    [assetData, assetPath],
  );
  const [document, setDocument] = useState<LayoutAssetDocument>(() => loadedAsset.document);
  const [playerCount, setPlayerCount] = useState<number>(() => {
    const urlCount = new URLSearchParams(window.location.search).get('playerCount');
    const fromUrl = urlCount !== null ? parseInt(urlCount, 10) : NaN;
    const stored = readStoredLayoutEditorPlayerCount(assetPath, loadedAsset.document.defaultPlayerCount);
    return Number.isFinite(fromUrl) ? fromUrl : stored;
  });
  const [playerRange, setPlayerRange] = useState<LayoutPlayerRange | null>(null);
  const [showHandles, setShowHandles] = useState(true);
  const [showArenaGuide, setShowArenaGuide] = useState(true);
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
        // Fallback to minimal set if file fetch fails
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
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    const handler = (event: MessageEvent<CardGameLayoutDraftMessage>) => {
      if (event.data?.assetPath !== assetPath || !event.data.document) {
        return;
      }
      if (event.data.draftSessionId === draftSessionIdRef.current) {
        return;
      }
      setDocument(event.data.document);
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

  const broadcast = useCallback((nextDocument: LayoutAssetDocument, nextPlayerCount: number) => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    channel.postMessage({
      assetPath,
      document: nextDocument,
      playerCount: nextPlayerCount,
      draftSessionId: draftSessionIdRef.current,
      sourceSurface: 'editorCanvas',
      viewerPerspective: {
        mode: 'canonical',
        localSeatId: 0,
      },
    } satisfies CardGameLayoutDraftMessage);
    channel.close();
  }, [assetPath]);

  const handleChange = useCallback((nextDocument: LayoutAssetDocument) => {
    setDocument(nextDocument);
    broadcast(nextDocument, playerCount);
  }, [broadcast, playerCount]);

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
      // Add before the custom entry if it exists, otherwise at the end
      const customIdx = current.findIndex(r => r.value === 'custom');
      const next = [...current];
      if (customIdx !== -1) {
        next.splice(customIdx, 0, newOption);
      } else {
        next.push(newOption);
      }
      
      // Persist back to the JSON file using Tauri command
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

  // Handle header props mapping (handle string|null vs string difference)
  const headerProps: NonNullable<CardGameTemplatePageProps['headerProps']> = {
    user: headProps.user ? {
      email: headProps.user.email ?? '',
      displayName: headProps.user.displayName ?? 'Editor',
      photoURL: headProps.user.photoURL ? headProps.getImageUrl(headProps.user.photoURL) : undefined,
    } : null,
    onLogout: headProps.onLogout,
  };

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

  const containerRef = useRef<HTMLDivElement>(null);
  const [boxDimensions, setBoxDimensions] = useState({ width: 0, height: 0 });

  const aspectRatio = useMemo(() => {
    if (resolution === 'fit') return 0;
    
    let rawW = 1920;
    let rawH = 1080;

    if (resolution === 'custom') {
      rawW = customWidth;
      rawH = customHeight;
    } else {
      // Extract numbers from strings like "iPhone SE (667x375)"
      const matches = resolution.match(/(\d+)\D+(\d+)/);
      if (matches) {
        rawW = parseInt(matches[1]);
        rawH = parseInt(matches[2]);
      }
    }

    const { w, h } = getOrientedDimensions(rawW, rawH);
    return w / h;
  }, [resolution, customWidth, customHeight, getOrientedDimensions]);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      // Increased padding for better "breathing room"
      const padding = 120; // 60px each side
      const availW = Math.max(100, rect.width - padding);
      const availH = Math.max(100, rect.height - padding);
      
      if (aspectRatio === 0) {
        setBoxDimensions({ width: availW, height: availH });
        return;
      }

      const containerAspect = availW / availH;
      
      if (aspectRatio > containerAspect) {
        // Target is wider than container -> limited by width
        setBoxDimensions({
          width: availW,
          height: availW / aspectRatio
        });
      } else {
        // Target is taller than container -> limited by height
        setBoxDimensions({
          width: availH * aspectRatio,
          height: availH
        });
      }
    };

    updateDimensions();
    const ro = new ResizeObserver(updateDimensions);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [aspectRatio]);

  return (
    <div className={`standalone-panel-page ${LayoutClasses.EDITOR_PREVIEW}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {!hideTools && (
        <StandaloneCanvasMenuBar
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
          onShowLayers={() => setShowHudEditor(true)}
        />
      )}
      <div 
        className="standalone-canvas-viewport"
        style={{ 
          display: 'flex', 
          flex: 1, 
          minHeight: 0, 
          position: 'relative', 
          padding: '40px',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#02040a',
          overflow: 'hidden'
        }} 
        ref={containerRef}
      >
        {/* Resolution & Orientation Label */}
        <div style={{
          position: 'absolute',
          top: 'calc(50% - ' + (boxDimensions.height / 2 + 10) + 'px)',
          left: 'calc(50% - ' + (boxDimensions.width / 2) + 'px)',
          transform: 'translateY(-100%)',
          paddingBottom: '6px',
          fontSize: '11px',
          fontWeight: '600',
          color: '#4ade80',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          opacity: 0.8,
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }}>
          {(() => {
            if (resolution === 'fit') return 'Auto Fit';
            let displayRes = resolution;
            if (resolution === 'custom') displayRes = `${customWidth}x${customHeight}`;
            
            // Extract numbers and swap if portrait
            const matches = displayRes.match(/(\d+)\D+(\d+)/);
            if (matches && isPortrait) {
              const [_, w, h] = matches;
              if (parseInt(w) > parseInt(h)) {
                return `${h} × ${w}`;
              }
            }
            return displayRes.replace(/[()]/g, '').replace('x', ' × ');
          })()}
          <span style={{ opacity: 0.6, marginLeft: '8px' }}>
            [ {isPortrait ? 'portrait' : 'landscape'} ]
          </span>
        </div>
        <div 
          style={{ 
            width: `${boxDimensions.width}px`,
            height: `${boxDimensions.height}px`,
            border: '2px solid #4ade80',
            boxShadow: '0 0 40px rgba(74, 222, 128, 0.15)',
            borderRadius: '4px',
            background: '#050814',
            position: 'relative',
            boxSizing: 'border-box',
            overflow: 'hidden',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <CardGameTemplatePage
            embedded
            document={document as unknown as CardGameLayoutDocument}
            playerCount={playerCount}
            surfaceMode="editorCanvas"
            headerProps={headerProps}
            headerTitle={loadedAsset.displayName || loadedAsset.gameId}
            headerTagline={`${loadedAsset.gameId} layout preview`}
            footerVersion="Editor"
          editableSeats={showHandles}
          onSeatsChange={handleSeatsChange}
          showArenaGuide={showArenaGuide}
          assetPath={assetPath}
          showHeaderDebugControls={false}
          onIsolateRequest={handleIsolateRequest}
        />
      </div>
      </div>

      <Suspense fallback={null}>
        {showHudEditor && (
          <HudButtonEditorModal
            open={showHudEditor}
            onClose={() => setShowHudEditor(false)}
            document={document as unknown as CardGameLayoutDocument}
            onChange={handleChange}
            initialWorkspaceSection="layerSplit"
          />
        )}
      </Suspense>

      {/* 
        Temporarily disabled for step-by-step refinement:
        - CardGameTemplatePage
        - CardGameDesignStudio
      */}
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
  } | null>(() => {
    const search = new URLSearchParams(window.location.search);
    const panel = search.get('standalone') as StandalonePanel;
    const assetPath = search.get('assetPath');
    const locked = search.get('locked') === 'true';
    const hideTools = search.get('hideTools') === 'true';
    if (
      panel &&
      assetPath &&
      (panel === 'preview' || panel === 'inspector' || panel === 'design-studio' || panel === 'preview-canvas' || panel === 'isolation')
    ) {
      return { panel, assetPath, locked, hideTools };
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
      : <StandaloneCardGamePreviewCanvas key={`preview-canvas:${params.assetPath}`} assetPath={params.assetPath} assetData={assetData} hideTools={params.hideTools} />;
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
