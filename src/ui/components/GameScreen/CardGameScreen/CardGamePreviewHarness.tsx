import React, { useEffect, useMemo, useState } from 'react';
import { CardGameTemplatePage } from '@ocentra/card-game-ui/CardGameTemplatePage';
import {
  normalizeCardGameLayoutDocument,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import { CARD_GAME_LAYOUT_DRAFT_CHANNEL } from '@ocentra/game-layout-domain/draftChannel';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import type { GameHeaderProps } from '@ocentra/core-ui/Header/GameHeader';

export const CardGamePreviewHarness: React.FC = () => {
  const rawHeaderProps = useCoreUIHeaderProps();

  const defaultDoc = useMemo<CardGameLayoutDocument>(
    () => normalizeCardGameLayoutDocument({}),
    [],
  );

  const [document, setDocument] = useState<CardGameLayoutDocument>(defaultDoc);

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

  useEffect(() => {
    const hide = (globalThis as Record<string, unknown>).__hideAppLoading as (() => void) | undefined;
    hide?.();
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
    <CardGameTemplatePage
      document={document}
      headerProps={headerProps}
      footerVersion={footerVersion}
      onHomeClick={() => {
        window.location.href = '/';
      }}
    />
  );
};
