import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSON5 from 'json5';
import { fileURLToPath } from 'url';

type CardAsset = {
  system: { assetType?: string };
  data: {
    cardId?: string;
    imageHash?: string;
    imagePath?: string;
  };
};

type DeckAsset = {
  system: { assetType?: string };
  data: {
    imageSourceFolderPath?: string;
    cardTemplates?: Array<{ path?: string }>;
    cardComposition?: Array<{ cardTemplate?: { path?: string } }>;
  };
};

type CandidateContext = {
  cardId: string;
  relCardPath: string;
  sources: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_ROOT = path.resolve(__dirname, '../../asset-editor/Resources');
const CARD_GAMES_ROOT = path.join(RESOURCES_ROOT, 'GameMode', 'CardGames');
const ZERO_HASH = '0'.repeat(64);

const args = new Set(process.argv.slice(2));
const write = args.has('--write');

function readJson5<T>(filePath: string): T {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function toResourcePath(absPath: string): string {
  return `Resources/${path.relative(RESOURCES_ROOT, absPath).replaceAll(path.sep, '/')}`;
}

function toAbsResourcePath(resourcePath: string): string {
  return path.join(RESOURCES_ROOT, resourcePath.replace(/^Resources\//, '').replaceAll('/', path.sep));
}

function sha256Hex(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

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

function cardIdToTarotStem(cardId: string): string | null {
  const trumpMap: Record<string, string> = {
    tarot_fool: 'The_Fool',
    tarot_trump_1: 'The_Magician',
    tarot_trump_2: 'The_High_Priestess',
    tarot_trump_3: 'The_Empress',
    tarot_trump_4: 'The_Emperor',
    tarot_trump_5: 'The_Pope',
    tarot_trump_6: 'The_Lovers',
    tarot_trump_7: 'The_Chariot',
    tarot_trump_8: 'Justice',
    tarot_trump_9: 'The_Hermit',
    tarot_trump_10: 'Wheel_of_Fortune',
    tarot_trump_11: 'Strength',
    tarot_trump_12: 'The_Hanged_Man',
    tarot_trump_13: 'Death',
    tarot_trump_14: 'Temperance',
    tarot_trump_15: 'The_Devil',
    tarot_trump_16: 'House_of_God',
    tarot_trump_17: 'The_Star',
    tarot_trump_18: 'The_Moon',
    tarot_trump_19: 'The_Sun',
    tarot_trump_20: 'Judgement',
    tarot_trump_21: 'The_World',
  };
  if (trumpMap[cardId]) {
    return trumpMap[cardId];
  }
  const m = cardId.match(/^(\d+)_of_(coins|cups|swords|batons)$/);
  if (!m) {
    return null;
  }
  const rank = Number(m[1]);
  const suit = m[2];
  const rankMap: Record<number, string> = {
    2: 'Two',
    3: 'Three',
    4: 'Four',
    5: 'Five',
    6: 'Six',
    7: 'Seven',
    8: 'Eight',
    9: 'Nine',
    10: 'Ten',
    11: 'Jack',
    12: 'Queen',
    13: 'King',
    14: 'Ace',
    15: 'Knight',
  };
  const suitMap: Record<string, string> = {
    coins: 'Coins',
    cups: 'Cups',
    swords: rank === 2 || rank === 14 ? 'Sword' : 'Swords',
    batons: 'Wands',
  };
  if (!rankMap[rank] || !suitMap[suit]) {
    return null;
  }
  return `${rankMap[rank]}_of_${suitMap[suit]}`;
}

function tarotTrumpBase(cardId: string): string | null {
  const stem = cardIdToTarotStem(cardId);
  if (!stem) {
    return null;
  }
  return stem;
}

function cardIdToFrenchTarockFile(cardId: string): string | null {
  const trump = tarotTrumpBase(cardId);
  if (trump) {
    if (cardId === 'tarot_trump_16') {
      return 'French_Tarock_House_of_Gods.png';
    }
    return `French_Tarock_${trump}.png`;
  }
  const knight = cardId.match(/^15_of_(clubs|diamonds|hearts|spades)$/);
  if (knight) {
    const suitMap: Record<string, string> = {
      clubs: 'Club',
      diamonds: 'Diamond',
      hearts: 'Heart',
      spades: 'spade',
    };
    return `French_Tarock_knight_of_${suitMap[knight[1]]}.png`;
  }
  return null;
}

function cardIdToSwissTarotFile(cardId: string): string | null {
  if (cardId === 'tarot_trump_2') {
    return 'Tarot_Swiss_Junon.png';
  }
  if (cardId === 'tarot_trump_5') {
    return 'Tarot_Swiss_Jupiter.png';
  }
  return null;
}

function cardIdToCegoFile(cardId: string): string | null {
  if (cardId === 'cego_gsties') {
    return 'Cego_Tarot_Tarot_Fool.png';
  }
  const trump = cardId.match(/^cego_trump_(\d+)$/);
  if (trump) {
    return `Cego_Tarot_Tarot_Trump_${trump[1]}.png`;
  }
  return null;
}

function cardIdToCegoReuseFiles(cardId: string): string[] {
  const court = cardId.match(/^cego_(clubs|diamonds|hearts|spades)_(king|queen|cavalier|jack)$/);
  if (!court) {
    return [];
  }
  const suit = court[1];
  const rank = court[2];
  const standardRankMap: Record<string, string> = {
    king: 'king',
    queen: 'queen',
    jack: 'jack',
  };
  if (standardRankMap[rank]) {
    return [`Resources/GameMode/CardGames/Images/standard/${standardRankMap[rank]}_of_${suit}.png`];
  }
  const knightSuitMap: Record<string, string> = {
    clubs: 'Club',
    diamonds: 'Diamond',
    hearts: 'Heart',
    spades: 'spade',
  };
  return [`Resources/GameMode/CardGames/Images/French_Tarock/French_Tarock_knight_of_${knightSuitMap[suit]}.png`];
}

function cardIdToStandardFile(cardId: string): string | null {
  const face = cardId.match(/^(11|12|13|14)_of_(clubs|diamonds|hearts|spades)$/);
  if (face) {
    const rankMap: Record<string, string> = {
      '11': 'jack',
      '12': 'queen',
      '13': 'king',
      '14': 'ace',
    };
    return `${rankMap[face[1]]}_of_${face[2]}.png`;
  }
  if (cardId === 'joker_1') {
    return 'jokers_of_colour.png';
  }
  if (cardId === 'joker_2') {
    return 'jokers_of_nocolour.png';
  }
  return null;
}

function cardIdToStrippedTrumpStandardFile(cardId: string): string | null {
  const m = cardId.match(/^(\d+)_of_trumps$/);
  if (!m) {
    return null;
  }
  const rank = Number(m[1]);
  if (rank >= 8 && rank <= 10) {
    return `${rank}_of_spades.png`;
  }
  const faceMap: Record<number, string> = {
    11: 'jack_of_spades.png',
    12: 'queen_of_spades.png',
    13: 'king_of_spades.png',
    14: 'ace_of_spades.png',
  };
  return faceMap[rank] ?? null;
}

function cardIdToTaroccoPiemonteseFile(cardId: string): string | null {
  const trumpMap: Record<string, string> = {
    tarot_fool: 'The_Fool',
    tarot_trump_1: 'The_Magician',
    tarot_trump_2: 'The_Popess',
    tarot_trump_3: 'The_Empress',
    tarot_trump_4: 'The_Emperor',
    tarot_trump_5: 'The_Pope',
    tarot_trump_6: 'The_Lovers',
    tarot_trump_7: 'The_Chariot',
    tarot_trump_8: 'Justice',
    tarot_trump_9: 'The_Hermit',
    tarot_trump_10: 'Wheel_of_Fortune',
    tarot_trump_11: 'Strength',
    tarot_trump_12: 'The_Hanged_Man',
    tarot_trump_13: 'Death',
    tarot_trump_14: 'Temperance',
    tarot_trump_15: 'The_Devil',
    tarot_trump_16: 'House_of_God',
    tarot_trump_17: 'The_Star',
    tarot_trump_18: 'The_Moon',
    tarot_trump_19: 'The_Sun',
    tarot_trump_20: 'The_Angel',
    tarot_trump_21: 'The_World',
  };
  if (trumpMap[cardId]) {
    return `Tarocco_Piemontese_${trumpMap[cardId]}.png`;
  }
  const m = cardId.match(/^(\d+)_of_(coins|cups|swords|batons)$/);
  if (!m) {
    return null;
  }
  const rank = Number(m[1]);
  const suit = m[2];
  const rankMap: Record<number, string> = {
    1: 'Ace',
    2: 'Two',
    3: 'Three',
    4: 'Four',
    5: 'Five',
    6: 'Six',
    7: 'Seven',
    8: 'Eight',
    9: 'Nine',
    10: 'Ten',
    11: 'Jack',
    12: 'Queen',
    13: 'King',
    14: 'Ace',
    15: 'Knight',
  };
  const suitMap: Record<string, string> = {
    coins: 'Coins',
    cups: 'Cups',
    swords: rank === 1 || rank === 2 ? 'Sword' : 'Swords',
    batons: 'Wands',
  };
  if (!rankMap[rank] || !suitMap[suit]) {
    return null;
  }
  return `Tarocco_Piemontese_${rankMap[rank]}_of_${suitMap[suit]}.png`;
}

function cardIdToTaroccoSicilianoFile(cardId: string): string | null {
  if (cardId === 'italian_fuggitivo') {
    return 'Tarocco_Sicilian_Fool.png';
  }
  if (cardId === 'italian_miseria') {
    return 'Tarocco_Sicilian_Miseria.png';
  }
  const trump = cardId.match(/^italian_trump_(\d+)$/);
  if (trump) {
    return `Tarocco_Sicilian_Trump_${trump[1]}.png`;
  }
  const suit = cardId.match(/^italian_(bastoni|coppe|denari|spade)_(ace|2|3|4|5|6|7|8|9|10|jack|maid|horse|king)$/);
  if (!suit) {
    return null;
  }
  const suitMap: Record<string, string> = {
    bastoni: 'Wands',
    coppe: 'Cups',
    denari: 'Coins',
    spade: 'Swords',
  };
  const rankMap: Record<string, string> = {
    ace: 'Ace',
    '2': 'Two',
    '3': 'Three',
    '4': 'Four',
    '5': 'Five',
    '6': 'Six',
    '7': 'Seven',
    '8': 'Eight',
    '9': 'Nine',
    '10': 'Ten',
    jack: 'Jack',
    maid: 'Maid',
    horse: 'Knight',
    king: 'King',
  };
  const suitName = suit[1] === 'spade' && (suit[2] === '2' || suit[2] === 'ace') ? 'Sword' : suitMap[suit[1]];
  return `Tarocco_Sicilian_${rankMap[suit[2]]}_of_${suitName}.png`;
}

function cardIdToTaroccoBologneseFile(cardId: string): string | null {
  if (cardId === 'italian_matto') {
    return 'Tarocco_Bolognese_Matto.png';
  }
  const trump = cardId.match(/^italian_trump_(\d+)$/);
  if (trump) {
    const map: Record<string, string> = {
      '0': 'Begato_0',
      '1': 'Moretti_1',
      '2': 'Moretti_2',
      '3': 'Moretti_3',
      '4': 'Moretti_4',
      '5': 'Amore_5',
      '6': 'Carro_6',
      '7': 'Tempra_7',
      '8': 'Giusta_8',
      '9': 'Forza_9',
      '10': 'Roda_10',
      '11': 'Vecchio_11',
      '12': 'Traditore_12',
      '13': 'Morte_13',
      '14': 'Diavolo_14',
      '15': 'Saetta_Torre_15',
      '16': 'Stella_16',
      '17': 'Luna_17',
      '18': 'Sole_18',
      '19': 'Mondo_19',
      '20': 'Angelo_20',
    };
    return map[trump[1]] ? `Tarocco_Bolognese_${map[trump[1]]}.png` : null;
  }
  const suit = cardId.match(/^italian_(bastoni|coppe|denari|spade)_(\d+|king|queen|cavalier|jack)$/);
  if (!suit) {
    return null;
  }
  const suitMap: Record<string, string> = {
    bastoni: 'Bastoni',
    coppe: 'Coppe',
    denari: 'Denari',
    spade: 'Spade',
  };
  const rankMap: Record<string, string> = {
    jack: 'Knave',
    queen: 'Queen',
    king: 'King',
    cavalier: 'Cavalier',
  };
  const normalizedRank = rankMap[suit[2]] ?? suit[2];
  return `Tarocco_Bolognese_${suitMap[suit[1]]}_${normalizedRank}.png`;
}

function cardIdToItalianBologneseReuseFile(cardId: string): string | null {
  const suit = cardId.match(/^italian_(bastoni|coppe|denari|spade)_(\d+|ace|king|queen|cavalier|jack)$/);
  if (!suit) {
    return null;
  }
  const suitMap: Record<string, string> = {
    bastoni: 'Bastoni',
    coppe: 'Coppe',
    denari: 'Denari',
    spade: 'Spade',
  };
  const rankMap: Record<string, string> = {
    ace: '1',
    '14': '1',
    king: 'King',
    '13': 'King',
    queen: 'Queen',
    '12': 'Queen',
    cavalier: 'Cavalier',
    jack: 'Knave',
    '11': 'Knave',
  };
  const normalizedRank = rankMap[suit[2]] ?? suit[2];
  return `Tarocco_Bolognese_${suitMap[suit[1]]}_${normalizedRank}.png`;
}

function sourceFolderFromCardPath(relCardPath: string): string[] {
  const out: string[] = [];
  if (relCardPath.includes('/Cards/Tarot_78_(French_Tarock)/')) {
    out.push('Resources/GameMode/CardGames/Images/French_Tarock');
  }
  if (relCardPath.includes('/Cards/Tarot_78_(Swiss_1JJ)/')) {
    out.push('Resources/GameMode/CardGames/Images/Tarot_Swiss');
  }
  if (relCardPath.includes('/Cards/Cego_38/')) {
    out.push('Resources/GameMode/CardGames/Images/Cego');
  }
  if (relCardPath.includes('/Cards/Tarocco_Bolognese_62/')) {
    out.push('Resources/GameMode/CardGames/Images/Tarocco_Bolognese');
  }
  if (
    relCardPath.includes('/Cards/Standard_52_+_Joker(s)_(Italian)/') ||
    relCardPath.includes('/Cards/Standard_52_+_Joker(s) (Italian)/')
  ) {
    out.push('Resources/GameMode/CardGames/Images/Tarocco_Bolognese');
  }
  return out;
}

function buildImageIndexes(imageFiles: string[]): {
  byBasename: Map<string, string[]>;
  byHash: Map<string, string[]>;
} {
  const byBasename = new Map<string, string[]>();
  const byHash = new Map<string, string[]>();
  for (const filePath of imageFiles) {
    const base = path.basename(filePath).toLowerCase();
    const list = byBasename.get(base) ?? [];
    list.push(filePath);
    byBasename.set(base, list);
    const hash = sha256Hex(filePath);
    const hashList = byHash.get(hash) ?? [];
    hashList.push(filePath);
    byHash.set(hash, hashList);
  }
  return { byBasename, byHash };
}

function candidateImagePaths(ctx: CandidateContext): string[] {
  const candidates: string[] = [];
  const allSources = [...ctx.sources, ...sourceFolderFromCardPath(ctx.relCardPath)];
  const uniqueSources = Array.from(new Set(allSources.filter(s => s.startsWith('Resources/'))));
  for (const source of uniqueSources) {
    candidates.push(`${source}/${ctx.cardId}.png`);
    const stem = cardIdToTarotStem(ctx.cardId);
    if (stem) {
      candidates.push(`${source}/${stem}.png`);
      const folderBase = source.split('/').at(-1) ?? '';
      candidates.push(`${source}/${folderBase}_${stem}.png`);
    }
    const frenchTarock = cardIdToFrenchTarockFile(ctx.cardId);
    if (frenchTarock) {
      candidates.push(`${source}/${frenchTarock}`);
      candidates.push(`Resources/GameMode/CardGames/Images/French_Tarock/${frenchTarock}`);
    }
    const swiss = cardIdToSwissTarotFile(ctx.cardId);
    if (swiss) {
      candidates.push(`${source}/${swiss}`);
      candidates.push(`Resources/GameMode/CardGames/Images/Tarot_Swiss/${swiss}`);
    }
    const cego = cardIdToCegoFile(ctx.cardId);
    if (cego) {
      candidates.push(`${source}/${cego}`);
      candidates.push(`Resources/GameMode/CardGames/Images/Cego/${cego}`);
    }
    candidates.push(...cardIdToCegoReuseFiles(ctx.cardId));
    const bolognese = cardIdToTaroccoBologneseFile(ctx.cardId);
    if (bolognese) {
      candidates.push(`${source}/${bolognese}`);
      candidates.push(`Resources/GameMode/CardGames/Images/Tarocco_Bolognese/${bolognese}`);
    }
    const italianBolognese = cardIdToItalianBologneseReuseFile(ctx.cardId);
    if (italianBolognese) {
      candidates.push(`${source}/${italianBolognese}`);
      candidates.push(`Resources/GameMode/CardGames/Images/Tarocco_Bolognese/${italianBolognese}`);
    }
    const piemontese = cardIdToTaroccoPiemonteseFile(ctx.cardId);
    if (piemontese) {
      candidates.push(`${source}/${piemontese}`);
      candidates.push(`Resources/GameMode/CardGames/Images/Tarocco_Piemontese/${piemontese}`);
    }
    const siciliano = cardIdToTaroccoSicilianoFile(ctx.cardId);
    if (siciliano) {
      candidates.push(`${source}/${siciliano}`);
      candidates.push(`Resources/GameMode/CardGames/Images/Tarocco_Siciliano/${siciliano}`);
    }
    const strippedTrump = cardIdToStrippedTrumpStandardFile(ctx.cardId);
    if (strippedTrump) {
      candidates.push(`${source}/${strippedTrump}`);
      candidates.push(`Resources/GameMode/CardGames/Images/standard/${strippedTrump}`);
    }
    const standard = cardIdToStandardFile(ctx.cardId);
    if (standard) {
      candidates.push(`${source}/${standard}`);
      candidates.push(`Resources/GameMode/CardGames/Images/standard/${standard}`);
    }
    if (source === 'Resources/GameMode/CardGames/Images') {
      candidates.push(`Resources/GameMode/CardGames/Images/Tarot_Marseille/Tarot_Marseille_${ctx.cardId}.png`);
      candidates.push(`Resources/GameMode/CardGames/Images/French_Tarock/French_Tarock_${ctx.cardId}.png`);
      candidates.push(`Resources/GameMode/CardGames/Images/Cego/Cego_${ctx.cardId}.png`);
      candidates.push(`Resources/GameMode/CardGames/Images/Tarocco_Bolognese/Tarocco_Bolognese_${ctx.cardId}.png`);
      candidates.push(`Resources/GameMode/CardGames/Images/standard/${ctx.cardId}.png`);
    }
  }
  return Array.from(new Set(candidates));
}

function main(): void {
  const cardFiles = collectFiles(path.join(CARD_GAMES_ROOT, 'Cards'), '.asset');
  const deckFiles = collectFiles(path.join(CARD_GAMES_ROOT, 'Decks'), '.asset');
  const imageFiles = collectFiles(path.join(CARD_GAMES_ROOT, 'Images'), '.png');
  const imageIndexes = buildImageIndexes(imageFiles);

  const deckImageSourceByCardPath = new Map<string, Set<string>>();
  for (const deckPath of deckFiles) {
    const deck = readJson5<DeckAsset>(deckPath);
    if (deck.system.assetType !== 'Deck') {
      continue;
    }
    const source = deck.data.imageSourceFolderPath;
    if (!source) {
      continue;
    }
    for (const template of deck.data.cardTemplates ?? []) {
      if (template.path) {
        const list = deckImageSourceByCardPath.get(template.path) ?? new Set<string>();
        list.add(source);
        deckImageSourceByCardPath.set(template.path, list);
      }
    }
    for (const item of deck.data.cardComposition ?? []) {
      const cardPath = item.cardTemplate?.path;
      if (cardPath) {
        const list = deckImageSourceByCardPath.get(cardPath) ?? new Set<string>();
        list.add(source);
        deckImageSourceByCardPath.set(cardPath, list);
      }
    }
  }

  let updated = 0;
  let alreadyValid = 0;
  let unresolved = 0;
  const unresolvedEntries: Array<{ card: string; cardId: string; reason: string }> = [];
  const unresolvedSamples: Array<{ card: string; cardId: string; reason: string }> = [];

  for (const cardPath of cardFiles) {
    const asset = readJson5<CardAsset>(cardPath);
    if (asset.system.assetType !== 'Card') {
      continue;
    }
    const relCardPath = toResourcePath(cardPath);
    const cardId = asset.data.cardId;
    if (!cardId) {
      unresolved++;
      unresolvedEntries.push({ card: relCardPath, cardId: '', reason: 'missing cardId' });
      if (unresolvedSamples.length < 50) {
        unresolvedSamples.push({ card: relCardPath, cardId: '', reason: 'missing cardId' });
      }
      continue;
    }

    const currentImagePath = asset.data.imagePath;
    const currentHash = asset.data.imageHash;
    if (currentImagePath) {
      const abs = toAbsResourcePath(currentImagePath);
      if (fs.existsSync(abs)) {
        const realHash = sha256Hex(abs);
        if (currentHash === realHash) {
          alreadyValid++;
          continue;
        }
      }
    }

    const sourceSet = deckImageSourceByCardPath.get(relCardPath);
    const sources = sourceSet ? Array.from(sourceSet) : [];
    let resolvedAbs: string | null = null;

    for (const candidate of candidateImagePaths({ cardId, relCardPath, sources })) {
      const absCandidate = toAbsResourcePath(candidate);
      if (fs.existsSync(absCandidate)) {
        resolvedAbs = absCandidate;
        break;
      }
    }

    if (!resolvedAbs && typeof currentHash === 'string' && currentHash !== ZERO_HASH) {
      const hashMatches = imageIndexes.byHash.get(currentHash) ?? [];
      if (hashMatches.length === 1) {
        resolvedAbs = hashMatches[0];
      }
    }

    if (!resolvedAbs) {
      const baseMatches = imageIndexes.byBasename.get(`${cardId}.png`.toLowerCase()) ?? [];
      if (baseMatches.length === 1) {
        resolvedAbs = baseMatches[0];
      }
    }

    if (!resolvedAbs) {
      unresolved++;
      const unresolvedEntry = {
        card: relCardPath,
        cardId,
        reason: sources.length > 0 ? `no candidate in ${sources.join(',')}` : 'no deck image source mapping',
      };
      unresolvedEntries.push(unresolvedEntry);
      if (unresolvedSamples.length < 50) {
        unresolvedSamples.push(unresolvedEntry);
      }
      continue;
    }

    const nextImagePath = toResourcePath(resolvedAbs);
    const nextHash = sha256Hex(resolvedAbs);
    const changed = asset.data.imagePath !== nextImagePath || asset.data.imageHash !== nextHash;
    if (!changed) {
      alreadyValid++;
      continue;
    }

    asset.data.imagePath = nextImagePath;
    asset.data.imageHash = nextHash;
    updated++;
    if (write) {
      writeJson(cardPath, asset);
    }
  }

  const result = {
    mode: write ? 'write' : 'dry-run',
    cardAssets: cardFiles.length,
    updated,
    alreadyValid,
    unresolved,
    unresolvedReportPath: unresolved > 0 ? 'packages/game-asset-domain/sync-card-image-links.unresolved.json' : null,
    unresolvedSamples,
  };
  if (unresolved > 0) {
    const reportPath = path.resolve(__dirname, '../sync-card-image-links.unresolved.json');
    fs.writeFileSync(reportPath, `${JSON.stringify(unresolvedEntries, null, 2)}\n`, 'utf8');
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (unresolved > 0) {
    process.exitCode = 1;
  }
}

main();

