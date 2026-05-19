import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { CardRankingEntry, CardSuitEntry } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import {
  DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS,
  DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS,
  type SelectedGameDeckVisualControls,
  type SelectedGameLayoutControls,
  type SelectedGameRankingVisualControls,
  type SelectedGameTabId,
} from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation';
import { DeckPreviewView } from '@ocentra/core-ui/Common/DeckPreview/DeckPreviewView';
import { CardImageViewer } from '@ocentra/core-ui/Common/CardImageViewer/CardImageViewer';
import { SuitIcon } from '@ocentra/core-ui/Common/SuitArt/SuitArt';
import { normalizeSuit, type Suit } from '@ocentra/core-ui/Common/SuitArt/SuitArtPrimitives';
import { useImageUrl } from '@/hooks/useImageUrl';
import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
import type { SelectedGameAssetBundle } from '@/ui/pages/games/SelectedGame/gameDetailAssetSections';

type LooseRecord = Record<string, unknown>;
type VisualStyle = CSSProperties & Record<`--${string}`, string | number | undefined>;
type CardSuitColor = CardSuitEntry['SuitColor'];

const cardSuitColor = {
  black: 'Black' as CardSuitColor,
  red: 'Red' as CardSuitColor,
  none: 'None' as CardSuitColor,
};

interface SelectedGameVisualContentProps {
  bundle: SelectedGameAssetBundle | null;
  gameLabel: string;
  layoutControls?: SelectedGameLayoutControls;
  tabId: SelectedGameTabId;
}

interface AssetResourceLookupEntry {
  guid?: string;
  path?: string;
  assetType?: string;
}

export function SelectedGameVisualContent({
  bundle,
  gameLabel,
  layoutControls,
  tabId,
}: SelectedGameVisualContentProps): ReactNode {
  if (!bundle) {
    return null;
  }

  if (tabId === 'deck' && (bundle.deck || bundle.deckModel)) {
    return (
      <SelectedGameDeckVisual
        source={bundle.deck ?? bundle.deckModel}
        gameLabel={gameLabel}
        controls={layoutControls?.visuals?.deck}
      />
    );
  }

  if (tabId === 'ranking' && bundle.ranking) {
    return (
      <SelectedGameRankingVisual
        source={bundle.ranking}
        gameLabel={gameLabel}
        controls={layoutControls?.visuals?.ranking}
      />
    );
  }

  return null;
}

function SelectedGameDeckVisual({
  controls,
  gameLabel,
  source,
}: {
  controls?: SelectedGameDeckVisualControls;
  gameLabel: string;
  source: unknown;
}) {
  const [model, setModel] = useState<DeckPreviewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<DeckPreviewCell | null>(null);
  const viewerCells = useMemo(() => deckPreviewViewerCells(model), [model]);
  const style = useMemo(() => buildDeckPreviewCompactStyle({
    ...DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS,
    ...controls,
  }), [controls]);

  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      setIsLoading(true);
      setSelectedCell(null);
      try {
        const refs = collectDeckPreviewRefs(source);
        const resources = await getEntryIndexResourceEntries();
        const [pieces, rankings] = await Promise.all([
          loadDeckReferences(uniqueDeckPreviewRefs(refs.pieceRefs), resources),
          loadDeckReferences(refs.rankingRefs, resources),
        ]);
        if (!cancelled) {
          setModel(buildDeckPreviewModel({
            deck: source,
            pieces,
            rankings,
            title: `${gameLabel} Deck`,
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
  }, [gameLabel, source]);

  if (isLoading) {
    return <SelectedGameVisualPlaceholder label="Loading deck..." />;
  }

  if (!model) {
    return <SelectedGameVisualPlaceholder label="No deck preview available." />;
  }

  return (
    <div className="selected-game-asset-visual selected-game-asset-visual--deck" style={style}>
      <DeckPreviewView
        model={model}
        compact
        onCellClick={setSelectedCell}
        renderPiece={(cell) => <DeckPieceCell cell={cell} />}
        renderAxis={(axis) => <DeckAxisCell axis={axis} />}
        renderBack={(imageHash) => <DeckBackCell imageHash={imageHash} />}
      />
      {selectedCell ? (
        <DeckCellDetail
          cell={selectedCell}
          cells={viewerCells}
          onSelectCell={setSelectedCell}
          onClose={() => setSelectedCell(null)}
        />
      ) : null}
    </div>
  );
}

function SelectedGameRankingVisual({
  controls,
  gameLabel,
  source,
}: {
  controls?: SelectedGameRankingVisualControls;
  gameLabel: string;
  source: unknown;
}) {
  const data = dataOf(source);
  const style = useMemo(() => buildRankingPreviewCompactStyle({
    ...DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS,
    ...controls,
  }), [controls]);
  const familyPayload = asRecord(data.familyPayload);
  const french = asRecord(familyPayload.french);
  const suits = asArray(french.suits).map(asRecord).map(toCardSuitEntry).sort((a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0));
  const rankings = asArray(french.rankings).map(asRecord).map(toCardRankingEntry).sort((a, b) => {
    const displayOrder = (a.DisplayOrder ?? Number.MAX_SAFE_INTEGER) - (b.DisplayOrder ?? Number.MAX_SAFE_INTEGER);
    return displayOrder !== 0 ? displayOrder : (b.Value ?? 0) - (a.Value ?? 0);
  });
  const strongestRank = rankings[0];
  const weakestRank = rankings[rankings.length - 1];

  if (suits.length === 0 || rankings.length === 0) {
    return <SelectedGameVisualPlaceholder label="No ranking matrix available." />;
  }

  return (
    <div className="selected-game-ranking-visual" style={style}>
      <div className="selected-game-ranking-visual__header">
        <h2>{gameLabel} Ranking</h2>
      </div>
      <div className="selected-game-ranking-visual__suits">
        {suits.map((suit) => (
          <div
            key={suit.SuitName}
            className={[
              'selected-game-ranking-visual__suit',
              isRedRankingSuit(suit)
                ? 'selected-game-ranking-visual__suit--red'
                : 'selected-game-ranking-visual__suit--black',
            ].join(' ')}
          >
            <span className="selected-game-ranking-visual__suit-glyph">
              <RankingSuitGlyph suit={suit} />
            </span>
            <span>{suit.SuitName}</span>
          </div>
        ))}
      </div>
      <div className="selected-game-ranking-visual__summary">
        <RankingSummary label="Strongest" value={strongestRank ? `${strongestRank.CardSymbol || strongestRank.CardName} = ${strongestRank.Value}` : 'None'} />
        <RankingSummary label="Weakest" value={weakestRank ? `${weakestRank.CardSymbol || weakestRank.CardName} = ${weakestRank.Value}` : 'None'} />
        <RankingSummary label="Ranks" value={String(rankings.length)} />
        <RankingSummary label="Suits" value={String(suits.length)} />
      </div>
      <div className="selected-game-ranking-visual__matrix" style={{ '--ranking-suit-count': String(suits.length) } as CSSProperties}>
        <div className="selected-game-ranking-visual__matrix-corner">Rank</div>
        {suits.map((suit) => (
          <div
            key={suit.SuitName}
            className={[
              'selected-game-ranking-visual__matrix-suit',
              isRedRankingSuit(suit)
                ? 'selected-game-ranking-visual__matrix-suit--red'
                : 'selected-game-ranking-visual__matrix-suit--black',
            ].join(' ')}
            title={suit.SuitName}
          >
            <RankingSuitGlyph suit={suit} />
          </div>
        ))}
        {rankings.map((ranking) => (
          <div key={`${ranking.Value}:${ranking.CardSymbol}:row`} className="selected-game-ranking-visual__matrix-row-fragment">
            <div className="selected-game-ranking-visual__matrix-rank">
              {ranking.CardSymbol || ranking.CardName}
            </div>
            {suits.map((suit) => (
              <div key={`${ranking.Value}:${ranking.CardSymbol}:${suit.SuitName}`} className="selected-game-ranking-visual__matrix-value">
                {ranking.Value}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SelectedGameVisualPlaceholder({ label }: { label: string }) {
  return (
    <div className="selected-game-asset-visual__placeholder">
      {label}
    </div>
  );
}

function RankingSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="selected-game-ranking-visual__summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

async function loadDeckReferences(refs: DeckPreviewReference[], resources: AssetResourceLookupEntry[]): Promise<unknown[]> {
  const documents = await Promise.all(refs.map((ref) => loadDeckReference(ref, resources)));
  return documents.filter((document): document is LooseRecord => document !== null);
}

async function loadDeckReference(ref: DeckPreviewReference, resources: AssetResourceLookupEntry[]): Promise<LooseRecord | null> {
  const pathGuid = findGuidByPath(resources, ref.path, ref.assetType);
  return await loadAssetDocumentByCandidateGuids(pathGuid, ref.guid);
}

async function loadAssetDocumentByCandidateGuids(primaryGuid: string, fallbackGuid = ''): Promise<LooseRecord | null> {
  const candidateGuids = [primaryGuid, fallbackGuid].filter((guid, index, guids) => guid && guids.indexOf(guid) === index);
  for (const guid of candidateGuids) {
    const document = await loadRawAssetDocumentByGuid(guid);
    if (document) {
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
        className="selected-game-deck-visual__piece-image"
        onError={() => setHasError(true)}
      />
    );
  }

  return <span className="selected-game-deck-visual__piece-label">{cell.label}</span>;
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
        className="selected-game-deck-visual__axis-image"
        onError={() => setHasError(true)}
      />
    );
  }

  return undefined;
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
        className="selected-game-deck-visual__back-image"
        onError={() => setHasError(true)}
      />
    );
  }

  return <span className="selected-game-deck-visual__piece-label">Back</span>;
}

function deckPreviewViewerCells(model: DeckPreviewModel | null): DeckPreviewCell[] {
  const seen = new Set<string>();
  const cells: DeckPreviewCell[] = [];
  for (const section of model?.sections ?? []) {
    for (const cell of section.cells ?? []) {
      if (seen.has(cell.id)) continue;
      seen.add(cell.id);
      cells.push(cell);
    }
    for (const cell of section.items ?? []) {
      if (seen.has(cell.id)) continue;
      seen.add(cell.id);
      cells.push(cell);
    }
  }
  return cells;
}

function wrapDeckPreviewIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

function deckPieceDisplayLabel(label: string): string {
  return label.replace(/_/g, ' ');
}

function DeckCellDetail({
  cell,
  cells,
  onSelectCell,
  onClose,
}: {
  cell: DeckPreviewCell;
  cells: DeckPreviewCell[];
  onSelectCell: (cell: DeckPreviewCell) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const src = useDeckImageUrl(cell.imageHash, cell.imagePath);
  const [hasError, setHasError] = useState(false);
  const currentIndex = Math.max(0, cells.findIndex(item => item.id === cell.id));
  const canCycle = cells.length > 1;
  const selectByDelta = useCallback((delta: number) => {
    if (!canCycle) return;
    const nextCell = cells[wrapDeckPreviewIndex(currentIndex + delta, cells.length)];
    if (nextCell) {
      onSelectCell(nextCell);
    }
  }, [canCycle, cells, currentIndex, onSelectCell]);
  useEffect(() => {
    setHasError(false);
  }, [src]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [cell.id]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        selectByDelta(-1);
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        selectByDelta(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectByDelta]);

  return (
    <div
      ref={dialogRef}
      className="selected-game-deck-visual__detail"
      role="dialog"
      aria-label={`${cell.label} detail`}
      tabIndex={-1}
    >
      <CardImageViewer
        className="selected-game-deck-visual__viewer"
        ariaLabel={`${cell.label} card image`}
        imageSrc={src && !hasError ? src : null}
        imageAlt={deckPieceDisplayLabel(cell.label)}
        missingLabel={deckPieceDisplayLabel(cell.label)}
        caption={deckPieceDisplayLabel(cell.label)}
        counter={cells.length > 0 ? `${currentIndex + 1}/${cells.length}` : '1/1'}
        previousLabel="Previous card image"
        nextLabel="Next card image"
        closeLabel="Close card detail"
        onPrevious={canCycle ? () => selectByDelta(-1) : undefined}
        onNext={canCycle ? () => selectByDelta(1) : undefined}
        onClose={onClose}
        onImageError={src ? () => setHasError(true) : undefined}
      />
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

function buildRankingPreviewCompactStyle(
  controls: Required<SelectedGameRankingVisualControls>
): VisualStyle {
  return {
    '--ranking-suit-icon-gap': px(controls.suitIconGap),
    '--ranking-suit-icon-glyph-size': px(controls.suitIconGlyphSize),
    '--ranking-suit-icon-glyph-font': px(controls.suitIconGlyphFont),
    '--ranking-suit-icon-label-font': px(controls.suitIconLabelFont),
    '--ranking-suit-icon-radius': px(controls.suitIconRadius),
    '--ranking-suit-icon-pad-y': px(controls.suitIconPadY),
    '--ranking-suit-icon-pad-x': px(controls.suitIconPadX),
    '--ranking-summary-gap': px(controls.summaryGap),
    '--ranking-summary-label-font': px(controls.summaryLabelFont),
    '--ranking-summary-value-font': px(controls.summaryValueFont),
    '--ranking-summary-pad-y': px(controls.summaryPadY),
    '--ranking-summary-pad-x': px(controls.summaryPadX),
    '--ranking-matrix-row-height': px(controls.matrixRowHeight),
    '--ranking-matrix-rank-column-width': px(controls.matrixRankColumnWidth),
    '--ranking-matrix-cell-font': px(controls.matrixCellFont),
    '--ranking-matrix-header-font': px(controls.matrixHeaderFont),
    '--ranking-matrix-cell-pad-y': px(controls.matrixCellPadY),
    '--ranking-matrix-cell-pad-x': px(controls.matrixCellPadX),
    '--ranking-matrix-radius': px(controls.matrixRadius),
    '--ranking-matrix-scrollbar-size': px(controls.matrixScrollbarSize),
  };
}

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
}

function dataOf(value: unknown): LooseRecord {
  const record = asRecord(value);
  const data = asRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toSuitColor(value: unknown): CardSuitColor {
  const normalized = asString(value).toLowerCase();
  if (normalized === 'black') {
    return cardSuitColor.black;
  }
  if (normalized === 'red') {
    return cardSuitColor.red;
  }
  return cardSuitColor.none;
}

function toCardSuitEntry(record: LooseRecord): CardSuitEntry {
  return {
    SuitName: asString(record.SuitName || record.name),
    SuitSymbol: asString(record.SuitSymbol || record.symbol),
    SuitColor: toSuitColor(record.SuitColor || record.color),
    DisplayOrder: asNumber(record.DisplayOrder ?? record.order),
  };
}

function toCardRankingEntry(record: LooseRecord): CardRankingEntry {
  return {
    CardName: asString(record.CardName || record.name),
    CardSymbol: asString(record.CardSymbol || record.symbol),
    Value: asNumber(record.Value ?? record.value),
    DisplayOrder: asNumber(record.DisplayOrder ?? record.order),
  };
}

function RankingSuitGlyph({ suit }: { suit: CardSuitEntry }) {
  const normalizedSuit = getRankingSuit(suit);
  if (normalizedSuit) {
    return (
      <SuitIcon
        suit={normalizedSuit}
        variant="filled"
        size={28}
        showRings={false}
        shadowGlow={false}
        title={suit.SuitName}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  return <>{suit.SuitSymbol || suit.SuitName.slice(0, 1)}</>;
}

function getRankingSuit(suit: CardSuitEntry): Suit | null {
  return normalizeSuit(suit.SuitSymbol) ?? normalizeSuit(suit.SuitName);
}

function isRedRankingSuit(suit: CardSuitEntry): boolean {
  const nameLower = String(suit.SuitName).toLowerCase();
  const colorLower = String(suit.SuitColor ?? '').toLowerCase();
  return nameLower.includes('heart') ||
    nameLower.includes('diamond') ||
    colorLower.includes('red');
}
