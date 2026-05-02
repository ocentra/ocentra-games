import { useEffect, useState } from 'react';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import {
  buildDeckPreviewModel,
  collectDeckPreviewRefs,
  uniqueDeckPreviewRefs,
  type DeckPreviewAxis,
  type DeckPreviewCell,
  type DeckPreviewModel,
  type DeckPreviewReference,
} from '@ocentra/game-asset-domain/deckPreview/DeckPreviewModel';
import { DeckPreviewView } from '@ocentra/core-ui/Common/DeckPreview/DeckPreviewView';
import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
import { useImageUrl } from '@/hooks/useImageUrl';

interface GameCardDeckPreviewProps {
  gameIdentifier: string;
}

const DECK_PREVIEW_LOAD_TIMEOUT_MS = 15000;

export function GameCardDeckPreview({ gameIdentifier }: GameCardDeckPreviewProps) {
  const normalizedIdentifier = gameIdentifier.includes(':') ? gameIdentifier.split(':')[0] : gameIdentifier;
  const [model, setModel] = useState<DeckPreviewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDeckPreview = async () => {
      setIsLoading(true);
      try {
        if (!normalizedIdentifier) {
          setModel(null);
          return;
        }

        const deck = await withTimeout(loadDeckFromGameIdentifier(normalizedIdentifier));
        if (!deck || cancelled) {
          setModel(null);
          return;
        }

        const refs = collectDeckPreviewRefs(deck);
        const loadedRefs = await withTimeout(Promise.all([
          loadRefs(uniqueDeckPreviewRefs(refs.pieceRefs)),
          loadRefs(refs.rankingRefs),
        ]));
        const [pieces, rankings] = loadedRefs ?? [[], []];

        if (cancelled) {
          return;
        }

        setModel(buildDeckPreviewModel({
          deck,
          pieces,
          rankings,
        }));
      } catch {
        if (!cancelled) {
          setModel(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDeckPreview();
    return () => {
      cancelled = true;
    };
  }, [normalizedIdentifier]);

  if (isLoading) {
    return <div style={{ marginBottom: '1rem', opacity: 0.8 }}>Loading deck preview...</div>;
  }

  if (!model) {
    return null;
  }

  return (
    <section style={{ marginBottom: '1rem' }}>
      <DeckPreviewView
        model={model}
        renderPiece={(cell) => <GameDeckPieceCell cell={cell} />}
        renderAxis={(axis) => axis.imageHash ? <GameDeckAxisImage axis={axis} /> : undefined}
        renderBack={(imageHash) => <GameDeckBackCell hash={imageHash as ImageHash} />}
      />
    </section>
  );
}

async function withTimeout<T>(promise: Promise<T>): Promise<T | null> {
  let timeoutId: number | null = null;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(null), DECK_PREVIEW_LOAD_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function loadDeckFromGameIdentifier(identifier: string): Promise<unknown | null> {
  const resources = await getEntryIndexResourceEntries();
  const gameEntry = resources.find((resource) => (
    resource.guid === identifier ||
    resource.gameId === identifier
  ));
  if (!gameEntry?.guid) {
    return null;
  }
  const gameDocument = await loadRawAssetDocumentByGuid(gameEntry.guid);
  const deckRef = dataRecord(gameDocument).deckAsset;
  return await loadDeckFromRef(deckRef);
}

async function loadDeckFromRef(ref: unknown): Promise<unknown | null> {
  const refRecord = recordOf(ref);
  const assetType = textOf(refRecord.assetType) || 'Deck';
  const guid = await resolveReferenceGuid({
    assetType,
    guid: textOf(refRecord.guid),
    path: textOf(refRecord.path),
  });
  if (!guid) {
    return null;
  }
  return await loadRawAssetDocumentByGuid(guid);
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function dataRecord(value: unknown): Record<string, unknown> {
  return recordOf(recordOf(value).data);
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function loadRefs(refs: DeckPreviewReference[]): Promise<unknown[]> {
  const results = await Promise.all(refs.map(loadRef));
  return results.filter((asset): asset is unknown => asset !== null);
}

async function loadRef(ref: DeckPreviewReference): Promise<unknown | null> {
  const guid = await resolveReferenceGuid(ref);
  if (!guid) {
    return null;
  }
  return await loadRawAssetDocumentByGuid(guid);
}

async function resolveReferenceGuid(ref: DeckPreviewReference): Promise<string | null> {
  if (ref.guid) {
    return ref.guid;
  }
  if (!ref.path) {
    return null;
  }

  const normalizedPath = normalizeReferencePath(ref.path);
  const resources = await getEntryIndexResourceEntries();
  const match = resources.find((resource) => (
    resource.guid &&
    normalizeReferencePath(resource.path ?? '') === normalizedPath &&
    (!ref.assetType || resource.assetType === ref.assetType)
  ));
  return match?.guid ?? null;
}

function normalizeReferencePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

function GameDeckAxisImage({ axis }: { axis: DeckPreviewAxis }) {
  const { imageUrl } = useImageUrl((axis.imageHash || null) as ImageHash | null);

  if (!imageUrl) {
    return null;
  }

  return (
    <img
      src={imageUrl}
      alt={axis.label}
      title={axis.label}
      style={{ width: '1.35rem', height: '1.35rem', objectFit: 'contain', display: 'block' }}
      onError={(event) => {
        (event.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

function GameDeckPieceCell({ cell }: { cell: DeckPreviewCell }) {
  const { imageUrl } = useImageUrl((cell.imageHash || null) as ImageHash | null);

  if (!imageUrl) {
    return <span style={{ fontSize: '0.72rem', opacity: 0.85, overflowWrap: 'anywhere' }}>{cell.label}</span>;
  }

  return (
    <img
      src={imageUrl}
      alt={cell.label}
      style={{ width: '100%', maxWidth: '3.5rem', height: '4.75rem', objectFit: 'contain', borderRadius: '0.25rem' }}
      onError={(event) => {
        (event.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

function GameDeckBackCell({ hash }: { hash: ImageHash }) {
  const { imageUrl } = useImageUrl(hash);

  if (!imageUrl) {
    return <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>Back</span>;
  }

  return (
    <img
      src={imageUrl}
      alt="Back"
      style={{ width: '100%', maxWidth: '3.5rem', height: '4.75rem', objectFit: 'contain', borderRadius: '0.25rem' }}
      onError={(event) => {
        (event.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}
