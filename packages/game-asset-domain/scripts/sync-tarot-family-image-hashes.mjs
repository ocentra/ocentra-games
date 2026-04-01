import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import JSON5 from 'json5';

const ROOT = path.resolve('E:/ocentra-games/packages/asset-editor/Resources/GameMode/CardGames');
const IMAGES_DIR = path.join(ROOT, 'Images');
const CARDS_DIR = path.join(ROOT, 'Cards');

function sha256Hex(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJson(filePath) {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function setAssetImageHash(assetPath, imageHash) {
  const asset = readJson(assetPath);
  asset.data.imageHash = imageHash;
  writeJson(assetPath, asset);
}

function syncIndustrieUndGlueckTarot() {
  const imageFolder = path.join(IMAGES_DIR, 'Industrie und Glueck');
  const cardFolder = path.join(CARDS_DIR, 'Tarot 54');

  const mappings = [
    { asset: 'tarot_fool.asset', image: 'IndustrieAndGlueck_Tarot_Fool.png' },
    ...Array.from({ length: 21 }, (_, index) => ({
      asset: `tarot_trump_${index + 1}.asset`,
      image: `IndustrieAndGlueck_Tarot_Trump_${index + 1}.png`,
    })),
  ];

  let updated = 0;
  const failures = [];

  for (const mapping of mappings) {
    const assetPath = path.join(cardFolder, mapping.asset);
    const imagePath = path.join(imageFolder, mapping.image);

    if (!fs.existsSync(assetPath)) {
      failures.push({ asset: mapping.asset, reason: 'missing asset' });
      continue;
    }

    if (!fs.existsSync(imagePath)) {
      failures.push({ image: mapping.image, reason: 'missing image' });
      continue;
    }

    const nextHash = sha256Hex(imagePath);
    const asset = readJson(assetPath);
    if (asset?.data?.imageHash !== nextHash) {
      setAssetImageHash(assetPath, nextHash);
      updated += 1;
    }
  }

  return { updated, failures };
}

function syncCegoTarot() {
  const imageFolder = path.join(IMAGES_DIR, 'Cego');
  const cardFolder = path.join(CARDS_DIR, 'Tarot 54 (Cego)');

  const mappings = [
    { asset: 'tarot_fool.asset', image: 'Cego_Tarot_Tarot_Fool.png' },
    ...Array.from({ length: 21 }, (_, index) => ({
      asset: `tarot_trump_${index + 1}.asset`,
      image: `Cego_Tarot_Tarot_Trump_${index + 1}.png`,
    })),
  ];

  let updated = 0;
  const failures = [];

  for (const mapping of mappings) {
    const assetPath = path.join(cardFolder, mapping.asset);
    const imagePath = path.join(imageFolder, mapping.image);

    if (!fs.existsSync(assetPath)) {
      failures.push({ asset: mapping.asset, reason: 'missing asset' });
      continue;
    }

    if (!fs.existsSync(imagePath)) {
      failures.push({ image: mapping.image, reason: 'missing image' });
      continue;
    }

    const nextHash = sha256Hex(imagePath);
    const asset = readJson(assetPath);
    if (asset?.data?.imageHash !== nextHash) {
      setAssetImageHash(assetPath, nextHash);
      updated += 1;
    }
  }

  return { updated, failures };
}

function main() {
  const industrieUndGlueck = syncIndustrieUndGlueckTarot();
  const cego = syncCegoTarot();
  const result = { industrieUndGlueck, cego };
  console.log(JSON.stringify(result, null, 2));
  if (industrieUndGlueck.failures.length > 0 || cego.failures.length > 0) {
    process.exitCode = 1;
  }
}

main();
