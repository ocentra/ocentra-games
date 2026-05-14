import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { isImageHash, type ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
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
import { SuitIcon } from '@ocentra/core-ui/Common/SuitArt/SuitArt';
import { normalizeSuit, type Suit } from '@ocentra/core-ui/Common/SuitArt/SuitArtPrimitives';
import { useImageUrl } from '@/hooks/useImageUrl';
import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
import './AppDeckPreview.css';

type LooseRecord = Record<string, unknown>;
type VisualStyle = CSSProperties & Record<`--${string}`, string | number | undefined>;

export interface AppDeckPreviewAsset {
  title: string;
  guid?: string;
  path?: string;
  document?: unknown;
}

interface AssetResourceLookupEntry {
  guid?: string;
  path?: string;
  assetType?: string;
}

export function AppDeckPreview({
  asset,
  className = 'app-deck-preview',
  controls,
  compact = true,
}: {
  asset: AppDeckPreviewAsset | null;
  className?: string;
  controls?: SelectedGameDeckVisualControls;
  compact?: boolean;
}): ReactNode {
  const [model, setModel] = useState<DeckPreviewModel | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(asset));
  const [selectedCell, setSelectedCell] = useState<DeckPreviewCell | null>(null);
  const style = useMemo(() => buildDeckPreviewCompactStyle({
    ...DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS,
    ...controls,
  }), [controls]);

  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      setIsLoading(Boolean(asset));
      setSelectedCell(null);
      setModel(null);
      if (!asset) {
        return;
      }

      try {
        const resources = await getEntryIndexResourceEntries();
        const source = await loadDeckSource(asset, resources);
        if (!source) {
          if (!cancelled) {
            setModel(null);
          }
          return;
        }

        const refs = collectDeckPreviewRefs(source);
        const [pieces, rankings] = await Promise.all([
          loadDeckReferences(uniqueDeckPreviewRefs(refs.pieceRefs), resources),
          loadDeckReferences(refs.rankingRefs, resources),
        ]);
        if (!cancelled) {
          setModel(buildDeckPreviewModel({
            deck: source,
            pieces,
            rankings,
            title: asset.title,
          }));
        }
      } catch {
        if (!cancelled) {
          setModel(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadModel();

    return () => {
      cancelled = true;
    };
  }, [asset]);

  if (isLoading) {
    return <AppDeckPreviewPlaceholder label="Loading deck..." />;
  }

  if (!model) {
    return <AppDeckPreviewPlaceholder label="No deck preview available." />;
  }

  return (
    <div className={className} style={style}>
      <DeckPreviewView
        model={model}
        compact={compact}
        onCellClick={setSelectedCell}
        renderPiece={(cell) => <DeckPieceCell cell={cell} />}
        renderAxis={(axis) => <DeckAxisCell axis={axis} />}
        renderBack={(imageHash) => <DeckBackCell imageHash={imageHash} />}
      />
      {selectedCell ? <DeckCellDetail cell={selectedCell} onClose={() => setSelectedCell(null)} /> : null}
    </div>
  );
}

async function loadDeckSource(asset: AppDeckPreviewAsset, resources: AssetResourceLookupEntry[]): Promise<LooseRecord | null> {
  if (isRecord(asset.document)) {
    return asset.document;
  }
  const pathGuid = findGuidByPath(resources, asset.path);
  return await loadAssetDocumentByCandidateGuids(asset.guid ?? '', pathGuid);
}

async function loadDeckReferences(refs: DeckPreviewReference[], resources: AssetResourceLookupEntry[]): Promise<unknown[]> {
  const documents = await Promise.all(refs.map((ref) => loadDeckReference(ref, resources)));
  return documents.filter((document): document is LooseRecord => document !== null);
}

async function loadDeckReference(ref: DeckPreviewReference, resources: AssetResourceLookupEntry[]): Promise<LooseRecord | null> {
  const pathGuid = findGuidByPath(resources, ref.path, ref.assetType);
  return await loadAssetDocumentByCandidateGuids(pathGuid, ref.guid ?? '');
}

async function loadAssetDocumentByCandidateGuids(primaryGuid: string, fallbackGuid = ''): Promise<LooseRecord | null> {
  const candidateGuids = [primaryGuid, fallbackGuid].filter((guid, index, guids) => guid && guids.indexOf(guid) === index);
  for (const guid of candidateGuids) {
    const document = await loadRawAssetDocumentByGuid(guid);
    if (isRecord(document)) {
      return document;
    }
  }
  return null;
}

function findGuidByPath(resources: AssetResourceLookupEntry[], path: string | undefined, assetType = ''): string {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    return '';
  }
  return resources.find((resource) => {
    if (normalizePath(resource.path) !== normalizedPath) {
      return false;
    }
    return !assetType || !resource.assetType || resource.assetType === assetType;
  })?.guid ?? '';
}

function normalizePath(path: string | undefined): string {
  return (path ?? '').replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

function isRecord(value: unknown): value is LooseRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function AppDeckPreviewPlaceholder({ label }: { label: string }) {
  return (
    <div className="app-deck-preview app-deck-preview__placeholder">
      {label}
    </div>
  );
}

function DeckPieceCell({ cell }: { cell: DeckPreviewCell }) {
  const src = useDeckImageUrl(cell.imageHash, cell.imagePath);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={cell.label}
        className="app-deck-preview__piece-image"
        onError={() => setHasError(true)}
      />
    );
  }

  return <span className="app-deck-preview__piece-label">{cell.label}</span>;
}

function DeckAxisCell({ axis }: { axis: DeckPreviewAxis }) {
  const src = useDeckImageUrl(axis.imageHash, axis.imagePath);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={axis.label}
        title={axis.label}
        className="app-deck-preview__axis-image"
        onError={() => setHasError(true)}
      />
    );
  }

  return <RankingSuitGlyph axis={axis} />;
}

function DeckBackCell({ imageHash }: { imageHash: string }) {
  const src = useDeckImageUrl(imageHash, undefined);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt="Back"
        className="app-deck-preview__back-image"
        onError={() => setHasError(true)}
      />
    );
  }

  return <span className="app-deck-preview__piece-label">Back</span>;
}

function DeckCellDetail({ cell, onClose }: { cell: DeckPreviewCell; onClose: () => void }) {
  const src = useDeckImageUrl(cell.imageHash, cell.imagePath);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <div className="app-deck-preview__detail" role="dialog" aria-label={`${cell.label} detail`}>
      <div className="app-deck-preview__detail-panel">
        <button type="button" className="app-deck-preview__detail-close" onClick={onClose} aria-label="Close card detail">
          x
        </button>
        {src && !hasError ? (
          <img
            src={src}
            alt={cell.label}
            className="app-deck-preview__detail-image"
            onError={() => setHasError(true)}
          />
        ) : (
          <span className="app-deck-preview__piece-label">{cell.label}</span>
        )}
      </div>
    </div>
  );
}

function useDeckImageUrl(imageHash?: string, imagePath?: string): string | null {
  const hash = typeof imageHash === 'string' && isImageHash(imageHash) ? imageHash as ImageHash : null;
  const { imageUrl } = useImageUrl(hash);
  return imageUrl ?? imagePathToBrowserUrl(imagePath);
}

function imagePathToBrowserUrl(path?: string): string | null {
  if (!path) {
    return null;
  }
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized.startsWith('Resources/')
    ? `/${normalized}`
    : `/Resources/${normalized}`;
}

function px(value: number | undefined): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}px` : undefined;
}

function buildDeckPreviewCompactStyle(
  controls: Required<SelectedGameDeckVisualControls>
): VisualStyle {
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

function RankingSuitGlyph({ axis }: { axis: DeckPreviewAxis }) {
  const normalizedSuit = getDeckPreviewAxisSuit(axis);
  if (normalizedSuit) {
    return (
      <SuitIcon
        suit={normalizedSuit}
        variant="filled"
        size={28}
        showRings={false}
        shadowGlow={false}
        title={axis.label}
        className="app-deck-preview__axis-image"
      />
    );
  }

  return undefined;
}

function getDeckPreviewAxisSuit(axis: DeckPreviewAxis): Suit | null {
  return normalizeSuit(axis.symbol) ?? normalizeSuit(axis.icon) ?? normalizeSuit(axis.label) ?? normalizeSuit(axis.key);
}
