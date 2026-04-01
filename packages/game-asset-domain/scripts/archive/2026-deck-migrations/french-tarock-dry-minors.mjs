#!/usr/bin/env node
/**
 * One-off: Update Tarot 78 (French Tarock) and Tarot 66 decks to reference
 * Standard 52 + Joker(s) for the 52 overlapping minor cards (2-14 per suit).
 * Keeps French Tarock folder DRY: only 4 Knights + 22 trumps.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const ASSET_EDITOR = path.join(ROOT, 'packages/asset-editor');

const STANDARD52_GUIDS = {
  '2_of_spades': '0ae444cf-bd69-fcfa-d8eb-6d0cd3bbcdb5',
  '3_of_spades': '4782029a-2274-eb6b-b8d2-dc36407325ed',
  '4_of_spades': '6908c2b1-c104-f743-dd59-5c2b9b26001d',
  '5_of_spades': '3efd62e4-5bb7-6c59-0b8f-a31068a487ef',
  '6_of_spades': 'af1c9cd3-a58a-3089-1278-5985d118ee67',
  '7_of_spades': '1b01cc47-af95-825f-0d7e-ce2943db0762',
  '8_of_spades': '3a98f9cd-6ec4-a029-bb25-817f79927b7a',
  '9_of_spades': '36d73003-ae1e-9169-4f4e-4f481ca84d4d',
  '10_of_spades': 'd98e8028-75d1-aaab-1ec9-9485d07eb4d9',
  '11_of_spades': '860b1e39-92f0-66fc-05c9-d7b20e55a1a1',
  '12_of_spades': '0f9ab068-98c2-170b-494d-f0d1355b0591',
  '13_of_spades': 'b028d693-cb40-ee66-13e3-a944721b4906',
  '14_of_spades': 'f39249e4-dcbb-6c6f-cec1-d15eb0d56229',
  '2_of_hearts': '24ad80a2-4ac1-c9e1-4f51-1eacef9a5e59',
  '3_of_hearts': 'c15a8d4c-3751-a037-ad3c-2bca537e265e',
  '4_of_hearts': '73691d43-882f-1478-0f4e-5cf896599517',
  '5_of_hearts': 'e3f26ccd-3a20-1965-4266-a1a937d3e4ed',
  '6_of_hearts': 'b25972dc-a79f-d167-b10d-edca3053273a',
  '7_of_hearts': '35f13245-b03e-a6d9-e264-68a58f434fbc',
  '8_of_hearts': '310e4c7d-0dc0-d8b3-bcdd-b8982164116c',
  '9_of_hearts': 'b54a1193-e75d-8a8a-c76b-988c9ef3d61d',
  '10_of_hearts': '0248061a-faa1-ac6a-4ae3-1b244e940a33',
  '11_of_hearts': '97feb0db-312e-1314-3a3e-ecf3a3553bf3',
  '12_of_hearts': '9a4220fc-47ae-674b-cae9-6cb23a24f2b6',
  '13_of_hearts': '2247660e-0e66-f390-1817-eb296594c984',
  '14_of_hearts': 'f89dd623-0f3e-c0ae-d6ec-df7aa2ba759b',
  '2_of_diamonds': 'af23cd51-17cb-18e8-0f03-45bff7324304',
  '3_of_diamonds': 'a51d5395-5b75-9572-54e7-39b7fd7fdb82',
  '4_of_diamonds': '3f9347d3-daf5-f1cd-47b1-29806f014cb9',
  '5_of_diamonds': '4403c60b-3a4f-3760-a52b-af455afd09ff',
  '6_of_diamonds': '8e868c7f-463f-1028-2711-7ce5367a3cf6',
  '7_of_diamonds': '5ef56e05-739d-f274-5279-1e6b38d9cda1',
  '8_of_diamonds': '68f7bdd2-6f9b-3db7-b1d7-6dcfe8d3494e',
  '9_of_diamonds': 'b3cd712a-479e-1def-e062-cf14ff9876f0',
  '10_of_diamonds': 'ab6076ec-ed7a-9fe7-a159-909dab2010db',
  '11_of_diamonds': '7aaf15bd-bfd9-2244-dfeb-17c2e8056bf9',
  '12_of_diamonds': 'fcaa5fa3-f22c-5d60-83ed-745c52507cb8',
  '13_of_diamonds': 'ebeafb79-07f3-855f-5c34-2f977e923fed',
  '14_of_diamonds': '73045b15-f37e-2a04-73ce-264f3760fc24',
  '2_of_clubs': '62400e9e-1203-c94c-ef6b-6815170f2b57',
  '3_of_clubs': '7173d690-70bc-7fa0-1ddc-fccff105dddc',
  '4_of_clubs': '6fc236be-5017-8cef-9b27-6af03d1ce491',
  '5_of_clubs': '1a49f65a-3424-c296-d8f5-2242436d3c92',
  '6_of_clubs': 'ff17436a-10fe-9fdb-b929-01db5d1089ef',
  '7_of_clubs': '2952d3e9-a925-5d4b-c6c4-1f4a5dfec9c2',
  '8_of_clubs': '6bd0848a-76bd-2c6d-4752-3e643c7a2d34',
  '9_of_clubs': 'f7c93ba1-c01d-7bde-a2bc-dae977499dcf',
  '10_of_clubs': '8fef0c93-0972-1440-fdf1-6f437cfdb08d',
  '11_of_clubs': 'cab11669-9ca3-0181-e7bd-4ae6b70f38b0',
  '12_of_clubs': '54180022-0100-000b-bf9f-6b6343df2a15',
  '13_of_clubs': 'f6a18a17-bd75-34cc-7740-a94bb85e0769',
  '14_of_clubs': 'c140a532-c2a0-29e7-b7b8-0cb758b6def9',
};

const STANDARD52_PATH = 'Resources/GameMode/CardGames/Cards/Standard 52 + Joker(s)';
const TAROT78_FOLDERS_TO_DRY = [
  'Resources/GameMode/CardGames/Cards/Tarot 78 (French Tarock)',
];

function isMinorToReplace(displayName) {
  if (!displayName || typeof displayName !== 'string') return false;
  if (displayName.startsWith('tarot_trump_') || displayName === 'tarot_fool') return false;
  if (displayName.startsWith('15_of_')) return false;
  const m = displayName.match(/^(\d+)_of_(spades|hearts|diamonds|clubs)$/);
  return m && parseInt(m[1], 10) >= 2 && parseInt(m[1], 10) <= 14;
}

function updateEntry(entry, useCardTemplate = false) {
  const t = useCardTemplate ? entry?.cardTemplate : entry;
  if (!t || !t.displayName) return false;
  if (!isMinorToReplace(t.displayName)) return false;
  const guid = STANDARD52_GUIDS[t.displayName];
  if (!guid) return false;
  t.path = `${STANDARD52_PATH}/${t.displayName}.asset`;
  t.guid = guid;
  return true;
}

function run() {
  const decks = [
    ['Tarot 78 (French Tarock)', path.join(ASSET_EDITOR, 'Resources/GameMode/CardGames/Decks/Tarot 78 (French Tarock).asset')],
    ['Tarot 66', path.join(ASSET_EDITOR, 'Resources/GameMode/CardGames/Decks/Tarot 66.asset')],
  ];

  for (const [name, p] of decks) {
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    let count = 0;

    if (data.data.cardTemplates?.length) {
      for (const entry of data.data.cardTemplates) {
        if (updateEntry(entry, false)) count++;
      }
    }
    if (data.data.cardComposition?.length) {
      for (const entry of data.data.cardComposition) {
        if (updateEntry(entry, true)) count++;
      }
    }

    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${name}: ${count} minor paths → Standard 52`);
  }

  let totalDeleted = 0;
  for (const folder of TAROT78_FOLDERS_TO_DRY) {
    const toDelete = Object.keys(STANDARD52_GUIDS).map(id =>
      path.join(ASSET_EDITOR, folder, `${id}.asset`)
    );
    let deleted = 0;
    for (const fp of toDelete) {
      if (fs.existsSync(fp)) {
        fs.unlinkSync(fp);
        deleted++;
        totalDeleted++;
      }
    }
    if (deleted > 0) {
      console.log(`Deleted ${deleted} duplicate minor .asset files from ${folder}`);
    }
  }
  if (totalDeleted > 0) {
    console.log(`Total: ${totalDeleted} duplicate minors removed`);
  }
}

run();
