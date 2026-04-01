import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSON5 from 'json5';
import { fileURLToPath } from 'url';

type TileAsset = {
  system: { assetType?: string };
  data: {
    imageHash?: string;
    imagePath?: string;
  };
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_ROOT = path.resolve(__dirname, '../../asset-editor/Resources');
const CARD_GAMES_ROOT = path.join(RESOURCES_ROOT, 'GameMode', 'CardGames');

const args = new Set(process.argv.slice(2));
const write = args.has('--write');

function collectFiles(dir: string, suffix: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, suffix, out);
      continue;
    }
    if (entry.name.endsWith(suffix)) {
      out.push(fullPath);
    }
  }
  return out;
}

function toResourcePath(absPath: string): string {
  return `Resources/${path.relative(RESOURCES_ROOT, absPath).replaceAll(path.sep, '/')}`;
}

function sha256Hex(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function main(): void {
  const tileAssets = collectFiles(path.join(CARD_GAMES_ROOT, 'Tiles'), '.asset');
  const imageFiles = collectFiles(path.join(CARD_GAMES_ROOT, 'Images'), '.png');

  const hashToImages = new Map<string, string[]>();
  for (const imagePath of imageFiles) {
    const hash = sha256Hex(imagePath);
    const list = hashToImages.get(hash) ?? [];
    list.push(imagePath);
    hashToImages.set(hash, list);
  }

  let updated = 0;
  let alreadyValid = 0;
  let unresolved = 0;
  const unresolvedSamples: Array<{ tile: string; reason: string }> = [];

  for (const assetPath of tileAssets) {
    const asset = JSON5.parse(fs.readFileSync(assetPath, 'utf8')) as TileAsset;
    const assetType = asset.system.assetType;
    if (assetType !== 'DominoTile' && assetType !== 'MahjongTile') {
      continue;
    }
    const imageHash = asset.data.imageHash;
    if (!imageHash || typeof imageHash !== 'string') {
      unresolved++;
      if (unresolvedSamples.length < 50) {
        unresolvedSamples.push({ tile: toResourcePath(assetPath), reason: 'missing imageHash' });
      }
      continue;
    }
    const matches = hashToImages.get(imageHash) ?? [];
    if (matches.length !== 1) {
      unresolved++;
      if (unresolvedSamples.length < 50) {
        unresolvedSamples.push({
          tile: toResourcePath(assetPath),
          reason: matches.length === 0 ? 'no image found for hash' : 'multiple images found for hash',
        });
      }
      continue;
    }
    const nextImagePath = toResourcePath(matches[0]);
    if (asset.data.imagePath === nextImagePath) {
      alreadyValid++;
      continue;
    }
    asset.data.imagePath = nextImagePath;
    updated++;
    if (write) {
      fs.writeFileSync(assetPath, `${JSON.stringify(asset, null, 2)}\n`, 'utf8');
    }
  }

  process.stdout.write(
    `${JSON.stringify({ mode: write ? 'write' : 'dry-run', tileAssets: tileAssets.length, updated, alreadyValid, unresolved, unresolvedSamples }, null, 2)}\n`,
  );
  if (unresolved > 0) {
    process.exitCode = 1;
  }
}

main();

