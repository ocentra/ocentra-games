import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { DECK_TYPE_VALUES } from '@ocentra/game-domain/deck/deckTypes';
import { ALLOWED_TRIPLES } from '@ocentra/game-domain/deck/deckCompatibility';
import {
  COMMERCIAL_DECK_TRIPLES,
  COMMERCIAL_DECK_TYPE_SET,
} from '@ocentra/game-domain/deck/commercialDeckTypes';
import { getCommercialAssetViolation } from '../src/schemas/asset/commercial-asset-policy';
import { computeExpectedCardIdentities } from '../src/schemas/asset/deck-cross-validators';
import { getExpectedGenericDeckCardCount } from '../src/schemas/asset/deck-name-expectations';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_DIR = path.resolve(__dirname, '../../asset-editor/Resources');
const DECKS_DIR = path.join(RESOURCES_DIR, 'GameMode/CardGames/Decks');
const CARD_RANKING_DIR = path.join(RESOURCES_DIR, 'GameMode/CardGames/CardRanking');
const CARDS_DIR = path.join(RESOURCES_DIR, 'GameMode/CardGames/Cards');

type AssetJson = {
  system?: {
    guid?: string;
    assetType?: string;
    displayName?: string;
    treePath?: string;
    variant?: string;
  };
  data?: Record<string, unknown>;
};

type AssetRef = {
  path?: string;
  guid?: string;
  displayName?: string;
  variant?: string;
  assetType?: string;
};

type SupportedTriple = {
  deckType?: string;
  suitSet?: string;
  rankSet?: string;
};

type RankingJson = AssetJson & {
  data?: {
    deckFamily?: string;
    deckType?: string;
    expectedCardCount?: number;
    cardEntries?: Array<{ id?: string; copies?: number }>;
    familyPayload?: {
      french?: {
        suits?: Array<{ SuitName?: string }>;
        rankings?: Array<{ Value?: number }>;
      };
    };
  };
};

type CardJson = AssetJson & {
  data?: {
    cardId?: string;
    cardRankingAsset?: AssetRef;
  };
};

type DeckIssue = {
  deck: string;
  file: string;
  issue: string;
  detail: string;
};

function readJson<T extends AssetJson>(filePath: string): T {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function normalizeResourcePath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^Resources\//, '');
}

function isGermanStandard32PlusJokersCardRanking(cardRankingRef?: AssetRef): boolean {
  if (!cardRankingRef) {
    return false;
  }
  const pathValue = cardRankingRef.path ? normalizeResourcePath(String(cardRankingRef.path)).toLowerCase() : '';
  const variantValue = String(cardRankingRef.variant ?? '').toLowerCase();
  const displayNameValue = String(cardRankingRef.displayName ?? '').toLowerCase();
  return (
    pathValue.endsWith('german_standard_32_plus_jokers.asset') ||
    variantValue === 'german_standard_32_plus_jokers' ||
    displayNameValue === 'german_standard_32_plus_jokers'
  );
}

function isGermanDeckUsingShared32Pool(ranking: RankingJson): boolean {
  const treePath = String(ranking.system?.treePath ?? '').toLowerCase();
  return (
    treePath.includes('german_stripped_32') ||
    treePath.includes('german_double_32') ||
    treePath.includes('german_standard_32_plus_jokers')
  );
}

function isFrenchStandard52PlusJokersCardRanking(cardRankingRef?: AssetRef): boolean {
  if (!cardRankingRef) return false;
  const pathValue = cardRankingRef.path ? normalizeResourcePath(String(cardRankingRef.path)).toLowerCase() : '';
  const variantValue = String(cardRankingRef.variant ?? '').toLowerCase();
  const displayNameValue = String(cardRankingRef.displayName ?? '').toLowerCase();
  return (
    pathValue.endsWith('french_standard_52_plus_jokers.asset') ||
    variantValue === 'french_standard_52_plus_jokers' ||
    displayNameValue === 'french_standard_52_plus_jokers'
  );
}

function isFrench500Deck63Ranking(ranking: RankingJson): boolean {
  const treePath = String(ranking.system?.treePath ?? '').toLowerCase();
  const displayName = String(ranking.system?.displayName ?? '').toLowerCase();
  return (
    treePath.includes('french_500_deck_63.asset') ||
    displayName === 'french_500_deck_63'
  );
}

function isCegoTarot54CardRanking(cardRankingRef?: AssetRef): boolean {
  if (!cardRankingRef) return false;
  const pathValue = cardRankingRef.path ? normalizeResourcePath(String(cardRankingRef.path)).toLowerCase() : '';
  const variantValue = String(cardRankingRef.variant ?? '').toLowerCase();
  const displayNameValue = String(cardRankingRef.displayName ?? '').toLowerCase();
  return (
    pathValue.endsWith('cego_tarot_54.asset') ||
    variantValue === 'cego_tarot_54' ||
    displayNameValue === 'cego_tarot_54'
  );
}

function isIndustrieUndGlueckReducedDeckRanking(ranking: RankingJson): boolean {
  const treePath = String(ranking.system?.treePath ?? '').toLowerCase();
  const displayName = String(ranking.system?.displayName ?? '').toLowerCase();
  return (
    treePath.includes('industrie_und_glueck_tarot_40') ||
    treePath.includes('industrie_und_glueck_tarot_42') ||
    displayName === 'industrie_und_glueck_tarot_40' ||
    displayName === 'industrie_und_glueck_tarot_42'
  );
}

function isTarotDeMarseilleCardRanking(cardRankingRef?: AssetRef): boolean {
  if (!cardRankingRef) return false;
  const pathValue = cardRankingRef.path ? normalizeResourcePath(String(cardRankingRef.path)).toLowerCase() : '';
  const variantValue = String(cardRankingRef.variant ?? '').toLowerCase();
  const displayNameValue = String(cardRankingRef.displayName ?? '').toLowerCase();
  return (
    pathValue.endsWith('tarot_de_marseille_tarot_78.asset') ||
    variantValue === 'tarot_de_marseille_tarot_78' ||
    displayNameValue === 'tarot_de_marseille_tarot_78'
  );
}

function fileBaseName(name: string): string {
  return name.replace(/\.asset$/i, '');
}

function walkAssetFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }
  const out: string[] = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.asset')) {
        out.push(fullPath);
      }
    }
  }
  return out.sort();
}

function toResourcePath(filePath: string): string {
  return normalizeResourcePath(path.relative(RESOURCES_DIR, filePath));
}

function multiset(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function formatCountDiff(
  expected: Map<string, number>,
  actual: Map<string, number>,
): string[] {
  const keys = new Set([...expected.keys(), ...actual.keys()]);
  const diffs: string[] = [];
  for (const key of Array.from(keys).sort()) {
    const expectedCount = expected.get(key) ?? 0;
    const actualCount = actual.get(key) ?? 0;
    if (expectedCount !== actualCount) {
      diffs.push(`${key}: expected ${expectedCount}, got ${actualCount}`);
    }
  }
  return diffs;
}

function isStandardFrenchPlaceholder(ranking: RankingJson): boolean {
  const data = ranking.data;
  if (!data?.deckFamily || data.deckFamily === 'French' || data.deckFamily === 'Tarot') {
    return false;
  }

  const suits = data.familyPayload?.french?.suits ?? [];
  const rankings = data.familyPayload?.french?.rankings ?? [];
  const suitNames = suits.map((suit) => String(suit.SuitName ?? '').toLowerCase());
  const rankValues = rankings.map((entry) => Number(entry.Value));

  return (
    data.expectedCardCount === 52 &&
    suitNames.join(',') === 'spades,hearts,diamonds,clubs' &&
    rankValues.join(',') === '14,13,12,11,10,9,8,7,6,5,4,3,2'
  );
}

function resolveDeckName(
  fileDeckName: string,
  displayName: string,
  expectedDeckNames: Set<string>,
  data: Record<string, unknown>,
): string {
  const supportedTriples = Array.isArray(data.supportedTriples)
    ? (data.supportedTriples as SupportedTriple[])
    : [];
  const supportedDeckType = String(supportedTriples[0]?.deckType ?? '');
  if (expectedDeckNames.has(supportedDeckType)) {
    return supportedDeckType;
  }
  if (expectedDeckNames.has(displayName)) {
    return displayName;
  }
  if (expectedDeckNames.has(fileDeckName)) {
    return fileDeckName;
  }
  return displayName || fileDeckName;
}

function resolveRanking(
  ref: AssetRef | undefined,
  rankingsByGuid: Map<string, RankingJson>,
  rankingsByPath: Map<string, RankingJson>,
): RankingJson | undefined {
  if (!ref) {
    return undefined;
  }
  if (ref.guid) {
    const byGuid = rankingsByGuid.get(ref.guid);
    if (byGuid) {
      return byGuid;
    }
  }
  if (ref.path) {
    return rankingsByPath.get(normalizeResourcePath(String(ref.path)));
  }
  return undefined;
}

function resolveCard(
  ref: AssetRef,
  cardsByGuid: Map<string, CardJson>,
  cardsByPath: Map<string, CardJson>,
): CardJson | undefined {
  if (ref.guid) {
    const byGuid = cardsByGuid.get(ref.guid);
    if (byGuid) {
      return byGuid;
    }
  }
  if (ref.path) {
    return cardsByPath.get(normalizeResourcePath(String(ref.path)));
  }
  return undefined;
}

function getCardIdentityId(card: CardJson, ref: AssetRef): string {
  const cardId = card.data?.cardId;
  if (typeof cardId === 'string' && cardId.length > 0) {
    return cardId;
  }
  const displayName = card.system?.displayName;
  if (typeof displayName === 'string' && displayName.length > 0) {
    return displayName;
  }
  if (typeof ref.variant === 'string' && ref.variant.length > 0) {
    return ref.variant;
  }
  if (typeof ref.displayName === 'string' && ref.displayName.length > 0) {
    return ref.displayName;
  }
  return '';
}

function expandDeckCardRefs(
  templateRefs: AssetRef[],
  compositionRefs: Array<{ cardTemplate?: AssetRef; copies?: number }> | undefined,
): AssetRef[] {
  if (Array.isArray(compositionRefs) && compositionRefs.length > 0) {
    return compositionRefs.flatMap((entry) => {
      const cardTemplate = entry.cardTemplate;
      if (!cardTemplate) {
        return [];
      }
      const copies = Math.max(1, Number(entry.copies ?? 1));
      return Array.from({ length: copies }, () => cardTemplate);
    });
  }
  return templateRefs;
}

function main(): void {
  const expectedDeckNames: Set<string> = new Set(
    (DECK_TYPE_VALUES as readonly string[]).filter((deckType) => !COMMERCIAL_DECK_TYPE_SET.has(deckType)),
  );
  const deckFiles = fs.readdirSync(DECKS_DIR).filter((file) => file.endsWith('.asset')).sort();
  const rankingFiles = walkAssetFiles(CARD_RANKING_DIR);
  const cardFiles = walkAssetFiles(CARDS_DIR);

  const rankingsByPath = new Map<string, RankingJson>();
  const rankingsByGuid = new Map<string, RankingJson>();

  for (const file of rankingFiles) {
    const violation = getCommercialAssetViolation(toResourcePath(file));
    if (violation) {
      issues.push({
        deck: '',
        file: path.basename(file),
        issue: 'commercial-ranking-asset-forbidden',
        detail: violation,
      });
      continue;
    }
    const json = readJson<RankingJson>(file);
    const assetType = String(json.system?.assetType ?? '');
    const typedViolation = getCommercialAssetViolation(toResourcePath(file), assetType, json.data);
    if (typedViolation) {
      issues.push({
        deck: '',
        file: path.basename(file),
        issue: 'commercial-ranking-asset-forbidden',
        detail: typedViolation,
      });
      continue;
    }
    rankingsByPath.set(toResourcePath(file), json);
    const guid = json.system?.guid;
    if (guid) {
      rankingsByGuid.set(guid, json);
    }
  }

  const cardsByPath = new Map<string, CardJson>();
  const cardsByGuid = new Map<string, CardJson>();

  for (const file of cardFiles) {
    const violation = getCommercialAssetViolation(toResourcePath(file));
    if (violation) {
      issues.push({
        deck: '',
        file: path.basename(file),
        issue: 'commercial-card-asset-forbidden',
        detail: violation,
      });
      continue;
    }
    const json = readJson<CardJson>(file);
    const assetType = String(json.system?.assetType ?? '');
    const typedViolation = getCommercialAssetViolation(toResourcePath(file), assetType, json.data);
    if (typedViolation) {
      issues.push({
        deck: '',
        file: path.basename(file),
        issue: 'commercial-card-asset-forbidden',
        detail: typedViolation,
      });
      continue;
    }
    cardsByPath.set(toResourcePath(file), json);
    const guid = json.system?.guid;
    if (guid) {
      cardsByGuid.set(guid, json);
    }
  }

  const issues: DeckIssue[] = [];
  const representedTriples = new Set<string>();
  let readyDecks = 0;

  for (const file of deckFiles) {
    const fullPath = path.join(DECKS_DIR, file);
    const deckResourcePath = toResourcePath(fullPath);
    const pathViolation = getCommercialAssetViolation(deckResourcePath);
    if (pathViolation) {
      issues.push({
        deck: fileBaseName(file),
        file,
        issue: 'commercial-deck-asset-forbidden',
        detail: pathViolation,
      });
      continue;
    }
    const json = readJson<AssetJson>(fullPath);
    const fileDeckName = fileBaseName(file);
    const displayName = String(json.system?.displayName ?? fileDeckName);
    const data = json.data ?? {};
    const typedViolation = getCommercialAssetViolation(deckResourcePath, String(json.system?.assetType ?? ''), data);
    if (typedViolation) {
      issues.push({
        deck: fileDeckName,
        file,
        issue: 'commercial-deck-asset-forbidden',
        detail: typedViolation,
      });
      continue;
    }
    const deckName = resolveDeckName(fileDeckName, displayName, expectedDeckNames, data);
    const assetType = String(json.system?.assetType ?? '');
    const supportedTriples = Array.isArray(data.supportedTriples)
      ? (data.supportedTriples as SupportedTriple[])
      : [];
    const rankingRef =
      (data.cardRankingAsset as AssetRef | undefined) ??
      (data.dominoRankingAsset as AssetRef | undefined) ??
      (data.hanafudaRankingAsset as AssetRef | undefined) ??
      (data.mahjongRankingAsset as AssetRef | undefined) ??
      (data.playingCardRankingAsset as AssetRef | undefined);

    for (const triple of supportedTriples) {
      if (triple.deckType && triple.suitSet && triple.rankSet) {
        representedTriples.add(`${triple.deckType}\0${triple.suitSet}\0${triple.rankSet}`);
      }
    }

    let deckReady = true;

    if (!expectedDeckNames.has(deckName)) {
      issues.push({
        deck: deckName,
        file,
        issue: 'unknown-deck-type',
        detail: `Deck file "${fileDeckName}" and system.displayName "${displayName}" do not map to any declared deck type`,
      });
      deckReady = false;
    }

    if (!assetType.endsWith('Deck')) {
      issues.push({
        deck: deckName,
        file,
        issue: 'invalid-asset-type',
        detail: `Deck asset must use a *Deck assetType, got "${assetType || 'unknown'}"`,
      });
      deckReady = false;
    }

    if (assetType === 'Deck') {
      const ranking = resolveRanking(rankingRef, rankingsByGuid, rankingsByPath);
      if (!ranking) {
        issues.push({
          deck: deckName,
          file,
          issue: 'missing-ranking',
          detail: 'Deck points to a missing CardRanking asset',
        });
        deckReady = false;
      } else {
        if (isStandardFrenchPlaceholder(ranking)) {
          issues.push({
            deck: deckName,
            file,
            issue: 'placeholder-ranking-semantics',
            detail: `CardRanking ${ranking.system?.displayName ?? 'unknown'} still uses a placeholder 52-card French suit/rank structure for deckFamily ${ranking.data?.deckFamily ?? 'unknown'}`,
          });
          deckReady = false;
        }

        const expectedIdentities = computeExpectedCardIdentities(
          (ranking.data ?? ranking) as Parameters<typeof computeExpectedCardIdentities>[0],
        );
        const templateRefs = expandDeckCardRefs(
          Array.isArray(data.cardTemplates) ? (data.cardTemplates as AssetRef[]) : [],
          Array.isArray(data.cardComposition)
            ? (data.cardComposition as Array<{ cardTemplate?: AssetRef; copies?: number }>)
            : undefined,
        );
        const canonicalCount = getExpectedGenericDeckCardCount(deckName);

        if (templateRefs.length !== expectedIdentities.length) {
          issues.push({
            deck: deckName,
            file,
            issue: 'deck-template-count-mismatch',
            detail: `Deck has ${templateRefs.length} cardTemplates but ranking expects ${expectedIdentities.length} physical cards`,
          });
          deckReady = false;
        }
        if (canonicalCount != null && templateRefs.length !== canonicalCount) {
          issues.push({
            deck: deckName,
            file,
            issue: 'canonical-deck-size-mismatch',
            detail: `Deck ${deckName} must have ${canonicalCount} physical cards, got ${templateRefs.length}`,
          });
          deckReady = false;
        }
        if (canonicalCount != null && ranking.data?.expectedCardCount !== canonicalCount) {
          issues.push({
            deck: deckName,
            file,
            issue: 'canonical-ranking-size-mismatch',
            detail: `CardRanking for ${deckName} must declare ${canonicalCount} physical cards, got ${ranking.data?.expectedCardCount ?? 'unknown'}`,
          });
          deckReady = false;
        }

        const actualIds: string[] = [];
        for (const ref of templateRefs) {
          const card = resolveCard(ref, cardsByGuid, cardsByPath);
          if (!card) {
            issues.push({
              deck: deckName,
              file,
              issue: 'missing-card-asset',
              detail: `Deck references missing card asset ${ref.path ?? ref.guid ?? ref.displayName ?? 'unknown-card'}`,
            });
            deckReady = false;
            continue;
          }

          const actualCardId = getCardIdentityId(card, ref);
          if (!actualCardId) {
            issues.push({
              deck: deckName,
              file,
              issue: 'missing-card-id',
              detail: `Card asset ${ref.path ?? ref.guid ?? 'unknown-card'} has no usable cardId/displayName/variant`,
            });
            deckReady = false;
            continue;
          }

          const cardRankingRef = card.data?.cardRankingAsset;
          const rankingGuid = ranking.system?.guid;
          const rankingPath = rankingRef?.path ? normalizeResourcePath(String(rankingRef.path)) : undefined;
          const cardRankingGuid = cardRankingRef?.guid;
          const cardRankingPath = cardRankingRef?.path
            ? normalizeResourcePath(String(cardRankingRef.path))
            : undefined;
          const cardRanking = resolveRanking(cardRankingRef, rankingsByGuid, rankingsByPath);
          const rankingMatches =
            (rankingGuid && cardRankingGuid && rankingGuid === cardRankingGuid) ||
            (rankingPath && cardRankingPath && rankingPath === cardRankingPath);

          const rankingFamily = String(ranking.data?.deckFamily ?? '');
          const cardRankingFamily = String(cardRanking?.data?.deckFamily ?? '');
          const germanShared32PoolOk =
            rankingFamily === 'German' &&
            isGermanStandard32PlusJokersCardRanking(cardRankingRef) &&
            isGermanDeckUsingShared32Pool(ranking);
          const frenchTarockSharedPoolOk =
            rankingFamily === 'French_tarock' &&
            isFrenchStandard52PlusJokersCardRanking(cardRankingRef);
          const french500SharedPoolOk =
            isFrench500Deck63Ranking(ranking) &&
            isFrenchStandard52PlusJokersCardRanking(cardRankingRef);
          const cegoSharedPoolOk =
            isIndustrieUndGlueckReducedDeckRanking(ranking) && isCegoTarot54CardRanking(cardRankingRef);
          const swiss1jjMarseilleSharedPoolOk =
            rankingFamily === 'Swiss_1JJ' && isTarotDeMarseilleCardRanking(cardRankingRef);
          const sameFamilySharedPoolOk =
            rankingFamily.length > 0 && cardRankingFamily.length > 0 && rankingFamily === cardRankingFamily;

          if (
            rankingFamily !== 'French' &&
            !rankingMatches &&
            !germanShared32PoolOk &&
            !frenchTarockSharedPoolOk &&
            !french500SharedPoolOk &&
            !cegoSharedPoolOk &&
            !swiss1jjMarseilleSharedPoolOk &&
            !sameFamilySharedPoolOk
          ) {
            issues.push({
              deck: deckName,
              file,
              issue: 'card-ranking-backlink-mismatch',
              detail: `Card ${actualCardId} does not point back to deck ranking ${ranking.system?.displayName ?? 'unknown-ranking'}`,
            });
            deckReady = false;
          }

          actualIds.push(actualCardId);
        }

        const expectedCounts = multiset(expectedIdentities);
        const actualCounts = multiset(actualIds);
        const diffs = formatCountDiff(expectedCounts, actualCounts);
        if (diffs.length > 0) {
          issues.push({
            deck: deckName,
            file,
            issue: 'deck-ranking-identity-mismatch',
            detail: diffs.slice(0, 10).join('; '),
          });
          deckReady = false;
        }
      }
    }

    if (deckReady) {
      readyDecks++;
    }
  }

  const commercialTripleSet = new Set(
    COMMERCIAL_DECK_TRIPLES.map(([deckType, suitSet, rankSet]) => `${deckType}\0${suitSet}\0${rankSet}`),
  );
  for (const [deckType, suitSet, rankSet] of ALLOWED_TRIPLES) {
    if (commercialTripleSet.has(`${deckType}\0${suitSet}\0${rankSet}`)) {
      continue;
    }
    if (!representedTriples.has(`${deckType}\0${suitSet}\0${rankSet}`)) {
      issues.push({
        deck: deckType,
        file: '',
        issue: 'missing-deck-triple',
        detail: `No deck asset currently represents the declared triple "${deckType}/${suitSet}/${rankSet}"`,
      });
    }
  }

  process.stdout.write(
    JSON.stringify(
      {
        declaredDeckTypes: DECK_TYPE_VALUES.length,
        nonCommercialDeclaredDeckTypes: expectedDeckNames.size,
        deckAssetFiles: deckFiles.length,
        readyDecks,
        failedDecks: issues.length,
      },
      null,
      2,
    ) + '\n',
  );

  if (issues.length > 0) {
    const outPath = path.resolve(process.cwd(), 'deck-semantic-readiness-failures.json');
    fs.writeFileSync(outPath, JSON.stringify(issues, null, 2));
    process.stderr.write(`Wrote failures to ${outPath}\n`);
    process.exit(1);
  }
}

main();
