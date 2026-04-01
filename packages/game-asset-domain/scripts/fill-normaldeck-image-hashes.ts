import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSON5 from 'json5';
import { fileURLToPath } from 'url';
import type { Suit } from '@ocentra/game-domain/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CARDS_DIR = path.resolve(__dirname, '../../asset-editor/Resources/GameMode/CardGames/Cards/NormalDeck');
const IMAGES_DIR = path.resolve(__dirname, '../../asset-editor/Resources/GameMode/CardGames/Images');

type CardAsset = {
  system: { assetType: string };
  data: { suit: Suit; rank: number; imageHash: string; cardId: string };
};

function sha256Hex(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function rankToImageStem(rank: number): string {
  if (rank === 11) return 'jack';
  if (rank === 12) return 'queen';
  if (rank === 13) return 'king';
  if (rank === 14) return 'ace';
  return String(rank);
}

function candidateImageFiles(suit: string, rank: number): string[] {
  const stem = rankToImageStem(rank);
  const suitLower = suit.toLowerCase();
  return [
    `${stem}_of_${suitLower}.png`,
    `${stem}_of_${suitLower}.PNG`,
    `${stem[0]?.toUpperCase()}_of_${suitLower}.png`,
    `${stem[0]?.toUpperCase()}_of_${suitLower}.PNG`,
  ];
}

function main(): void {
  if (!fs.existsSync(CARDS_DIR)) {
    process.stderr.write(`NormalDeck cards dir missing: ${CARDS_DIR}\n`);
    process.exit(1);
  }
  if (!fs.existsSync(IMAGES_DIR)) {
    process.stderr.write(`Images dir missing: ${IMAGES_DIR}\n`);
    process.exit(1);
  }

  const files = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.asset'));
  const failures: Array<{ file: string; reason: string }> = [];
  let updated = 0;

  for (const f of files) {
    const abs = path.join(CARDS_DIR, f);
    const raw = fs.readFileSync(abs, 'utf-8');
    const obj = JSON5.parse(raw) as CardAsset;

    if (obj.system.assetType !== 'Card') continue;

    const { suit, rank } = obj.data;
    const candidates = candidateImageFiles(String(suit), rank).map(name => path.join(IMAGES_DIR, name));
    const found = candidates.find(p => fs.existsSync(p));
    if (!found) {
      failures.push({ file: f, reason: `missing image file for ${rank}_of_${suit}` });
      continue;
    }

    const hash = sha256Hex(fs.readFileSync(found));
    if (obj.data.imageHash !== hash) {
      obj.data.imageHash = hash;
      fs.writeFileSync(abs, JSON.stringify(obj, null, 2).replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g, '$1:'));
      updated++;
    }
  }

  process.stdout.write(JSON.stringify({ cardAssets: files.length, updated, failed: failures.length }, null, 2) + '\n');
  if (failures.length > 0) {
    const outPath = path.resolve(process.cwd(), 'fill-normaldeck-image-hashes.failures.json');
    fs.writeFileSync(outPath, JSON.stringify(failures, null, 2));
    process.stderr.write(`Wrote failures to ${outPath}\n`);
    process.exit(1);
  }
}

main();

