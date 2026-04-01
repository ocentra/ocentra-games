#!/usr/bin/env node
/**
 * One-off: Update Swiss 1JJ deck to reference Marseille for 76 cards.
 * Keeps only tarot_trump_2 (Junon) and tarot_trump_5 (Jupiter) in Swiss 1JJ folder.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const ASSET_EDITOR = path.join(ROOT, 'packages/asset-editor');
const SWISS_KEEP = new Set(['tarot_trump_2', 'tarot_trump_5']);
const MARSEILLE_PATH = 'Resources/GameMode/CardGames/Cards/Tarot 78 (Tarot de Marseille)';

const MARSEILLE_GUIDS = {
  tarot_trump_1: 'e8f584c6-d603-c32d-9f73-b6a87cd5f87d',
  tarot_trump_3: '8d0983a9-4dba-1a61-d267-9599bc07b1e7',
  tarot_trump_4: 'df4fa16e-8235-ad45-5226-957e9aa11975',
  tarot_trump_6: 'f423b583-2316-a34a-cf82-4e35cb44f115',
  tarot_trump_7: '21a56d68-2d06-c5f3-2b51-5fb966cc76d8',
  tarot_trump_8: '38745b68-0c6b-a1ba-3ae0-7cef87221096',
  tarot_trump_9: '6dc9ac23-a0bb-75cd-5767-a436c749599c',
  tarot_trump_10: '9f5e9d32-6065-4c94-9b17-cab46681e146',
  tarot_trump_11: '7e3d2152-1097-a3ad-dcc8-37aff4c6ff17',
  tarot_trump_12: 'fea2fb98-acd5-ce6f-5362-ec5a56ebcb66',
  tarot_trump_13: '41265777-8430-f9ef-24bb-6707cf0e59e4',
  tarot_trump_14: '2c7655de-6100-ce1d-d990-1ce71b12c4c4',
  tarot_trump_15: '3184d423-ad3e-2e57-5603-94644a28fafd',
  tarot_trump_16: '5cf1d34f-fd01-7423-c47d-20e9b7a7bac6',
  tarot_trump_17: '547a7abc-f7a6-011d-9940-e7c66537d118',
  tarot_trump_18: '6cf5acb8-99fa-5997-478b-51228d10b256',
  tarot_trump_19: '3c171c56-5e03-f976-84fa-8ea2a96bf35f',
  tarot_trump_20: 'c55d6ca8-3929-209c-6c5e-33e047e802be',
  tarot_trump_21: 'd2282b35-258e-cdca-76e0-009a6cc464f3',
  tarot_fool: '92018ae2-fd1c-bac5-a88f-cf97c1df4d64',
  '13_of_swords': 'ecdef672-1d17-da74-add9-08c084671352',
  '12_of_swords': '12d6cb5b-ac0f-40b0-027b-7138284390b4',
  '15_of_swords': 'bb892972-b0f1-1733-ec5d-84815d45d576',
  '11_of_swords': '62d8d5e7-d97c-a59a-bae3-24dad304a7bb',
  '10_of_swords': '08d84587-aa9a-03c7-20cb-d1a8047828ce',
  '9_of_swords': '54efd7f3-9fc6-0581-3df5-5488df63acc4',
  '8_of_swords': '92e9b02d-8c06-ad06-fa47-9d9535d84300',
  '7_of_swords': '71526d95-399f-6e59-e67c-6f0d811db208',
  '6_of_swords': '6cc250af-48e3-ee42-d75a-a2a569faffd1',
  '5_of_swords': 'f27d3c31-a378-1a5e-c3bf-d52f7ed52458',
  '4_of_swords': '570d79cc-f63e-ebc9-7a88-2188e1cdb003',
  '3_of_swords': '0c7a74c0-a7f4-beae-db50-71f709f15226',
  '2_of_swords': '2fda85d4-c054-2223-d946-30f78a92751a',
  '14_of_swords': 'c014dfd7-16d0-443e-ddf2-58c52a49de77',
  '13_of_batons': 'ca95546e-4614-72d6-4348-412d0f2dc298',
  '12_of_batons': '5d0f5a33-feeb-ffbc-8032-aa38fe63f8ea',
  '15_of_batons': '743c796d-eecd-b9c4-8259-7b488c9074da',
  '11_of_batons': '7d428a43-ec49-5650-43b8-90280d34775d',
  '10_of_batons': '62d9c7b2-edbd-483e-a5ef-d09a55961f14',
  '9_of_batons': '0bb6dd6b-2dbb-4079-5e01-e75bd06ce1dd',
  '8_of_batons': 'bd35a9c5-f0c7-5960-620a-02427589b9df',
  '7_of_batons': '3dc36021-be8a-a55d-ac5e-6da911585052',
  '6_of_batons': '55f57ebb-40aa-8fe5-8e1f-4f1957dfc4c4',
  '5_of_batons': 'df08a9db-0e38-9c8b-fdf0-e40ff1ae61e3',
  '4_of_batons': '687eba17-ab70-b4dd-8664-46fd41b9faac',
  '3_of_batons': '2bba30ee-5454-4bec-cf6a-f972bc5c10e1',
  '2_of_batons': 'c8bcd8b5-2174-be83-c1af-d4ab25788890',
  '14_of_batons': '435a5a3a-1bc6-d1ba-bf8e-da243b51d5a7',
  '13_of_cups': '71753375-d4fa-d6e0-8d9e-8e4d09c4f401',
  '12_of_cups': '18ee1e5e-5eec-16d7-325c-ca56d1f412d9',
  '15_of_cups': '7bdbfac6-9bdb-f9fe-3347-9e058cb0c584',
  '11_of_cups': '9eb6cf38-9726-36ba-47bb-f9a791482c06',
  '14_of_cups': 'ee0ed52d-e3ee-fdc0-1b88-3cf21ec35779',
  '2_of_cups': 'f6375285-4cdb-0cae-f00b-2b6dfd590ca9',
  '3_of_cups': '8a01d384-d494-63a3-f0c1-7dbf3dfae5ed',
  '4_of_cups': '57f7579a-7e66-db4f-6328-3d1c480a3d8f',
  '5_of_cups': '5a317c02-9b85-b92b-b616-0f57cc40003b',
  '6_of_cups': 'c6b9cb4d-804d-affa-ceee-b197709a4fad',
  '7_of_cups': 'eb274620-5943-4b0b-868e-cc119f2c2bab',
  '8_of_cups': '10da3602-1a52-cdd2-67f2-1d96422e28c8',
  '9_of_cups': '984c5d8e-adc3-e3f9-f00a-3dcc1c4f050e',
  '10_of_cups': 'fa374745-3231-31f4-c0e1-256670ededeb',
  '13_of_coins': '5818a687-030c-b754-8d95-b0d8784402eb',
  '12_of_coins': '2238ae51-c311-38ca-3567-f22c707312d1',
  '15_of_coins': '2161a01b-769a-3467-c2c9-05cba32717f4',
  '11_of_coins': '365b6b64-ed5d-ebd6-3aea-6dec3d99b84a',
  '14_of_coins': '15359d67-5839-925c-56a9-b85a20b5e4d9',
  '2_of_coins': 'ca642e5e-294f-3a7a-df51-3e34f9a0cb1f',
  '3_of_coins': '822834a1-7499-4b51-db9a-d7cbc21d5df7',
  '4_of_coins': '6f33a08d-ebe2-bbb0-e98f-9c049b3f6492',
  '5_of_coins': '32f517fa-ea89-dfc3-72fb-7d40bf206801',
  '6_of_coins': '065500db-9ea7-3235-1624-d9115635f156',
  '7_of_coins': 'dbe736ee-4d04-27f1-4ea9-3df7cf8c6a30',
  '8_of_coins': 'eac6b360-fe7e-f579-769c-cc657b622290',
  '9_of_coins': '76fe0aea-51d6-3bdf-daf9-af1324bb2c34',
  '10_of_coins': '8f33c019-f961-4d8b-386f-7202c250ae7c',
};

const SWISS_1JJ_PATH = 'Resources/GameMode/CardGames/Cards/Tarot 78 (Swiss 1JJ)';
const SWISS_TRUMP_2_GUID = 'ef6988e1-07f0-be84-b034-83ad0c7af5a4';
const SWISS_TRUMP_5_GUID = '83776900-2824-d3f0-d22d-3885f6b48541';

function updateDeckToMarseille(filePath, useCardTemplate = false) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const entries = useCardTemplate ? (data.data?.cardComposition ?? []) : (data.data?.cardTemplates ?? []);
  let count = 0;
  for (const entry of entries) {
    const t = useCardTemplate ? entry?.cardTemplate : entry;
    if (!t?.displayName) continue;
    if (SWISS_KEEP.has(t.displayName)) {
      if (!t.path.includes(SWISS_1JJ_PATH)) {
        t.path = `${SWISS_1JJ_PATH}/${t.displayName}.asset`;
        t.guid = t.displayName === 'tarot_trump_2' ? SWISS_TRUMP_2_GUID : SWISS_TRUMP_5_GUID;
        count++;
      }
      continue;
    }
    const guid = MARSEILLE_GUIDS[t.displayName];
    if (!guid) continue;
    t.path = `${MARSEILLE_PATH}/${t.displayName}.asset`;
    t.guid = guid;
    count++;
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return count;
}

function run() {
  const swissDeckPath = path.join(ASSET_EDITOR, 'Resources/GameMode/CardGames/Decks/Tarot 78 (Swiss 1JJ).asset');
  const tarot62Path = path.join(ASSET_EDITOR, 'Resources/GameMode/CardGames/Decks/Tarot 62.asset');
  const swissFolder = path.join(ASSET_EDITOR, 'Resources/GameMode/CardGames/Cards/Tarot 78 (Swiss 1JJ)');

  const data = JSON.parse(fs.readFileSync(swissDeckPath, 'utf8'));
  let updated = 0;
  for (const entry of data.data.cardTemplates) {
    const dn = entry.displayName;
    if (!dn || SWISS_KEEP.has(dn)) continue;
    const guid = MARSEILLE_GUIDS[dn];
    if (!guid) {
      console.warn(`No Marseille GUID for ${dn}`);
      continue;
    }
    entry.path = `${MARSEILLE_PATH}/${dn}.asset`;
    entry.guid = guid;
    updated++;
  }
  fs.writeFileSync(swissDeckPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Tarot 78 (Swiss 1JJ): ${updated} card refs → Marseille (2 kept in Swiss 1JJ)`);

  const c62 = updateDeckToMarseille(tarot62Path, true);
  console.log(`Tarot 62: ${c62} card refs updated (Marseille + Swiss 1JJ trump 2/5)`);

  const files = fs.readdirSync(swissFolder);
  let deleted = 0;
  for (const f of files) {
    if (!f.endsWith('.asset')) continue;
    const base = f.replace(/\.asset$/, '');
    if (SWISS_KEEP.has(base)) continue;
    fs.unlinkSync(path.join(swissFolder, f));
    deleted++;
  }
  console.log(`Deleted ${deleted} duplicate .asset files from Swiss 1JJ folder`);
  console.log(`Kept: tarot_trump_2 (Junon), tarot_trump_5 (Jupiter)`);
}

run();
