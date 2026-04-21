import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { CardGameViewportScaler } from '@ocentra/card-game-ui/CardGameViewportScaler';
import { CardGameDesignStudio } from '@ocentra/card-game-ui/CardGameDesignStudio';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { hydrateCardGameLayoutAsset } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import {
  type CardGameLayoutDocument as LayoutAssetDocument,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { GameHeaderProps } from '@ocentra/core-ui/Header/GameHeader';
import { createPanelWindow, CARD_GAME_LAYOUT_DRAFT_CHANNEL } from '@/utils/createPanelWindow';
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
  const rawHeaderProps = useCoreUIHeaderProps();
  const footerVersion = '1.0.0-dev';

  const [isPreviewTornOff, setIsPreviewTornOff] = useState(false);
  const [document, setDocument] = useState<LayoutAssetDocument | null>(null);
  const externalWindowRef = useRef<import('@tauri-apps/api/webviewWindow').WebviewWindow | null | undefined>(null);

  useEffect(() => {
    const raw = assetData.data || assetData.raw;
    if (raw) {
      const asset = hydrateCardGameLayoutAsset(raw as Record<string, unknown>, assetPath);
      setDocument(asset.layout as LayoutAssetDocument);
    }
  }, [assetData, assetPath]);

  const handleChange = useCallback((nextDocument: LayoutAssetDocument) => {
    setDocument(nextDocument);
    if (assetData && onAssetUpdate) {
      const updatedData = {
        ...assetData,
        data: {
          ...(assetData.data as Record<string, unknown> || {}),
          layout: nextDocument,
        },
      };
      onAssetUpdate(updatedData);

      const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
      channel.postMessage({ assetPath, document: nextDocument });
      channel.close();
    }
  }, [assetData, onAssetUpdate, assetPath]);

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

  const headerProps = useMemo<GameHeaderProps>(() => ({
    user: rawHeaderProps.user ? {
      uid: rawHeaderProps.user.uid,
      email: rawHeaderProps.user.email ?? '',
      displayName: rawHeaderProps.user.displayName ?? 'Editor',
      photoURL: rawHeaderProps.user.photoURL ?? undefined,
      isAdmin: rawHeaderProps.user.isAdmin,
    } : null,
    onLogout: rawHeaderProps.onLogout,
    getImageUrl: rawHeaderProps.getImageUrl,
  }), [rawHeaderProps]);

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
          {isPreviewTornOff ? (
            <button onClick={handleRecallPreview}>Bring Preview Back</button>
          ) : (
            <button onClick={handleOpenCanvas}>Open Canvas</button>
          )}
        </div>
      </div>

      <div className="card-game-layout-preview__container">
        <div className="card-game-layout-preview__content">
          {!isPreviewTornOff && (
            <div className="card-game-layout-preview__viewport-box">
              <CardGameViewportScaler
                document={document}
                headerProps={headerProps}
                footerVersion={footerVersion}
                onHomeClick={() => {}}
              />
            </div>
          )}

          <div className="card-game-layout-preview__controls-box">
            <CardGameDesignStudio
              document={document}
              onChange={handleChange}
              embedded
            />
          </div>
        </div>
      </div>
    </div>
  );
};
