export const DeckPreviewSectionKind = {
  Matrix: 'matrix',
  Grid: 'grid',
} as const;

export type DeckPreviewSectionKind = typeof DeckPreviewSectionKind[keyof typeof DeckPreviewSectionKind];

export interface DeckPreviewReference {
  assetType: string;
  guid?: string;
  path?: string;
  displayName?: string;
  variant?: string | null;
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

export interface DeckPreviewRefs {
  pieceRefs: DeckPreviewReference[];
  rankingRefs: DeckPreviewReference[];
}

export interface BuildDeckPreviewModelInput {
  deck: unknown;
  pieces?: unknown[];
  rankings?: unknown[];
  title?: string;
}

interface PieceRecord {
  id: string;
  label: string;
  assetType: string;
  count?: number;
  sourceGuid?: string;
  sourcePath?: string;
  sourceDisplayName?: string;
  imageHash?: string;
  imagePath?: string;
  data: Record<string, unknown>;
}

interface CardEntryRecord {
  id: string;
  label: string;
  kind?: string;
  suit?: string | null;
  rank?: string | number | null;
  order?: number;
}

interface DeclaredLayoutCellRecord {
  pieceId: string;
  rowKey: string;
  columnKey: string;
}

const ZeroImageHashPattern = /^0{64}$/;

function asRecord(value: unknown): Record<string, unknown> {
  return value && (typeof value === 'object' || typeof value === 'function') ? value as Record<string, unknown> : {};
}

function dataRecord(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  const data = record.data;
  return data && typeof data === 'object' ? data as Record<string, unknown> : record;
}

function assetTypeOf(value: unknown): string {
  const record = asRecord(value);
  const system = asRecord(record.system);
  const constructor = value && typeof value === 'object'
    ? asRecord((value as { constructor?: unknown }).constructor)
    : {};
  return stringValue(system.assetType) ||
    stringValue(record.assetType) ||
    stringValue(constructor.assetType) ||
    '';
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function imageHashValue(value: unknown): string | undefined {
  const hash = stringValue(value);
  return hash && !ZeroImageHashPattern.test(hash) ? hash : undefined;
}

function normalizedResourcePath(value: unknown): string {
  return stringValue(value).replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const FrenchSuitPresentation: Record<string, { label: string; symbol: string; color: string }> = {
  spade: { label: 'Spades', symbol: '♠', color: 'black' },
  spades: { label: 'Spades', symbol: '♠', color: 'black' },
  s: { label: 'Spades', symbol: '♠', color: 'black' },
  heart: { label: 'Hearts', symbol: '♥', color: 'red' },
  hearts: { label: 'Hearts', symbol: '♥', color: 'red' },
  h: { label: 'Hearts', symbol: '♥', color: 'red' },
  diamond: { label: 'Diamonds', symbol: '♦', color: 'red' },
  diamonds: { label: 'Diamonds', symbol: '♦', color: 'red' },
  d: { label: 'Diamonds', symbol: '♦', color: 'red' },
  club: { label: 'Clubs', symbol: '♣', color: 'black' },
  clubs: { label: 'Clubs', symbol: '♣', color: 'black' },
  c: { label: 'Clubs', symbol: '♣', color: 'black' },
  '♠': { label: 'Spades', symbol: '♠', color: 'black' },
  '♥': { label: 'Hearts', symbol: '♥', color: 'red' },
  '♦': { label: 'Diamonds', symbol: '♦', color: 'red' },
  '♣': { label: 'Clubs', symbol: '♣', color: 'black' },
};

function suitPresentation(value: unknown): { label: string; symbol: string; color: string } | undefined {
  const key = stringValue(value).trim().toLowerCase().replace(/[_\s-]+/g, '_');
  if (!key) {
    return undefined;
  }
  return FrenchSuitPresentation[key] ?? FrenchSuitPresentation[key.replace(/_/g, '')];
}

function titleCaseIdentifier(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isFrenchSuitGlyph(value: string): boolean {
  return value === '♠' || value === '♥' || value === '♦' || value === '♣';
}

function axisPresentation(record: Record<string, unknown>, key: string): Omit<DeckPreviewAxis, 'key'> {
  const explicitSymbol = stringValue(record.symbol);
  const explicitIcon = stringValue(record.icon);
  const keyPresentation = suitPresentation(key);
  const symbolPresentation = isFrenchSuitGlyph(explicitSymbol) ? suitPresentation(explicitSymbol) : undefined;
  const presentation = keyPresentation ?? symbolPresentation;
  const label = stringValue(record.label);
  const labelIsFrenchAlias = suitPresentation(label) !== undefined;
  const displayLabel = presentation && (!label || (keyPresentation && labelIsFrenchAlias))
    ? presentation.label
    : label || titleCaseIdentifier(key) || key;
  const color = stringValue(record.color) || presentation?.color;

  return {
    label: displayLabel,
    symbol: presentation?.symbol || explicitSymbol || undefined,
    icon: explicitIcon || undefined,
    imageHash: stringValue(record.imageHash) || undefined,
    imagePath: stringValue(record.imagePath) || undefined,
    color: color || undefined,
  };
}

function referenceFrom(value: unknown, fallbackAssetType: string): DeckPreviewReference | null {
  const record = asRecord(value);
  const refValue = record.ref;
  if (typeof refValue === 'string') {
    return {
      assetType: fallbackAssetType,
      guid: refValue,
    };
  }
  if (refValue && typeof refValue === 'object') {
    return referenceFrom(refValue, fallbackAssetType);
  }
  const guid = stringValue(record.guid);
  const path = stringValue(record.path);
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

function repeatedRefs(ref: DeckPreviewReference | null, copies: unknown): DeckPreviewReference[] {
  if (!ref) {
    return [];
  }
  const count = Math.max(1, Math.trunc(numberValue(copies) ?? 1));
  return Array.from({ length: count }, () => ref);
}

function uniqueRefs(refs: DeckPreviewReference[]): DeckPreviewReference[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = ref.guid || ref.path || `${ref.assetType}:${ref.displayName || ref.variant || ''}`;
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function collectDeckPreviewRefs(deck: unknown): DeckPreviewRefs {
  const assetType = assetTypeOf(deck);
  const data = dataRecord(deck);
  const rankingRefs: DeckPreviewReference[] = [];
  let pieceRefs: DeckPreviewReference[] = [];

  if (assetType === 'Deck') {
    const composition = arrayValue(data.composition);
    pieceRefs = composition.length > 0
      ? composition.flatMap((entry) => {
        const entryRecord = asRecord(entry);
        return repeatedRefs(referenceFrom(entryRecord.pieceTemplate, fallbackPieceAssetType(data)), entryRecord.copies);
      })
      : [];
    if (pieceRefs.length === 0) {
      const cardComposition = arrayValue(data.cardComposition);
      pieceRefs = cardComposition.length > 0
      ? cardComposition.flatMap((entry) => {
        const entryRecord = asRecord(entry);
        return repeatedRefs(referenceFrom(entryRecord.cardTemplate, 'Card'), entryRecord.copies);
      })
      : arrayValue(data.cardTemplates).flatMap((ref) => repeatedRefs(referenceFrom(ref, 'Card'), 1));
    }
    const rankingRef = referenceFrom(data.rankingAsset, 'DeckRanking') ?? referenceFrom(data.cardRankingAsset, 'CardRanking');
    if (rankingRef) {
      rankingRefs.push(rankingRef);
    }
  }

  if (assetType === 'PlayingCardDeck') {
    pieceRefs = arrayValue(data.cardTemplates).flatMap((ref) => repeatedRefs(referenceFrom(ref, 'PlayingCard'), 1));
    const rankingRef = referenceFrom(data.playingCardRankingAsset, 'PlayingCardRanking');
    if (rankingRef) {
      rankingRefs.push(rankingRef);
    }
  }

  if (assetType === 'DominoDeck') {
    const composition = arrayValue(data.tileComposition);
    pieceRefs = composition.length > 0
      ? composition.flatMap((entry) => {
        const entryRecord = asRecord(entry);
        return repeatedRefs(referenceFrom(entryRecord.tileTemplate, 'DominoTile'), entryRecord.copies);
      })
      : arrayValue(data.tileTemplates).flatMap((ref) => repeatedRefs(referenceFrom(ref, 'DominoTile'), 1));
    const rankingRef = referenceFrom(data.dominoRankingAsset, 'DominoRanking');
    if (rankingRef) {
      rankingRefs.push(rankingRef);
    }
  }

  if (assetType === 'HanafudaDeck') {
    pieceRefs = arrayValue(data.cardTemplates).flatMap((ref) => repeatedRefs(referenceFrom(ref, 'HanafudaCard'), 1));
    const rankingRef = referenceFrom(data.hanafudaRankingAsset, 'HanafudaRanking');
    if (rankingRef) {
      rankingRefs.push(rankingRef);
    }
  }

  if (assetType === 'MahjongDeck') {
    pieceRefs = arrayValue(data.tiles).flatMap((entry) => {
      const entryRecord = asRecord(entry);
      return repeatedRefs(referenceFrom(entryRecord.tile, 'MahjongTile'), entryRecord.count);
    });
    const rankingRef = referenceFrom(data.mahjongRankingAsset, 'MahjongRanking');
    if (rankingRef) {
      rankingRefs.push(rankingRef);
    }
  }

  return {
    pieceRefs,
    rankingRefs: uniqueRefs(rankingRefs),
  };
}

function fallbackPieceAssetType(deckData: Record<string, unknown>): string {
  const pieceKind = stringValue(deckData.pieceKind);
  if (pieceKind.includes('domino')) {
    return 'DominoTile';
  }
  if (pieceKind.includes('hanafuda')) {
    return 'HanafudaCard';
  }
  if (pieceKind.includes('mahjong')) {
    return 'MahjongTile';
  }
  if (pieceKind === 'tile') {
    return 'Tile';
  }
  return 'Card';
}

export function uniqueDeckPreviewRefs(refs: DeckPreviewReference[]): DeckPreviewReference[] {
  return uniqueRefs(refs);
}

export function buildDeckPreviewModel(input: BuildDeckPreviewModelInput): DeckPreviewModel {
  const deckData = dataRecord(input.deck);
  const assetType = assetTypeOf(input.deck);
  const refs = collectDeckPreviewRefs(input.deck);
  const loadedPieces = (input.pieces ?? []).map(toPieceRecord).filter((piece): piece is PieceRecord => piece !== null);
  const pieces = materializePreviewPieces(deckData, loadedPieces);
  const rankings = input.rankings ?? [];
  const ranking = rankings.map(dataRecord).find((record) => Object.keys(record).length > 0) ?? {};
  const title = input.title || stringValue(deckData.name) || assetType || 'Deck';
  const warnings: string[] = [];
  const sections = buildSections(assetType, deckData, pieces, ranking, warnings);
  const missingImageCount = pieces.filter((piece) => !piece.imageHash && !piece.imagePath).length;
  if (missingImageCount > 0) {
    warnings.push(`${missingImageCount} preview piece${missingImageCount === 1 ? ' does' : 's do'} not have image metadata.`);
  }

  if (sections.length === 0 && pieces.length > 0) {
    sections.push({
      id: 'pieces',
      title: 'Pieces',
      kind: DeckPreviewSectionKind.Grid,
      items: pieces.map(pieceToCell),
    });
  }

  if (sections.length === 0) {
    warnings.push('No preview layout could be derived for this deck.');
  }

  return {
    assetType,
    title,
    totalPieces: refs.pieceRefs.length || pieces.length || numberValue(ranking.expectedCardCount) || numberValue(ranking.expectedTileCount) || 0,
    backImageHash: imageHashValue(asRecord(deckData.presentation).backImageHash) || imageHashValue(deckData.backCardHash),
    sections,
    warnings,
  };
}

function buildSections(
  assetType: string,
  deckData: Record<string, unknown>,
  pieces: PieceRecord[],
  ranking: Record<string, unknown>,
  warnings: string[],
): DeckPreviewSection[] {
  const layoutSections = buildDeclaredLayoutSections(pieces, ranking);
  if (layoutSections.length > 0) {
    return layoutSections;
  }

  if (assetType === 'Deck') {
    const family = stringValue(ranking.rankingFamily) || stringValue(deckData.deckFamily) || stringValue(deckData.pieceKind);
    if (family.includes('domino')) {
      return buildDominoSections(pieces, ranking);
    }
    if (family.includes('hanafuda')) {
      return buildHanafudaSections(pieces, ranking);
    }
    if (family.includes('mahjong')) {
      return buildMahjongSections(pieces, ranking);
    }
    return buildCardDeckSections(pieces, ranking, warnings);
  }
  if (assetType === 'PlayingCardDeck') {
    return buildPlayingCardSections(pieces, ranking);
  }
  if (assetType === 'DominoDeck') {
    return buildDominoSections(pieces, ranking);
  }
  if (assetType === 'HanafudaDeck') {
    return buildHanafudaSections(pieces, ranking);
  }
  if (assetType === 'MahjongDeck') {
    return buildMahjongSections(pieces, ranking);
  }
  return [];
}

function buildDeclaredLayoutSections(pieces: PieceRecord[], ranking: Record<string, unknown>): DeckPreviewSection[] {
  const sections: DeckPreviewSection[] = [];
  const orderedIds = arrayValue(ranking.order)
    .map((entry) => stringValue(asRecord(entry).id))
    .filter(Boolean);

  for (const sectionValue of arrayValue(ranking.layout)) {
    const section = asRecord(sectionValue);
    const kind = stringValue(section.kind);
    if (kind !== DeckPreviewSectionKind.Matrix && kind !== DeckPreviewSectionKind.Grid) {
      continue;
    }
    const id = stringValue(section.id);
    if (!id) {
      continue;
    }
    const sectionPieceIds = arrayValue(section.pieceIds).map(stringValue).filter(Boolean);
    const pieceIds = sectionPieceIds.length > 0 ? sectionPieceIds : orderedIds;
    if (kind === DeckPreviewSectionKind.Grid) {
      const items: DeckPreviewCell[] = pieceIds.length > 0
        ? pieceIds.map((pieceId) => cellForPieceId(pieces, pieceId))
        : pieces.map(pieceToCell);
      sections.push({
        id,
        title: stringValue(section.title) || id,
        kind,
        items,
      });
      continue;
    }

    const rows = arrayValue(section.rows).map(toAxis).filter((axis): axis is DeckPreviewAxis => axis !== null);
    const columns = arrayValue(section.columns).map(toAxis).filter((axis): axis is DeckPreviewAxis => axis !== null);
    if (rows.length === 0 || columns.length === 0) {
      continue;
    }
    const explicitCells = arrayValue(section.cells)
      .map(toDeclaredLayoutCellRecord)
      .filter((cell): cell is DeclaredLayoutCellRecord => cell !== null);
    sections.push({
      id,
      title: stringValue(section.title) || id,
      kind,
      rows,
      columns,
      cells: explicitCells.length > 0
        ? buildExplicitLayoutCells(explicitCells, pieces)
        : buildLayoutCells(rows, columns, pieces, pieceIds),
    });
  }
  return sections;
}

function toAxis(value: unknown): DeckPreviewAxis | null {
  const record = asRecord(value);
  const key = stringValue(record.key);
  if (!key) {
    return null;
  }
  return {
    key,
    ...axisPresentation(record, key),
  };
}

function frenchSuitAxis(suit: Record<string, unknown>): DeckPreviewAxis {
  const key = stringValue(suit.SuitName);
  return {
    key,
    ...axisPresentation({
      label: stringValue(suit.SuitName),
      symbol: stringValue(suit.SuitSymbol),
      color: stringValue(suit.SuitColor),
    }, key),
  };
}

function suitNameAxis(suit: string): DeckPreviewAxis {
  return {
    key: suit,
    ...axisPresentation({ label: suit }, suit),
  };
}

function buildLayoutCells(
  rows: DeckPreviewAxis[],
  columns: DeckPreviewAxis[],
  pieces: PieceRecord[],
  orderedIds: string[],
): DeckPreviewCell[] {
  const ids = orderedIds.length > 0 ? orderedIds : pieces.map((piece) => piece.id);
  return ids.map((pieceId, index) => {
    const row = rows[Math.floor(index / columns.length)];
    const column = columns[index % columns.length];
    return {
      ...cellForPieceId(pieces, pieceId),
      rowKey: row?.key,
      columnKey: column?.key,
    };
  });
}

function buildExplicitLayoutCells(cells: DeclaredLayoutCellRecord[], pieces: PieceRecord[]): DeckPreviewCell[] {
  return cells.map((cell) => ({
    ...cellForPieceId(pieces, cell.pieceId),
    rowKey: cell.rowKey,
    columnKey: cell.columnKey,
  }));
}

function toDeclaredLayoutCellRecord(value: unknown): DeclaredLayoutCellRecord | null {
  const record = asRecord(value);
  const pieceId = stringValue(record.pieceId);
  const rowKey = stringValue(record.rowKey);
  const columnKey = stringValue(record.columnKey);
  return pieceId && rowKey && columnKey ? { pieceId, rowKey, columnKey } : null;
}

function materializePreviewPieces(deckData: Record<string, unknown>, loadedPieces: PieceRecord[]): PieceRecord[] {
  const composition = arrayValue(deckData.composition).map((entry) => asRecord(entry));
  if (composition.length === 0) {
    return loadedPieces;
  }

  const materialized = composition.flatMap((entry) => {
    const ref = referenceFrom(entry.pieceTemplate, fallbackPieceAssetType(deckData));
    const piece = findPieceByRef(loadedPieces, ref);
    const copies = Math.max(1, Math.trunc(numberValue(entry.copies) ?? 1));
    const logicalId = stringValue(entry.logicalId);
    const baseId = logicalId || piece?.id || ref?.displayName || ref?.guid || ref?.path || '';
    if (!baseId) {
      return [];
    }
    return [{
      id: baseId,
      label: logicalId || piece?.label || ref?.displayName || baseId,
      assetType: piece?.assetType || ref?.assetType || fallbackPieceAssetType(deckData),
      count: copies,
      sourceGuid: piece?.sourceGuid || ref?.guid,
      sourcePath: piece?.sourcePath || ref?.path,
      sourceDisplayName: piece?.sourceDisplayName || ref?.displayName,
      imageHash: piece?.imageHash,
      imagePath: piece?.imagePath,
      data: piece?.data ?? {},
    }];
  });

  return materialized.length > 0 ? materialized : loadedPieces;
}

function toPieceRecord(value: unknown): PieceRecord | null {
  const record = asRecord(value);
  const system = asRecord(record.system);
  const data = dataRecord(value);
  const assetType = assetTypeOf(value) || stringValue(data.assetType);
  const identity = asRecord(data.cardIdentity);
  const id = stringValue(data.cardId) ||
    stringValue(data.tileId) ||
    cardIdentityId(identity) ||
    stringValue(data.displayName);

  if (!id) {
    return null;
  }

  return {
    id,
    label: id,
    assetType,
    sourceGuid: stringValue(system.guid) || stringValue(record.guid) || undefined,
    sourcePath: stringValue(system.treePath) || stringValue(record.path) || undefined,
    sourceDisplayName: stringValue(system.displayName) || stringValue(record.displayName) || undefined,
    imageHash: imageHashValue(data.imageHash),
    imagePath: stringValue(data.imagePath) || undefined,
    data,
  };
}

function pieceToCell(piece: PieceRecord, count = 1): DeckPreviewCell {
  return {
    id: piece.id,
    label: piece.label,
    assetType: piece.assetType,
    imageHash: piece.imageHash,
    imagePath: piece.imagePath,
    count: Math.max(piece.count ?? 1, count) > 1 ? Math.max(piece.count ?? 1, count) : undefined,
  };
}

function cardIdentityId(identity: Record<string, unknown>): string {
  const family = stringValue(identity.family);
  if (family === 'French') {
    const suit = stringValue(identity.suit);
    const value = numberValue(identity.value);
    return suit && typeof value === 'number' ? `${value}_of_${suit}` : '';
  }
  if (family === 'Tarot') {
    const kind = stringValue(identity.kind);
    const number = numberValue(identity.number);
    if (kind === 'trump' && typeof number === 'number') {
      return `tarot_trump_${number}`;
    }
    if (kind === 'fool') {
      return 'tarot_fool';
    }
  }
  return '';
}

function buildCardDeckSections(
  pieces: PieceRecord[],
  ranking: Record<string, unknown>,
  warnings: string[],
): DeckPreviewSection[] {
  const sections: DeckPreviewSection[] = [];
  const french = asRecord(asRecord(ranking.familyPayload).french);
  const suits = arrayValue(french.suits)
    .map((suit) => asRecord(suit))
    .sort((a, b) => (numberValue(a.DisplayOrder) ?? 0) - (numberValue(b.DisplayOrder) ?? 0));
  const ranks = arrayValue(french.rankings)
    .map((rank) => asRecord(rank))
    .sort((a, b) => (numberValue(a.DisplayOrder) ?? 0) - (numberValue(b.DisplayOrder) ?? 0));

  if (suits.length > 0 && ranks.length > 0) {
    sections.push({
      id: 'french',
      title: 'Cards',
      kind: DeckPreviewSectionKind.Matrix,
      rows: suits.map((suit) => ({
        ...frenchSuitAxis(suit),
      })),
      columns: ranks.map((rank) => ({
        key: String(numberValue(rank.Value) ?? stringValue(rank.CardName)),
        label: stringValue(rank.CardSymbol) || stringValue(rank.CardName) || String(numberValue(rank.Value) ?? ''),
      })),
      cells: buildFrenchMatrixCells(pieces, suits, ranks),
    });
    return sections;
  }

  const entries = arrayValue(ranking.cardEntries).map(toCardEntryRecord).filter((entry): entry is CardEntryRecord => entry !== null);
  if (entries.length > 0) {
    const minorEntries = entries.filter((entry) => entry.kind === 'minor' || (entry.suit && entry.rank !== null && entry.rank !== undefined));
    const trumpEntries = entries.filter((entry) => entry.kind === 'trump');
    const otherEntries = entries.filter((entry) => !minorEntries.includes(entry) && !trumpEntries.includes(entry));

    if (minorEntries.length > 0) {
      sections.push(buildCardEntryMatrix('minor', 'Suits', minorEntries, pieces));
    }
    if (trumpEntries.length > 0) {
      sections.push(buildCardEntryRow('trumps', 'Trumps', trumpEntries, pieces));
    }
    if (otherEntries.length > 0) {
      sections.push({
        id: 'other-cards',
        title: 'Other Cards',
        kind: DeckPreviewSectionKind.Grid,
        items: otherEntries.map((entry) => cardEntryCell(entry, pieces)),
      });
    }
    return sections;
  }

  const inferredFrench = inferFrenchAxes(pieces);
  if (inferredFrench.rows.length > 0 && inferredFrench.columns.length > 0) {
    sections.push({
      id: 'cards',
      title: 'Cards',
      kind: DeckPreviewSectionKind.Matrix,
      rows: inferredFrench.rows,
      columns: inferredFrench.columns,
      cells: inferredFrench.cells,
    });
    return sections;
  }

  warnings.push('Card ranking did not contain matrix metadata.');
  return [];
}

function buildPlayingCardSections(pieces: PieceRecord[], ranking: Record<string, unknown>): DeckPreviewSection[] {
  const ids = arrayValue(ranking.cards)
    .map((entry) => stringValue(asRecord(entry).cardId))
    .filter(Boolean);
  const ordered = ids.length > 0 ? ids.map((id) => cellForPieceId(pieces, id)) : pieces.map(pieceToCell);
  return [
    {
      id: 'playing-cards',
      title: 'Cards',
      kind: DeckPreviewSectionKind.Grid,
      items: ordered,
    },
  ];
}

function buildDominoSections(pieces: PieceRecord[], ranking: Record<string, unknown>): DeckPreviewSection[] {
  const maxPip = numberValue(ranking.maxPip);
  if (typeof maxPip === 'number') {
    const axes = Array.from({ length: maxPip + 1 }, (_, index) => ({ key: String(index), label: String(index) }));
    const cells: DeckPreviewCell[] = [];
    for (let left = 0; left <= maxPip; left += 1) {
      for (let right = left; right <= maxPip; right += 1) {
        const id = `${left}-${right}`;
        const piece = findPieceById(pieces, id);
        cells.push({
          ...(piece ? pieceToCell(piece) : cellFromId(id)),
          rowKey: String(left),
          columnKey: String(right),
        });
      }
    }
    return [
      {
        id: 'domino-pips',
        title: 'Tiles',
        kind: DeckPreviewSectionKind.Matrix,
        rows: axes,
        columns: axes,
        cells,
      },
    ];
  }

  const ids = arrayValue(ranking.tileIds).map(stringValue).filter(Boolean);
  const items = ids.length > 0 ? ids.map((id) => cellForPieceId(pieces, id)) : pieces.map(pieceToCell);
  return [
    {
      id: 'domino-tiles',
      title: 'Tiles',
      kind: DeckPreviewSectionKind.Grid,
      items,
    },
  ];
}

function buildHanafudaSections(pieces: PieceRecord[], ranking: Record<string, unknown>): DeckPreviewSection[] {
  const months = arrayValue(ranking.months)
    .map((month) => asRecord(month))
    .sort((a, b) => (numberValue(a.month) ?? 0) - (numberValue(b.month) ?? 0));
  const slotNumbers = Array.from(new Set(months.flatMap((month) =>
    arrayValue(month.slots).map((slot) => numberValue(asRecord(slot).slot)).filter((slot): slot is number => typeof slot === 'number'),
  ))).sort((a, b) => a - b);

  if (months.length === 0 || slotNumbers.length === 0) {
    return [
      {
        id: 'hanafuda-cards',
        title: 'Cards',
        kind: DeckPreviewSectionKind.Grid,
        items: pieces.map(pieceToCell),
      },
    ];
  }

  const cells = months.flatMap((month) =>
    arrayValue(month.slots).map((slot) => {
      const slotRecord = asRecord(slot);
      const id = stringValue(slotRecord.cardId);
      const piece = findPieceById(pieces, id);
      return {
        ...(piece ? pieceToCell(piece) : cellFromId(id)),
        rowKey: String(numberValue(month.month) ?? ''),
        columnKey: String(numberValue(slotRecord.slot) ?? ''),
      };
    }),
  );

  return [
    {
      id: 'hanafuda-months',
      title: 'Months',
      kind: DeckPreviewSectionKind.Matrix,
      rows: months.map((month) => {
        const monthNumber = numberValue(month.month) ?? 0;
        return { key: String(monthNumber), label: String(monthNumber).padStart(2, '0') };
      }),
      columns: slotNumbers.map((slot) => ({ key: String(slot), label: String(slot) })),
      cells,
    },
  ];
}

function buildMahjongSections(pieces: PieceRecord[], ranking: Record<string, unknown>): DeckPreviewSection[] {
  const suitRows = ['Characters', 'Bamboos', 'Dots'].map((suit) => ({ key: suit, label: suit }));
  const rankColumns = Array.from({ length: 9 }, (_, index) => ({ key: String(index + 1), label: String(index + 1) }));
  const suitCells = pieces
    .filter((piece) => stringValue(piece.data.tileKind) === 'Suit')
    .map((piece) => ({
      ...pieceToCell(piece),
      rowKey: stringValue(piece.data.suit),
      columnKey: String(numberValue(piece.data.rank) ?? ''),
    }));
  const otherPieces = pieces.filter((piece) => stringValue(piece.data.tileKind) !== 'Suit');
  const sections: DeckPreviewSection[] = [
    {
      id: 'mahjong-suits',
      title: 'Suits',
      kind: DeckPreviewSectionKind.Matrix,
      rows: suitRows,
      columns: rankColumns,
      cells: suitCells,
    },
  ];

  const honors = otherPieces.filter((piece) => ['Wind', 'Dragon'].includes(stringValue(piece.data.tileKind)));
  const bonus = otherPieces.filter((piece) => ['Flower', 'Season'].includes(stringValue(piece.data.tileKind)));
  const special = otherPieces.filter((piece) => !honors.includes(piece) && !bonus.includes(piece));

  if (honors.length > 0) {
    sections.push({
      id: 'mahjong-honors',
      title: 'Honors',
      kind: DeckPreviewSectionKind.Grid,
      items: sortMahjongHonors(honors).map(pieceToCell),
    });
  }

  if (bonus.length > 0 || ranking.includeBonusTiles === true) {
    sections.push({
      id: 'mahjong-bonus',
      title: 'Bonus Tiles',
      kind: DeckPreviewSectionKind.Grid,
      items: sortMahjongBonus(bonus).map(pieceToCell),
    });
  }

  if (special.length > 0) {
    sections.push({
      id: 'mahjong-special',
      title: 'Special Tiles',
      kind: DeckPreviewSectionKind.Grid,
      items: sortMahjongBonus(special).map(pieceToCell),
    });
  }

  return sections;
}

function sortMahjongHonors(pieces: PieceRecord[]): PieceRecord[] {
  const order = new Map([
    ['Wind:East', 0],
    ['Wind:South', 1],
    ['Wind:West', 2],
    ['Wind:North', 3],
    ['Dragon:Red', 4],
    ['Dragon:Green', 5],
    ['Dragon:White', 6],
  ]);
  return [...pieces].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99) || a.id.localeCompare(b.id));
}

function sortMahjongBonus(pieces: PieceRecord[]): PieceRecord[] {
  return [...pieces].sort((a, b) => mahjongBonusSortKey(a).localeCompare(mahjongBonusSortKey(b)));
}

function mahjongBonusSortKey(piece: PieceRecord): string {
  const kind = stringValue(piece.data.tileKind);
  const kindOrder: Record<string, string> = {
    Flower: '0',
    Season: '1',
    Animal: '2',
    Face: '3',
    Emperor: '4',
    Empress: '5',
    Joker: '6',
  };
  const index = numberValue(piece.data.bonusIndex) ?? Number(stringValue(piece.id).split(':')[1] || '0');
  return `${kindOrder[kind] ?? '9'}:${String(index).padStart(2, '0')}:${piece.id}`;
}

function buildFrenchMatrixCells(
  pieces: PieceRecord[],
  suits: Record<string, unknown>[],
  ranks: Record<string, unknown>[],
): DeckPreviewCell[] {
  return suits.flatMap((suit) => {
    const suitName = stringValue(suit.SuitName);
    return ranks.map((rank) => {
      const rankValue = numberValue(rank.Value);
      const piece = pieces.find((candidate) => {
        const identity = asRecord(candidate.data.cardIdentity);
        return stringValue(identity.family) === 'French' &&
          stringValue(identity.suit) === suitName &&
          numberValue(identity.value) === rankValue;
      });
      const fallbackId = `${rankValue}_of_${suitName}`;
      return {
        ...(piece ? cellForPieceId(pieces, fallbackId) : cellFromId(fallbackId)),
        rowKey: suitName,
        columnKey: String(rankValue),
      };
    });
  });
}

function inferFrenchAxes(pieces: PieceRecord[]): { rows: DeckPreviewAxis[]; columns: DeckPreviewAxis[]; cells: DeckPreviewCell[] } {
  const rows = Array.from(new Set(pieces.map((piece) => stringValue(asRecord(piece.data.cardIdentity).suit)).filter(Boolean)));
  const ranks = Array.from(new Set(pieces.map((piece) => numberValue(asRecord(piece.data.cardIdentity).value)).filter((rank): rank is number => typeof rank === 'number')))
    .sort((a, b) => b - a);
  const cells = pieces.flatMap((piece) => {
    const identity = asRecord(piece.data.cardIdentity);
    const suit = stringValue(identity.suit);
    const rank = numberValue(identity.value);
    if (!suit || typeof rank !== 'number') {
      return [];
    }
    return [{
      ...pieceToCell(piece),
      rowKey: suit,
      columnKey: String(rank),
    }];
  });
  return {
    rows: rows.map(suitNameAxis),
    columns: ranks.map((rank) => ({ key: String(rank), label: String(rank) })),
    cells,
  };
}

function toCardEntryRecord(value: unknown): CardEntryRecord | null {
  const record = asRecord(value);
  const id = stringValue(record.id);
  if (!id) {
    return null;
  }
  return {
    id,
    label: stringValue(record.label) || id,
    kind: stringValue(record.kind) || undefined,
    suit: typeof record.suit === 'string' || record.suit === null ? record.suit : undefined,
    rank: typeof record.rank === 'string' || typeof record.rank === 'number' || record.rank === null ? record.rank : undefined,
    order: numberValue(record.order),
  };
}

function buildCardEntryMatrix(
  id: string,
  title: string,
  entries: CardEntryRecord[],
  pieces: PieceRecord[],
): DeckPreviewSection {
  const sorted = [...entries].sort(cardEntrySort);
  const rows = Array.from(new Set(sorted.map((entry) => entry.suit).filter((suit): suit is string => typeof suit === 'string' && suit.length > 0)));
  const ranks = Array.from(new Set(sorted.map((entry) => String(entry.rank ?? '')).filter(Boolean)));
  return {
    id,
    title,
    kind: DeckPreviewSectionKind.Matrix,
    rows: rows.map(suitNameAxis),
    columns: ranks.map((rank) => ({ key: rank, label: rank })),
    cells: sorted.map((entry) => ({
      ...cardEntryCell(entry, pieces),
      rowKey: entry.suit ?? '',
      columnKey: String(entry.rank ?? ''),
    })),
  };
}

function buildCardEntryRow(
  id: string,
  title: string,
  entries: CardEntryRecord[],
  pieces: PieceRecord[],
): DeckPreviewSection {
  const sorted = [...entries].sort(cardEntrySort);
  return {
    id,
    title,
    kind: DeckPreviewSectionKind.Matrix,
    rows: [{ key: id, label: title }],
    columns: sorted.map((entry) => ({ key: entry.id, label: entry.label.replace(/^Trump\s+/i, '') })),
    cells: sorted.map((entry) => ({
      ...cardEntryCell(entry, pieces),
      rowKey: id,
      columnKey: entry.id,
    })),
  };
}

function cardEntryCell(entry: CardEntryRecord, pieces: PieceRecord[]): DeckPreviewCell {
  return {
    ...cellForPieceId(pieces, entry.id),
    label: entry.label,
  };
}

function cardEntrySort(a: CardEntryRecord, b: CardEntryRecord): number {
  return (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label);
}

function findPieceById(pieces: PieceRecord[], id: string): PieceRecord | undefined {
  return pieces.find((piece) => piece.id === id || stringValue(piece.data.cardId) === id || stringValue(piece.data.tileId) === id);
}

function cellForPieceId(pieces: PieceRecord[], id: string): DeckPreviewCell {
  const piece = findPieceById(pieces, id);
  if (!piece) {
    return cellFromId(id);
  }
  return pieceToCell(piece, countPiecesById(pieces, id));
}

function countPiecesById(pieces: PieceRecord[], id: string): number {
  return pieces
    .filter((piece) => piece.id === id || stringValue(piece.data.cardId) === id || stringValue(piece.data.tileId) === id)
    .reduce((sum, piece) => sum + Math.max(1, Math.trunc(piece.count ?? 1)), 0);
}

function findPieceByRef(pieces: PieceRecord[], ref: DeckPreviewReference | null): PieceRecord | undefined {
  if (!ref) {
    return undefined;
  }
  return pieces.find((piece) => (
    (ref.guid && piece.sourceGuid === ref.guid) ||
    (ref.path && normalizedResourcePath(piece.sourcePath) === normalizedResourcePath(ref.path)) ||
    (ref.displayName && (piece.sourceDisplayName === ref.displayName || piece.id === ref.displayName))
  ));
}

function cellFromId(id: string): DeckPreviewCell {
  return {
    id,
    label: id,
  };
}
