import React, { useEffect, useMemo, useState } from 'react';
import { CardGameTemplatePage } from '@ocentra/card-game-ui/CardGameTemplatePage';
import {
  normalizeCardGameLayoutDocument,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import {
  CARD_GAME_LAYOUT_DRAFT_CHANNEL,
  type CardGameLayoutDraftMessage,
} from '@ocentra/game-layout-domain/draftChannel';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import type { GameHeaderProps } from '@ocentra/core-ui/Header/GameHeader';
import { loadSavedCardGameLayoutDocument, readCardGameLayoutDocument } from '@/ui/layout/cardGameLayoutAsset';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';

function toDocument(source: ReturnType<typeof readCardGameLayoutDocument>): CardGameLayoutDocument {
  return {
    defaultPlayerCount: source.defaultPlayerCount,
    presets: source.presets,
    playerUiDefaults: source.playerUiDefaults,
    hud: source.hud,
    cardFan: source.cardFan,
    cardVisuals: source.cardVisuals,
    views: source.views,
    gameplay: source.gameplay,
    extensions: source.extensions,
  };
}

export const CardGamePreviewHarness: React.FC = () => {
  const rawHeaderProps = useCoreUIHeaderProps();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const gameId = searchParams.get('gameId')?.trim() || 'claim';
  const layoutGuid = searchParams.get('layoutGuid')?.trim() || null;

  const defaultDoc = useMemo<CardGameLayoutDocument>(
    () => normalizeCardGameLayoutDocument({}),
    [],
  );

  const [savedDocument, setSavedDocument] = useState<CardGameLayoutDocument | null>(null);
  const [draftDocument, setDraftDocument] = useState<CardGameLayoutDocument | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadInitialDocument = async () => {
      try {
        if (layoutGuid) {
          const raw = await loadRawAssetDocumentByGuid(layoutGuid);
          if (!raw) {
            throw new Error(`Layout asset ${layoutGuid} could not be loaded.`);
          }
          const nextDocument = toDocument(readCardGameLayoutDocument(raw));
          if (!cancelled) {
            setSavedDocument(nextDocument);
            setPlayerCount(nextDocument.defaultPlayerCount);
          }
          return;
        }

        const nextDocument = await loadSavedCardGameLayoutDocument(gameId);
        if (!nextDocument) {
          throw new Error(`Saved layout for ${gameId} could not be loaded.`);
        }
        if (!cancelled) {
          const hydratedDocument = toDocument(nextDocument);
          setSavedDocument(hydratedDocument);
          setPlayerCount(hydratedDocument.defaultPlayerCount);
        }
      } catch {
        if (!cancelled) {
          setSavedDocument(defaultDoc);
          setPlayerCount(defaultDoc.defaultPlayerCount);
        }
      }
    };

    void loadInitialDocument();

    return () => {
      cancelled = true;
    };
  }, [defaultDoc, gameId, layoutGuid]);

  useEffect(() => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    const handler = (event: MessageEvent<CardGameLayoutDraftMessage>) => {
      if (event.data?.document) {
        setDraftDocument(event.data.document);
      }
      if (typeof event.data?.playerCount === 'number') {
        setPlayerCount(event.data.playerCount);
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

  const document = draftDocument ?? savedDocument ?? defaultDoc;
  const resolvedPlayerCount = playerCount ?? document.defaultPlayerCount;

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
      playerCount={resolvedPlayerCount}
      headerProps={headerProps}
      footerVersion={footerVersion}
      onHomeClick={() => {
        window.location.href = '/';
      }}
    />
  );
};
