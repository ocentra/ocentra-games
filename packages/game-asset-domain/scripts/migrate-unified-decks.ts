import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import JSON5 from 'json5';

type JsonRecord = Record<string, unknown>;

const root = process.cwd();
const resourcesRoot = join(root, 'packages', 'asset-editor', 'Resources', 'GameMode', 'CardGames');
const write = process.argv.includes('--write');

const retiredDeckTypes = new Set(['PlayingCardDeck', 'DominoDeck', 'HanafudaDeck', 'MahjongDeck']);
const retiredRankingTypes = new Set(['CardRanking', 'DominoRanking', 'HanafudaRanking', 'MahjongRanking', 'PlayingCardRanking']);
const rankingRefKeys = [
  'cardRankingAsset',
  'dominoRankingAsset',
  'hanafudaRankingAsset',
  'mahjongRankingAsset',
  'playingCardRankingAsset',
];
const frenchSuitPresentation: Record<string, { label: string; symbol: string; color: string }> = {
  spade: { label: 'Spades', symbol: '♠', color: 'black' },
  spades: { label: 'Spades', symbol: '♠', color: 'black' },
  heart: { label: 'Hearts', symbol: '♥', color: 'red' },
  hearts: { label: 'Hearts', symbol: '♥', color: 'red' },
  diamond: { label: 'Diamonds', symbol: '♦', color: 'red' },
  diamonds: { label: 'Diamonds', symbol: '♦', color: 'red' },
  club: { label: 'Clubs', symbol: '♣', color: 'black' },
  clubs: { label: 'Clubs', symbol: '♣', color: 'black' },
};

const assetFiles = walk(resourcesRoot).filter((file) => file.endsWith('.asset'));
let changed = 0;

for (const file of assetFiles) {
  const original = readFileSync(file, 'utf8');
  let parsed: JsonRecord;
  try {
    parsed = JSON5.parse(original) as JsonRecord;
  } catch {
    continue;
  }

  const before = JSON.stringify(parsed);
  migrateDocument(parsed);
  const after = JSON.stringify(parsed);
  if (before !== after) {
    changed += 1;
    if (write) {
      writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`);
    }
  }
}

const violations = findRetiredPersistedTypes();
if (violations.length > 0) {
  throw new Error(`Retired deck/ranking asset types remain:\n${violations.join('\n')}`);
}

console.log(JSON.stringify({
  changed,
  checked: assetFiles.length,
  mode: write ? 'write' : 'check',
}, null, 2));

function migrateDocument(document: JsonRecord): void {
  const system = record(document.system);
  const data = record(document.data);
  const assetType = stringValue(system.assetType);

  migrateReferences(document);

  if (assetType === 'Deck' || retiredDeckTypes.has(assetType)) {
    system.assetType = 'Deck';
    data.name = stringValue(data.name) || stringValue(system.displayName) || stringValue(system.variant) || 'Deck';
    data.deckFamily = stringValue(data.deckFamily) || inferDeckFamily(assetType, data);
    data.pieceKind = stringValue(data.pieceKind) || inferPieceKind(assetType, data);
    data.composition = normalizeComposition(assetType, data);
    data.rankingAsset = normalizeRankingAsset(data);
    data.presentation = {
      backImageHash: stringValue(record(data.presentation).backImageHash) || stringValue(data.backCardHash),
      previewLayoutHint: stringValue(record(data.presentation).previewLayoutHint) || inferPreviewLayoutHint(data),
      defaultOrientation: stringValue(record(data.presentation).defaultOrientation) || inferOrientation(data),
      defaultShape: stringValue(record(data.presentation).defaultShape) || inferDefaultShape(data),
      ...record(data.presentation),
    };
    data.runtimePolicy = {
      shufflePolicy: 'seeded_round_shuffle',
      drawDirection: 'top_is_index_0',
      multiplicity: 1,
      visibilityDefaults: {},
      ...record(data.runtimePolicy),
    };
    deleteLegacyDeckFields(data);
    return;
  }

  if (retiredRankingTypes.has(assetType) || assetType === 'DeckRanking') {
    const rankingFamily = stringValue(data.rankingFamily) || inferRankingFamily(assetType, data);
    system.assetType = 'DeckRanking';
    data.rankingFamily = rankingFamily;
    data.order = normalizeRankingOrder(rankingFamily, data);
    data.expectedPieceCount = positiveInteger(data.expectedPieceCount, inferExpectedPieceCount(data));
    data.layout = normalizeRankingLayout(rankingFamily, data);
    data.scoringHints = record(data.scoringHints);
    data.legacyPayload = {
      ...record(data.legacyPayload),
      originalAssetType: assetType,
    };
  }
}

function migrateReferences(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(migrateReferences);
    return;
  }
  if (!value || typeof value !== 'object') {
    return;
  }

  const object = value as JsonRecord;
  const assetType = stringValue(object.assetType);
  if (retiredDeckTypes.has(assetType)) {
    object.assetType = 'Deck';
  }
  if (retiredRankingTypes.has(assetType)) {
    object.assetType = 'DeckRanking';
  }

  for (const key of rankingRefKeys) {
    if (object[key] && !object.rankingAsset) {
      object.rankingAsset = object[key];
    }
    delete object[key];
  }

  const assetRefs = record(object.assetRefs);
  if (Object.keys(assetRefs).length > 0) {
    if (assetRefs.cardRanking && !assetRefs.ranking) {
      assetRefs.ranking = assetRefs.cardRanking;
    }
    delete assetRefs.cardRanking;
    object.assetRefs = assetRefs;
  }

  const deckModel = record(object.deckModel);
  if (Object.keys(deckModel).length > 0) {
    if (typeof deckModel.cardRankingAssetRef === 'string' && typeof deckModel.rankingAssetRef !== 'string') {
      deckModel.rankingAssetRef = deckModel.cardRankingAssetRef;
    }
    if (deckModel.rankingAssetRef === 'cardRanking') {
      deckModel.rankingAssetRef = 'ranking';
    }
    delete deckModel.cardRankingAssetRef;
    object.deckModel = deckModel;
  }

  for (const child of Object.values(object)) {
    migrateReferences(child);
  }
}

function normalizeComposition(assetType: string, data: JsonRecord): JsonRecord[] {
  const existing = array(data.composition).map((entry) => record(entry)).filter((entry) => Object.keys(entry).length > 0);
  if (existing.length > 0) {
    return existing.map((entry) => ({
      pieceTemplate: migrateReferenceType(record(entry.pieceTemplate)),
      copies: positiveInteger(entry.copies, 1),
      logicalId: optionalString(entry.logicalId),
      role: optionalString(entry.role),
      tags: array(entry.tags).map(stringValue).filter(Boolean),
    }));
  }

  if (assetType === 'DominoDeck' || array(data.tileComposition).length > 0 || array(data.tileTemplates).length > 0) {
    const tileComposition = array(data.tileComposition);
    if (tileComposition.length > 0) {
      return tileComposition.flatMap((entry) => {
        const item = record(entry);
        const ref = migrateReferenceType(record(item.tileTemplate));
        return Object.keys(ref).length > 0 ? [{
          pieceTemplate: ref,
          copies: positiveInteger(item.copies, 1),
          logicalId: optionalString(item.logicalTileId),
          role: 'tile',
          tags: [],
        }] : [];
      });
    }
    return array(data.tileTemplates).flatMap((ref) => {
      const entry = migrateReferenceType(record(ref));
      return Object.keys(entry).length > 0 ? [{ pieceTemplate: entry, copies: 1, role: 'tile', tags: [] }] : [];
    });
  }

  if (assetType === 'MahjongDeck' || array(data.tiles).length > 0) {
    return array(data.tiles).flatMap((entry) => {
      const item = record(entry);
      const ref = migrateReferenceType(record(item.tile));
      return Object.keys(ref).length > 0 ? [{
        pieceTemplate: ref,
        copies: positiveInteger(item.count, 1),
        logicalId: optionalString(item.logicalTileId),
        role: 'tile',
        tags: [],
      }] : [];
    });
  }

  const cardComposition = array(data.cardComposition);
  if (cardComposition.length > 0) {
    return cardComposition.flatMap((entry) => {
      const item = record(entry);
      const ref = migrateReferenceType(record(item.cardTemplate));
      return Object.keys(ref).length > 0 ? [{
        pieceTemplate: ref,
        copies: positiveInteger(item.copies, 1),
        logicalId: optionalString(item.logicalCardId),
        role: 'card',
        tags: [],
      }] : [];
    });
  }

  return array(data.cardTemplates).flatMap((ref) => {
    const entry = migrateReferenceType(record(ref));
    return Object.keys(entry).length > 0 ? [{ pieceTemplate: entry, copies: 1, role: 'card', tags: [] }] : [];
  });
}

function normalizeRankingAsset(data: JsonRecord): JsonRecord | undefined {
  const existing = record(data.rankingAsset);
  if (Object.keys(existing).length > 0) {
    return migrateReferenceType(existing);
  }
  for (const key of rankingRefKeys) {
    const ref = record(data[key]);
    if (Object.keys(ref).length > 0) {
      return migrateReferenceType(ref);
    }
  }
  return undefined;
}

function normalizeRankingOrder(rankingFamily: string, data: JsonRecord): JsonRecord[] {
  const existing = array(data.order).map((entry) => record(entry)).filter((entry) => stringValue(entry.id));
  if (existing.length > 0) {
    return existing;
  }

  const cardEntries = array(data.cardEntries).map((entry) => record(entry)).filter((entry) => stringValue(entry.id));
  if (cardEntries.length > 0) {
    return cardEntries.map((entry, index) => ({ ...entry, order: positiveInteger(entry.order, index) }));
  }

  const tileIds = array(data.tileIds).map(stringValue).filter(Boolean);
  if (tileIds.length > 0) {
    return tileIds.map((id, index) => ({ id, order: index, copies: 1 }));
  }

  const french = record(record(data.familyPayload).french);
  const suits = array(french.suits).map((entry) => record(entry)).sort(displayOrderSort);
  const ranks = array(french.rankings).map((entry) => record(entry)).sort(displayOrderSort);
  if (suits.length > 0 && ranks.length > 0) {
    return suits.flatMap((suit) => ranks.map((rank, index) => ({
      id: `${rank.Value}_of_${suit.SuitName}`,
      suit: stringValue(suit.SuitName),
      rank: rank.Value,
      label: `${rank.CardSymbol ?? rank.Value} ${suit.SuitSymbol ?? suit.SuitName}`,
      order: index,
      copies: 1,
      kind: rankingFamily.includes('tarot') ? 'minor' : 'card',
    })));
  }

  const months = array(data.months).map((entry) => record(entry)).sort((a, b) => positiveInteger(a.month, 0) - positiveInteger(b.month, 0));
  if (months.length > 0) {
    return months.flatMap((month) => array(month.slots).map((slot) => record(slot)).flatMap((slot, index) => {
      const id = stringValue(slot.cardId);
      return id ? [{ id, order: index, copies: 1, kind: 'hanafuda' }] : [];
    }));
  }

  return [];
}

function normalizeRankingLayout(rankingFamily: string, data: JsonRecord): JsonRecord[] {
  const existing = array(data.layout).map((entry) => record(entry)).filter((entry) => stringValue(entry.id));
  const french = record(record(data.familyPayload).french);
  const suits = array(french.suits).map((entry) => record(entry)).sort(displayOrderSort);
  const suitLookup = buildSuitLookup(suits);
  const cardEntryLayout = buildCardEntryLayout(data);
  const mahjongLayout = buildMahjongLayout(data);
  if (existing.length > 0) {
    if ((isGenericPiecesLayout(existing) || isGeneratedMahjongLayout(existing)) && mahjongLayout.length > 0) {
      return mahjongLayout;
    }
    if ((isGenericPiecesLayout(existing) || isGeneratedCardEntryLayout(existing)) && cardEntryLayout.length > 0) {
      return cardEntryLayout;
    }
    return existing.map((section) => normalizeLayoutSection(section, suitLookup));
  }

  if (cardEntryLayout.length > 0) {
    return cardEntryLayout;
  }

  if (mahjongLayout.length > 0) {
    return mahjongLayout;
  }

  const ranks = array(french.rankings).map((entry) => record(entry)).sort(displayOrderSort);
  if (suits.length > 0 && ranks.length > 0) {
    return [{
      id: rankingFamily.includes('tarot') ? 'minors' : 'cards',
      title: rankingFamily.includes('tarot') ? 'Minor Arcana' : 'Cards',
      kind: 'matrix',
      rows: suits.map(buildSuitAxisEntry),
      columns: ranks.map((rank, index) => ({ key: String(rank.Value), label: stringValue(rank.CardSymbol) || String(rank.Value), order: index })),
    }];
  }

  if (typeof data.maxPip === 'number') {
    const axes = Array.from({ length: data.maxPip + 1 }, (_, index) => ({ key: String(index), label: String(index), order: index }));
    return [{ id: 'domino-pips', title: 'Tiles', kind: 'matrix', rows: axes, columns: axes }];
  }

  const months = array(data.months).map((entry) => record(entry)).sort((a, b) => positiveInteger(a.month, 0) - positiveInteger(b.month, 0));
  if (months.length > 0) {
    const slots = Array.from(new Set(months.flatMap((month) => array(month.slots).map((slot) => positiveInteger(record(slot).slot, 0)).filter(Boolean))));
    return [{
      id: 'hanafuda-months',
      title: 'Months',
      kind: 'matrix',
      rows: months.map((month) => ({ key: String(month.month), label: String(month.month), order: positiveInteger(month.month, 0) })),
      columns: slots.map((slot) => ({ key: String(slot), label: String(slot), order: slot })),
    }];
  }

  return [{ id: `${rankingFamily}-pieces`, title: 'Pieces', kind: 'grid' }];
}

function buildMahjongLayout(data: JsonRecord): JsonRecord[] {
  const rankingFamily = stringValue(data.rankingFamily);
  const expectedCount = positiveInteger(data.expectedPieceCount, positiveInteger(data.expectedTileCount, 0));
  const isMahjong = rankingFamily === 'mahjong' || typeof data.includeBonusTiles === 'boolean' || expectedCount === 136 || expectedCount === 144 || expectedCount === 148 || expectedCount === 152 || expectedCount === 160;
  if (!isMahjong) {
    return [];
  }

  const suitRows = ['Characters', 'Bamboos', 'Dots'];
  const rankColumns = Array.from({ length: 9 }, (_, index) => String(index + 1));
  const sections: JsonRecord[] = [{
    id: 'mahjong-suits',
    title: 'Number Suits',
    kind: 'matrix',
    rows: suitRows.map((suit, index) => ({ key: suit, label: suit, order: index })),
    columns: rankColumns.map((rank, index) => ({ key: rank, label: rank, order: index })),
    cells: suitRows.flatMap((suit) => rankColumns.map((rank) => ({
      pieceId: `Suit:${suit}:${rank}`,
      rowKey: suit,
      columnKey: rank,
    }))),
  }, {
    id: 'mahjong-honors',
    title: 'Honors',
    kind: 'grid',
    pieceIds: ['Wind:East', 'Wind:South', 'Wind:West', 'Wind:North', 'Dragon:Red', 'Dragon:Green', 'Dragon:White'],
  }];

  if (data.includeBonusTiles === true || expectedCount >= 144) {
    sections.push({
      id: 'mahjong-bonus',
      title: 'Bonus Tiles',
      kind: 'grid',
      pieceIds: ['Flower:1', 'Season:1', 'Flower:2', 'Season:2', 'Flower:3', 'Season:3', 'Flower:4', 'Season:4'],
    });
  }

  const extraPieceIds = array(data.extraTiles)
    .map((entry) => stringValue(record(entry).tileId))
    .filter(Boolean);
  const specialPieceIds = extraPieceIds.filter((id) => !id.startsWith('Flower:') && !id.startsWith('Season:'));
  if (specialPieceIds.length > 0) {
    sections.push({
      id: 'mahjong-special',
      title: 'Special Tiles',
      kind: 'grid',
      pieceIds: specialPieceIds,
    });
  }

  return sections;
}

function buildCardEntryLayout(data: JsonRecord): JsonRecord[] {
  const entries = array(data.cardEntries)
    .map((entry) => record(entry))
    .filter((entry) => stringValue(entry.id));
  if (entries.length === 0) {
    return [];
  }

  const trumpEntries = entries
    .filter((entry) => stringValue(entry.kind) === 'trump' || stringValue(entry.kind) === 'fool')
    .sort(cardEntryOrderSort);
  const minorEntries = entries
    .filter((entry) => stringValue(entry.suit) && entry.rank !== null && entry.rank !== undefined);
  const sections: JsonRecord[] = [];

  if (trumpEntries.length > 0) {
    sections.push({
      id: 'trumps',
      title: trumpEntries.some((entry) => stringValue(entry.kind) === 'fool') ? 'Trumps and Fool' : 'Trumps',
      kind: 'grid',
      pieceIds: trumpEntries.map((entry) => stringValue(entry.id)),
    });
  }

  if (minorEntries.length > 0) {
    const suits = uniqueOrdered(minorEntries.map((entry) => stringValue(entry.suit)).filter(Boolean));
    const ranks = uniqueOrdered(minorEntries.map((entry) => scalarKey(entry.rank)).filter(Boolean));
    const bySuitRank = new Map(minorEntries.map((entry) => [`${stringValue(entry.suit)}\0${scalarKey(entry.rank)}`, entry]));
    const cells = minorEntries.flatMap((entry) => {
      const pieceId = stringValue(entry.id);
      const rowKey = stringValue(entry.suit);
      const columnKey = scalarKey(entry.rank);
      return pieceId && rowKey && columnKey ? [{ pieceId, rowKey, columnKey }] : [];
    });
    sections.push({
      id: 'minors',
      title: trumpEntries.length > 0 ? 'Minor Suits' : 'Suits',
      kind: 'matrix',
      rows: suits.map((suit, index) => buildGenericSuitAxisEntry(suit, index)),
      columns: ranks.map((rank, index) => ({ key: rank, label: labelFromRank(rank), order: index })),
      pieceIds: suits.flatMap((suit) => ranks.flatMap((rank) => {
        const entry = bySuitRank.get(`${suit}\0${rank}`);
        return entry ? [stringValue(entry.id)] : [];
      })),
      cells,
    });
  }

  if (sections.length === 0) {
    return [];
  }

  const coveredIds = new Set(sections.flatMap((section) => array(section.pieceIds).map(stringValue)));
  const otherEntries = entries.filter((entry) => !coveredIds.has(stringValue(entry.id))).sort(cardEntryOrderSort);
  if (otherEntries.length > 0) {
    sections.push({
      id: 'other-pieces',
      title: 'Other Pieces',
      kind: 'grid',
      pieceIds: otherEntries.map((entry) => stringValue(entry.id)),
    });
  }

  return sections;
}

function isGenericPiecesLayout(layout: JsonRecord[]): boolean {
  return layout.length === 1 &&
    stringValue(layout[0].kind) === 'grid' &&
    array(layout[0].pieceIds).length === 0 &&
    stringValue(layout[0].id).endsWith('-pieces');
}

function isGeneratedCardEntryLayout(layout: JsonRecord[]): boolean {
  const generatedIds = new Set(['trumps', 'minors', 'other-pieces']);
  return layout.length > 0 && layout.every((section) => generatedIds.has(stringValue(section.id)));
}

function isGeneratedMahjongLayout(layout: JsonRecord[]): boolean {
  const generatedIds = new Set(['mahjong-suits', 'mahjong-honors', 'mahjong-bonus', 'mahjong-special']);
  return layout.length > 0 && layout.every((section) => generatedIds.has(stringValue(section.id)));
}

function normalizeLayoutSection(section: JsonRecord, suitLookup: Map<string, JsonRecord>): JsonRecord {
  const normalized = { ...section };
  const rows = array(section.rows).map((entry) => record(entry));
  const columns = array(section.columns).map((entry) => record(entry));
  if (rows.length > 0) {
    normalized.rows = rows.map((entry, index) => normalizeAxisEntry(entry, index, suitLookup));
  }
  if (columns.length > 0) {
    normalized.columns = columns.map((entry, index) => ({
      ...entry,
      order: positiveInteger(entry.order, index),
    }));
  }
  return normalized;
}

function normalizeAxisEntry(axis: JsonRecord, index: number, suitLookup: Map<string, JsonRecord>): JsonRecord {
  const key = stringValue(axis.key);
  const label = stringValue(axis.label);
  const suit = suitLookup.get(axisLookupKey(key)) ?? suitLookup.get(axisLookupKey(label));
  if (!suit) {
    return {
      ...axis,
      label: label || titleCaseIdentifier(key),
      order: positiveInteger(axis.order, index),
    };
  }
  const symbol = stringValue(axis.symbol) || normalizedSuitSymbol(suit);
  const color = stringValue(axis.color) || normalizedSuitColor(suit);
  return {
    ...axis,
    label: normalizedSuitLabel(suit),
    ...(symbol ? { symbol } : {}),
    ...(color ? { color } : {}),
    order: positiveInteger(axis.order, index),
  };
}

function buildSuitAxisEntry(suit: JsonRecord, index: number): JsonRecord {
  const symbol = normalizedSuitSymbol(suit);
  const color = normalizedSuitColor(suit);
  return {
    key: stringValue(suit.SuitName),
    label: normalizedSuitLabel(suit),
    ...(symbol ? { symbol } : {}),
    ...(color ? { color } : {}),
    order: index,
  };
}

function buildGenericSuitAxisEntry(suit: string, index: number): JsonRecord {
  const label = genericSuitLabel(suit);
  const symbol = genericSuitSymbol(suit);
  return {
    key: suit,
    label,
    ...(symbol && symbol !== label ? { symbol } : {}),
    order: index,
  };
}

function genericSuitLabel(suit: string): string {
  const labels: Record<string, string> = {
    bastoni: 'Batons',
    batons: 'Batons',
    wands: 'Batons',
    coppe: 'Cups',
    cups: 'Cups',
    denari: 'Coins',
    coins: 'Coins',
    oro: 'Coins',
    oros: 'Coins',
    spade: 'Swords',
    swords: 'Swords',
    sword: 'Swords',
    clubs: 'Clubs',
    diamonds: 'Diamonds',
    hearts: 'Hearts',
    spades: 'Spades',
    eichel: 'Acorns',
    laub: 'Leaves',
    herz: 'Hearts',
    schellen: 'Bells',
  };
  return labels[axisLookupKey(suit)] ?? titleCaseIdentifier(suit);
}

function genericSuitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    clubs: '♣',
    diamonds: '♦',
    hearts: '♥',
    spades: '♠',
  };
  return symbols[axisLookupKey(suit)] ?? '';
}

function labelFromRank(rank: string): string {
  const labels: Record<string, string> = {
    '1': 'A',
    '11': 'J',
    '12': 'Q',
    '13': 'K',
    '14': 'A',
    jack: 'J',
    queen: 'Q',
    king: 'K',
    cavalier: 'Cav',
    knight: 'Kn',
  };
  return labels[axisLookupKey(rank)] ?? titleCaseIdentifier(rank);
}

function buildSuitLookup(suits: JsonRecord[]): Map<string, JsonRecord> {
  const lookup = new Map<string, JsonRecord>();
  for (const suit of suits) {
    const nameKey = axisLookupKey(suit.SuitName);
    const symbolKey = axisLookupKey(suit.SuitSymbol);
    if (nameKey) {
      lookup.set(nameKey, suit);
    }
    if (symbolKey) {
      lookup.set(symbolKey, suit);
    }
  }
  return lookup;
}

function normalizedSuitLabel(suit: JsonRecord): string {
  const suitName = stringValue(suit.SuitName);
  return frenchSuitPresentation[axisLookupKey(suitName)]?.label || titleCaseIdentifier(suitName) || stringValue(suit.SuitSymbol);
}

function normalizedSuitSymbol(suit: JsonRecord): string {
  const suitName = stringValue(suit.SuitName);
  const suitSymbol = stringValue(suit.SuitSymbol);
  return frenchSuitPresentation[axisLookupKey(suitName)]?.symbol || suitSymbol;
}

function normalizedSuitColor(suit: JsonRecord): string {
  const suitName = stringValue(suit.SuitName);
  return stringValue(suit.SuitColor).toLowerCase() || frenchSuitPresentation[axisLookupKey(suitName)]?.color || '';
}

function uniqueOrdered(values: string[]): string[] {
  return Array.from(new Set(values));
}

function inferExpectedPieceCount(data: JsonRecord): number {
  const orderCount = array(data.order).reduce((sum, entry) => sum + positiveInteger(record(entry).copies, 1), 0);
  return positiveInteger(data.expectedCardCount, 0) ||
    positiveInteger(data.expectedTileCount, 0) ||
    positiveInteger(data.expectedPieceCount, 0) ||
    orderCount ||
    array(data.tileIds).length ||
    array(data.cardEntries).reduce((sum, entry) => sum + positiveInteger(record(entry).copies, 1), 0);
}

function inferDeckFamily(assetType: string, data: JsonRecord): string {
  if (assetType === 'DominoDeck' || data.dominoRankingAsset) return 'domino';
  if (assetType === 'HanafudaDeck' || data.hanafudaRankingAsset) return 'hanafuda';
  if (assetType === 'MahjongDeck' || data.mahjongRankingAsset) return 'mahjong';
  if (assetType === 'PlayingCardDeck' || data.playingCardRankingAsset) return 'custom';
  const tripleText = JSON.stringify(data.supportedTriples ?? '').toLowerCase();
  if (tripleText.includes('domino')) return 'domino';
  if (tripleText.includes('hanafuda') || tripleText.includes('kabufuda')) return 'hanafuda';
  if (tripleText.includes('mahjong')) return 'mahjong';
  if (tripleText.includes('tarot') || tripleText.includes('tarocco') || tripleText.includes('tarock')) return 'tarot';
  return 'french_cards';
}

function inferPieceKind(assetType: string, data: JsonRecord): string {
  if (assetType === 'DominoDeck' || data.dominoRankingAsset) return 'domino_tile';
  if (assetType === 'HanafudaDeck' || data.hanafudaRankingAsset) return 'hanafuda_card';
  if (assetType === 'MahjongDeck' || data.mahjongRankingAsset) return 'mahjong_tile';
  return 'card';
}

function inferRankingFamily(assetType: string, data: JsonRecord): string {
  if (assetType === 'DominoRanking' || data.maxPip || data.tileIds) return 'domino';
  if (assetType === 'HanafudaRanking' || data.months) return 'hanafuda';
  if (assetType === 'MahjongRanking' || data.includeBonusTiles) return 'mahjong';
  const deckFamily = stringValue(data.deckFamily).toLowerCase();
  if (deckFamily.includes('tarot')) return 'tarot';
  return deckFamily || 'french_cards';
}

function inferPreviewLayoutHint(data: JsonRecord): string {
  const family = stringValue(data.deckFamily);
  return family === 'french_cards' || family === 'tarot' || family === 'domino' || family === 'hanafuda' || family === 'mahjong' ? 'matrix' : 'grid';
}

function inferOrientation(data: JsonRecord): string {
  return stringValue(data.pieceKind).includes('domino') ? 'landscape' : 'portrait';
}

function inferDefaultShape(data: JsonRecord): string {
  return stringValue(data.pieceKind).includes('domino') || stringValue(data.pieceKind).includes('tile') ? 'tile' : 'card';
}

function migrateReferenceType(ref: JsonRecord): JsonRecord {
  const migrated = { ...ref };
  const assetType = stringValue(migrated.assetType);
  if (retiredDeckTypes.has(assetType)) {
    migrated.assetType = 'Deck';
  }
  if (retiredRankingTypes.has(assetType)) {
    migrated.assetType = 'DeckRanking';
  }
  return migrated;
}

function deleteLegacyDeckFields(data: JsonRecord): void {
  delete data.cardTemplates;
  delete data.cardComposition;
  delete data.cardRankingAsset;
  delete data.tileTemplates;
  delete data.tileComposition;
  delete data.dominoRankingAsset;
  delete data.hanafudaRankingAsset;
  delete data.mahjongRankingAsset;
  delete data.playingCardRankingAsset;
  delete data.tiles;
  delete data.backCardHash;
  delete data.imageSourceFolderPath;
  delete data.cardOutputPath;
  delete data.backCardSourceFolderPath;
}

function findRetiredPersistedTypes(): string[] {
  return assetFiles.flatMap((file) => {
    const parsed = JSON5.parse(readFileSync(file, 'utf8')) as JsonRecord;
    const assetType = stringValue(record(parsed.system).assetType);
    return retiredDeckTypes.has(assetType) || retiredRankingTypes.has(assetType)
      ? [`${relative(root, file)}: ${assetType}`]
      : [];
  });
}

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const file = join(directory, name);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function scalarKey(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function axisLookupKey(value: unknown): string {
  return scalarKey(value).trim().toLowerCase().replace(/[_\s-]+/g, '');
}

function titleCaseIdentifier(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function optionalString(value: unknown): string | undefined {
  const text = stringValue(value);
  return text || undefined;
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function displayOrderSort(left: JsonRecord, right: JsonRecord): number {
  return positiveInteger(left.DisplayOrder, 0) - positiveInteger(right.DisplayOrder, 0);
}

function cardEntryOrderSort(left: JsonRecord, right: JsonRecord): number {
  return positiveInteger(left.order, 0) - positiveInteger(right.order, 0) ||
    stringValue(left.label).localeCompare(stringValue(right.label)) ||
    stringValue(left.id).localeCompare(stringValue(right.id));
}
