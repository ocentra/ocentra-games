import type { CSSProperties, ReactNode } from 'react';
import { CardGridMatrix } from '../CardGridMatrix/CardGridMatrix';
import { SuitIcon } from '../SuitArt/SuitArt';
import { normalizeSuit } from '../SuitArt/SuitArtPrimitives';

const DeckPreviewSectionKind = {
  Matrix: 'matrix',
  Grid: 'grid',
} as const;

type DeckPreviewSectionKind = typeof DeckPreviewSectionKind[keyof typeof DeckPreviewSectionKind];

export interface DeckPreviewCell {
  id: string;
  label: string;
  rowKey?: string;
  columnKey?: string;
  assetType?: string;
  imageHash?: string;
  imagePath?: string;
  count?: number;
}

export interface DeckPreviewAxis {
  key: string;
  label: string;
  symbol?: string;
  icon?: string;
  imageHash?: string;
  imagePath?: string;
  color?: string;
}

export interface DeckPreviewSection {
  id: string;
  title: string;
  kind: DeckPreviewSectionKind;
  rows?: DeckPreviewAxis[];
  columns?: DeckPreviewAxis[];
  cells?: DeckPreviewCell[];
  items?: DeckPreviewCell[];
}

export interface DeckPreviewModel {
  assetType: string;
  title: string;
  totalPieces: number;
  backImageHash?: string;
  sections: DeckPreviewSection[];
  warnings: string[];
}

export interface DeckPreviewViewProps {
  model: DeckPreviewModel;
  compact?: boolean;
  onCellClick?: (cell: DeckPreviewCell) => void;
  renderPiece?: (cell: DeckPreviewCell) => ReactNode;
  renderAxis?: (axis: DeckPreviewAxis) => ReactNode;
  renderBack?: (imageHash: string) => ReactNode;
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '100%',
  } as CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '0.75rem',
    flexWrap: 'wrap',
  } as CSSProperties,
  title: {
    margin: 0,
    fontSize: '1.125rem',
    lineHeight: 1.2,
    fontWeight: 700,
    color: 'var(--color-accent, #4a9eff)',
  } as CSSProperties,
  meta: {
    margin: 0,
    color: 'var(--text-color-secondary, rgba(255, 255, 255, 0.68))',
    fontSize: '0.8rem',
  } as CSSProperties,
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    minWidth: 0,
  } as CSSProperties,
  sectionTitle: {
    margin: 0,
    fontSize: '0.95rem',
    lineHeight: 1.25,
    fontWeight: 700,
    color: 'var(--text-color-primary, rgba(255, 255, 255, 0.9))',
  } as CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(4.25rem, 1fr))',
    gap: '0.5rem',
  } as CSSProperties,
  compactMatrix: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--deck-preview-compact-matrix-gap, 0.28rem)',
    minWidth: 0,
  } as CSSProperties,
  compactSuitRow: {
    display: 'grid',
    gridTemplateColumns: 'var(--deck-preview-axis-column-width, 2rem) minmax(0, 1fr)',
    alignItems: 'stretch',
    gap: 'var(--deck-preview-compact-row-gap, 0.28rem)',
    minWidth: 0,
  } as CSSProperties,
  compactSuitHeader: {
    minWidth: 0,
    border: '1px solid rgba(120, 120, 120, 0.24)',
    borderRadius: '0.3rem',
    background: 'rgba(255, 255, 255, 0.035)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.12rem',
  } as CSSProperties,
  compactAxisGlyph: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--deck-preview-axis-glyph-size, 0.9rem)',
    fontWeight: 800,
    lineHeight: 1,
  } as CSSProperties,
  compactAxisImage: {
    width: 'var(--deck-preview-axis-image-size, 1rem)',
    height: 'var(--deck-preview-axis-image-size, 1rem)',
    objectFit: 'contain',
    display: 'block',
  } as CSSProperties,
  compactSuitCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(var(--deck-preview-card-track-min, 2.35rem), 1fr))',
    gap: '0.18rem',
    minWidth: 0,
  } as CSSProperties,
  compactGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(var(--deck-preview-card-track-min, 2.35rem), 1fr))',
    gap: '0.18rem',
    minWidth: 0,
  } as CSSProperties,
  compactCell: {
    minHeight: 'var(--deck-preview-card-cell-min-height, 2.7rem)',
    padding: '0.08rem',
    borderRadius: '0.24rem',
  } as CSSProperties,
  cell: {
    minWidth: 0,
    minHeight: '4rem',
    border: '1px solid rgba(120, 120, 120, 0.25)',
    borderRadius: '0.375rem',
    background: 'rgba(255, 255, 255, 0.035)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.25rem',
    overflow: 'hidden',
    position: 'relative',
  } as CSSProperties,
  cellLabel: {
    color: 'var(--text-color-secondary, rgba(255, 255, 255, 0.72))',
    fontSize: '0.72rem',
    lineHeight: 1.15,
    textAlign: 'center',
    overflowWrap: 'anywhere',
  } as CSSProperties,
  empty: {
    opacity: 0.45,
  } as CSSProperties,
  emptyCell: {
    opacity: 0.32,
    background: 'rgba(255, 255, 255, 0.018)',
  } as CSSProperties,
  warning: {
    color: 'var(--warning-color, #f5c16c)',
    fontSize: '0.8rem',
    margin: 0,
  } as CSSProperties,
  back: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    width: 'min(100%, 8rem)',
  } as CSSProperties,
  countBadge: {
    position: 'absolute',
    right: '0.25rem',
    bottom: '0.25rem',
    minWidth: '1.35rem',
    height: '1.15rem',
    borderRadius: '999px',
    padding: '0 0.35rem',
    background: 'rgba(10, 12, 18, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.22)',
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: '0.65rem',
    lineHeight: '1.05rem',
    fontWeight: 700,
    textAlign: 'center',
    pointerEvents: 'none',
  } as CSSProperties,
  clickableCell: {
    appearance: 'none',
    width: '100%',
    color: 'inherit',
    font: 'inherit',
    cursor: 'pointer',
  } as CSSProperties,
};

export function DeckPreviewView({ model, compact = false, onCellClick, renderPiece, renderAxis, renderBack }: DeckPreviewViewProps) {
  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <h2 style={styles.title}>{model.title}</h2>
        <p style={styles.meta}>{model.totalPieces} piece{model.totalPieces === 1 ? '' : 's'}</p>
      </div>

      {model.sections.map((section) => (
        <DeckPreviewSectionView
          key={section.id}
          section={section}
          renderPiece={renderPiece}
          renderAxis={renderAxis}
          compact={compact}
          onCellClick={onCellClick}
        />
      ))}

      {model.backImageHash && renderBack && (
        <div style={styles.back}>
          <h3 style={styles.sectionTitle}>Back</h3>
          {renderBack(model.backImageHash)}
        </div>
      )}

      {model.warnings.map((warning) => (
        <p key={warning} style={styles.warning}>{warning}</p>
      ))}
    </div>
  );
}

function DeckPreviewSectionView({
  section,
  renderPiece,
  renderAxis,
  compact,
  onCellClick,
}: {
  section: DeckPreviewSection;
  renderPiece?: (cell: DeckPreviewCell) => ReactNode;
  renderAxis?: (axis: DeckPreviewAxis) => ReactNode;
  compact: boolean;
  onCellClick?: (cell: DeckPreviewCell) => void;
}) {
  const cellMap = new Map<string, DeckPreviewCell>();
  for (const cell of section.cells ?? []) {
    if (cell.rowKey && cell.columnKey) {
      cellMap.set(`${cell.rowKey}:${cell.columnKey}`, cell);
    }
  }

  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>{section.title}</h3>
      {section.kind === DeckPreviewSectionKind.Matrix && compact ? (
        <DeckPreviewCompactMatrix
          rows={section.rows ?? []}
          columns={section.columns ?? []}
          cellMap={cellMap}
          renderPiece={renderPiece}
          renderAxis={renderAxis}
          onCellClick={onCellClick}
        />
      ) : section.kind === DeckPreviewSectionKind.Matrix ? (
        <CardGridMatrix
          rows={section.rows ?? []}
          columns={section.columns ?? []}
          renderAxis={renderAxis}
          renderCell={(rowKey, columnKey) => (
            <DeckPreviewCellView
              cell={cellMap.get(`${rowKey}:${columnKey}`)}
              renderPiece={renderPiece}
              onCellClick={onCellClick}
            />
          )}
          emptyMessage="No matrix data available."
        />
      ) : (
        <div style={compact ? styles.compactGrid : styles.grid}>
          {(section.items ?? []).map((cell) => (
            <DeckPreviewCellView
              key={cell.id}
              cell={cell}
              renderPiece={renderPiece}
              compact={compact}
              onCellClick={onCellClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DeckPreviewCompactMatrix({
  rows,
  columns,
  cellMap,
  renderPiece,
  renderAxis,
  onCellClick,
}: {
  rows: DeckPreviewAxis[];
  columns: DeckPreviewAxis[];
  cellMap: Map<string, DeckPreviewCell>;
  renderPiece?: (cell: DeckPreviewCell) => ReactNode;
  renderAxis?: (axis: DeckPreviewAxis) => ReactNode;
  onCellClick?: (cell: DeckPreviewCell) => void;
}) {
  if (rows.length === 0 || columns.length === 0) {
    return <div style={styles.empty}>No matrix data available.</div>;
  }

  return (
    <div style={styles.compactMatrix}>
      {rows.map((row) => (
        <div key={row.key} style={styles.compactSuitRow}>
          <div style={styles.compactSuitHeader}>
            <DeckPreviewAxisHeader axis={row} renderAxis={renderAxis} />
          </div>
          <div style={styles.compactSuitCards}>
            {columns.map((column) => (
              <DeckPreviewCellView
                key={`${row.key}:${column.key}`}
                cell={cellMap.get(`${row.key}:${column.key}`)}
                compact
                renderPiece={renderPiece}
                onCellClick={onCellClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function resolveDeckAxisColor(color?: string): string | undefined {
  const normalized = color?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'red') {
    return '#ef4444';
  }
  if (normalized === 'black') {
    return 'rgba(235, 235, 235, 0.92)';
  }
  return color;
}

function DeckPreviewAxisHeader({
  axis,
  renderAxis,
}: {
  axis: DeckPreviewAxis;
  renderAxis?: (axis: DeckPreviewAxis) => ReactNode;
}) {
  const custom = renderAxis?.(axis);
  if (custom !== null && custom !== undefined) {
    return <>{custom}</>;
  }

  if (axis.imagePath) {
    return <img src={axis.imagePath} alt={axis.label} title={axis.label} style={styles.compactAxisImage} />;
  }

  const suit = getDeckPreviewAxisSuit(axis);
  if (suit) {
    return (
      <SuitIcon
        suit={suit}
        variant="filled"
        size={24}
        showRings={false}
        shadowGlow={false}
        title={axis.label}
        style={styles.compactAxisImage}
      />
    );
  }

  return (
    <span
      aria-label={axis.label}
      title={axis.label}
      style={{ ...styles.compactAxisGlyph, color: resolveDeckAxisColor(axis.color) }}
    >
      {axis.symbol || axis.icon || axis.label}
    </span>
  );
}

function getDeckPreviewAxisSuit(axis: DeckPreviewAxis) {
  return normalizeSuit(axis.symbol) ?? normalizeSuit(axis.icon) ?? normalizeSuit(axis.label) ?? normalizeSuit(axis.key);
}

function DeckPreviewCellView({
  cell,
  renderPiece,
  compact = false,
  onCellClick,
}: {
  cell?: DeckPreviewCell;
  renderPiece?: (cell: DeckPreviewCell) => ReactNode;
  compact?: boolean;
  onCellClick?: (cell: DeckPreviewCell) => void;
}) {
  const cellStyle = compact
    ? { ...styles.cell, ...styles.compactCell }
    : styles.cell;

  if (!cell) {
    return (
      <div
        aria-label="Not in deck"
        style={{ ...cellStyle, ...styles.emptyCell }}
        title="Not in deck"
      />
    );
  }

  const custom = renderPiece?.(cell);
  const content = (
    <>
      {custom ?? <span style={styles.cellLabel}>{cell.label}</span>}
      <DeckPreviewCountBadge count={cell.count} />
    </>
  );

  if (onCellClick) {
    return (
      <button
        type="button"
        style={{ ...cellStyle, ...styles.clickableCell }}
        title={cell.label}
        onClick={() => onCellClick(cell)}
      >
        {content}
      </button>
    );
  }

  if (custom) {
    return (
      <div style={cellStyle}>
        {content}
      </div>
    );
  }

  return (
    <div style={cellStyle}>
      {content}
    </div>
  );
}

function DeckPreviewCountBadge({ count }: { count?: number }) {
  if (!count || count <= 1) {
    return null;
  }
  return <span style={styles.countBadge}>x{count}</span>;
}
