import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGES_DIR = path.resolve(__dirname, '../..');
const CARD_GAMES_DIR = path.resolve(PACKAGES_DIR, 'asset-editor/Resources/GameMode/CardGames');
const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const CARD_ICON = '\uD83C\uDCCF';

type AssetEnvelope = {
  system: Record<string, unknown>;
  data: Record<string, unknown>;
};

type ResourceEntry = {
  path: string;
  guid: string;
  assetType: string;
  displayName: string;
  resourceEntryType: 'AssetResourceEntry';
  variant?: string | null;
  category?: 'Game';
};

function readJson5(filePath: string): AssetEnvelope {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as AssetEnvelope;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function toResourcePath(absolutePath: string): string {
  return path.relative(path.resolve(PACKAGES_DIR, 'asset-editor'), absolutePath).replaceAll(path.sep, '/');
}

function toTreePath(absolutePath: string): string {
  return path.relative(path.resolve(PACKAGES_DIR, 'asset-editor'), absolutePath).replaceAll(path.sep, '/');
}

function toParentPath(absolutePath: string): string {
  return path.dirname(toTreePath(absolutePath)).replaceAll(path.sep, '/');
}

function deterministicGuid(seed: string): string {
  const hex = crypto.createHash('sha1').update(seed).digest('hex').slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function createResourceEntry(filePath: string, assetType: string, displayName: string): ResourceEntry {
  return {
    path: toResourcePath(filePath),
    guid: deterministicGuid(toTreePath(filePath)),
    assetType,
    displayName,
    resourceEntryType: 'AssetResourceEntry',
    variant: displayName,
    category: 'Game',
  };
}

function createSystem(assetType: string, displayName: string, absolutePath: string, icon?: string): Record<string, unknown> {
  return {
    guid: deterministicGuid(toTreePath(absolutePath)),
    assetType,
    schemaVersion: 1,
    displayName,
    category: 'Game',
    icon: icon ?? CARD_ICON,
    variant: displayName,
    parentPath: toParentPath(absolutePath),
    treePath: toTreePath(absolutePath),
  };
}

function buildPlayingCardFamily(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}_${String(index + 1).padStart(3, '0')}`);
}

function migratePlayingCardDeck(deckName: string, count: number): void {
  const prefix = deckName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const deckFilePath = path.resolve(CARD_GAMES_DIR, 'Decks', `${deckName}.asset`);
  const deckAsset = readJson5(deckFilePath);
  const rankingFilePath = path.resolve(CARD_GAMES_DIR, 'CardRanking', `PlayingCard_${prefix}.asset`);
  const rankingIds = buildPlayingCardFamily(prefix, count);

  const cardEntries = rankingIds.map((cardId) => {
    const cardFilePath = path.resolve(CARD_GAMES_DIR, 'Cards', deckName, `${cardId}.asset`);
    writeJson(cardFilePath, {
      system: createSystem('PlayingCard', cardId, cardFilePath, CARD_ICON),
      data: {
        pieceKind: 'PlayingCard',
        cardId,
        imageHash: ZERO_HASH,
        playingCardRankingAsset: createResourceEntry(rankingFilePath, 'PlayingCardRanking', `PlayingCard_${prefix}`),
      },
    });
    return createResourceEntry(cardFilePath, 'PlayingCard', cardId);
  });

  writeJson(rankingFilePath, {
    system: createSystem('PlayingCardRanking', `PlayingCard_${prefix}`, rankingFilePath, CARD_ICON),
    data: {
      expectedCardCount: rankingIds.length,
      cards: rankingIds.map((cardId) => ({ cardId })),
    },
  });

  writeJson(deckFilePath, {
    system: {
      ...deckAsset.system,
      assetType: 'PlayingCardDeck',
      icon: deckAsset.system.icon ?? CARD_ICON,
    },
    data: {
      name: deckName,
      cardTemplates: cardEntries,
      playingCardRankingAsset: createResourceEntry(rankingFilePath, 'PlayingCardRanking', `PlayingCard_${prefix}`),
    },
  });
}

function buildMahjongTiles(): Array<{ tileId: string; data: Record<string, unknown>; count: number }> {
  const tiles: Array<{ tileId: string; data: Record<string, unknown>; count: number }> = [];
  for (const suit of ['Characters', 'Bamboos', 'Dots']) {
    for (let rank = 1; rank <= 9; rank++) {
      tiles.push({
        tileId: `Suit:${suit}:${rank}`,
        data: { pieceKind: 'MahjongTile', tileKind: 'Suit', suit, rank, imageHash: ZERO_HASH },
        count: 4,
      });
    }
  }
  for (const wind of ['East', 'South', 'West', 'North']) {
    tiles.push({
      tileId: `Wind:${wind}`,
      data: { pieceKind: 'MahjongTile', tileKind: 'Wind', wind, imageHash: ZERO_HASH },
      count: 4,
    });
  }
  for (const dragon of ['Red', 'Green', 'White']) {
    tiles.push({
      tileId: `Dragon:${dragon}`,
      data: { pieceKind: 'MahjongTile', tileKind: 'Dragon', dragon, imageHash: ZERO_HASH },
      count: 4,
    });
  }
  for (let bonusIndex = 1; bonusIndex <= 4; bonusIndex++) {
    tiles.push({
      tileId: `Flower:${bonusIndex}`,
      data: { pieceKind: 'MahjongTile', tileKind: 'Flower', bonusIndex, imageHash: ZERO_HASH },
      count: 1,
    });
    tiles.push({
      tileId: `Season:${bonusIndex}`,
      data: { pieceKind: 'MahjongTile', tileKind: 'Season', bonusIndex, imageHash: ZERO_HASH },
      count: 1,
    });
  }
  return tiles;
}

function migrateMahjongDeck(): void {
  const deckName = 'Mahjong 144';
  const deckFilePath = path.resolve(CARD_GAMES_DIR, 'Decks', `${deckName}.asset`);
  const deckAsset = readJson5(deckFilePath);
  const rankingFilePath = path.resolve(CARD_GAMES_DIR, 'CardRanking', 'Mahjong_144.asset');
  const tiles = buildMahjongTiles();

  const tileEntries = tiles.map(({ tileId, data, count }) => {
    const tileFilePath = path.resolve(CARD_GAMES_DIR, 'Tiles', 'Mahjong', `${tileId.replaceAll(':', '_')}.asset`);
    writeJson(tileFilePath, {
      system: createSystem('MahjongTile', tileId, tileFilePath, CARD_ICON),
      data: {
        ...data,
        tileId,
      },
    });
    return {
      tile: createResourceEntry(tileFilePath, 'MahjongTile', tileId),
      count,
    };
  });

  writeJson(rankingFilePath, {
    system: createSystem('MahjongRanking', 'Mahjong_144', rankingFilePath, CARD_ICON),
    data: {
      includeBonusTiles: true,
      expectedTileCount: 144,
    },
  });

  writeJson(deckFilePath, {
    system: {
      ...deckAsset.system,
      assetType: 'MahjongDeck',
      icon: deckAsset.system.icon ?? CARD_ICON,
    },
    data: {
      name: deckName,
      tiles: tileEntries,
      mahjongRankingAsset: createResourceEntry(rankingFilePath, 'MahjongRanking', 'Mahjong_144'),
    },
  });
}

function buildWesternDominoIds(maxPip: number): string[] {
  const tileIds: string[] = [];
  for (let left = 0; left <= maxPip; left++) {
    for (let right = left; right <= maxPip; right++) {
      tileIds.push(`${left}-${right}`);
    }
  }
  return tileIds;
}

function migrateDominoDeck(deckName: string, rankingDisplayName: string, tileIds: string[], options?: { maxPip?: number }): void {
  const deckFilePath = path.resolve(CARD_GAMES_DIR, 'Decks', `${deckName}.asset`);
  const deckAsset = readJson5(deckFilePath);
  const rankingFilePath = path.resolve(CARD_GAMES_DIR, 'CardRanking', `${rankingDisplayName}.asset`);
  const tileEntries = tileIds.map((tileId) => {
    const tileFilePath = path.resolve(CARD_GAMES_DIR, 'Tiles', deckName, `${tileId.replaceAll(':', '_')}.asset`);
    const westernMatch = /^(\d+)-(\d+)$/.exec(tileId);
    writeJson(tileFilePath, {
      system: createSystem('DominoTile', tileId, tileFilePath, CARD_ICON),
      data: westernMatch
        ? {
            pieceKind: 'DominoTile',
            leftPips: Number(westernMatch[1]),
            rightPips: Number(westernMatch[2]),
            tileId,
            imageHash: ZERO_HASH,
          }
        : {
            pieceKind: 'DominoTile',
            tileId,
            imageHash: ZERO_HASH,
          },
    });
    return createResourceEntry(tileFilePath, 'DominoTile', tileId);
  });

  writeJson(rankingFilePath, {
    system: createSystem('DominoRanking', rankingDisplayName, rankingFilePath, CARD_ICON),
    data: typeof options?.maxPip === 'number'
      ? {
          maxPip: options.maxPip,
          expectedTileCount: tileIds.length,
        }
      : {
          expectedTileCount: tileIds.length,
          tileIds,
        },
  });

  writeJson(deckFilePath, {
    system: {
      ...deckAsset.system,
      assetType: 'DominoDeck',
      icon: deckAsset.system.icon ?? CARD_ICON,
    },
    data: {
      name: deckName,
      tileTemplates: tileEntries,
      dominoRankingAsset: createResourceEntry(rankingFilePath, 'DominoRanking', rankingDisplayName),
    },
  });
}

function withDeckLabel(tileIds: string[], label: string): string[] {
  return tileIds.map((tileId) => `${label}:${tileId}`);
}

function buildHanafudaMonths(slotCountByMonth: number[]): Array<{ month: number; slots: Array<{ slot: number; cardId: string }> }> {
  return slotCountByMonth.map((slotCount, index) => ({
    month: index + 1,
    slots: Array.from({ length: slotCount }, (_, slotIndex) => ({
      slot: slotIndex + 1,
      cardId: `${String(index + 1).padStart(2, '0')}-${slotIndex + 1}`,
    })),
  }));
}

function groupForSlot(slot: number): string {
  if (slot === 1) return 'Bright';
  if (slot === 2) return 'Animal';
  if (slot === 3) return 'Ribbon';
  if (slot === 4) return 'Chaff';
  return 'Special';
}

function pointsForSlot(slot: number): number {
  if (slot === 1) return 20;
  if (slot === 2) return 10;
  if (slot === 3) return 5;
  if (slot === 4) return 1;
  return 0;
}

function migrateHanafudaDeck(deckName: string, slotCountByMonth: number[], rankingDisplayName: string): void {
  const deckFilePath = path.resolve(CARD_GAMES_DIR, 'Decks', `${deckName}.asset`);
  const deckAsset = readJson5(deckFilePath);
  const rankingFilePath = path.resolve(CARD_GAMES_DIR, 'CardRanking', `${rankingDisplayName}.asset`);
  const months = buildHanafudaMonths(slotCountByMonth);
  const cardEntries: ResourceEntry[] = [];

  for (const month of months) {
    for (const slot of month.slots) {
      const cardFilePath = path.resolve(CARD_GAMES_DIR, 'Cards', deckName, `${slot.cardId}.asset`);
      writeJson(cardFilePath, {
        system: createSystem('HanafudaCard', slot.cardId, cardFilePath, CARD_ICON),
        data: {
          pieceKind: 'HanafudaCard',
          month: month.month,
          slot: slot.slot,
          group: groupForSlot(slot.slot),
          points: pointsForSlot(slot.slot),
          cardId: slot.cardId,
          imageHash: ZERO_HASH,
        },
      });
      cardEntries.push(createResourceEntry(cardFilePath, 'HanafudaCard', slot.cardId));
    }
  }

  writeJson(rankingFilePath, {
    system: createSystem('HanafudaRanking', rankingDisplayName, rankingFilePath, CARD_ICON),
    data: {
      expectedCardCount: cardEntries.length,
      months,
    },
  });

  writeJson(deckFilePath, {
    system: {
      ...deckAsset.system,
      assetType: 'HanafudaDeck',
      icon: deckAsset.system.icon ?? CARD_ICON,
    },
    data: {
      name: deckName,
      cardTemplates: cardEntries,
      hanafudaRankingAsset: createResourceEntry(rankingFilePath, 'HanafudaRanking', rankingDisplayName),
    },
  });
}

function main(): void {
  migrateDominoDeck('Double-6 Dominoes', 'Domino_Double_6', buildWesternDominoIds(6), { maxPip: 6 });
  migrateDominoDeck('Double-8 Dominoes', 'Domino_Double_8', buildWesternDominoIds(8), { maxPip: 8 });
  migrateDominoDeck('Double-9 Dominoes', 'Domino_Double_9', buildWesternDominoIds(9), { maxPip: 9 });
  migrateDominoDeck('Double-12 Dominoes', 'Domino_Double_12', buildWesternDominoIds(12), { maxPip: 12 });
  migrateDominoDeck(
    'Double-6 + Double-12 Dominoes',
    'Domino_Double_6_Plus_Double_12',
    [
      ...withDeckLabel(buildWesternDominoIds(6), 'double6'),
      ...withDeckLabel(buildWesternDominoIds(12), 'double12'),
    ],
  );
  migrateDominoDeck(
    'Double-9 + Double-12 Dominoes',
    'Domino_Double_9_Plus_Double_12',
    [
      ...withDeckLabel(buildWesternDominoIds(9), 'double9'),
      ...withDeckLabel(buildWesternDominoIds(12), 'double12'),
    ],
  );
  migrateDominoDeck('Chinese domino 32', 'Chinese_domino_32', buildPlayingCardFamily('chinese_domino', 32));
  migrateDominoDeck('Chinese domino 84', 'Chinese_domino_84', buildPlayingCardFamily('chinese_domino', 84));

  migrateMahjongDeck();

  migratePlayingCardDeck('Bai_choi 33', 33);
  migratePlayingCardDeck('Ceki 60', 60);
  migratePlayingCardDeck('To_tom 120', 120);
  migratePlayingCardDeck('Unsun Karuta 75', 75);
  migratePlayingCardDeck('Uta-garuta 200', 200);
  migratePlayingCardDeck('Iroha Karuta 96', 96);
  migratePlayingCardDeck('Komatsufuda 48', 48);

  migrateHanafudaDeck('Hanafuda 48', Array.from({ length: 12 }, () => 4), 'Hanafuda_48');
  migrateHanafudaDeck('Hanafuda 52', [5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4], 'Hanafuda_52');
  migrateHanafudaDeck('Kabufuda 40', [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], 'Kabufuda_40');

  process.stdout.write(
    JSON.stringify(
      {
        migrated: [
          'Double-6 Dominoes',
          'Double-8 Dominoes',
          'Double-9 Dominoes',
          'Double-12 Dominoes',
          'Double-6 + Double-12 Dominoes',
          'Double-9 + Double-12 Dominoes',
          'Chinese domino 32',
          'Chinese domino 84',
          'Mahjong 144',
          'Bai_choi 33',
          'Ceki 60',
          'To_tom 120',
          'Unsun Karuta 75',
          'Uta-garuta 200',
          'Iroha Karuta 96',
          'Komatsufuda 48',
          'Hanafuda 48',
          'Hanafuda 52',
          'Kabufuda 40',
        ],
      },
      null,
      2,
    ) + '\n',
  );
}

main();
