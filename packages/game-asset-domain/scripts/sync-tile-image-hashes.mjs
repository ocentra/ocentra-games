import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve('E:/ocentra-games/packages/asset-editor/Resources/GameMode/CardGames');
const TILES_DIR = path.join(ROOT, 'Tiles');
const IMAGES_DIR = path.join(ROOT, 'Images');
const DECKS_DIR = path.join(ROOT, 'Decks');
const CARD_RANKING_DIR = path.join(ROOT, 'CardRanking');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readMeta(metaPath) {
  const source = fs.readFileSync(metaPath, 'utf8');
  const script = new vm.Script(`(${source})`);
  return script.runInNewContext();
}

function imageHashFor(imageFolder, imageName) {
  const metaPath = path.join(imageFolder, `${imageName}.meta`);
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Missing meta file for image ${imageName} in ${imageFolder}`);
  }
  const meta = readMeta(metaPath);
  if (typeof meta.imageHash !== 'string' || meta.imageHash.length === 0) {
    throw new Error(`Missing imageHash in meta ${metaPath}`);
  }
  return meta.imageHash;
}

function setAssetImageHash(assetPath, imageHash) {
  const asset = readJson(assetPath);
  asset.data.imageHash = imageHash;
  writeJson(assetPath, asset);
}

function syncWesternDominoes() {
  const imageFolder = path.join(IMAGES_DIR, 'domino91Tiles');
  const tileFolder = path.join(TILES_DIR, 'Double-12 Dominoes');
  for (const entry of fs.readdirSync(tileFolder)) {
    if (!entry.endsWith('.asset')) continue;
    const tileId = path.basename(entry, '.asset');
    const imageHash = imageHashFor(imageFolder, `${tileId}.png`);
    setAssetImageHash(path.join(tileFolder, entry), imageHash);
  }
}

const CHINESE_FACE_SEQUENCE = [
  '6-6',
  '1-1',
  '4-4',
  '3-1',
  '5-5',
  '3-3',
  '2-2',
  '5-6',
  '4-6',
  '1-6',
  '1-5',
  '6-3',
  '5-4',
  '6-2',
  '5-3',
  '5-2',
  '4-3',
  '4-2',
  '4-1',
  '3-2',
  '2-1',
];

function buildChineseLogicalIds(faceCount, copies) {
  const ids = [];
  for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
    for (let faceIndex = 0; faceIndex < faceCount; faceIndex += 1) {
      const numeric = String(copyIndex * faceCount + faceIndex + 1).padStart(3, '0');
      ids.push(`chinese_domino_${numeric}`);
    }
  }
  return ids;
}

function chineseTileRef(faceIndex) {
  const numeric = String(faceIndex + 1).padStart(3, '0');
  return {
    path: `Resources/GameMode/CardGames/Tiles/Chinese domino 84/chinese_domino_${numeric}.asset`,
    guid: readJson(path.join(TILES_DIR, 'Chinese domino 84', `chinese_domino_${numeric}.asset`)).system.guid,
    assetType: 'DominoTile',
    displayName: `chinese_domino_${numeric}`,
    resourceEntryType: 'AssetResourceEntry',
  };
}

function syncChineseDominoes() {
  const imageFolder = path.join(IMAGES_DIR, 'DominoChinese');
  const tileFolder = path.join(TILES_DIR, 'Chinese domino 84');

  CHINESE_FACE_SEQUENCE.forEach((faceName, faceIndex) => {
    const numeric = String(faceIndex + 1).padStart(3, '0');
    const assetPath = path.join(tileFolder, `chinese_domino_${numeric}.asset`);
    const imageHash = imageHashFor(imageFolder, `${faceName}.png`);
    setAssetImageHash(assetPath, imageHash);
  });

  for (let assetIndex = CHINESE_FACE_SEQUENCE.length + 1; assetIndex <= 84; assetIndex += 1) {
    const numeric = String(assetIndex).padStart(3, '0');
    const assetPath = path.join(tileFolder, `chinese_domino_${numeric}.asset`);
    if (fs.existsSync(assetPath)) {
      fs.unlinkSync(assetPath);
    }
  }

  const deck32Path = path.join(DECKS_DIR, 'Chinese domino 32.asset');
  const deck32 = readJson(deck32Path);
  const logical32 = [
    ...buildChineseLogicalIds(11, 2),
    ...buildChineseLogicalIds(10, 1).map((id, index) => `chinese_domino_${String(23 + index).padStart(3, '0')}`),
  ];
  const faceOrder32 = [
    ...Array.from({ length: 11 }, (_, index) => index),
    ...Array.from({ length: 11 }, (_, index) => index),
    ...Array.from({ length: 10 }, (_, index) => 11 + index),
  ];
  deck32.data.tileTemplates = [];
  deck32.data.tileComposition = faceOrder32.map((faceIndex, index) => ({
    tileTemplate: chineseTileRef(faceIndex),
    copies: 1,
    logicalTileId: logical32[index],
  }));
  writeJson(deck32Path, deck32);

  const ranking32Path = path.join(CARD_RANKING_DIR, 'Chinese_domino_32.asset');
  const ranking32 = readJson(ranking32Path);
  ranking32.data.tileIds = logical32;
  ranking32.data.expectedTileCount = logical32.length;
  writeJson(ranking32Path, ranking32);

  const deck84Path = path.join(DECKS_DIR, 'Chinese domino 84.asset');
  const deck84 = readJson(deck84Path);
  const logical84 = buildChineseLogicalIds(21, 4);
  const faceOrder84 = Array.from({ length: 4 }, () => Array.from({ length: 21 }, (_, index) => index)).flat();
  deck84.data.tileTemplates = [];
  deck84.data.tileComposition = faceOrder84.map((faceIndex, index) => ({
    tileTemplate: chineseTileRef(faceIndex),
    copies: 1,
    logicalTileId: logical84[index],
  }));
  writeJson(deck84Path, deck84);

  const ranking84Path = path.join(CARD_RANKING_DIR, 'Chinese_domino_84.asset');
  const ranking84 = readJson(ranking84Path);
  ranking84.data.tileIds = logical84;
  ranking84.data.expectedTileCount = logical84.length;
  writeJson(ranking84Path, ranking84);
}

const MAHJONG_IMAGE_MAP = {
  Suit_Dots_1: 'Circles1.png',
  Suit_Dots_2: 'Circles2.png',
  Suit_Dots_3: 'Circles3.png',
  Suit_Dots_4: 'Circles4.png',
  Suit_Dots_5: 'Circles5.png',
  Suit_Dots_6: 'Circles6.png',
  Suit_Dots_7: 'Circles7.png',
  Suit_Dots_8: 'Circles8.png',
  Suit_Dots_9: 'Circles9.png',
  Suit_Bamboos_1: 'Bamboo1.png',
  Suit_Bamboos_2: 'Bamboo2.png',
  Suit_Bamboos_3: 'Bamboo3.png',
  Suit_Bamboos_4: 'Bamboo4.png',
  Suit_Bamboos_5: 'Bamboo5.png',
  Suit_Bamboos_6: 'Bamboo6.png',
  Suit_Bamboos_7: 'Bamboo7.png',
  Suit_Bamboos_8: 'Bamboo8.png',
  Suit_Bamboos_9: 'Bamboo9.png',
  Suit_Characters_1: 'Characters1.png',
  Suit_Characters_2: 'Characters2.png',
  Suit_Characters_3: 'Characters3.png',
  Suit_Characters_4: 'Characters4.png',
  Suit_Characters_5: 'Characters5.png',
  Suit_Characters_6: 'Characters6.png',
  Suit_Characters_7: 'Characters7.png',
  Suit_Characters_8: 'Characters8.png',
  Suit_Characters_9: 'Characters9.png',
  Wind_East: 'East.png',
  Wind_South: 'South.png',
  Wind_West: 'West.png',
  Wind_North: 'North.png',
  Dragon_Red: 'RedDragon.png',
  Dragon_Green: 'GreenDragon.png',
  Dragon_White: 'WhiteDragon.png',
  Flower_1: 'PlumBlossom.png',
  Flower_2: 'Orchid.png',
  Flower_3: 'Chrysanthemum.png',
  Flower_4: 'BambooFlower.png',
  Season_1: 'Spring.png',
  Season_2: 'Summer.png',
  Season_3: 'Autumn.png',
  Season_4: 'Winter.png',
};

function syncMahjong() {
  const imageFolder = path.join(IMAGES_DIR, 'Mahjong');
  const tileFolder = path.join(TILES_DIR, 'Mahjong');
  for (const [assetBaseName, imageName] of Object.entries(MAHJONG_IMAGE_MAP)) {
    const assetPath = path.join(tileFolder, `${assetBaseName}.asset`);
    const imageHash = imageHashFor(imageFolder, imageName);
    setAssetImageHash(assetPath, imageHash);
  }
}

syncWesternDominoes();
syncChineseDominoes();
syncMahjong();

