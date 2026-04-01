import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const PROCESSED_GAMES_DIR = path.join(ROOT_DIR, 'card-games/src/processed-games');
const OUTPUT_PATH = path.resolve(process.cwd(), 'deck-taxonomy-conflicts-report.json');

type ProcessedGame = {
  filename?: string;
  name?: string;
  legal?: {
    isCommercial?: boolean;
  };
  overview?: {
    deck?: string;
  };
  engine?: {
    deckType?: string;
    suitSet?: string;
    rankSet?: string;
    deckDescription?: string;
    suitDescription?: string;
    rankDescription?: string;
  };
};

type SuitSetConflict = {
  file: string;
  name: string;
  deckType: string;
  suitSet: string;
  rankSet: string;
  reason: string;
};

function readProcessedGames(): Array<{ file: string; data: ProcessedGame }> {
  return fs
    .readdirSync(PROCESSED_GAMES_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => ({
      file,
      data: JSON.parse(fs.readFileSync(path.join(PROCESSED_GAMES_DIR, file), 'utf8')) as ProcessedGame,
    }));
}

function combinedDeckText(game: ProcessedGame): string {
  return [
    game.overview?.deck ?? '',
    game.engine?.deckDescription ?? '',
    game.engine?.suitDescription ?? '',
    game.engine?.rankDescription ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

function detectSuitFamilies(text: string): string[] {
  const matches = new Set<string>();

  if (/\bhearts\b|\bdiamonds\b|\bclubs\b|\bspades\b|\bfrench\b/.test(text)) {
    matches.add('French');
  }
  if (/\boros\b|\bcopas\b|\bespadas\b|\bbastos\b|\bsota\b|\bcaballo\b|\brey\b|\bspanish\b/.test(text)) {
    matches.add('Spanish');
  }
  if (/\bdenari\b|\bcoppe\b|\bspade\b|\bbastoni\b|\bfante\b|\bcavallo\b|\bitalian\b|\bsicilian\b|\bbolognese\b|\bpiemontese\b/.test(text)) {
    matches.add('Italian');
  }
  if (/\bcoins\b|\bcups\b|\bswords\b|\bbatons\b/.test(text)) {
    matches.add('Latin');
  }
  if (
    /\beichel\b|\blaub\b|\bgrün\b|\bgru[eü]n\b|\bschellen\b|\bacorns\b|\bleaves\b|\bbells\b|\bgerman\b/.test(
      text,
    )
  ) {
    matches.add('German');
  }

  return Array.from(matches.values()).sort();
}

function isCompatibleSuitSet(suitSet: string, detectedSuitFamilies: string[]): boolean {
  const acceptableFamilies = new Set<string>();

  switch (suitSet) {
    case 'French':
    case 'French_tarock':
    case 'Industrie_und_Glueck':
    case 'Cego':
      acceptableFamilies.add('French');
      break;
    case 'Spanish':
      acceptableFamilies.add('Spanish');
      acceptableFamilies.add('Latin');
      break;
    case 'Italian':
    case 'Portuguese':
    case 'Tarot_de_Marseille':
    case 'Tarocco_Piemontese':
    case 'Swiss_1JJ':
      acceptableFamilies.add('Italian');
      acceptableFamilies.add('Latin');
      acceptableFamilies.add('Spanish');
      break;
    case 'German':
      acceptableFamilies.add('German');
      break;
    default:
      return true;
  }

  return detectedSuitFamilies.some((family) => acceptableFamilies.has(family));
}

function deckSignature(game: ProcessedGame): string {
  const text = combinedDeckText(game);
  const bits: string[] = [];

  if (/less all four 10s|tens are removed|without tens|four 10s removed/.test(text)) {
    bits.push('missing_10s');
  }
  if (/removing the aces|aces removed|without aces|no aces/.test(text)) {
    bits.push('missing_aces');
  }
  if (/removing all twos|twos removed|without twos|no twos/.test(text)) {
    bits.push('missing_2s');
  }
  if (/four 8s removed|8s removed|without eights|no eights/.test(text)) {
    bits.push('missing_8s');
  }
  if (/ace through 7 plus|as,? 2 through 7|sota, caballo and rey|sota, caballo, rey/.test(text)) {
    bits.push('spanish_40_layout');
  }
  if (/twelve ranks in four suits.*swords.*batons.*cups.*coins|standard 48-card spanish deck/.test(text)) {
    bits.push('spanish_48_layout');
  }
  if (/two copies of 9|two copies of 9, 10, jack, queen, king, ace|pinochle deck/.test(text)) {
    bits.push('pinochle_duplicate_layout');
  }
  if (/6 through ace|eight ranks per suit \(6 through ace\)/.test(text)) {
    bits.push('six_through_ace_layout');
  }
  if (/7 through ace|eight ranks per suit \(7 through ace\)/.test(text)) {
    bits.push('seven_through_ace_layout');
  }

  return bits.length > 0 ? bits.join('|') : 'unclassified';
}

function main(): void {
  const games = readProcessedGames();
  const suitSetConflicts: SuitSetConflict[] = [];
  const tripleVariants = new Map<string, Map<string, string[]>>();

  for (const { file, data } of games) {
    if (data.legal?.isCommercial === true) {
      continue;
    }
    const engine = data.engine ?? {};
    const deckType = String(engine.deckType ?? '');
    const suitSet = String(engine.suitSet ?? '');
    const rankSet = String(engine.rankSet ?? '');
    if (!deckType || !suitSet || !rankSet) {
      continue;
    }

    const text = combinedDeckText(data);
    const detectedSuitFamilies = detectSuitFamilies(text);
    const tripleKey = `${deckType}/${suitSet}/${rankSet}`;
    const signature = deckSignature(data);
    const variants = tripleVariants.get(tripleKey) ?? new Map<string, string[]>();
    const files = variants.get(signature) ?? [];
    files.push(file);
    variants.set(signature, files);
    tripleVariants.set(tripleKey, variants);

    if (
      detectedSuitFamilies.length > 0 &&
      !isCompatibleSuitSet(suitSet, detectedSuitFamilies) &&
      !(suitSet === 'Spanish' && detectedSuitFamilies.includes('French') && /spanish 21/.test(text))
    ) {
      suitSetConflicts.push({
        file,
        name: String(data.name ?? file),
        deckType,
        suitSet,
        rankSet,
        reason: `Engine suitSet "${suitSet}" conflicts with description-derived families: ${detectedSuitFamilies.join(', ')}`,
      });
    }
  }

  const overloadedTriples = Array.from(tripleVariants.entries())
    .map(([triple, variants]) => ({
      triple,
      variantCount: variants.size,
      variants: Array.from(variants.entries())
        .map(([signature, files]) => ({
          signature,
          files: files.sort(),
        }))
        .sort((left, right) => left.signature.localeCompare(right.signature)),
    }))
    .filter((entry) => entry.variantCount > 1)
    .sort((left, right) => left.triple.localeCompare(right.triple));

  const report = {
    processedGames: games.length,
    nonCommercialProcessedGames: games.filter((entry) => entry.data.legal?.isCommercial !== true).length,
    suitSetConflictCount: suitSetConflicts.length,
    overloadedTripleCount: overloadedTriples.length,
    suitSetConflicts,
    overloadedTriples,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
