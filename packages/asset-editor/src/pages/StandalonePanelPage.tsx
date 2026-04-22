import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { CardGameTemplateViewport } from '@ocentra/card-game-ui/CardGameTemplateViewport';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import type { GameHeaderProps } from '@ocentra/core-ui/Header/GameHeader';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
import {
  cloneCardGameLayoutDocument,
  createLayoutPreset,
  seedLayoutPresetFromSource,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import type { CardGameLayoutDraftMessage } from '@ocentra/game-layout-domain/draftChannel';
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
  | 'preview-canvas';

interface PreviewCanvasToolsProps {
  playerCount: number;
  minPlayerCount: number;
  maxPlayerCount: number;
  showHandles: boolean;
  currentTable: {
    width?: number;
    height?: number;
    offsetX?: number;
    offsetY?: number;
    curvature?: number;
  };
  onPlayerCountChange: (count: number) => void;
  onShowHandlesChange: (value: boolean) => void;
  onCopyPreset: (sourceCount: number) => void;
  onTableChange: (field: 'width' | 'height' | 'offsetX' | 'offsetY' | 'curvature', value: number) => void;
}

type PreviewCanvasToolTab = 'preset' | 'table' | 'view';

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

const PreviewCanvasTools: React.FC<PreviewCanvasToolsProps> = ({
  playerCount,
  minPlayerCount,
  maxPlayerCount,
  showHandles,
  currentTable,
  onPlayerCountChange,
  onShowHandlesChange,
  onCopyPreset,
  onTableChange,
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
  const [position, setPosition] = useState({ x: 24, y: 96 });
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<PreviewCanvasToolTab>('preset');
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const resolvedCopySourceCount = useMemo(
    () => resolveCopySourceCount(copySourceCount, playerCount, minPlayerCount, maxPlayerCount),
    [copySourceCount, maxPlayerCount, minPlayerCount, playerCount],
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragOffsetRef.current) {
        return;
      }

      setPosition({
        x: Math.max(8, event.clientX - dragOffsetRef.current.x),
        y: Math.max(8, event.clientY - dragOffsetRef.current.y),
      });
    };

    const handlePointerUp = () => {
      dragOffsetRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  const handleDragStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  }, []);

  const handleCopy = useCallback(() => {
    if (resolvedCopySourceCount !== playerCount) {
      onCopyPreset(resolvedCopySourceCount);
    }
  }, [onCopyPreset, playerCount, resolvedCopySourceCount]);

  return (
    <div
      className={collapsed ? 'preview-canvas-tools preview-canvas-tools--collapsed' : 'preview-canvas-tools'}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className="preview-canvas-tools__titlebar" onPointerDown={handleDragStart}>
        <div className="preview-canvas-tools__titlecopy">
          <strong>Layout Tools</strong>
          <span>{playerCount} players</span>
        </div>
        <div className="preview-canvas-tools__titleactions" onPointerDown={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="preview-canvas-tools__icon"
            onClick={() => setCollapsed((current) => !current)}
            aria-label={collapsed ? 'Expand layout tools' : 'Collapse layout tools'}
          >
            {collapsed ? 'Open' : 'Hide'}
          </button>
        </div>
      </div>

      {collapsed ? (
        <div className="preview-canvas-tools__compact">
          <button
            type="button"
            className="preview-canvas-tools__chip preview-canvas-tools__chip--active"
            onClick={() => setCollapsed(false)}
          >
            {playerCount}P
          </button>
          <label className="preview-canvas-tools__toggle preview-canvas-tools__toggle--compact">
            <input type="checkbox" checked={showHandles} onChange={(event) => onShowHandlesChange(event.target.checked)} />
            <span>Handles</span>
          </label>
        </div>
      ) : (
        <>
          <div className="preview-canvas-tools__tabs">
            <button
              type="button"
              className={activeTab === 'preset' ? 'preview-canvas-tools__tab preview-canvas-tools__tab--active' : 'preview-canvas-tools__tab'}
              onClick={() => setActiveTab('preset')}
            >
              Preset
            </button>
            <button
              type="button"
              className={activeTab === 'table' ? 'preview-canvas-tools__tab preview-canvas-tools__tab--active' : 'preview-canvas-tools__tab'}
              onClick={() => setActiveTab('table')}
            >
              Table
            </button>
            <button
              type="button"
              className={activeTab === 'view' ? 'preview-canvas-tools__tab preview-canvas-tools__tab--active' : 'preview-canvas-tools__tab'}
              onClick={() => setActiveTab('view')}
            >
              View
            </button>
          </div>

          {activeTab === 'preset' ? (
            <>
              <div className="preview-canvas-tools__section">
                <div className="preview-canvas-tools__row">
                  <span>Player count</span>
                  <strong>{playerCount}</strong>
                </div>
                <input
                  className="preview-canvas-tools__range"
                  type="range"
                  min={minPlayerCount}
                  max={maxPlayerCount}
                  step={1}
                  value={playerCount}
                  onChange={(event) => onPlayerCountChange(Number(event.target.value))}
                />
                <div className="preview-canvas-tools__chips">
                  {counts.map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={count === playerCount ? 'preview-canvas-tools__chip preview-canvas-tools__chip--active' : 'preview-canvas-tools__chip'}
                      onClick={() => onPlayerCountChange(count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="preview-canvas-tools__section">
                <div className="preview-canvas-tools__row">
                  <span>Copy preset</span>
                </div>
                <div className="preview-canvas-tools__inline">
                  <select
                    className="preview-canvas-tools__select"
                    value={sourceCounts.includes(resolvedCopySourceCount) ? resolvedCopySourceCount : (sourceCounts[0] ?? playerCount)}
                    onChange={(event) => setCopySourceCount(Number(event.target.value))}
                    disabled={sourceCounts.length === 0}
                  >
                    {sourceCounts.map((count) => (
                      <option key={count} value={count}>
                        From {count} players
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="preview-canvas-tools__action"
                    onClick={handleCopy}
                    disabled={sourceCounts.length === 0}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === 'table' ? (
            <div className="preview-canvas-tools__section">
              <div className="preview-canvas-tools__row">
                <span>Table shape</span>
              </div>
              <label className="preview-canvas-tools__field">
                <span>Width</span>
                <input type="range" min={400} max={1800} step={1} value={currentTable.width ?? 960} onChange={(event) => onTableChange('width', Number(event.target.value))} />
              </label>
              <label className="preview-canvas-tools__field">
                <span>Height</span>
                <input type="range" min={200} max={1000} step={1} value={currentTable.height ?? 560} onChange={(event) => onTableChange('height', Number(event.target.value))} />
              </label>
              <label className="preview-canvas-tools__field">
                <span>Offset X</span>
                <input type="range" min={-400} max={400} step={1} value={currentTable.offsetX ?? 0} onChange={(event) => onTableChange('offsetX', Number(event.target.value))} />
              </label>
              <label className="preview-canvas-tools__field">
                <span>Offset Y</span>
                <input type="range" min={-400} max={400} step={1} value={currentTable.offsetY ?? 0} onChange={(event) => onTableChange('offsetY', Number(event.target.value))} />
              </label>
              <label className="preview-canvas-tools__field">
                <span>Curvature</span>
                <input type="range" min={0} max={1} step={0.01} value={currentTable.curvature ?? 0.88} onChange={(event) => onTableChange('curvature', Number(event.target.value))} />
              </label>
            </div>
          ) : null}

          {activeTab === 'view' ? (
            <div className="preview-canvas-tools__section">
              <label className="preview-canvas-tools__toggle">
                <input type="checkbox" checked={showHandles} onChange={(event) => onShowHandlesChange(event.target.checked)} />
                <span>Show drag handles</span>
              </label>
              <p className="preview-canvas-tools__hint">
                Use this window for seat positioning. The editor preview stays clean and read-only.
              </p>
            </div>
          ) : null}
        </>
      )}
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

  const broadcast = useCallback((nextDocument: LayoutAssetDocument, playerCount: number) => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    channel.postMessage({
      assetPath,
      document: nextDocument,
      playerCount,
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
  const [playerCount, setPlayerCount] = useState<number>(
    () => readStoredLayoutEditorPlayerCount(assetPath, loadedAsset.document.defaultPlayerCount),
  );
  const [playerRange, setPlayerRange] = useState<LayoutPlayerRange | null>(null);
  const [showHandles, setShowHandles] = useState(true);

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
    } satisfies CardGameLayoutDraftMessage);
    channel.close();
  }, [assetPath]);

  const activePreset = useMemo(
    () => document.presets[String(playerCount)] ?? createLayoutPreset(playerCount),
    [document.presets, playerCount],
  );

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

  const handleSeatsChange = useCallback((seats: SeatLayout[]) => {
    updateActivePreset((_next, preset) => {
        preset.seats = seats.map((seat) => ({
          ...seat,
          position: { ...seat.position },
          playerOverrides: seat.playerOverrides ? { ...seat.playerOverrides } : undefined,
        }));
    });
  }, [updateActivePreset]);

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

  const handleTableChange = useCallback((
    field: 'width' | 'height' | 'offsetX' | 'offsetY' | 'curvature',
    value: number,
  ) => {
    updateActivePreset((_next, preset) => {
      preset.table = {
        ...preset.table,
        [field]: value,
      };
    });
  }, [updateActivePreset]);

  // Handle header props mapping (handle string|null vs string difference)
  const headerProps: GameHeaderProps = {
    user: headProps.user ? {
      uid: headProps.user.uid,
      email: headProps.user.email ?? '',
      displayName: headProps.user.displayName ?? 'Editor',
      photoURL: headProps.user.photoURL ?? undefined,
      isAdmin: headProps.user.isAdmin,
    } : null,
    onLogout: headProps.onLogout,
    getImageUrl: headProps.getImageUrl,
  };

  return (
    <div className="standalone-panel-page standalone-panel-page--card-game-preview">
      {!hideTools && (
        <PreviewCanvasTools
          playerCount={playerCount}
          minPlayerCount={playerRange?.minPlayers ?? 2}
          maxPlayerCount={playerRange?.maxPlayers ?? 10}
          showHandles={showHandles}
          currentTable={activePreset.table}
          onPlayerCountChange={handlePlayerCountChange}
          onShowHandlesChange={setShowHandles}
          onCopyPreset={handleCopyPreset}
          onTableChange={handleTableChange}
        />
      )}
      <CardGameTemplateViewport
        document={document as unknown as CardGameLayoutDocument}
        playerCount={playerCount}
        headerProps={headerProps}
        footerVersion="1.0.0-dev"
        onHomeClick={() => {}}
        embedded={false}
        editableSeats={showHandles}
        onSeatsChange={handleSeatsChange}
      />
    </div>
  );
};

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
      (panel === 'preview' || panel === 'inspector' || panel === 'design-studio' || panel === 'preview-canvas')
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
