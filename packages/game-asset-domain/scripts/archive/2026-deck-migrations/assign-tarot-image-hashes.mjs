#!/usr/bin/env node
/**
 * Assigns imageHash to Tarot card assets from .meta files.
 * Handles English/French image names vs cardId mismatch.
 * Marseille: uses Images/Tarot Marseille
 * Swiss 1JJ: uses Images/Tarot Marseille for most, Images/Tarrot Swiss for Junon/Jupiter (trump 2/5)
 * French Tarock: uses Images/French Tarock (fool + 21 trumps + 4 knights)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const MARSEILLE_IMAGES = path.join(ROOT, 'packages/asset-editor/Resources/GameMode/CardGames/Images/Tarot Marseille');
const SWISS_IMAGES = path.join(ROOT, 'packages/asset-editor/Resources/GameMode/CardGames/Images/Tarrot Swiss');
const MARSEILLE_CARDS = path.join(ROOT, 'packages/asset-editor/Resources/GameMode/CardGames/Cards/Tarot 78 (Tarot de Marseille)');
const SWISS_CARDS = path.join(ROOT, 'packages/asset-editor/Resources/GameMode/CardGames/Cards/Tarot 78 (Swiss 1JJ)');
const FRENCH_TAROCK_IMAGES = path.join(ROOT, 'packages/asset-editor/Resources/GameMode/CardGames/Images/French Tarock');
const FRENCH_TAROCK_CARDS = path.join(ROOT, 'packages/asset-editor/Resources/GameMode/CardGames/Cards/Tarot 78 (French Tarock)');

const SUITS = ['coins', 'cups', 'swords', 'batons'];
const SUIT_TO_IMAGE = { coins: 'Coins', cups: 'Cups', swords: 'Swords', batons: 'Wands' };
const RANK_TO_IMAGE = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six',
  7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten',
  11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace', 15: 'Knight',
};
const SWORDS_SINGULAR = { 2: true, 14: true };

const TRUMP_TO_IMAGE = {
  tarot_fool: 'The Fool',
  tarot_trump_1: 'The Magician',
  tarot_trump_2: 'The High Priestess',
  tarot_trump_3: 'The Empress',
  tarot_trump_4: 'The Emperor',
  tarot_trump_5: 'The Pope',
  tarot_trump_6: 'The Lovers',
  tarot_trump_7: 'The Chariot',
  tarot_trump_8: 'Justice',
  tarot_trump_9: 'The Hermit',
  tarot_trump_10: 'Wheel of Fortune',
  tarot_trump_11: 'Strength',
  tarot_trump_12: 'The Hanged Man',
  tarot_trump_13: 'Death',
  tarot_trump_14: 'Temperance',
  tarot_trump_15: 'The Devil',
  tarot_trump_16: 'House of God',
  tarot_trump_17: 'The Star',
  tarot_trump_18: 'The Moon',
  tarot_trump_19: 'The Sun',
  tarot_trump_20: 'Judgement',
  tarot_trump_21: 'The World',
};

const SWISS_TRUMP_OVERRIDES = {
  tarot_trump_2: 'Junon',
  tarot_trump_5: 'Jupiter',
};

const FRENCH_TAROCK_IMAGE_MAP = {
  ...TRUMP_TO_IMAGE,
  tarot_trump_16: 'House of Gods',
  '15_of_clubs': 'knight_of_Club',
  '15_of_diamonds': 'knight_of_Diamond',
  '15_of_hearts': 'knight_of_Heart',
  '15_of_spades': 'knight_of_spade',
};

function loadMetaHashes(dir) {
  const out = new Map();
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (!name.toLowerCase().endsWith('.meta')) continue;
    const metaPath = path.join(dir, name);
    try {
      const raw = fs.readFileSync(metaPath, 'utf8');
      const obj = JSON5.parse(raw);
      const hash = obj.imageHash ?? obj.checksum;
      if (typeof hash === 'string' && hash.length > 0) {
        let base = name.replace(/\.meta$/i, '');
        if (base.endsWith('.png')) base = base.slice(0, -4);
        out.set(base, hash);
      }
    } catch (_) {}
  }
  return out;
}

function cardIdToMarseilleImage(cardId) {
  if (TRUMP_TO_IMAGE[cardId]) return TRUMP_TO_IMAGE[cardId];
  const m = cardId.match(/^(\d+)_of_(coins|cups|swords|batons)$/);
  if (!m) return null;
  const rank = parseInt(m[1], 10);
  const suit = m[2];
  const rankName = RANK_TO_IMAGE[rank];
  const suitName = SUIT_TO_IMAGE[suit];
  if (!rankName || !suitName) return null;
  const suitSuffix = suit === 'swords' && SWORDS_SINGULAR[rank] ? 'Sword' : suitName;
  return `${rankName}_of_${suitSuffix}`;
}

function assignHashes(cardsDir, hashMap, overrides = {}) {
  let updated = 0;
  const failures = [];
  for (const name of fs.readdirSync(cardsDir)) {
    if (!name.endsWith('.asset')) continue;
    const cardId = name.replace(/\.asset$/, '');
    const assetPath = path.join(cardsDir, name);
    let imageName = overrides[cardId] ?? cardIdToMarseilleImage(cardId);
    if (!imageName) {
      failures.push({ cardId, reason: 'no mapping' });
      continue;
    }
    const hash = hashMap.get(imageName);
    if (!hash) {
      failures.push({ cardId, imageName, reason: 'image not found' });
      continue;
    }
    try {
      const raw = fs.readFileSync(assetPath, 'utf8');
      const obj = JSON5.parse(raw);
      if (obj.data?.imageHash !== hash) {
        obj.data.imageHash = hash;
        fs.writeFileSync(assetPath, JSON.stringify(obj, null, 2));
        updated++;
      }
    } catch (e) {
      failures.push({ cardId, reason: String(e.message) });
    }
  }
  return { updated, failures };
}

function main() {
  const marseilleHashes = loadMetaHashes(MARSEILLE_IMAGES);
  const swissHashes = loadMetaHashes(SWISS_IMAGES);

  const swissMerged = new Map(marseilleHashes);
  for (const [k, v] of swissHashes) swissMerged.set(k, v);

  const mResult = assignHashes(MARSEILLE_CARDS, marseilleHashes);
  const sResult = assignHashes(SWISS_CARDS, swissMerged, SWISS_TRUMP_OVERRIDES);

  const frenchTarockHashes = loadMetaHashes(FRENCH_TAROCK_IMAGES);
  const ftResult = assignHashes(FRENCH_TAROCK_CARDS, frenchTarockHashes, FRENCH_TAROCK_IMAGE_MAP);

  const out = {
    marseille: { updated: mResult.updated, failures: mResult.failures },
    swiss: { updated: sResult.updated, failures: sResult.failures },
    frenchTarock: { updated: ftResult.updated, failures: ftResult.failures },
  };
  console.log(JSON.stringify(out, null, 2));
  if (mResult.failures.length || sResult.failures.length || ftResult.failures.length) {
    process.exitCode = 1;
  }
}

main();
