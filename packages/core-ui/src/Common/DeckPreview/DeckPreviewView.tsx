import type { CSSProperties, ReactNode } from 'react';
import { CardGridMatrix } from '../CardGridMatrix/CardGridMatrix';

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
};

export function DeckPreviewView({ model, renderPiece, renderAxis, renderBack }: DeckPreviewViewProps) {
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
}: {
  section: DeckPreviewSection;
  renderPiece?: (cell: DeckPreviewCell) => ReactNode;
  renderAxis?: (axis: DeckPreviewAxis) => ReactNode;
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
      {section.kind === DeckPreviewSectionKind.Matrix ? (
        <CardGridMatrix
          rows={section.rows ?? []}
          columns={section.columns ?? []}
          renderAxis={renderAxis}
          renderCell={(rowKey, columnKey) => (
            <DeckPreviewCellView
              cell={cellMap.get(`${rowKey}:${columnKey}`)}
              renderPiece={renderPiece}
            />
          )}
          emptyMessage="No matrix data available."
        />
      ) : (
        <div style={styles.grid}>
          {(section.items ?? []).map((cell) => (
            <DeckPreviewCellView
              key={cell.id}
              cell={cell}
              renderPiece={renderPiece}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DeckPreviewCellView({
  cell,
  renderPiece,
}: {
  cell?: DeckPreviewCell;
  renderPiece?: (cell: DeckPreviewCell) => ReactNode;
}) {
  if (!cell) {
    return (
      <div
        aria-label="Not in deck"
        style={{ ...styles.cell, ...styles.emptyCell }}
        title="Not in deck"
      />
    );
  }

  const custom = renderPiece?.(cell);
  if (custom) {
    return (
      <div style={styles.cell}>
        {custom}
        <DeckPreviewCountBadge count={cell.count} />
      </div>
    );
  }

  return (
    <div style={styles.cell}>
      <span style={styles.cellLabel}>{cell.label}</span>
      <DeckPreviewCountBadge count={cell.count} />
    </div>
  );
}

function DeckPreviewCountBadge({ count }: { count?: number }) {
  if (!count || count <= 1) {
    return null;
  }
  return <span style={styles.countBadge}>x{count}</span>;
}
