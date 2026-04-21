import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardGameDesignStudio } from '@ocentra/card-game-ui/CardGameDesignStudio';
import type { CardGameLayoutDocument as LayoutAssetDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { createPanelWindow, CARD_GAME_LAYOUT_DRAFT_CHANNEL } from '@/utils/createPanelWindow';
import type { AssetData } from '@/types/assets';
import {
  buildLoadedLayoutAssetFromRaw,
  loadLayoutPlayerRange,
  type LayoutPlayerRange,
  saveLayoutAsset,
  type LoadedLayoutAsset,
} from '@/adapters/layout/LayoutAssetService';
import type { CardGameLayoutDraftMessage } from '@ocentra/game-layout-domain/draftChannel';
import './CardGameLayoutPreview.css';

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

  const [isPreviewTornOff, setIsPreviewTornOff] = useState(false);
  const [document, setDocument] = useState<LayoutAssetDocument | null>(null);
  const [loadedAsset, setLoadedAsset] = useState<LoadedLayoutAsset | null>(null);
  const [playerRange, setPlayerRange] = useState<LayoutPlayerRange | null>(null);
  const [activePlayerCount, setActivePlayerCount] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const externalWindowRef = useRef<import('@tauri-apps/api/webviewWindow').WebviewWindow | null | undefined>(null);

  useEffect(() => {
    try {
      const nextLoadedAsset = buildLoadedLayoutAssetFromRaw(assetPath, assetData as Record<string, unknown>);
      setLoadedAsset(nextLoadedAsset);
      setDocument(nextLoadedAsset.document);
      setActivePlayerCount(nextLoadedAsset.document.defaultPlayerCount);
      setPlayerRange(null);
      setSaveStatus(null);
    } catch {
      setLoadedAsset(null);
      setDocument(null);
      setPlayerRange(null);
      setActivePlayerCount(null);
      setSaveStatus('Layout asset could not be loaded');
    }
  }, [assetData, assetPath]);

  useEffect(() => {
    if (!loadedAsset?.gameId) {
      setPlayerRange(null);
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
      if (event.data?.assetPath !== assetPath || !event.data.document) {
        return;
      }

      setDocument(event.data.document);
      if (typeof event.data.playerCount === 'number') {
        setActivePlayerCount(event.data.playerCount);
      }
      onAssetUpdate?.(buildDraftAssetData(event.data.document));
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, [assetPath, buildDraftAssetData, document, onAssetUpdate]);

  const broadcastDraft = useCallback((nextDocument: LayoutAssetDocument, playerCount: number | null) => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    const payload: CardGameLayoutDraftMessage = {
      assetPath,
      document: nextDocument,
      playerCount: playerCount ?? nextDocument.defaultPlayerCount,
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
      setLoadedAsset(saved);
      setDocument(saved.document);
      onAssetUpdate?.(saved.raw as AssetData);
      setSaveStatus('Saved');
      broadcastDraft(saved.document, activePlayerCount);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : 'Failed to save layout');
    }
  }, [activePlayerCount, broadcastDraft, document, loadedAsset, onAssetUpdate]);

  const handleOpenCanvas = useCallback(async () => {
    const win = await createPanelWindow('preview-canvas', assetPath, (assetData.name as string) || 'Layout Preview', true);
    setIsPreviewTornOff(true);
    externalWindowRef.current = win;

    if (win) {
      win.once('tauri://destroyed', () => {
        setIsPreviewTornOff(false);
        externalWindowRef.current = null;
      });
    }
  }, [assetPath, assetData.name]);

  const handleRecallPreview = useCallback(() => {
    if (externalWindowRef.current) {
      void externalWindowRef.current.close();
    }
    setIsPreviewTornOff(false);
  }, []);


  const [viewportScale, setViewportScale] = useState(0.2);
  const observerRef = useRef<ResizeObserver | null>(null);

  const viewportBoxRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      const measure = () => {
        const width = node.clientWidth;
        const height = node.clientHeight;
        if (width > 0 && height > 0) {
          setViewportScale(Math.min(width / 1920, height / 1080));
        }
      };

      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      observerRef.current = observer;

      // Ensure it settles
      setTimeout(measure, 100);
      setTimeout(measure, 500);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('standalone', 'preview-canvas');
    params.set('assetPath', assetPath);
    params.set('hideTools', 'true');
    params.set('locked', 'true');
    return `/standalone-panel?${params.toString()}`;
  }, [assetPath]);

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
          {saveStatus ? <span className="card-game-layout-preview__status">{saveStatus}</span> : null}
        </div>
      </div>

      <div className="card-game-layout-preview__container">
        <div className="card-game-layout-preview__content">
          {!isPreviewTornOff && (
            <div ref={viewportBoxRef} className="card-game-layout-preview__viewport-box">
              <iframe
                src={previewUrl}
                className="card-game-layout-preview__reflection-iframe"
                style={{
                  width: 1920,
                  height: 1080,
                  minWidth: 1920,
                  minHeight: 1080,
                  transform: `translate(-50%, -50%) scale(${viewportScale})`,
                  transformOrigin: 'center center',
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  border: 'none',
                  opacity: 1,
                  transition: 'transform 0.2s ease-out, opacity 0.2s ease-in-out',
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
