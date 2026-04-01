import fs from 'fs';
import path from 'path';
import JSON5 from 'json5';

const packageDir = 'E:/ocentra-games/packages/game-asset-domain';
const resourcesDir = path.resolve(packageDir, '../asset-editor/Resources/GameMode/CardGames');
const decksDir = path.join(resourcesDir, 'Decks');
const tilesDir = path.join(resourcesDir, 'Tiles');

const canonicalFolder = 'Double-12 Dominoes';
const canonicalTilesDir = path.join(tilesDir, canonicalFolder);
const chineseCanonicalFolder = 'Chinese domino 84';
const chineseCanonicalTilesDir = path.join(tilesDir, chineseCanonicalFolder);

function readJson(filePath) {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function makeResourcePath(...segments) {
  return `Resources/GameMode/CardGames/${segments.join('/')}`;
}

function getCanonicalTileMap() {
  const out = new Map();
  for (const file of fs.readdirSync(canonicalTilesDir).filter((name) => name.endsWith('.asset')).sort()) {
    const fullPath = path.join(canonicalTilesDir, file);
    const json = readJson(fullPath);
    const tileId = String(json?.data?.tileId ?? '');
    if (!tileId) {
      continue;
    }
    out.set(tileId, {
      path: makeResourcePath('Tiles', canonicalFolder, file),
      guid: json.system.guid,
      assetType: 'DominoTile',
      displayName: String(json.system.displayName ?? tileId),
      resourceEntryType: 'AssetResourceEntry',
    });
  }
  return out;
}

function getChineseCanonicalTileMap() {
  const out = new Map();
  for (const file of fs.readdirSync(chineseCanonicalTilesDir).filter((name) => name.endsWith('.asset')).sort()) {
    const fullPath = path.join(chineseCanonicalTilesDir, file);
    const json = readJson(fullPath);
    const tileId = String(json?.data?.tileId ?? '');
    if (!tileId) {
      continue;
    }
    out.set(tileId, {
      path: makeResourcePath('Tiles', chineseCanonicalFolder, file),
      guid: json.system.guid,
      assetType: 'DominoTile',
      displayName: String(json.system.displayName ?? tileId),
      resourceEntryType: 'AssetResourceEntry',
    });
  }
  return out;
}

function generateWesternTileIds(maxPip) {
  const ids = [];
  for (let left = 0; left <= maxPip; left += 1) {
    for (let right = left; right <= maxPip; right += 1) {
      ids.push(`${left}-${right}`);
    }
  }
  return ids;
}

function buildTileComposition(tileIds, canonicalMap, logicalPrefix = null) {
  return tileIds.map((tileId) => {
    const tileTemplate = canonicalMap.get(tileId);
    if (!tileTemplate) {
      throw new Error(`Missing canonical tile for ${tileId}`);
    }
    return {
      tileTemplate,
      copies: 1,
      ...(logicalPrefix ? { logicalTileId: `${logicalPrefix}:${tileId}` } : {}),
    };
  });
}

function updateDeckFile(fileName, tileComposition) {
  const filePath = path.join(decksDir, fileName);
  const json = readJson(filePath);
  json.data.tileTemplates = [];
  json.data.tileComposition = tileComposition;
  writeJson(filePath, json);
}

function removeFolder(folderName) {
  const fullPath = path.join(tilesDir, folderName);
  if (!fs.existsSync(fullPath)) {
    return;
  }
  for (const file of fs.readdirSync(fullPath)) {
    fs.rmSync(path.join(fullPath, file), { force: true });
  }
  fs.rmdirSync(fullPath);
}

function main() {
  const canonicalMap = getCanonicalTileMap();
  const chineseCanonicalMap = getChineseCanonicalTileMap();

  updateDeckFile('Double-6 Dominoes.asset', buildTileComposition(generateWesternTileIds(6), canonicalMap));
  updateDeckFile('Double-8 Dominoes.asset', buildTileComposition(generateWesternTileIds(8), canonicalMap));
  updateDeckFile('Double-9 Dominoes.asset', buildTileComposition(generateWesternTileIds(9), canonicalMap));
  updateDeckFile('Double-12 Dominoes.asset', buildTileComposition(generateWesternTileIds(12), canonicalMap));

  updateDeckFile('Double-6 Dominoes (Khorol).asset', buildTileComposition(generateWesternTileIds(6), canonicalMap));
  updateDeckFile('Double-8 Dominoes (Khorol).asset', buildTileComposition(generateWesternTileIds(8), canonicalMap));
  updateDeckFile('Double-9 Dominoes (Khorol).asset', buildTileComposition(generateWesternTileIds(9), canonicalMap));
  updateDeckFile('Double-12 Dominoes (Khorol).asset', buildTileComposition(generateWesternTileIds(12), canonicalMap));

  updateDeckFile('Double-6 Dominoes (E-awase).asset', buildTileComposition(generateWesternTileIds(6), canonicalMap));
  updateDeckFile('Double-8 Dominoes (E-awase).asset', buildTileComposition(generateWesternTileIds(8), canonicalMap));
  updateDeckFile('Double-9 Dominoes (E-awase).asset', buildTileComposition(generateWesternTileIds(9), canonicalMap));
  updateDeckFile('Double-12 Dominoes (E-awase).asset', buildTileComposition(generateWesternTileIds(12), canonicalMap));

  updateDeckFile(
    'Double-6 + Double-12 Dominoes.asset',
    [
      ...buildTileComposition(generateWesternTileIds(6), canonicalMap, 'double6'),
      ...buildTileComposition(generateWesternTileIds(12), canonicalMap, 'double12'),
    ],
  );

  updateDeckFile(
    'Double-9 + Double-12 Dominoes.asset',
    [
      ...buildTileComposition(generateWesternTileIds(9), canonicalMap, 'double9'),
      ...buildTileComposition(generateWesternTileIds(12), canonicalMap, 'double12'),
    ],
  );

  updateDeckFile(
    'Chinese domino 32.asset',
    buildTileComposition(
      Array.from({ length: 32 }, (_, index) => `chinese_domino_${String(index + 1).padStart(3, '0')}`),
      chineseCanonicalMap,
    ),
  );

  const redundantFolders = [
    'Chinese domino 32',
    'Double-6 Dominoes',
    'Double-8 Dominoes',
    'Double-9 Dominoes',
    'Double-6 Dominoes (Khorol)',
    'Double-8 Dominoes (Khorol)',
    'Double-9 Dominoes (Khorol)',
    'Double-12 Dominoes (Khorol)',
    'Double-6 Dominoes (E-awase)',
    'Double-8 Dominoes (E-awase)',
    'Double-9 Dominoes (E-awase)',
    'Double-12 Dominoes (E-awase)',
    'Double-6 + Double-12 Dominoes',
    'Double-9 + Double-12 Dominoes',
  ];

  for (const folderName of redundantFolders) {
    removeFolder(folderName);
  }
}

main();
