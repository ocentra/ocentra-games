import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const CARD_GAMES_ROOT = path.join(REPO_ROOT, 'packages', 'asset-editor', 'Resources', 'GameMode', 'CardGames');
const DECKS_DIR = path.join(CARD_GAMES_ROOT, 'Decks');
const RANKINGS_DIR = path.join(CARD_GAMES_ROOT, 'CardRanking');
const TILES_DIR = path.join(CARD_GAMES_ROOT, 'Tiles');

const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function newGuid() {
  return crypto.randomUUID();
}

function treePathFor(filePath) {
  return path.relative(path.join(REPO_ROOT, 'packages', 'asset-editor'), filePath).replaceAll(path.sep, '/');
}

function createResourceEntry(filePath) {
  const asset = readJson(filePath);
  return {
    path: treePathFor(filePath),
    guid: asset.system.guid,
    assetType: asset.system.assetType,
    displayName: asset.system.displayName,
    resourceEntryType: 'AssetResourceEntry',
    variant: asset.system.variant ?? null,
    category: asset.system.category ?? 'Game',
  };
}

function createTileAsset({
  folderName,
  fileName,
  displayName,
  variant,
  data,
  assetType,
}) {
  const filePath = path.join(TILES_DIR, folderName, fileName);
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  writeJson(filePath, {
    system: {
      guid: newGuid(),
      assetType,
      schemaVersion: 1,
      displayName,
      category: 'Game',
      icon: '🃏',
      variant,
      parentPath: `Resources/GameMode/CardGames/Tiles/${folderName}`,
      treePath: treePathFor(filePath),
    },
    data,
  });

  return filePath;
}

function createRankingAsset({
  fileName,
  displayName,
  variant,
  assetType,
  data,
}) {
  const filePath = path.join(RANKINGS_DIR, fileName);
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  writeJson(filePath, {
    system: {
      guid: newGuid(),
      assetType,
      schemaVersion: 1,
      displayName,
      category: 'Game',
      icon: '🃏',
      variant,
      parentPath: 'Resources/GameMode/CardGames/CardRanking',
      treePath: treePathFor(filePath),
    },
    data,
  });

  return filePath;
}

function createDeckAsset({
  fileName,
  displayName,
  variant,
  assetType,
  data,
}) {
  const filePath = path.join(DECKS_DIR, fileName);
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  writeJson(filePath, {
    system: {
      guid: newGuid(),
      assetType,
      schemaVersion: 1,
      displayName,
      category: 'Game',
      icon: '🃏',
      variant,
      treePath: treePathFor(filePath),
    },
    data,
  });

  return filePath;
}

function buildDoublePipIds(maxPip) {
  const ids = [];
  for (let left = 0; left <= maxPip; left++) {
    for (let right = left; right <= maxPip; right++) {
      ids.push(`${left}-${right}`);
    }
  }
  return ids;
}

function buildIndexedIds(prefix, count) {
  return Array.from({ length: count }, (_, index) => `${prefix}_${String(index + 1).padStart(3, '0')}`);
}

function loadMahjong144Deck() {
  return readJson(path.join(DECKS_DIR, 'Mahjong 144.asset'));
}

function createMahjongSpecialTiles() {
  const specials = [
    ...Array.from({ length: 4 }, (_, index) => ({
      fileName: `Animal_${index + 1}.asset`,
      displayName: `Animal:${index + 1}`,
      variant: `Animal:${index + 1}`,
      data: {
        pieceKind: 'MahjongTile',
        tileKind: 'Animal',
        bonusIndex: index + 1,
        tileId: `Animal:${index + 1}`,
        imageHash: ZERO_HASH,
      },
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      fileName: `Face_${index + 1}.asset`,
      displayName: `Face:${index + 1}`,
      variant: `Face:${index + 1}`,
      data: {
        pieceKind: 'MahjongTile',
        tileKind: 'Face',
        bonusIndex: index + 1,
        tileId: `Face:${index + 1}`,
        imageHash: ZERO_HASH,
      },
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      fileName: `Emperor_${index + 1}.asset`,
      displayName: `Emperor:${index + 1}`,
      variant: `Emperor:${index + 1}`,
      data: {
        pieceKind: 'MahjongTile',
        tileKind: 'Emperor',
        bonusIndex: index + 1,
        tileId: `Emperor:${index + 1}`,
        imageHash: ZERO_HASH,
      },
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      fileName: `Empress_${index + 1}.asset`,
      displayName: `Empress:${index + 1}`,
      variant: `Empress:${index + 1}`,
      data: {
        pieceKind: 'MahjongTile',
        tileKind: 'Empress',
        bonusIndex: index + 1,
        tileId: `Empress:${index + 1}`,
        imageHash: ZERO_HASH,
      },
    })),
    {
      fileName: 'Joker.asset',
      displayName: 'Joker',
      variant: 'Joker',
      data: {
        pieceKind: 'MahjongTile',
        tileKind: 'Joker',
        tileId: 'Joker',
        imageHash: ZERO_HASH,
      },
    },
  ];

  return specials.map((special) =>
    createTileAsset({
      folderName: 'Mahjong',
      fileName: special.fileName,
      displayName: special.displayName,
      variant: special.variant,
      data: special.data,
      assetType: 'MahjongTile',
    }),
  );
}

function createMahjongAssets() {
  const mahjong144 = loadMahjong144Deck();
  const baseTiles = mahjong144.data.tiles;
  const nonBonusTiles = baseTiles.filter((entry) => !entry.tile.displayName.startsWith('Flower:') && !entry.tile.displayName.startsWith('Season:'));

  createMahjongSpecialTiles();

  const ranking136Path = createRankingAsset({
    fileName: 'Mahjong_136.asset',
    displayName: 'Mahjong_136',
    variant: 'Mahjong_136',
    assetType: 'MahjongRanking',
    data: {
      includeBonusTiles: false,
      expectedTileCount: 136,
      extraTiles: [],
    },
  });

  const ranking148Path = createRankingAsset({
    fileName: 'Mahjong_148.asset',
    displayName: 'Mahjong_148',
    variant: 'Mahjong_148',
    assetType: 'MahjongRanking',
    data: {
      includeBonusTiles: true,
      expectedTileCount: 148,
      extraTiles: Array.from({ length: 4 }, (_, index) => ({
        tileId: `Animal:${index + 1}`,
        count: 1,
      })),
    },
  });

  const ranking152Path = createRankingAsset({
    fileName: 'Mahjong_152.asset',
    displayName: 'Mahjong_152',
    variant: 'Mahjong_152',
    assetType: 'MahjongRanking',
    data: {
      includeBonusTiles: true,
      expectedTileCount: 152,
      extraTiles: [
        {
          tileId: 'Joker',
          count: 8,
        },
      ],
    },
  });

  const ranking160Path = createRankingAsset({
    fileName: 'Mahjong_160.asset',
    displayName: 'Mahjong_160',
    variant: 'Mahjong_160',
    assetType: 'MahjongRanking',
    data: {
      includeBonusTiles: true,
      expectedTileCount: 160,
      extraTiles: [
        ...Array.from({ length: 4 }, (_, index) => ({ tileId: `Animal:${index + 1}`, count: 1 })),
        ...Array.from({ length: 4 }, (_, index) => ({ tileId: `Face:${index + 1}`, count: 1 })),
        ...Array.from({ length: 4 }, (_, index) => ({ tileId: `Emperor:${index + 1}`, count: 1 })),
        ...Array.from({ length: 4 }, (_, index) => ({ tileId: `Empress:${index + 1}`, count: 1 })),
      ],
    },
  });

  const animalEntries = Array.from({ length: 4 }, (_, index) => ({
    tile: createResourceEntry(path.join(TILES_DIR, 'Mahjong', `Animal_${index + 1}.asset`)),
    count: 1,
  }));
  const faceEntries = Array.from({ length: 4 }, (_, index) => ({
    tile: createResourceEntry(path.join(TILES_DIR, 'Mahjong', `Face_${index + 1}.asset`)),
    count: 1,
  }));
  const emperorEntries = Array.from({ length: 4 }, (_, index) => ({
    tile: createResourceEntry(path.join(TILES_DIR, 'Mahjong', `Emperor_${index + 1}.asset`)),
    count: 1,
  }));
  const empressEntries = Array.from({ length: 4 }, (_, index) => ({
    tile: createResourceEntry(path.join(TILES_DIR, 'Mahjong', `Empress_${index + 1}.asset`)),
    count: 1,
  }));
  const jokerEntry = {
    tile: createResourceEntry(path.join(TILES_DIR, 'Mahjong', 'Joker.asset')),
    count: 8,
  };

  createDeckAsset({
    fileName: 'Mahjong 136.asset',
    displayName: 'Mahjong 136',
    variant: 'Mahjong136',
    assetType: 'MahjongDeck',
    data: {
      name: 'Mahjong 136',
      tiles: nonBonusTiles,
      mahjongRankingAsset: createResourceEntry(ranking136Path),
      supportedTriples: [{ deckType: 'Mahjong 136', suitSet: 'Mahjong', rankSet: 'Mahjong_136' }],
    },
  });

  createDeckAsset({
    fileName: 'Mahjong 148.asset',
    displayName: 'Mahjong 148',
    variant: 'Mahjong148',
    assetType: 'MahjongDeck',
    data: {
      name: 'Mahjong 148',
      tiles: [...baseTiles, ...animalEntries],
      mahjongRankingAsset: createResourceEntry(ranking148Path),
      supportedTriples: [{ deckType: 'Mahjong 148', suitSet: 'Mahjong', rankSet: 'Mahjong_148' }],
    },
  });

  createDeckAsset({
    fileName: 'Mahjong 152.asset',
    displayName: 'Mahjong 152',
    variant: 'Mahjong152',
    assetType: 'MahjongDeck',
    data: {
      name: 'Mahjong 152',
      tiles: [...baseTiles, jokerEntry],
      mahjongRankingAsset: createResourceEntry(ranking152Path),
      supportedTriples: [{ deckType: 'Mahjong 152', suitSet: 'Mahjong', rankSet: 'Mahjong_152' }],
    },
  });

  createDeckAsset({
    fileName: 'Mahjong 160.asset',
    displayName: 'Mahjong 160',
    variant: 'Mahjong160',
    assetType: 'MahjongDeck',
    data: {
      name: 'Mahjong 160',
      tiles: [...baseTiles, ...animalEntries, ...faceEntries, ...emperorEntries, ...empressEntries],
      mahjongRankingAsset: createResourceEntry(ranking160Path),
      supportedTriples: [{ deckType: 'Mahjong 160', suitSet: 'Mahjong', rankSet: 'Mahjong_160' }],
    },
  });
}

function createDouble15Assets() {
  const folderName = 'Double-15 Dominoes';
  const tileIds = buildDoublePipIds(15);
  for (const tileId of tileIds) {
    const [leftPips, rightPips] = tileId.split('-').map(Number);
    createTileAsset({
      folderName,
      fileName: `${tileId}.asset`,
      displayName: tileId,
      variant: tileId,
      assetType: 'DominoTile',
      data: {
        pieceKind: 'DominoTile',
        leftPips,
        rightPips,
        tileId,
        imageHash: ZERO_HASH,
      },
    });
  }

  const rankingPath = createRankingAsset({
    fileName: 'Domino_Double_15.asset',
    displayName: 'Domino_Double_15',
    variant: 'Domino_Double_15',
    assetType: 'DominoRanking',
    data: {
      maxPip: 15,
      expectedTileCount: 136,
    },
  });

  createDeckAsset({
    fileName: 'Double-15 Dominoes.asset',
    displayName: 'Double-15 Dominoes',
    variant: 'Double15Dominoes',
    assetType: 'DominoDeck',
    data: {
      name: 'Double-15 Dominoes',
      tileTemplates: tileIds.map((tileId) =>
        createResourceEntry(path.join(TILES_DIR, folderName, `${tileId}.asset`)),
      ),
      dominoRankingAsset: createResourceEntry(rankingPath),
      supportedTriples: [{ deckType: 'Double-15 Dominoes', suitSet: 'Dominoes', rankSet: 'Domino_double15' }],
    },
  });
}

function createMultiSetDouble6Assets() {
  const baseTileIds = buildDoublePipIds(6);
  const baseEntries = baseTileIds.map((tileId) => createResourceEntry(path.join(TILES_DIR, 'Double-12 Dominoes', `${tileId}.asset`)));

  const x2TileIds = [];
  for (const setIndex of [1, 2]) {
    for (const tileId of baseTileIds) {
      x2TileIds.push(`set${setIndex}:${tileId}`);
    }
  }
  const x2RankingPath = createRankingAsset({
    fileName: 'Domino_Double_6_x2.asset',
    displayName: 'Domino_Double_6_x2',
    variant: 'Domino_Double_6_x2',
    assetType: 'DominoRanking',
    data: {
      expectedTileCount: x2TileIds.length,
      tileIds: x2TileIds,
    },
  });

  createDeckAsset({
    fileName: 'Double-6 Dominoes x2.asset',
    displayName: 'Double-6 Dominoes x2',
    variant: 'Double6DominoesX2',
    assetType: 'DominoDeck',
    data: {
      name: 'Double-6 Dominoes x2',
      tileTemplates: [],
      tileComposition: [1, 2].flatMap((setIndex) =>
        baseEntries.map((tileEntry) => ({
          tileTemplate: tileEntry,
          copies: 1,
          logicalTileId: `set${setIndex}:${tileEntry.displayName}`,
        })),
      ),
      dominoRankingAsset: createResourceEntry(x2RankingPath),
      supportedTriples: [{ deckType: 'Double-6 Dominoes x2', suitSet: 'Dominoes', rankSet: 'Domino_double6' }],
    },
  });

  const x4TileIds = [];
  for (const setIndex of [1, 2, 3, 4]) {
    for (const tileId of baseTileIds) {
      x4TileIds.push(`set${setIndex}:${tileId}`);
    }
  }
  const x4RankingPath = createRankingAsset({
    fileName: 'Domino_Double_6_x4.asset',
    displayName: 'Domino_Double_6_x4',
    variant: 'Domino_Double_6_x4',
    assetType: 'DominoRanking',
    data: {
      expectedTileCount: x4TileIds.length,
      tileIds: x4TileIds,
    },
  });

  createDeckAsset({
    fileName: 'Double-6 Dominoes x4.asset',
    displayName: 'Double-6 Dominoes x4',
    variant: 'Double6DominoesX4',
    assetType: 'DominoDeck',
    data: {
      name: 'Double-6 Dominoes x4',
      tileTemplates: [],
      tileComposition: [1, 2, 3, 4].flatMap((setIndex) =>
        baseEntries.map((tileEntry) => ({
          tileTemplate: tileEntry,
          copies: 1,
          logicalTileId: `set${setIndex}:${tileEntry.displayName}`,
        })),
      ),
      dominoRankingAsset: createResourceEntry(x4RankingPath),
      supportedTriples: [{ deckType: 'Double-6 Dominoes x4', suitSet: 'Dominoes', rankSet: 'Domino_double6' }],
    },
  });
}

function createDaaluuAssets() {
  const chinese32Deck = readJson(path.join(DECKS_DIR, 'Chinese domino 32.asset'));
  const daaluuTileIds = buildIndexedIds('daaluu', 64);
  const daaluuRankingPath = createRankingAsset({
    fileName: 'Daaluu_64.asset',
    displayName: 'Daaluu_64',
    variant: 'Daaluu_64',
    assetType: 'DominoRanking',
    data: {
      expectedTileCount: daaluuTileIds.length,
      tileIds: daaluuTileIds,
    },
  });

  const firstPass = chinese32Deck.data.tileComposition.map((entry, index) => ({
    tileTemplate: entry.tileTemplate,
    copies: 1,
    logicalTileId: daaluuTileIds[index],
  }));
  const secondPass = chinese32Deck.data.tileComposition.map((entry, index) => ({
    tileTemplate: entry.tileTemplate,
    copies: 1,
    logicalTileId: daaluuTileIds[index + 32],
  }));

  createDeckAsset({
    fileName: 'Daaluu 64.asset',
    displayName: 'Daaluu 64',
    variant: 'Daaluu64',
    assetType: 'DominoDeck',
    data: {
      name: 'Daaluu 64',
      tileTemplates: [],
      tileComposition: [...firstPass, ...secondPass],
      dominoRankingAsset: createResourceEntry(daaluuRankingPath),
      supportedTriples: [{ deckType: 'Daaluu 64', suitSet: 'Daaluu', rankSet: 'Daaluu' }],
    },
  });
}

function main() {
  createMahjongAssets();
  createDouble15Assets();
  createMultiSetDouble6Assets();
  createDaaluuAssets();
  process.stdout.write('Missing tile-family assets repaired.\n');
}

main();
