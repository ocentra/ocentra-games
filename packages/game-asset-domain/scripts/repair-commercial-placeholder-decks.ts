import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const assetEditorRoot = path.join(repoRoot, 'packages', 'asset-editor');
const cardGamesRoot = path.join(assetEditorRoot, 'Resources', 'GameMode', 'CardGames');
const cardImagePath = 'Resources/GameMode/CardGames/Images/Extras/PlainCard.png';
const backImagePath = 'Resources/GameMode/CardGames/Images/Extras/BackCard.png';

type AssetType = 'Card' | 'Deck' | 'DeckRanking';

interface ResourceEntry {
  path: string;
  guid: string;
  assetType: AssetType;
  displayName: string;
  resourceEntryType: 'AssetResourceEntry';
  variant: string;
  category: 'Game';
}

interface PieceDefinition {
  id: string;
  label: string;
  suit: string | null;
  rank: number | string | null;
  order: number;
  points: number | null;
  copies: number;
  rowKey?: string;
  columnKey?: string;
}

interface FamilyDefinition {
  deckDisplayName: string;
  deckFileName: string;
  deckFamily: 'Rook_colors' | 'Whot';
  deckType: 'Rook 56' | 'Whot 54';
  suitSet: 'Rook_colors' | 'Whot';
  rankSet: 'Rook_1_14' | 'Whot';
  cardFolder: string;
  rankingFileName: string;
  rankingDisplayName: string;
  rankingFamily: string;
  rows: Array<{ key: string; label: string; symbol?: string; color?: string; order: number }>;
  columns: Array<{ key: string; label: string; order: number }>;
  pieces: PieceDefinition[];
}

function stableGuid(seed: string): string {
  const hex = crypto.createHash('sha1').update(seed).digest('hex').slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function hashFileHex(resourcePath: string): string {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(assetEditorRoot, resourcePath.replace(/\//g, path.sep))))
    .digest('hex');
}

function treePathFor(filePath: string): string {
  return path.relative(assetEditorRoot, filePath).replace(/\\/g, '/');
}

function resourceEntry(filePath: string, assetType: AssetType, displayName: string): ResourceEntry {
  const treePath = treePathFor(filePath);
  return {
    path: treePath,
    guid: stableGuid(treePath),
    assetType,
    displayName,
    resourceEntryType: 'AssetResourceEntry',
    variant: displayName,
    category: 'Game',
  };
}

function systemBlock(filePath: string, assetType: AssetType, displayName: string): Record<string, unknown> {
  const treePath = treePathFor(filePath);
  return {
    guid: stableGuid(treePath),
    assetType,
    schemaVersion: 1,
    displayName,
    category: 'Game',
    icon: 'card',
    variant: displayName,
    parentPath: path.dirname(treePath).replace(/\\/g, '/'),
    treePath,
  };
}

function writeAsset(filePath: string, assetType: AssetType, displayName: string, data: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${JSON.stringify({
      system: systemBlock(filePath, assetType, displayName),
      data,
    }, null, 2)}\n`,
    'utf8',
  );
}

function rookPieces(): PieceDefinition[] {
  const colors = ['black', 'red', 'green', 'yellow'];
  const pieces: PieceDefinition[] = [];
  for (const color of colors) {
    for (let rank = 1; rank <= 14; rank += 1) {
      pieces.push({
        id: `rook_colors_${color}_${rank}`,
        label: `${color} ${rank}`,
        suit: color,
        rank,
        order: pieces.length,
        points: rank === 1 ? 15 : rank === 14 || rank === 10 ? 10 : rank === 5 ? 5 : 0,
        copies: 1,
        rowKey: color,
        columnKey: String(rank),
      });
    }
  }
  return pieces;
}

function whotPieces(): PieceDefinition[] {
  const suitRanks: Record<string, number[]> = {
    circles: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
    triangles: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
    crosses: [1, 2, 3, 5, 7, 10, 11, 13, 14],
    squares: [1, 2, 3, 5, 7, 10, 11, 13, 14],
    stars: [1, 2, 3, 4, 5, 7, 8],
  };
  const pieces: PieceDefinition[] = Object.entries(suitRanks).flatMap(([suit, ranks]) =>
    ranks.map((rank) => ({
      id: `whot_${suit}_${rank}`,
      label: `${suit} ${rank}`,
      suit,
      rank,
      order: 0,
      points: suit === 'stars' ? rank * 2 : rank,
      copies: 1,
      rowKey: suit,
      columnKey: String(rank),
    })),
  );
  pieces.forEach((piece, index) => {
    piece.order = index;
  });
  pieces.push({
    id: 'whot_wild_20',
    label: 'Whot 20',
    suit: 'whot',
    rank: 20,
    order: pieces.length,
    points: 20,
    copies: 5,
  });
  return pieces;
}

function familyDefinitions(): FamilyDefinition[] {
  return [
    {
      deckDisplayName: 'Rook 56',
      deckFileName: 'Rook 56.asset',
      deckFamily: 'Rook_colors',
      deckType: 'Rook 56',
      suitSet: 'Rook_colors',
      rankSet: 'Rook_1_14',
      cardFolder: 'Rook',
      rankingFileName: 'Rook_colors_Rook_1_14.asset',
      rankingDisplayName: 'Rook_colors_Rook_1_14',
      rankingFamily: 'rook_colors',
      rows: [
        { key: 'black', label: 'Black', symbol: 'B', color: '#111111', order: 0 },
        { key: 'red', label: 'Red', symbol: 'R', color: '#b91c1c', order: 1 },
        { key: 'green', label: 'Green', symbol: 'G', color: '#15803d', order: 2 },
        { key: 'yellow', label: 'Yellow', symbol: 'Y', color: '#ca8a04', order: 3 },
      ],
      columns: Array.from({ length: 14 }, (_, index) => ({
        key: String(index + 1),
        label: String(index + 1),
        order: index,
      })),
      pieces: rookPieces(),
    },
    {
      deckDisplayName: 'Whot 54',
      deckFileName: 'Whot 54.asset',
      deckFamily: 'Whot',
      deckType: 'Whot 54',
      suitSet: 'Whot',
      rankSet: 'Whot',
      cardFolder: 'Whot 54',
      rankingFileName: 'whot_54.asset',
      rankingDisplayName: 'whot_54',
      rankingFamily: 'whot',
      rows: [
        { key: 'circles', label: 'Circles', symbol: 'O', order: 0 },
        { key: 'triangles', label: 'Triangles', symbol: 'T', order: 1 },
        { key: 'crosses', label: 'Crosses', symbol: 'X', order: 2 },
        { key: 'squares', label: 'Squares', symbol: 'S', order: 3 },
        { key: 'stars', label: 'Stars', symbol: '*', order: 4 },
      ],
      columns: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14].map((rank, index) => ({
        key: String(rank),
        label: String(rank),
        order: index,
      })),
      pieces: whotPieces(),
    },
  ];
}

function buildRankingLayout(definition: FamilyDefinition): Array<Record<string, unknown>> {
  const cells = definition.pieces
    .filter((piece) => piece.rowKey && piece.columnKey)
    .map((piece) => ({
      pieceId: piece.id,
      rowKey: piece.rowKey,
      columnKey: piece.columnKey,
    }));
  const layout: Array<Record<string, unknown>> = [
    {
      id: `${definition.rankingFamily}-matrix`,
      title: `${definition.deckDisplayName} matrix`,
      kind: 'matrix',
      rows: definition.rows,
      columns: definition.columns,
      cells,
    },
  ];
  const loosePieces = definition.pieces.filter((piece) => !piece.rowKey || !piece.columnKey);
  if (loosePieces.length > 0) {
    layout.push({
      id: `${definition.rankingFamily}-specials`,
      title: `${definition.deckDisplayName} special cards`,
      kind: 'grid',
      pieceIds: loosePieces.map((piece) => piece.id),
    });
  }
  return layout;
}

function writeFamily(definition: FamilyDefinition): void {
  const imageHash = hashFileHex(cardImagePath);
  const backImageHash = hashFileHex(backImagePath);
  const rankingFilePath = path.join(cardGamesRoot, 'CardRanking', definition.rankingFileName);
  const rankingRef = resourceEntry(rankingFilePath, 'DeckRanking', definition.rankingDisplayName);
  const cardEntries = definition.pieces.map((piece) => ({
    id: piece.id,
    copies: piece.copies,
    suit: piece.suit,
    rank: piece.rank,
    label: piece.label,
    order: piece.order,
    points: piece.points,
    kind: 'card',
  }));

  writeAsset(rankingFilePath, 'DeckRanking', definition.rankingDisplayName, {
    commercialPlaceholderOnly: true,
    visualAssetStatus: 'needs_final_art',
    rankingFamily: definition.rankingFamily,
    expectedPieceCount: definition.pieces.reduce((sum, piece) => sum + piece.copies, 0),
    layout: buildRankingLayout(definition),
    order: cardEntries,
    deckType: definition.deckType,
    expectedCardCount: definition.pieces.reduce((sum, piece) => sum + piece.copies, 0),
    includesJokers: false,
    backCardCount: 1,
    deckFamily: definition.deckFamily,
    cardEntries,
    scoringHints: {
      sourceStatus: 'source_verified_placeholder_art',
    },
  });

  const cardRefs = definition.pieces.map((piece) => {
    const cardFilePath = path.join(cardGamesRoot, 'Cards', definition.cardFolder, `${piece.id}.asset`);
    writeAsset(cardFilePath, 'Card', piece.id, {
      commercialPlaceholderOnly: true,
      visualAssetStatus: 'needs_final_art',
      visualAssetSource: 'shared_plain_card',
      visualAssetReplacementRequired: true,
      pieceKind: 'Card',
      cardIdentity: {
        family: definition.deckFamily,
        id: piece.id,
      },
      imageHash,
      imagePath: cardImagePath,
      cardId: piece.id,
      rankingAsset: rankingRef,
    });
    return {
      ref: resourceEntry(cardFilePath, 'Card', piece.id),
      piece,
    };
  });

  writeAsset(path.join(cardGamesRoot, 'Decks', definition.deckFileName), 'Deck', definition.deckDisplayName, {
    commercialPlaceholderOnly: true,
    visualAssetStatus: 'needs_final_art',
    visualAssetSource: 'shared_plain_card',
    visualAssetReplacementRequired: true,
    name: definition.deckDisplayName,
    deckFamily: definition.deckFamily,
    pieceKind: 'card',
    supportedTriples: [
      {
        deckType: definition.deckType,
        suitSet: definition.suitSet,
        rankSet: definition.rankSet,
      },
    ],
    composition: cardRefs.map(({ ref, piece }) => ({
      pieceTemplate: ref,
      copies: piece.copies,
      logicalId: piece.id,
      role: 'card',
      tags: [],
    })),
    rankingAsset: rankingRef,
    presentation: {
      backImageHash,
      previewLayoutHint: 'matrix',
      defaultOrientation: 'portrait',
      defaultShape: 'card',
    },
    runtimePolicy: {
      shufflePolicy: 'seeded_round_shuffle',
      drawDirection: 'top_is_index_0',
      multiplicity: 1,
      visibilityDefaults: {},
    },
  });
}

for (const definition of familyDefinitions()) {
  writeFamily(definition);
}

process.stdout.write('Commercial placeholder decks repaired: Rook 56, Whot 54\n');
