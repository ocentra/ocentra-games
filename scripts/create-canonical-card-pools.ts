/**
 * Creates canonical card pools for non-French deck families (DRY pattern like Standard52).
 * Each family gets one folder with card .asset files; decks reference that folder.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

const CARDS_ROOT = path.join(
  process.cwd(),
  'packages/asset-editor/Resources/GameMode/CardGames/Cards'
);
const IMAGE_HASH_PLACEHOLDER =
  '0000000000000000000000000000000000000000000000000000000000000000';

function familyPrefix(family: string): string {
  return family
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function deterministicUuid(seed: string): string {
  const hash = createHash('sha256').update(NAMESPACE + seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

const FAMILY_CONFIGS: Array<{
  folder: string;
  deckFamily: string;
  rankingPath: string;
  rankingDisplayName: string;
  rankingGuid: string;
}> = [
  {
    folder: 'Hanafuda',
    deckFamily: 'Hanafuda',
    rankingPath: 'Resources/GameMode/CardGames/CardRanking/Hanafuda_Hanafuda.asset',
    rankingDisplayName: 'Hanafuda_Hanafuda',
    rankingGuid: 'fbc4db69-bc23-49eb-83b5-a325b8d56a1f',
  },
  {
    folder: 'Mahjong',
    deckFamily: 'Mahjong',
    rankingPath: 'Resources/GameMode/CardGames/CardRanking/Mahjong_Mahjong.asset',
    rankingDisplayName: 'Mahjong_Mahjong',
    rankingGuid: '84e8ad33-3587-4f28-8fd0-dc02f6db4988',
  },
  {
    folder: 'Chinese Dominoes',
    deckFamily: 'Chinese_domino',
    rankingPath:
      'Resources/GameMode/CardGames/CardRanking/Chinese_domino_Chinese_domino.asset',
    rankingDisplayName: 'Chinese_domino_Chinese_domino',
    rankingGuid: 'a9ef4ecb-5a8c-42ed-ae1d-4f1029b9372a',
  },
  {
    folder: 'Kabufuda',
    deckFamily: 'Kabufuda',
    rankingPath: 'Resources/GameMode/CardGames/CardRanking/Kabufuda_Kabufuda.asset',
    rankingDisplayName: 'Kabufuda_Kabufuda',
    rankingGuid: 'ce22969d-cab4-4e0c-ba11-dd13a097f038',
  },
  {
    folder: 'Whot',
    deckFamily: 'Whot',
    rankingPath: 'Resources/GameMode/CardGames/CardRanking/Whot_Whot.asset',
    rankingDisplayName: 'Whot_Whot',
    rankingGuid: '58683b0c-d1e5-47b7-8076-87c7ad10d5d5',
  },
  {
    folder: 'Okey',
    deckFamily: 'Okey',
    rankingPath: 'Resources/GameMode/CardGames/CardRanking/Okey_Okey.asset',
    rankingDisplayName: 'Okey_Okey',
    rankingGuid: 'fd8cf2ef-66b2-437b-9538-09d120ede695',
  },
  {
    folder: 'Rook',
    deckFamily: 'Rook_colors',
    rankingPath:
      'Resources/GameMode/CardGames/CardRanking/Rook_colors_Rook_1_14.asset',
    rankingDisplayName: 'Rook_colors_Rook_1_14',
    rankingGuid: '1521ad9f-17a4-471c-9a84-b122abbf0d15',
  },
  {
    folder: 'Khorol',
    deckFamily: 'Khorol',
    rankingPath: 'Resources/GameMode/CardGames/CardRanking/Khorol_Khorol.asset',
    rankingDisplayName: 'Khorol_Khorol',
    rankingGuid: '921c7360-888d-438d-ae0c-77655d92cdb2',
  },
  {
    folder: 'Uta-garuta',
    deckFamily: 'Uta_garuta',
    rankingPath:
      'Resources/GameMode/CardGames/CardRanking/Uta_garuta_Uta_garuta.asset',
    rankingDisplayName: 'Uta_garuta_Uta_garuta',
    rankingGuid: '025f0e8b-3f28-42fe-9bfd-fbf500d171f8',
  },
  {
    folder: 'Money-suited',
    deckFamily: 'Money-suited',
    rankingPath:
      'Resources/GameMode/CardGames/CardRanking/Money-suited_Money-suited.asset',
    rankingDisplayName: 'Money-suited_Money-suited',
    rankingGuid: '4e337f44-5260-470c-8b07-300ca5e0b4df',
  },
  {
    folder: 'Ganjifa',
    deckFamily: 'Ganjifa',
    rankingPath: 'Resources/GameMode/CardGames/CardRanking/Ganjifa_Ganjifa.asset',
    rankingDisplayName: 'Ganjifa_Ganjifa',
    rankingGuid: 'b9380747-7e81-4e20-aed4-95232479b729',
  },
  {
    folder: 'Gnav',
    deckFamily: 'Gnav',
    rankingPath:
      'Resources/GameMode/CardGames/CardRanking/Gnav_Gnav_ranks.asset',
    rankingDisplayName: 'Gnav_Gnav_ranks',
    rankingGuid: '3e24df71-beaf-4a7f-973d-261ac223190f',
  },
  {
    folder: 'Cego',
    deckFamily: 'Cego',
    rankingPath: 'Resources/GameMode/CardGames/CardRanking/Cego_Cego_38.asset',
    rankingDisplayName: 'Cego_Cego_38',
    rankingGuid: 'aa209bd5-1ef1-4e53-8a8d-b5f0bfc808fd',
  },
  {
    folder: 'Four Color',
    deckFamily: 'Four_color',
    rankingPath:
      'Resources/GameMode/CardGames/CardRanking/Four_color_Four_color_pieces.asset',
    rankingDisplayName: 'Four_color_Four_color_pieces',
    rankingGuid: 'a8042990-04ec-42b3-8109-9e4dd1fdb4ae',
  },
  {
    folder: 'Xiangqi',
    deckFamily: 'Xiangqi_red_black',
    rankingPath:
      'Resources/GameMode/CardGames/CardRanking/Xiangqi_red_black_Xiangqi_pieces.asset',
    rankingDisplayName: 'Xiangqi_red_black_Xiangqi_pieces',
    rankingGuid: '4f668e57-92eb-497b-9bbe-d4a8c644b804',
  },
  {
    folder: 'Numbered 104',
    deckFamily: 'Numbered_104',
    rankingPath:
      'Resources/GameMode/CardGames/CardRanking/Numbered_104_Numbered_1_104.asset',
    rankingDisplayName: 'Numbered_104_Numbered_1_104',
    rankingGuid: '32d2110f-a7b5-4e3e-8cd9-c96f4a5c864c',
  },
  {
    folder: 'Goita',
    deckFamily: 'Goita',
    rankingPath:
      'Resources/GameMode/CardGames/CardRanking/Goita_Goita_pieces.asset',
    rankingDisplayName: 'Goita_Goita_pieces',
    rankingGuid: '8a914583-3c1f-4c76-abe6-fd52f1444617',
  },
  {
    folder: 'Hols der Geier',
    deckFamily: 'Hols_der_Geier_colors',
    rankingPath:
      'Resources/GameMode/CardGames/CardRanking/Hols_der_Geier_colors_Hols_der_Geier_1_15.asset',
    rankingDisplayName: 'Hols_der_Geier_colors_Hols_der_Geier_1_15',
    rankingGuid: '2c449f73-65e3-4e80-8342-c768f7c5e82a',
  },
  {
    folder: 'Tiddlywink',
    deckFamily: 'Tiddlywink_colors',
    rankingPath:
      'Resources/GameMode/CardGames/CardRanking/Tiddlywink_colors_Tiddlywink_pieces.asset',
    rankingDisplayName: 'Tiddlywink_colors_Tiddlywink_pieces',
    rankingGuid: '889f0c82-745e-49fc-8298-7eb8f6a98475',
  },
];

function createCardAsset(
  config: (typeof FAMILY_CONFIGS)[0],
  cardId: string,
  guid: string
): string {
  const parentPath = `Resources/GameMode/CardGames/Cards/${config.folder}`;
  const treePath = `${parentPath}/${cardId}.asset`;
  return JSON.stringify(
    {
      system: {
        guid,
        assetType: 'Card',
        schemaVersion: 1,
        displayName: cardId,
        category: 'Game',
        icon: '🃏',
        variant: cardId,
        parentPath,
        treePath,
      },
      data: {
        cardIdentity: { family: config.deckFamily, id: cardId },
        imageHash: IMAGE_HASH_PLACEHOLDER,
        cardId,
        cardRankingAsset: {
          path: config.rankingPath,
          displayName: config.rankingDisplayName,
          gameId: null,
          category: 'Game',
          guid: config.rankingGuid,
          assetType: 'CardRanking',
        },
        assetType: 'Card',
      },
    },
    null,
    2
  );
}

function main() {
  for (const config of FAMILY_CONFIGS) {
    const prefix = familyPrefix(config.deckFamily);
    const dir = path.join(CARDS_ROOT, config.folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let count = 0;
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const cardId = `${prefix}_${suit}_${rank}`;
        const guid = deterministicUuid(cardId);
        const content = createCardAsset(config, cardId, guid);
        const filePath = path.join(dir, `${cardId}.asset`);
        fs.writeFileSync(filePath, content, 'utf-8');
        count++;
      }
    }
    console.log(`Created ${count} cards in ${config.folder}`);
  }
  console.log('Done.');
}

main();
