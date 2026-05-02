import { DECK_TYPE_VALUES } from '@ocentra/game-domain/deck/deckTypes';
import {
  RANK_SET_VALUES,
  SUIT_SET_VALUES,
} from '@ocentra/game-domain/deck/deckFamilies';
import { isValidDeckTriple } from '@ocentra/game-domain/deck/deckCompatibility';
import * as Schema from 'effect/Schema';
import { containsPlaceholder } from '../shared/validation-guards';

const NonEmptyString = Schema.String.pipe(Schema.minLength(1));
const Integer = Schema.Number.pipe(Schema.int());
const NonNegativeInteger = Integer.pipe(Schema.nonNegative());
const PositiveInteger = Integer.pipe(Schema.positive());
const UnknownRecord = Schema.Record({ key: Schema.String, value: Schema.Unknown });
const OptionalString = Schema.optional(NonEmptyString);
const NullableOptionalString = Schema.optional(Schema.NullOr(NonEmptyString));

const NoPlaceholderString = NonEmptyString.pipe(
  Schema.filter((value) => !containsPlaceholder(value), {
    message: () => 'Text must not contain placeholder text (e.g., TBD, TODO, or bracketed text)',
  }),
);

const AssetPathString = NonEmptyString.pipe(
  Schema.filter((value) => value.endsWith('.asset'), {
    message: () => 'Asset reference path must end in .asset',
  }),
);

const PieceAssetResourceEntrySchema = Schema.asSchema(
  Schema.Struct({
    resourceEntryType: OptionalString,
    path: AssetPathString,
    guid: Schema.optional(Schema.UUID),
    assetType: NonEmptyString,
    displayName: Schema.optional(NoPlaceholderString),
    variant: NullableOptionalString,
  }).pipe(Schema.extend(UnknownRecord)),
);

const CardAssetResourceEntrySchema = Schema.asSchema(
  Schema.Struct({
    resourceEntryType: OptionalString,
    path: AssetPathString,
    guid: Schema.optional(Schema.UUID),
    assetType: Schema.Literal('Card'),
    displayName: NoPlaceholderString,
    variant: NullableOptionalString,
  }).pipe(Schema.extend(UnknownRecord)),
);

const DeckRankingAssetResourceEntrySchema = Schema.asSchema(
  Schema.Struct({
    resourceEntryType: OptionalString,
    path: NonEmptyString,
    assetType: Schema.Literal('DeckRanking'),
    guid: Schema.UUID,
    displayName: Schema.optional(NoPlaceholderString),
    variant: NullableOptionalString,
  }).pipe(Schema.extend(UnknownRecord)),
);

const CardRankingAssetResourceEntrySchema = Schema.asSchema(
  Schema.Struct({
    resourceEntryType: OptionalString,
    path: NonEmptyString,
    assetType: Schema.Literal('CardRanking'),
    guid: Schema.UUID,
    displayName: Schema.optional(NoPlaceholderString),
    variant: NullableOptionalString,
  }).pipe(Schema.extend(UnknownRecord)),
);

export const SupportedDeckTripleEffectSchema = Schema.Struct({
  deckType: Schema.Literal(...DECK_TYPE_VALUES),
  suitSet: Schema.Literal(...SUIT_SET_VALUES),
  rankSet: Schema.Literal(...RANK_SET_VALUES),
});

export type SupportedDeckTriple = typeof SupportedDeckTripleEffectSchema.Type;

export const SupportedDeckTriplesEffectSchema = Schema.NonEmptyArray(SupportedDeckTripleEffectSchema);

const DeckCardMemberSchema = Schema.asSchema(
  Schema.Struct({
    cardTemplate: CardAssetResourceEntrySchema,
    copies: PositiveInteger,
  }).pipe(Schema.extend(UnknownRecord)),
);

const DeckPieceMemberSchema = Schema.asSchema(
  Schema.Struct({
    pieceTemplate: PieceAssetResourceEntrySchema,
    copies: PositiveInteger,
    logicalId: OptionalString,
    role: OptionalString,
    tags: Schema.optional(Schema.Array(NonEmptyString)),
  }).pipe(Schema.extend(UnknownRecord)),
);

const DeckPresentationSchema = Schema.asSchema(
  Schema.Struct({
    backImageHash: Schema.optional(Schema.String),
    previewLayoutHint: Schema.optional(Schema.String),
    defaultOrientation: Schema.optional(Schema.String),
    defaultShape: Schema.optional(Schema.String),
  }).pipe(Schema.extend(UnknownRecord)),
);

const DeckRuntimePolicySchema = Schema.asSchema(
  Schema.Struct({
    shufflePolicy: OptionalString,
    drawDirection: OptionalString,
    multiplicity: Schema.optional(PositiveInteger),
    visibilityDefaults: Schema.optional(UnknownRecord),
  }).pipe(Schema.extend(UnknownRecord)),
);

export const DeckDataEffectSchema = Schema.asSchema(
  Schema.Struct({
    name: NoPlaceholderString,
    deckFamily: OptionalString,
    pieceKind: OptionalString,
    supportedTriples: SupportedDeckTriplesEffectSchema,
    composition: Schema.optional(Schema.Array(DeckPieceMemberSchema)),
    rankingAsset: Schema.optional(DeckRankingAssetResourceEntrySchema),
    presentation: Schema.optional(DeckPresentationSchema),
    runtimePolicy: Schema.optional(DeckRuntimePolicySchema),
    cardTemplates: Schema.optional(Schema.Array(CardAssetResourceEntrySchema)),
    cardComposition: Schema.optional(Schema.Array(DeckCardMemberSchema)),
    cardRankingAsset: Schema.optional(CardRankingAssetResourceEntrySchema),
    imageSourceFolderPath: OptionalString,
    cardOutputPath: OptionalString,
    backCardSourceFolderPath: OptionalString,
    backCardHash: Schema.optional(Schema.String),
  }).pipe(Schema.extend(UnknownRecord)),
);

export type DeckData = typeof DeckDataEffectSchema.Type;

const DeckRankingAxisSchema = Schema.asSchema(
  Schema.Struct({
    key: NonEmptyString,
    label: OptionalString,
    symbol: OptionalString,
    icon: OptionalString,
    imageHash: OptionalString,
    imagePath: OptionalString,
    color: OptionalString,
    order: Schema.optional(Integer),
  }).pipe(Schema.extend(UnknownRecord)),
);

const DeckRankingLayoutCellSchema = Schema.asSchema(
  Schema.Struct({
    pieceId: NonEmptyString,
    rowKey: NonEmptyString,
    columnKey: NonEmptyString,
  }).pipe(Schema.extend(UnknownRecord)),
);

const DeckRankingLayoutSectionSchema = Schema.asSchema(
  Schema.Struct({
    id: NonEmptyString,
    title: OptionalString,
    kind: Schema.Literal('matrix', 'grid'),
    rows: Schema.optional(Schema.Array(DeckRankingAxisSchema)),
    columns: Schema.optional(Schema.Array(DeckRankingAxisSchema)),
    pieceIds: Schema.optional(Schema.Array(NonEmptyString)),
    cells: Schema.optional(Schema.Array(DeckRankingLayoutCellSchema)),
  }).pipe(Schema.extend(UnknownRecord)),
);

const DeckRankingOrderEntrySchema = Schema.asSchema(
  Schema.Struct({
    id: NonEmptyString,
    copies: Schema.optional(PositiveInteger),
    suit: NullableOptionalString,
    rank: Schema.optional(Schema.NullOr(Schema.Union(NonEmptyString, Integer))),
    label: NullableOptionalString,
    order: Schema.optional(Schema.NullOr(Integer)),
    points: Schema.optional(Schema.NullOr(Schema.Number)),
    kind: NullableOptionalString,
  }).pipe(Schema.extend(UnknownRecord)),
);

export const DeckRankingDataEffectSchema = Schema.asSchema(
  Schema.Struct({
    rankingFamily: NonEmptyString,
    expectedPieceCount: NonNegativeInteger,
    layout: Schema.optional(Schema.Array(DeckRankingLayoutSectionSchema)),
    order: Schema.optional(Schema.Array(DeckRankingOrderEntrySchema)),
    scoringHints: Schema.optional(UnknownRecord),
    deckType: OptionalString,
    expectedCardCount: Schema.optional(NonNegativeInteger),
    expectedTileCount: Schema.optional(NonNegativeInteger),
    includesJokers: Schema.optional(Schema.Boolean),
    backCardCount: Schema.optional(NonNegativeInteger),
    deckFamily: OptionalString,
    cardEntries: Schema.optional(Schema.Array(DeckRankingOrderEntrySchema)),
    familyPayload: Schema.optional(UnknownRecord),
    maxPip: Schema.optional(NonNegativeInteger),
    tileIds: Schema.optional(Schema.Array(NonEmptyString)),
    months: Schema.optional(Schema.Array(Schema.Unknown)),
    includeBonusTiles: Schema.optional(Schema.Boolean),
    legacyPayload: Schema.optional(UnknownRecord),
  }).pipe(Schema.extend(UnknownRecord)),
);

export type DeckRankingData = typeof DeckRankingDataEffectSchema.Type;

export function decodeDeckData(input: unknown): DeckData {
  const data = Schema.decodeUnknownSync(DeckDataEffectSchema)(input);
  validateDeckData(data);
  return data;
}

export function decodeDeckRankingData(input: unknown): DeckRankingData {
  const data = Schema.decodeUnknownSync(DeckRankingDataEffectSchema)(input);
  validateDeckRankingData(data);
  return data;
}

export function decodeSupportedDeckTriples(input: unknown): readonly SupportedDeckTriple[] {
  const triples = Schema.decodeUnknownSync(SupportedDeckTriplesEffectSchema)(input);
  validateSupportedDeckTriples(triples);
  return triples;
}

export function decodeProcessedGameDeckTriple(input: unknown): SupportedDeckTriple | null {
  const root = asRecord(input);
  const engine = asRecord(root.engine);
  const deckType = getString(engine.deckType ?? root.deckType);
  const suitSet = getString(engine.suitSet ?? root.suitSet);
  const rankSet = getString(engine.rankSet ?? root.rankSet);

  if (!deckType || !suitSet || !rankSet) {
    return null;
  }

  const triple = Schema.decodeUnknownSync(SupportedDeckTripleEffectSchema)({
    deckType,
    suitSet,
    rankSet,
  });
  validateSupportedDeckTriples([triple]);
  return triple;
}

export function getDeckTripleKey(triple: SupportedDeckTriple): string {
  return `${triple.deckType}\0${triple.suitSet}\0${triple.rankSet}`;
}

function validateDeckData(data: DeckData): void {
  validateSupportedDeckTriples(data.supportedTriples);

  const composition = data.composition ?? [];
  const cardTemplates = data.cardTemplates ?? [];
  const cardComposition = data.cardComposition ?? [];

  if (composition.length === 0 && cardTemplates.length === 0 && cardComposition.length === 0) {
    throw assetSchemaError('composition', 'Deck must declare composition');
  }

  if (!data.rankingAsset && !data.cardRankingAsset) {
    throw assetSchemaError('rankingAsset', 'Deck must declare rankingAsset');
  }

  const totalCopies = cardComposition.reduce((sum, entry) => sum + entry.copies, 0);
  if (cardComposition.length > 0 && cardTemplates.length > 0 && cardTemplates.length !== totalCopies) {
    throw assetSchemaError(
      'cardComposition',
      `cardComposition totals ${totalCopies} physical cards, but cardTemplates contains ${cardTemplates.length}; mixed mode must stay consistent`,
    );
  }
}

function validateSupportedDeckTriples(triples: readonly SupportedDeckTriple[]): void {
  const seen = new Set<string>();
  const deckTypes = new Set<string>();

  for (const [index, triple] of triples.entries()) {
    deckTypes.add(triple.deckType);

    if (!isValidDeckTriple(triple.deckType, triple.suitSet, triple.rankSet)) {
      throw assetSchemaError(
        `supportedTriples.${index}`,
        `supportedTriples[${index}] must be a valid [deckType, suitSet, rankSet] entry from ALLOWED_TRIPLES`,
      );
    }

    const key = getDeckTripleKey(triple);
    if (seen.has(key)) {
      throw assetSchemaError(`supportedTriples.${index}`, 'supportedTriples must not contain duplicate deck triples');
    }
    seen.add(key);
  }

  if (deckTypes.size > 1) {
    throw assetSchemaError('supportedTriples', 'supportedTriples for a single deck asset must all use the same deckType');
  }
}

function validateDeckRankingData(data: DeckRankingData): void {
  const order = data.order ?? [];
  const cardEntries = data.cardEntries ?? [];
  const layout = data.layout ?? [];
  const orderCount = order.reduce((sum, entry) => sum + (entry.copies ?? 1), 0);
  const cardEntryCount = cardEntries.reduce((sum, entry) => sum + (entry.copies ?? 1), 0);
  const explicitCount = Math.max(
    orderCount,
    data.expectedCardCount ?? 0,
    data.expectedTileCount ?? 0,
    data.tileIds?.length ?? 0,
    cardEntryCount,
  );

  if (data.expectedPieceCount === 0 && explicitCount > 0) {
    throw assetSchemaError(
      'expectedPieceCount',
      `expectedPieceCount must be populated for DeckRanking assets (expected ${explicitCount})`,
    );
  }

  if (data.expectedPieceCount > 0 && explicitCount > 0 && data.expectedPieceCount !== explicitCount) {
    throw assetSchemaError(
      'expectedPieceCount',
      `expectedPieceCount must match declared ranking order/count (${explicitCount})`,
    );
  }

  if (data.rankingFamily === 'mahjong') {
    const sectionIds = new Set(layout.map((section) => section.id));
    if (!sectionIds.has('mahjong-suits')) {
      throw assetSchemaError('layout', 'Mahjong rankings must declare a mahjong-suits matrix layout');
    }
    if (!sectionIds.has('mahjong-honors')) {
      throw assetSchemaError('layout', 'Mahjong rankings must declare a mahjong-honors layout');
    }
    if ((data.includeBonusTiles === true || data.expectedPieceCount >= 144) && !sectionIds.has('mahjong-bonus')) {
      throw assetSchemaError('layout', 'Mahjong rankings with bonus tiles must declare a mahjong-bonus layout');
    }
  }

  layout.forEach((section, sectionIndex) => {
    if (section.kind !== 'matrix') {
      return;
    }

    const rowCount = section.rows?.length ?? 0;
    const columnCount = section.columns?.length ?? 0;
    const pieceIdCount = section.pieceIds?.length ?? 0;
    const cellCount = section.cells?.length ?? 0;
    if (rowCount > 0 && columnCount > 0 && pieceIdCount > 0 && cellCount === 0 && pieceIdCount !== rowCount * columnCount) {
      throw assetSchemaError(
        `layout.${sectionIndex}.pieceIds`,
        'Sparse matrix layouts must declare explicit cells so preview positions cannot shift',
      );
    }

    const rowKeys = new Set(section.rows?.map((row) => row.key));
    const columnKeys = new Set(section.columns?.map((column) => column.key));
    section.cells?.forEach((cell, cellIndex) => {
      if (rowKeys.size > 0 && !rowKeys.has(cell.rowKey)) {
        throw assetSchemaError(
          `layout.${sectionIndex}.cells.${cellIndex}.rowKey`,
          `Cell rowKey "${cell.rowKey}" is not declared in matrix rows`,
        );
      }
      if (columnKeys.size > 0 && !columnKeys.has(cell.columnKey)) {
        throw assetSchemaError(
          `layout.${sectionIndex}.cells.${cellIndex}.columnKey`,
          `Cell columnKey "${cell.columnKey}" is not declared in matrix columns`,
        );
      }
    });

    section.rows?.forEach((row, rowIndex) => {
      if (axisNeedsPresentation(row) && !hasAxisPresentation(row)) {
        throw assetSchemaError(
          `layout.${sectionIndex}.rows.${rowIndex}`,
          'Matrix row axes with compact non-numeric labels must declare symbol, icon, imageHash, or imagePath',
        );
      }
    });
  });
}

function hasAxisPresentation(axis: typeof DeckRankingAxisSchema.Type): boolean {
  return Boolean(axis.symbol || axis.icon || axis.imageHash || axis.imagePath);
}

function axisNeedsPresentation(axis: typeof DeckRankingAxisSchema.Type): boolean {
  const key = axis.key.trim();
  const label = axis.label?.trim() ?? '';
  if (/^\d+$/.test(key) || /^\d+$/.test(label)) {
    return false;
  }
  return label.length > 0 && label.length <= 2;
}

function assetSchemaError(path: string, message: string): Error {
  return new Error(`Asset schema violation: ${path}: ${message}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
