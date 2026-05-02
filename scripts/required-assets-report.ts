/**
 * Enumerates required CardRanking, Deck, and Card .assets from game-domain catalog,
 * validates existing .asset files with Effect Schema, and reports gaps. No fake green:
 * missing or invalid assets cause exit 1 so gaps are visible and fixable.
 *
 * Usage: npx tsx scripts/required-assets-report.ts [glob] [--check-images]
 * Default glob: packages/asset-editor/Resources/ plus all subdirs .asset files
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import glob from 'glob';
import JSON5 from 'json5';
import { validateAssetFile } from '@ocentra/game-asset-domain/schemas/asset/asset-file-schema';
import { ALLOWED_TRIPLES } from '@ocentra/game-domain/deck/deckCompatibility';
import { getCardIds } from '@ocentra/game-domain/deck/cardIds';

const globAsync = promisify(glob.glob);

type DeckTriple = readonly [deckType: string, suitSet: string, rankSet: string];
const ALL_RANK_SETS = new Set<string>(ALLOWED_TRIPLES.map((t) => t[2]));

const RANK_SYMBOL_TO_VALUE: Record<string, number> = {
  A: 14, K: 13, Q: 12, J: 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
};

function cardIdToPieceId(cardId: string): string {
  if (cardId.startsWith('joker_')) return cardId;
  const idx = cardId.indexOf('_');
  if (idx <= 0) return cardId;
  const rankSym = cardId.slice(0, idx);
  const suit = cardId.slice(idx + 1);
  const value = RANK_SYMBOL_TO_VALUE[rankSym] ?? rankSym;
  return `${value}_of_${suit}`;
}

function rankingKey(suitSet: string, rankSet: string): string {
  return `${suitSet}\0${rankSet}`;
}

function requiredFromCatalog(): {
  rankingKeys: Set<string>;
  rankingKeysList: Array<{ suitSet: string; rankSet: string }>;
  deckTypes: Set<string>;
  cardsByRankingKey: Map<string, string[]>;
} {
  const rankingKeys = new Set<string>();
  const deckTypes = new Set<string>();
  const cardsByRankingKey = new Map<string, string[]>();

  for (const triple of ALLOWED_TRIPLES as DeckTriple[]) {
    const [deckType, suitSet, rankSet] = triple;
    if (deckType === 'Custom' && suitSet === 'Custom' && rankSet === 'Custom') continue;
    deckTypes.add(deckType);
    const key = rankingKey(suitSet, rankSet);
    rankingKeys.add(key);
    const ids = getCardIds(deckType, suitSet, rankSet);
    if (ids.length > 0) {
      const existing = cardsByRankingKey.get(key) ?? [];
      const combined = [...new Set([...existing, ...ids])];
      cardsByRankingKey.set(key, combined);
    }
  }

  const rankingKeysList = Array.from(rankingKeys).map((key) => {
    const [suitSet, rankSet] = key.split('\0');
    return { suitSet, rankSet };
  });

  return { rankingKeys, rankingKeysList, deckTypes, cardsByRankingKey };
}

interface ValidatedAsset {
  file: string;
  assetType: string;
  data: Record<string, unknown>;
}

async function loadAndValidateAssets(
  pattern: string
): Promise<{ valid: ValidatedAsset[]; invalid: Array<{ file: string; assetType: string; errors: string[] }> }> {
  const files = await globAsync(pattern);
  const valid: ValidatedAsset[] = [];
  const invalid: Array<{ file: string; assetType: string; errors: string[] }> = [];

  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8');
      const json = JSON5.parse(content);
      const result = validateAssetFile(json);
      const assetType = (json?.system as { assetType?: string })?.assetType ?? 'Unknown';
      if (!result.success) {
        const errors = result.error.issues.map(
          (i) => (i.path.length > 0 ? i.path.join('.') : 'asset') + ': ' + i.message
        );
        invalid.push({ file, assetType, errors });
      } else {
        valid.push({ file, assetType, data: (json?.data as Record<string, unknown>) ?? {} });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      invalid.push({ file, assetType: 'Unknown', errors: [`Parse: ${message}`] });
    }
  }
  return { valid, invalid };
}

function extractRankingKeyFromCardRanking(data: Record<string, unknown>): string | null {
  const deckFamily = data?.deckFamily as string | undefined;
  if (!deckFamily) return null;

  const deckType = data?.deckType as string | undefined;
  if (deckType && ALL_RANK_SETS.has(deckType)) {
    return rankingKey(deckFamily, deckType);
  }

  const fp = data?.familyPayload as { french?: { suits?: unknown[]; rankings?: unknown[] } } | undefined;
  if (deckFamily === 'French' && fp?.french) {
    const rankCount = fp.french.rankings?.length ?? 0;
    const suitCount = fp.french.suits?.length ?? 0;
    if (suitCount === 4 && rankCount === 13) return rankingKey('French', 'Standard_52');
    if (suitCount === 4 && rankCount === 12) return rankingKey('French', 'Pinochle_48');
  }
  return rankingKey(deckFamily, 'unknown');
}

function extractCardPieceId(data: Record<string, unknown>): string | null {
  const identity = data?.cardIdentity as {
    family?: string;
    suit?: string;
    value?: number;
    joker?: boolean;
    index?: 1 | 2;
  } | undefined;
  if (!identity || identity.family !== 'French') return null;
  if (identity.joker && (identity.index === 1 || identity.index === 2)) {
    return `joker_${identity.index}`;
  }
  const suit = identity.suit;
  const value = identity.value;
  if (suit == null || value == null) return null;
  return `${value}_of_${suit}`;
}

function main(): void {
  const args = process.argv.slice(2);
  const checkImages = args.includes('--check-images');
  const pattern = args.filter((a) => !a.startsWith('--'))[0] ?? 'packages/asset-editor/Resources/**/*.asset';

  (async () => {
    console.log('\n\x1b[36m\x1b[1mRequired assets report (catalog vs on-disk, strict Effect Schema)\x1b[0m\n');
    const required = requiredFromCatalog();
    console.log(`\x1b[90mRequired from catalog:\x1b[0m`);
    console.log(`  CardRankings (unique suitSet+rankSet): ${required.rankingKeys.size}`);
    console.log(`  Deck types: ${required.deckTypes.size}`);
    const totalCards = Array.from(required.cardsByRankingKey.values()).reduce((s, arr) => s + arr.length, 0);
    console.log(`  Cards (total across rankings with getCardIds): ${totalCards}`);
    console.log('');

    const { valid, invalid } = await loadAndValidateAssets(pattern);
    const invalidByType = {
      CardRanking: invalid.filter((i) => i.assetType === 'CardRanking'),
      Deck: invalid.filter((i) => i.assetType === 'Deck'),
      Card: invalid.filter((i) => i.assetType === 'Card'),
    };
    const cardRankingValid = valid.filter((a) => a.assetType === 'CardRanking');
    const deckValid = valid.filter((a) => a.assetType === 'Deck');
    const cardValid = valid.filter((a) => a.assetType === 'Card');

    console.log(`\x1b[90mOn-disk (pattern: ${pattern}):\x1b[0m`);
    console.log(`  Valid (Effect Schema): ${valid.length} | Invalid (Effect Schema): ${invalid.length}`);
    console.log('');

    let exitCode = 0;

    console.log('\x1b[1m--- Full inventory: every CardRanking .asset ---\x1b[0m');
    const allCardRankingFiles = [
      ...cardRankingValid.map((a) => ({ file: a.file, status: 'VALID' as const, errors: [] })),
      ...invalidByType.CardRanking.map((i) => ({ file: i.file, status: 'INVALID' as const, errors: i.errors })),
    ].sort((a, b) => a.file.localeCompare(b.file));
    for (const { file, status, errors } of allCardRankingFiles) {
      const rel = path.relative(process.cwd(), file);
      if (status === 'VALID') {
        console.log(`  \x1b[32m${rel}\x1b[0m  \x1b[32mVALID\x1b[0m`);
      } else {
        exitCode = 1;
        console.log(`  \x1b[31m${rel}\x1b[0m  \x1b[31mINVALID\x1b[0m`);
        for (const e of errors) console.log(`    - ${e}`);
      }
    }
    if (allCardRankingFiles.length === 0) console.log('  (none found)');
    console.log('');

    console.log('\x1b[1m--- Full inventory: every Deck .asset ---\x1b[0m');
    const allDeckFiles = [
      ...deckValid.map((a) => ({ file: a.file, status: 'VALID' as const, errors: [] })),
      ...invalidByType.Deck.map((i) => ({ file: i.file, status: 'INVALID' as const, errors: i.errors })),
    ].sort((a, b) => a.file.localeCompare(b.file));
    for (const { file, status, errors } of allDeckFiles) {
      const rel = path.relative(process.cwd(), file);
      if (status === 'VALID') {
        console.log(`  \x1b[32m${rel}\x1b[0m  \x1b[32mVALID\x1b[0m`);
      } else {
        exitCode = 1;
        console.log(`  \x1b[31m${rel}\x1b[0m  \x1b[31mINVALID\x1b[0m`);
        for (const e of errors) console.log(`    - ${e}`);
      }
    }
    if (allDeckFiles.length === 0) console.log('  (none found)');
    console.log('');

    console.log('\x1b[1m--- Full inventory: every Card .asset ---\x1b[0m');
    const allCardFiles = [
      ...cardValid.map((a) => ({ file: a.file, status: 'VALID' as const, errors: [] })),
      ...invalidByType.Card.map((i) => ({ file: i.file, status: 'INVALID' as const, errors: i.errors })),
    ].sort((a, b) => a.file.localeCompare(b.file));
    for (const { file, status, errors } of allCardFiles) {
      const rel = path.relative(process.cwd(), file);
      if (status === 'VALID') {
        console.log(`  \x1b[32m${rel}\x1b[0m  \x1b[32mVALID\x1b[0m`);
      } else {
        exitCode = 1;
        console.log(`  \x1b[31m${rel}\x1b[0m  \x1b[31mINVALID\x1b[0m`);
        for (const e of errors) console.log(`    - ${e}`);
      }
    }
    if (allCardFiles.length === 0) console.log('  (none found)');
    console.log('');

    const haveRankingKeys = new Set<string>();
    for (const a of cardRankingValid) {
      const key = extractRankingKeyFromCardRanking(a.data);
      if (key) haveRankingKeys.add(key);
    }
    const missingRankings = required.rankingKeysList.filter(
      (r) => !haveRankingKeys.has(rankingKey(r.suitSet, r.rankSet))
    );
    if (missingRankings.length > 0) {
      exitCode = 1;
      console.error('\x1b[31m\x1b[1mMissing CardRanking (required suitSet+rankSet)\x1b[0m');
      for (const r of missingRankings) console.error(`  - (${r.suitSet}, ${r.rankSet})`);
      console.log('');
    }

    console.error('\x1b[33m\x1b[1mDecks\x1b[0m');
    console.error(`  Required: ${required.deckTypes.size} deck types. You have: ${deckValid.length} Deck .asset(s) that passed Effect Schema.`);
    console.error('  (Deck .asset does not yet store deckType; add deckType to Deck schema to verify per-type coverage.)\n');

    for (const [key, cardIds] of required.cardsByRankingKey) {
      const [suitSet, rankSet] = key.split('\0');
      const pieceIdsFromAssets = new Set(
        cardValid.map((a) => extractCardPieceId(a.data)).filter((id): id is string => id != null)
      );
      const requiredPieceIds = cardIds.map(cardIdToPieceId);
      const missingCards = requiredPieceIds.filter((pieceId) => !pieceIdsFromAssets.has(pieceId));
      if (missingCards.length > 0) {
        exitCode = 1;
        console.error(
          `\x1b[31mMissing Cards for (${suitSet}, ${rankSet}): need ${cardIds.length}, have ${pieceIdsFromAssets.size} valid Card .assets; missing: ${missingCards.join(', ')}\x1b[0m`
        );
      }
    }

    if (checkImages) {
      for (const a of cardValid) {
        const imageHash = (a.data?.imageHash as string) ?? (a.data?.image as string);
        if (!imageHash) {
          exitCode = 1;
          const rel = path.relative(process.cwd(), a.file);
          console.error(`  \x1b[31mNo image ref: ${rel}\x1b[0m`);
        }
      }
    }

    if (exitCode === 0) {
      console.log('\x1b[32mNo gaps reported (invalid assets and missing required sets are zero).\x1b[0m\n');
    } else {
      console.error('\x1b[31mReport complete: there are invalid or missing assets. Fix schema validation first, then add missing CardRanking/Deck/Card .assets.\x1b[0m\n');
    }
    process.exit(exitCode);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

main();
