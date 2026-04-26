import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardGameDesignStudio } from '@ocentra/card-game-ui/CardGameDesignStudio';
import type { CardGameLayoutDocument as LayoutAssetDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { createPanelWindow } from '@/utils/createPanelWindow';
import type { AssetData } from '@/types/assets';
import {
  buildLoadedLayoutAssetFromRaw,
  loadLayoutPlayerRange,
  type LayoutPlayerRange,
  saveLayoutAsset,
} from '@/adapters/layout/LayoutAssetService';
import { syncSavedLayoutAssetToR2 } from '@/utils/layoutEditorSync';
import { CARD_GAME_LAYOUT_DRAFT_CHANNEL, ISOLATION_REQUEST_CHANNEL, type IsolationRequestMessage, type CardGameLayoutDraftMessage } from '@ocentra/game-layout-domain/draftChannel';
import { cloneCardGameLayoutDocument } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import { createDraftSessionId } from '@ocentra/game-layout-domain/draftSession';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isolationStore } from '@/services/IsolationStore';
import {
  readStoredLayoutEditorPlayerCount,
  writeStoredLayoutEditorPlayerCount,
} from '@/utils/layoutEditorPreferences';
import './CardGameLayoutPreview.css';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);


interface CardGameLayoutPreviewProps {
  assetPath: string;
  assetData: Record<string, unknown>;
  onAssetUpdate?: (updatedData: Record<string, unknown>) => void;
}

export const CardGameLayoutPreview: React.FC<CardGameLayoutPreviewProps> = ({
  assetPath,
  assetData,
  onAssetUpdate,
}) => {
  const loadedAsset = useMemo(() => {
    if (!assetData || !assetPath) return null;
    try {
      return buildLoadedLayoutAssetFromRaw(assetPath, assetData as Record<string, unknown>);
    } catch (err) {
      log.logError('Layout asset could not be loaded', getStackTrace(), { err, assetPath });
      return null;
    }
  }, [assetData, assetPath]);

  const [isPreviewTornOff, setIsPreviewTornOff] = useState(false);
  const [document, setDocument] = useState<LayoutAssetDocument | null>(loadedAsset?.document ?? null);
  const [playerRange, setPlayerRange] = useState<LayoutPlayerRange | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(loadedAsset ? null : 'Layout asset could not be loaded');
  const externalWindowRef = useRef<import('@tauri-apps/api/webviewWindow').WebviewWindow | null | undefined>(null);
  const draftSessionIdRef = useRef(createDraftSessionId('editor-embedded'));
  const [activePlayerCount, setActivePlayerCount] = useState<number | null>(
    loadedAsset
      ? readStoredLayoutEditorPlayerCount(assetPath, loadedAsset.document.defaultPlayerCount)
      : null,
  );

  useEffect(() => {
    if (typeof activePlayerCount === 'number') {
      writeStoredLayoutEditorPlayerCount(assetPath, activePlayerCount);
    }
  }, [activePlayerCount, assetPath]);


  useEffect(() => {
    if (!loadedAsset?.gameId) {
      return;
    }

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
  }, [loadedAsset?.gameId]);

  const buildDraftAssetData = useCallback((nextDocument: LayoutAssetDocument): AssetData => {
    const nextData = {
      ...(assetData.data as Record<string, unknown> || {}),
      defaultPlayerCount: nextDocument.defaultPlayerCount,
      presets: nextDocument.presets,
      playerUiDefaults: nextDocument.playerUiDefaults,
      hud: nextDocument.hud,
      cardFan: nextDocument.cardFan,
      cardVisuals: nextDocument.cardVisuals,
      views: nextDocument.views,
      gameplay: nextDocument.gameplay,
      extensions: nextDocument.extensions,
      layout: nextDocument,
    };

    return {
      ...assetData,
      data: nextData,
    };
  }, [assetData]);

  useEffect(() => {
    if (!document) {
      return;
    }

    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    const handler = (event: MessageEvent<CardGameLayoutDraftMessage>) => {
      if (event.data?.assetPath !== assetPath) {
        return;
      }

      if (event.data.type === 'ISOLATED_UPDATE') {
        const { componentType, config } = event.data;
        setDocument(prev => {
          if (!prev) return null;
          const next = cloneCardGameLayoutDocument(prev);
          
          if (componentType === 'PlayerUI') {
            next.playerUiDefaults = { ...next.playerUiDefaults, ...(config as Record<string, unknown>) };
          } else if (componentType === 'HudArtwork') {
            next.hud = { ...next.hud, ...(config as Record<string, unknown>) };
          } else if (componentType === 'TableZone') {
            const presetKey = String(activePlayerCount || prev.defaultPlayerCount);
            if (next.presets[presetKey]) {
              next.presets[presetKey].table = { ...next.presets[presetKey].table, ...(config as Record<string, unknown>) };
            }
          }
          
          onAssetUpdate?.(buildDraftAssetData(next));
          return next;
        });
        return;
      }

      if (event.data.sourceSurface === 'editorEmbedded' && event.data.draftSessionId === draftSessionIdRef.current) {
        return;
      }

      if (event.data.document) {
        setDocument(event.data.document);
        if (typeof event.data.playerCount === 'number') {
          setActivePlayerCount(event.data.playerCount);
        }
        onAssetUpdate?.(buildDraftAssetData(event.data.document));
      }
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, [assetPath, activePlayerCount, buildDraftAssetData, document, onAssetUpdate]);

  useEffect(() => {
    const channel = new BroadcastChannel(ISOLATION_REQUEST_CHANNEL);
    const handler = (event: MessageEvent<IsolationRequestMessage>) => {
      if (event.data?.assetPath !== assetPath) {
        return;
      }

      const { type, label, config } = event.data;
      isolationStore.isolateComponent(type, label, config);
      
      // Auto-open isolation hub if it's the first one
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

  const broadcastDraft = useCallback((nextDocument: LayoutAssetDocument, playerCount: number | null) => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    const payload: CardGameLayoutDraftMessage = {
      assetPath,
      document: nextDocument,
      playerCount: playerCount ?? nextDocument.defaultPlayerCount,
      draftSessionId: draftSessionIdRef.current,
      sourceSurface: 'editorEmbedded',
      viewerPerspective: {
        mode: 'canonical',
        localSeatId: 0,
      },
    };
    channel.postMessage(payload);
    channel.close();
  }, [assetPath]);

  const handleChange = useCallback((nextDocument: LayoutAssetDocument) => {
    setDocument(nextDocument);
    const nextAssetData = buildDraftAssetData(nextDocument);
    onAssetUpdate?.(nextAssetData);
    broadcastDraft(nextDocument, activePlayerCount);
  }, [activePlayerCount, broadcastDraft, buildDraftAssetData, onAssetUpdate]);

  const handleActivePlayerCountChange = useCallback((count: number) => {
    setActivePlayerCount(count);
    if (document) {
      broadcastDraft(document, count);
    }
  }, [broadcastDraft, document]);

  const handleSave = useCallback(async () => {
    if (!loadedAsset || !document) {
      return;
    }

    setSaveStatus('Saving...');
    try {
      const saved = await saveLayoutAsset(loadedAsset, document);
      setDocument(saved.document);

      onAssetUpdate?.(saved.raw as AssetData);
      broadcastDraft(saved.document, activePlayerCount);
      try {
        const syncResult = await syncSavedLayoutAssetToR2(saved.path);
        setSaveStatus(syncResult.message);
      } catch (syncError) {
        setSaveStatus(`Saved locally; ${syncError instanceof Error ? syncError.message : 'sync failed'}`);
      }
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : 'Failed to save layout');
    }
  }, [activePlayerCount, broadcastDraft, document, loadedAsset, onAssetUpdate]);

  const handleOpenCanvas = useCallback(async () => {
    const win = await createPanelWindow('preview-canvas', assetPath, (assetData.name as string) || 'Layout Preview', true, activePlayerCount ?? undefined);
    setIsPreviewTornOff(true);
    externalWindowRef.current = win;

    if (win) {
      win.once('tauri://destroyed', () => {
        setIsPreviewTornOff(false);
        externalWindowRef.current = null;
      });
    }
  }, [assetPath, assetData.name, activePlayerCount]);

  const handleRecallPreview = useCallback(() => {
    if (externalWindowRef.current) {
      void externalWindowRef.current.close();
    }
    setIsPreviewTornOff(false);
  }, []);


  const previewUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('standalone', 'preview-canvas');
    params.set('assetPath', assetPath);
    params.set('hideTools', 'true');
    params.set('locked', 'true');
    if (activePlayerCount !== null) params.set('playerCount', String(activePlayerCount));
    return `/standalone-panel?${params.toString()}`;
  }, [assetPath, activePlayerCount]);

  if (!document) {
    return (
      <div className="card-game-layout-preview-loading">
        Loading Layout Asset...
      </div>
    );
  }

  return (
    <div className={`card-game-layout-preview${isPreviewTornOff ? ' card-game-layout-preview--torn-off' : ''}`}>
      <div className="card-game-layout-preview__header">
        <div className="card-game-layout-preview__title">
          Studio: {(assetData?.name as string) || 'Layout Editor'}
        </div>
        <div className="card-game-layout-preview__toolbar">
          <button type="button" className="primary" onClick={() => void handleSave()}>
            Save Layout
          </button>
          {isPreviewTornOff ? (
            <button type="button" onClick={handleRecallPreview}>Bring Preview Back</button>
          ) : (
            <button type="button" onClick={handleOpenCanvas}>Open Canvas</button>
          )}
          <button type="button" onClick={() => void createPanelWindow('isolation', assetPath, 'Isolation Hub', true)}>
            Isolation Hub
          </button>
          {saveStatus ? <span className="card-game-layout-preview__status">{saveStatus}</span> : null}
        </div>
      </div>

      <div className="card-game-layout-preview__container">
        <div className="card-game-layout-preview__content">
          {!isPreviewTornOff && (
            <div className="card-game-layout-preview__viewport-box" style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
              <iframe
                src={previewUrl}
                className="card-game-layout-preview__reflection-iframe"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block'
                }}
                title="Card Game Reflection Preview"
              />
            </div>
          )}

          <div className="card-game-layout-preview__controls-box">
            <CardGameDesignStudio
              document={document}
              onChange={handleChange}
              activePlayerCount={activePlayerCount ?? document.defaultPlayerCount}
              onActivePlayerCountChange={handleActivePlayerCountChange}
              minPlayerCount={playerRange?.minPlayers}
              maxPlayerCount={playerRange?.maxPlayers}
              embedded
            />
          </div>
        </div>
      </div>
    </div>
  );
};
