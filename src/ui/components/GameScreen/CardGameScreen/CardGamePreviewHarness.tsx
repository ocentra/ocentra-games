import React, { useEffect, useState, useMemo } from 'react';
import { CardGameTemplateViewport } from '@ocentra/card-game-ui/CardGameTemplateViewport';
import { 
  normalizeCardGameLayoutDocument, 
  createLayoutPreset,
  hydrateCardGameLayoutAsset
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import type { GameHeaderProps } from '@ocentra/core-ui/Header/GameHeader';
import { setGameAsset } from '@ocentra/game-layout-domain/tableLayoutStore';

// Consistent with asset-editor's channel
const CARD_GAME_LAYOUT_DRAFT_CHANNEL = 'card-game-layout-draft-channel';

export const CardGamePreviewHarness: React.FC = () => {
  const rawHeaderProps = useCoreUIHeaderProps();
  
  // Initial dummy state or load from some default
  const [document, setDocument] = useState<CardGameLayoutDocument>(() => 
    normalizeCardGameLayoutDocument({
      defaultPlayerCount: 4,
      presets: {
        '4': createLayoutPreset(4)
      }
    })
  );

  // Sync with store on mount/update
  useEffect(() => {
    // For preview, we treat it as a ghost asset
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setGameAsset(hydrateCardGameLayoutAsset({ data: document, system: { guid: 'preview', assetType: 'CardGameLayout' } } as any, 'preview'));
    
    // Dismiss loading screen if direct navigations land here
    const hide = (globalThis as Record<string, unknown>).__hideAppLoading as (() => void) | undefined;
    hide?.();
  }, [document]);

  // Listen for live updates from the Asset Editor
  useEffect(() => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    
    const handler = (event: MessageEvent<{ document?: CardGameLayoutDocument }>) => {
      if (event.data?.document) {
        setDocument(event.data.document);
      }
    };

    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, []);

  const headerProps = useMemo<GameHeaderProps>(
    () => ({
      ...rawHeaderProps,
      user: rawHeaderProps.user
        ? {
            uid: rawHeaderProps.user.uid,
            email: rawHeaderProps.user.email ?? '',
            displayName: rawHeaderProps.user.displayName ?? 'Player',
            photoURL: rawHeaderProps.user.photoURL ?? undefined,
            isAdmin: rawHeaderProps.user.isAdmin,
          }
        : null,
    }),
    [rawHeaderProps],
  );

  const footerVersion = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'DEV';

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: 'var(--color-bg-main)' }}>
      <CardGameTemplateViewport
        document={document}
        headerProps={headerProps}
        footerVersion={footerVersion}
        onHomeClick={() => {
          window.location.href = '/';
        }}
      />
    </div>
  );
};
