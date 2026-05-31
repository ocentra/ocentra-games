import React, { useEffect, useState } from 'react';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { AssetType } from '@ocentra/asset-domain/types/assetType';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { parseJson5Asset } from '@ocentra/asset-domain/serialization/AssetMetadata';
import { Card } from '@ocentra/game-asset-domain/card/cardBase/Card';
import { CardRanking } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import { PlayingCard } from '@ocentra/game-asset-domain/playingCard/PlayingCard';
import { PlayingCardRanking } from '@ocentra/game-asset-domain/playingCard/PlayingCardRanking';
import { DominoTile } from '@ocentra/game-asset-domain/domino/DominoTile';
import { DominoRanking } from '@ocentra/game-asset-domain/domino/DominoRanking';
import { HanafudaCard } from '@ocentra/game-asset-domain/hanafuda/HanafudaCard';
import { HanafudaRanking } from '@ocentra/game-asset-domain/hanafuda/HanafudaRanking';
import { MahjongTile } from '@ocentra/game-asset-domain/mahjong/MahjongTile';
import { MahjongRanking } from '@ocentra/game-asset-domain/mahjong/MahjongRanking';
import {
  buildDeckPreviewModel,
  collectDeckPreviewRefs,
  uniqueDeckPreviewRefs,
  type DeckPreviewAxis,
  type DeckPreviewCell,
  type DeckPreviewModel,
  type DeckPreviewReference,
} from '@ocentra/game-asset-domain/deckPreview/DeckPreviewModel';
import {
  DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS,
  type SelectedGameDeckVisualControls,
} from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation';
import { DeckPreviewView } from '@ocentra/core-ui/Common/DeckPreview/DeckPreviewView';
import { BrandedLoadingSpinner } from '@ocentra/core-ui/Loading/BrandedLoadingSpinner';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { getResourceByGuidDb, loadAsset } from '@/adapters/assets/TauriAssetAdapter';
import { useImageUrl } from '@/hooks/useImageUrl';
import { assetTypeMap } from '@/lib/core/registry/assetTypeMap.generated';
import './DeckPreview.css';

interface DeckPreviewProps {
  assetId: string;
  assetInstance?: unknown | null;
  assetData?: { data?: Record<string, unknown>; system?: Record<string, unknown> } | null;
  compact?: boolean;
  enableCardDetail?: boolean;
  compactControls?: SelectedGameDeckVisualControls;
}

type DeckPreviewStyle = React.CSSProperties & Record<`--${string}`, string | number | undefined>;

type AssetConstructor<T = unknown> = new () => T;

const constructors: Record<string, AssetConstructor> = {
  Card,
  CardRanking,
  PlayingCard,
  PlayingCardRanking,
  DominoTile,
  DominoRanking,
  HanafudaCard,
  HanafudaRanking,
  MahjongTile,
  MahjongRanking,
};

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const DECK_PREVIEW_REF_BATCH_SIZE = 128;
const DECK_PREVIEW_REF_TIMEOUT_MS = 6000;

export const DeckPreview: React.FC<DeckPreviewProps> = ({
  assetId,
  assetInstance,
  assetData,
  compact = false,
  enableCardDetail = false,
  compactControls,
}) => {
  const [model, setModel] = useState<DeckPreviewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<DeckPreviewCell | null>(null);
  const compactStyle = compact
    ? buildDeckPreviewCompactStyle({
      ...DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS,
      ...compactControls,
    })
    : undefined;

  useEffect(() => {
    let isCancelled = false;

    const loadPreview = async () => {
      setIsLoading(true);
      setSelectedCell(null);
      try {
        const source = assetData || assetInstance;
        if (!source) {
          setModel(null);
          return;
        }

        const previewSource = await withDeckPreviewTimeout(
          resolveDeckPreviewSource(source),
          'deck preview source'
        ) ?? source;
        const refs = collectDeckPreviewRefs(previewSource);
        const rankingRefs = uniqueDeckPreviewRefs([
          ...refs.rankingRefs,
          ...collectDeckModelRankingRefs(source),
        ]);
        const [pieces, rankings] = await Promise.all([
          loadRefs(uniqueDeckPreviewRefs(refs.pieceRefs)),
          loadRefs(rankingRefs),
        ]);

        if (isCancelled) {
          return;
        }

        setModel(buildDeckPreviewModel({
          deck: previewSource,
          pieces,
          rankings,
          title: assetId,
        }));
      } catch (error) {
        if (!isCancelled) {
          log.logError('[DeckPreview] Failed to build deck preview', getStackTrace(), error);
          setModel(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      isCancelled = true;
    };
  }, [assetId, assetInstance, assetData]);

  if (isLoading) {
    return (
      <div className="preview-panel__content">
        <div className="preview-panel__placeholder">
          <div className="preview-panel__loading">
            <BrandedLoadingSpinner size="small" />
          </div>
          <p className="preview-panel__placeholder-subtitle">Loading deck...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="preview-panel__content">
        <div className="preview-panel__placeholder">
          <p className="preview-panel__placeholder-subtitle">No deck preview available.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        'preview-panel__content',
        'preview-panel__content--deck',
        compact ? 'preview-panel__content--deck-compact' : '',
      ].filter(Boolean).join(' ')}
      style={compactStyle}
    >
      <DeckPreviewView
        model={model}
        compact={compact}
        onCellClick={enableCardDetail ? setSelectedCell : undefined}
        renderPiece={(cell) => <PreviewPieceCell cell={cell} />}
        renderAxis={(axis) => axis.imageHash ? <PreviewAxisImage axis={axis} /> : undefined}
        renderBack={(imageHash) => <BackCell hash={imageHash as ImageHash} />}
      />
      {enableCardDetail && selectedCell ? (
        <PreviewCardDetail cell={selectedCell} onClose={() => setSelectedCell(null)} />
      ) : null}
    </div>
  );
};

function px(value: number | undefined): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}px` : undefined;
}

function buildDeckPreviewCompactStyle(
  controls: Required<SelectedGameDeckVisualControls>
): DeckPreviewStyle {
  return {
    '--deck-preview-card-track-min': px(controls.cardTrackMin),
    '--deck-preview-card-width': px(controls.cardWidth),
    '--deck-preview-card-cell-min-height': px(controls.cardCellMinHeight),
    '--deck-preview-compact-matrix-gap': px(controls.matrixGap),
    '--deck-preview-compact-row-gap': px(controls.rowGap),
    '--deck-preview-axis-column-width': px(controls.axisColumnWidth),
    '--deck-preview-axis-glyph-size': px(controls.axisGlyphSize),
    '--deck-preview-axis-image-size': px(controls.axisImageSize),
    '--deck-preview-detail-image-max-width': px(controls.detailImageMaxWidth),
    '--deck-preview-detail-image-max-height': px(controls.detailImageMaxHeight),
  };
}

async function loadRefs(refs: DeckPreviewReference[]): Promise<unknown[]> {
  const normalizedRefs = refs.map(normalizePreviewRef);
  const results: Array<unknown | null> = [];
  for (let index = 0; index < normalizedRefs.length; index += DECK_PREVIEW_REF_BATCH_SIZE) {
    const batch = normalizedRefs.slice(index, index + DECK_PREVIEW_REF_BATCH_SIZE);
    results.push(...await Promise.all(batch.map((ref) =>
      withDeckPreviewTimeout(
        loadRef(ref),
        `deck preview reference ${ref.path || ref.guid || ref.displayName || ref.assetType}`
      )
    )));
  }
  return results.filter((asset): asset is unknown => asset !== null);
}

async function resolveDeckPreviewSource(source: unknown): Promise<unknown> {
  const ref = collectDeckModelDeckRef(source);
  if (!ref) {
    return source;
  }
  const rawDocument = await loadRawDocumentFromRef(ref);
  return rawDocument ?? source;
}

function collectDeckModelDeckRef(source: unknown): DeckPreviewReference | null {
  const record = asRecord(source);
  const system = asRecord(record.system);
  if (stringValue(system.assetType) !== assetTypeMap.CardGameDeckModel.assetType) {
    return null;
  }
  const data = asRecord(record.data);
  const assetRefs = asRecord(data.assetRefs);
  const deckModel = asRecord(data.deckModel);
  const deckAssetRef = stringValue(deckModel.deckAssetRef) || 'deck';
  return referenceFromValue(assetRefs[deckAssetRef], assetTypeMap.Deck.assetType);
}

function collectDeckModelRankingRefs(source: unknown): DeckPreviewReference[] {
  const record = asRecord(source);
  const system = asRecord(record.system);
  if (stringValue(system.assetType) !== assetTypeMap.CardGameDeckModel.assetType) {
    return [];
  }
  const data = asRecord(record.data);
  const assetRefs = asRecord(data.assetRefs);
  const deckModel = asRecord(data.deckModel);
  const rankingAssetRef = stringValue(deckModel.rankingAssetRef) || 'ranking';
  const ref = referenceFromValue(assetRefs[rankingAssetRef], assetTypeMap.DeckRanking.assetType);
  return ref ? [ref] : [];
}

function referenceFromValue(value: unknown, fallbackAssetType: string): DeckPreviewReference | null {
  const record = asRecord(value);
  const refValue = record.ref;
  if (typeof refValue === 'string') {
    return {
      assetType: fallbackAssetType,
      guid: refValue,
    };
  }
  if (refValue && typeof refValue === 'object') {
    return referenceFromValue(refValue, fallbackAssetType);
  }
  const guid = stringValue(record.guid);
  const path = normalizePreviewResourcePath(stringValue(record.path));
  const assetType = stringValue(record.assetType) || stringValue(record.type) || fallbackAssetType;
  if (!guid && !path) {
    return null;
  }
  return {
    assetType,
    guid: guid || undefined,
    path: path || undefined,
    displayName: stringValue(record.displayName) || undefined,
    variant: typeof record.variant === 'string' || record.variant === null ? record.variant : undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizePreviewResourcePath(path: string): string {
  if (!path) {
    return '';
  }
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  return normalized.startsWith('Resources/') ? normalized : `Resources/${normalized}`;
}

function normalizePreviewRef(ref: DeckPreviewReference): DeckPreviewReference {
  const path = normalizePreviewResourcePath(ref.path ?? '');
  return {
    ...ref,
    path: path || undefined,
  };
}

async function withDeckPreviewTimeout<T>(promise: Promise<T>, label: string): Promise<T | null> {
  let timeoutId: number | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = window.setTimeout(() => {
      log.logWarn('[DeckPreview] Reference load timed out', getStackTrace(), {
        label,
        timeoutMs: DECK_PREVIEW_REF_TIMEOUT_MS,
      });
      resolve(null);
    }, DECK_PREVIEW_REF_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } catch (error) {
    log.logWarn('[DeckPreview] Reference load failed', getStackTrace(), {
      label,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function loadRef(ref: DeckPreviewReference): Promise<unknown | null> {
  const rawDocument = await loadRawDocumentFromRef(ref);
  if (rawDocument) {
    return rawDocument;
  }

  if (!ref.guid) {
    return null;
  }
  const constructor = constructors[ref.assetType];
  if (!constructor) {
    return null;
  }
  const entry = AssetResourceEntry.fromGuid(ref.guid, ref.assetType as AssetType, ref.displayName);
  return await entry.load(constructor);
}

async function loadRawDocumentFromRef(ref: DeckPreviewReference): Promise<Record<string, unknown> | null> {
  const path = ref.path || await loadPathFromGuid(ref.guid);
  if (!ref.guid && !path) {
    return null;
  }

  try {
    const response = await loadAsset(path ? { path } : { guid: ref.guid });
    if (!response.ok) {
      return null;
    }
    return parseJson5Asset(await response.text());
  } catch {
    return null;
  }
}

async function loadPathFromGuid(guid?: string): Promise<string | undefined> {
  if (!guid) {
    return undefined;
  }
  try {
    const entry = await getResourceByGuidDb(guid);
    return entry?.resourceEntryType === 'AssetResourceEntry' ? entry.path : undefined;
  } catch {
    return undefined;
  }
}

const PreviewPieceCell: React.FC<{ cell: DeckPreviewCell }> = ({ cell }) => {
  const { imageUrl } = useImageUrl((cell.imageHash || null) as ImageHash | null);
  const pathUrl = imageUrl ? null : imagePathToBrowserUrl(cell.imagePath);
  const src = imageUrl ?? pathUrl;

  if (src) {
    return (
      <img
        src={src}
        alt={cell.label}
        className="deck-preview__piece-image"
        onError={(event) => {
          (event.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return <span className="deck-preview__piece-label">{cell.label}</span>;
};

const PreviewCardDetail: React.FC<{
  cell: DeckPreviewCell;
  onClose: () => void;
}> = ({ cell, onClose }) => {
  const { imageUrl } = useImageUrl((cell.imageHash || null) as ImageHash | null);
  const pathUrl = imageUrl ? null : imagePathToBrowserUrl(cell.imagePath);
  const src = imageUrl ?? pathUrl;

  return (
    <div className="deck-preview__card-detail" role="dialog" aria-label={`${cell.label} detail`}>
      <div className="deck-preview__card-detail-panel">
        <button
          type="button"
          className="deck-preview__card-detail-close"
          onClick={onClose}
          aria-label="Close card detail"
        >
          x
        </button>
        <div className="deck-preview__card-detail-media">
          {src ? (
            <img
              src={src}
              alt={cell.label}
              className="deck-preview__card-detail-image"
              onError={(event) => {
                (event.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="deck-preview__card-detail-label">{cell.label}</span>
          )}
        </div>
      </div>
    </div>
  );
};

function imagePathToBrowserUrl(path?: string): string | null {
  if (!path) {
    return null;
  }
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized.startsWith('Resources/')
    ? `/${normalized}`
    : `/Resources/${normalized}`;
}

const PreviewAxisImage: React.FC<{ axis: DeckPreviewAxis }> = ({ axis }) => {
  const { imageUrl } = useImageUrl((axis.imageHash || null) as ImageHash | null);

  if (!imageUrl) {
    return null;
  }

  return (
    <img
      src={imageUrl}
      alt={axis.label}
      title={axis.label}
      className="deck-preview__axis-image"
      onError={(event) => {
        (event.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

const BackCell: React.FC<{ hash: ImageHash }> = ({ hash }) => {
  const { imageUrl } = useImageUrl(hash);

  if (!imageUrl) {
    return <span className="deck-preview__piece-label">Back</span>;
  }

  return (
    <img
      src={imageUrl}
      alt="Back"
      className="deck-preview__back-card-image"
      onError={(event) => {
        (event.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};
