import { schema } from '@ocentra/schema-domain/effect-builder';

const DeckRankingAxisSchema = schema.object({
  key: schema.string().min(1),
  label: schema.string().min(1).optional(),
  symbol: schema.string().min(1).optional(),
  icon: schema.string().min(1).optional(),
  imageHash: schema.string().min(1).optional(),
  imagePath: schema.string().min(1).optional(),
  color: schema.string().min(1).optional(),
  order: schema.number().int().optional(),
}).passthrough();

const DeckRankingLayoutCellSchema = schema.object({
  pieceId: schema.string().min(1),
  rowKey: schema.string().min(1),
  columnKey: schema.string().min(1),
}).passthrough();

const DeckRankingLayoutSectionSchema = schema.object({
  id: schema.string().min(1),
  title: schema.string().min(1).optional(),
  kind: schema.enum(['matrix', 'grid']),
  rows: schema.array(DeckRankingAxisSchema).optional(),
  columns: schema.array(DeckRankingAxisSchema).optional(),
  pieceIds: schema.array(schema.string().min(1)).optional(),
  cells: schema.array(DeckRankingLayoutCellSchema).optional(),
}).passthrough();

const DeckRankingOrderEntrySchema = schema.object({
  id: schema.string().min(1),
  copies: schema.number().int().min(1).optional(),
  suit: schema.string().min(1).nullable().optional(),
  rank: schema.union([schema.string().min(1), schema.number().int()]).nullable().optional(),
  label: schema.string().min(1).nullable().optional(),
  order: schema.number().int().nullable().optional(),
  points: schema.number().nullable().optional(),
  kind: schema.string().min(1).nullable().optional(),
}).passthrough();

export const DeckRankingDataSchema = schema.object({
  rankingFamily: schema.string().min(1),
  expectedPieceCount: schema.number().int().min(0),
  layout: schema.array(DeckRankingLayoutSectionSchema).default([]),
  order: schema.array(DeckRankingOrderEntrySchema).default([]),
  scoringHints: schema.record(schema.unknown()).default({}),
  deckType: schema.string().min(1).optional(),
  expectedCardCount: schema.number().int().min(0).optional(),
  expectedTileCount: schema.number().int().min(0).optional(),
  includesJokers: schema.boolean().optional(),
  backCardCount: schema.number().int().min(0).optional(),
  deckFamily: schema.string().min(1).optional(),
  cardEntries: schema.array(DeckRankingOrderEntrySchema).optional(),
  familyPayload: schema.record(schema.unknown()).optional(),
  maxPip: schema.number().int().min(0).optional(),
  tileIds: schema.array(schema.string().min(1)).optional(),
  months: schema.array(schema.unknown()).optional(),
  includeBonusTiles: schema.boolean().optional(),
  legacyPayload: schema.record(schema.unknown()).optional(),
}).passthrough().superRefine((data, ctx) => {
  const orderCount = data.order.reduce((sum, entry) => sum + (entry.copies ?? 1), 0);
  const explicitCount = Math.max(
    orderCount,
    data.expectedCardCount ?? 0,
    data.expectedTileCount ?? 0,
    data.tileIds?.length ?? 0,
    data.cardEntries?.reduce((sum, entry) => sum + (entry.copies ?? 1), 0) ?? 0,
  );

  if (data.expectedPieceCount === 0 && explicitCount > 0) {
    ctx.addIssue({
      code: schema.IssueCode.custom,
      path: ['expectedPieceCount'],
      message: `expectedPieceCount must be populated for DeckRanking assets (expected ${explicitCount})`,
    });
  }

  if (data.expectedPieceCount > 0 && explicitCount > 0 && data.expectedPieceCount !== explicitCount) {
    ctx.addIssue({
      code: schema.IssueCode.custom,
      path: ['expectedPieceCount'],
      message: `expectedPieceCount must match declared ranking order/count (${explicitCount})`,
    });
  }

  if (data.rankingFamily === 'mahjong') {
    const sectionIds = new Set(data.layout.map((section) => section.id));
    if (!sectionIds.has('mahjong-suits')) {
      ctx.addIssue({
        code: schema.IssueCode.custom,
        path: ['layout'],
        message: 'Mahjong rankings must declare a mahjong-suits matrix layout',
      });
    }
    if (!sectionIds.has('mahjong-honors')) {
      ctx.addIssue({
        code: schema.IssueCode.custom,
        path: ['layout'],
        message: 'Mahjong rankings must declare a mahjong-honors layout',
      });
    }
    if ((data.includeBonusTiles === true || data.expectedPieceCount >= 144) && !sectionIds.has('mahjong-bonus')) {
      ctx.addIssue({
        code: schema.IssueCode.custom,
        path: ['layout'],
        message: 'Mahjong rankings with bonus tiles must declare a mahjong-bonus layout',
      });
    }
  }

  data.layout.forEach((section, sectionIndex) => {
    if (section.kind !== 'matrix') {
      return;
    }
    const rowCount = section.rows?.length ?? 0;
    const columnCount = section.columns?.length ?? 0;
    const pieceIdCount = section.pieceIds?.length ?? 0;
    const cellCount = section.cells?.length ?? 0;
    if (rowCount > 0 && columnCount > 0 && pieceIdCount > 0 && cellCount === 0 && pieceIdCount !== rowCount * columnCount) {
      ctx.addIssue({
        code: schema.IssueCode.custom,
        path: ['layout', sectionIndex, 'pieceIds'],
        message: 'Sparse matrix layouts must declare explicit cells so preview positions cannot shift',
      });
    }
    const rowKeys = new Set(section.rows?.map((row) => row.key));
    const columnKeys = new Set(section.columns?.map((column) => column.key));
    section.cells?.forEach((cell, cellIndex) => {
      if (rowKeys.size > 0 && !rowKeys.has(cell.rowKey)) {
        ctx.addIssue({
          code: schema.IssueCode.custom,
          path: ['layout', sectionIndex, 'cells', cellIndex, 'rowKey'],
          message: `Cell rowKey "${cell.rowKey}" is not declared in matrix rows`,
        });
      }
      if (columnKeys.size > 0 && !columnKeys.has(cell.columnKey)) {
        ctx.addIssue({
          code: schema.IssueCode.custom,
          path: ['layout', sectionIndex, 'cells', cellIndex, 'columnKey'],
          message: `Cell columnKey "${cell.columnKey}" is not declared in matrix columns`,
        });
      }
    });
    section.rows?.forEach((row, rowIndex) => {
      if (axisNeedsPresentation(row) && !hasAxisPresentation(row)) {
        ctx.addIssue({
          code: schema.IssueCode.custom,
          path: ['layout', sectionIndex, 'rows', rowIndex],
          message: 'Matrix row axes with compact non-numeric labels must declare symbol, icon, imageHash, or imagePath',
        });
      }
    });
  });
});

function hasAxisPresentation(axis: schema.infer<typeof DeckRankingAxisSchema>): boolean {
  return Boolean(axis.symbol || axis.icon || axis.imageHash || axis.imagePath);
}

function axisNeedsPresentation(axis: schema.infer<typeof DeckRankingAxisSchema>): boolean {
  const key = axis.key.trim();
  const label = axis.label?.trim() ?? '';
  if (/^\d+$/.test(key) || /^\d+$/.test(label)) {
    return false;
  }
  return label.length > 0 && label.length <= 2;
}
