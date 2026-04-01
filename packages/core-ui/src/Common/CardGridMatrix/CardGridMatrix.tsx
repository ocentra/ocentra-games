import type { CSSProperties, ReactNode } from 'react';

export interface CardGridMatrixColumn {
  key: string;
  label: string;
}

export interface CardGridMatrixRow {
  key: string;
  label: string;
}

export interface CardGridMatrixProps {
  rows: CardGridMatrixRow[];
  columns: CardGridMatrixColumn[];
  renderCell: (rowKey: string, columnKey: string) => ReactNode;
  emptyMessage?: string;
}

const styles = {
  container: {
    width: '100%',
    border: '1px solid rgba(120, 120, 120, 0.35)',
    borderRadius: '8px',
    overflow: 'hidden',
    background: 'rgba(15, 15, 15, 0.35)',
  },
  headerRow: {
    display: 'grid',
    gridTemplateColumns: '80px repeat(var(--card-grid-col-count), minmax(56px, 1fr))',
    borderBottom: '1px solid rgba(120, 120, 120, 0.35)',
  } as CSSProperties,
  row: {
    display: 'grid',
    gridTemplateColumns: '80px repeat(var(--card-grid-col-count), minmax(56px, 1fr))',
    borderBottom: '1px solid rgba(120, 120, 120, 0.2)',
  } as CSSProperties,
  corner: {
    minHeight: '44px',
    borderRight: '1px solid rgba(120, 120, 120, 0.35)',
  },
  headerCell: {
    minHeight: '44px',
    borderRight: '1px solid rgba(120, 120, 120, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'rgba(220, 220, 220, 0.9)',
    padding: '4px',
    textAlign: 'center',
  } as CSSProperties,
  rowHeaderCell: {
    minHeight: '56px',
    borderRight: '1px solid rgba(120, 120, 120, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'rgba(220, 220, 220, 0.9)',
    padding: '4px',
    textAlign: 'center',
  } as CSSProperties,
  cell: {
    minHeight: '56px',
    borderRight: '1px solid rgba(120, 120, 120, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
  },
  empty: {
    width: '100%',
    padding: '24px 12px',
    textAlign: 'center',
    color: 'rgba(200, 200, 200, 0.75)',
    fontSize: '0.9rem',
  } as CSSProperties,
};

export function CardGridMatrix({ rows, columns, renderCell, emptyMessage = 'No matrix data available.' }: CardGridMatrixProps) {
  if (rows.length === 0 || columns.length === 0) {
    return <div style={styles.empty}>{emptyMessage}</div>;
  }

  return (
    <div style={styles.container}>
      <div style={{ ...styles.headerRow, ['--card-grid-col-count' as string]: String(columns.length) }}>
        <div style={styles.corner}></div>
        {columns.map((column) => (
          <div key={column.key} style={styles.headerCell}>
            {column.label}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.key} style={{ ...styles.row, ['--card-grid-col-count' as string]: String(columns.length) }}>
          <div style={styles.rowHeaderCell}>{row.label}</div>
          {columns.map((column) => (
            <div key={`${row.key}:${column.key}`} style={styles.cell}>
              {renderCell(row.key, column.key)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
