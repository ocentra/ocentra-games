import type { ContentBlock, Page, PageSection } from '@/ui/components/GameInfo/types';
import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';

type LooseRecord = Record<string, unknown>;

export interface GameDetailAssetSummary {
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  metrics: Array<{ label: string; value: string }>;
}

export interface GameDetailAssetContent {
  sections: PageSection[];
  summary: GameDetailAssetSummary | null;
}

export interface SelectedGameAssetBundle {
  layout: LooseRecord | null;
  gameMode: LooseRecord | null;
  gameInfo: LooseRecord | null;
  rules: LooseRecord | null;
  strategy: LooseRecord | null;
  scoring: LooseRecord | null;
  deckModel: LooseRecord | null;
  deck: LooseRecord | null;
  ranking: LooseRecord | null;
  mechanics: LooseRecord | null;
  actions: LooseRecord | null;
  validationFixtures: LooseRecord | null;
  images: LooseRecord | null;
}

export async function loadSelectedGameAssetBundle(gameGuid: string): Promise<SelectedGameAssetBundle> {
  const resources = await getEntryIndexResourceEntries();
  const gameDocument = await loadRawAssetDocumentByGuid(gameGuid);
  const gameData = dataOf(gameDocument);
  const infoDocument = await loadAssetDocumentFromRef(gameData.gameInfoAsset, resources);
  const rulesDocument = await loadAssetDocumentFromRef(gameData.gameRulesAsset, resources);
  const scoringDocument = await loadAssetDocumentFromRef(gameData.scoringAsset, resources);
  const strategyDocument = await loadAssetDocumentFromRef(gameData.strategyAsset, resources);
  const mechanicsDocument = await loadAssetDocumentFromRef(gameData.mechanicsAsset, resources);
  const deckDocument = await loadAssetDocumentFromRef(gameData.deckAsset, resources);
  const imagesDocument = await loadAssetDocumentFromRef(gameData.carouselImagesAsset, resources);
  const rankingDocument = await loadAssetDocumentFromRef(gameData.rankingAsset, resources)
    ?? await loadAssetDocumentFromRef(dataOf(scoringDocument).rankingAsset, resources);
  const infoData = dataOf(infoDocument);
  const linkedAssets = asRecord(asRecord(infoData.mechanicsContract).linkedAssetKeys);
  const gameTreePath = asText(asRecord(asRecord(gameDocument).system).treePath);
  const validationDocument = await loadAssetDocumentByLinkedKey(gameTreePath, asText(linkedAssets.validationFixtures), resources);
  const deckModelDocument = await loadAssetDocumentByLinkedKey(gameTreePath, asText(linkedAssets.deckModel), resources);
  const actionSetDocument = await loadAssetDocumentByLinkedKey(gameTreePath, asText(linkedAssets.actionSet), resources);
  const layoutDocument = await loadAssetDocumentByPath('Resources/Pages/SelectedGameLayout.asset', resources, 'PageLayout');

  return {
    layout: layoutDocument,
    gameMode: gameDocument,
    gameInfo: infoDocument,
    rules: rulesDocument,
    strategy: strategyDocument,
    scoring: scoringDocument,
    deckModel: deckModelDocument,
    deck: deckDocument,
    ranking: rankingDocument,
    mechanics: mechanicsDocument,
    actions: actionSetDocument,
    validationFixtures: validationDocument,
    images: imagesDocument,
  };
}

export async function loadGameDetailAssetContent(
  gameGuid: string,
  fallbackSections: PageSection[],
): Promise<GameDetailAssetContent> {
  const resources = await getEntryIndexResourceEntries();
  const gameDocument = await loadRawAssetDocumentByGuid(gameGuid);
  const gameData = dataOf(gameDocument);
  const infoDocument = await loadAssetDocumentFromRef(gameData.gameInfoAsset, resources);
  const rulesDocument = await loadAssetDocumentFromRef(gameData.gameRulesAsset, resources);
  const scoringDocument = await loadAssetDocumentFromRef(gameData.scoringAsset, resources);
  const strategyDocument = await loadAssetDocumentFromRef(gameData.strategyAsset, resources);

  const infoData = dataOf(infoDocument);
  const rulesData = dataOf(rulesDocument);
  const scoringData = dataOf(scoringDocument);
  const strategyData = dataOf(strategyDocument);
  const linkedAssets = asRecord(asRecord(infoData.mechanicsContract).linkedAssetKeys);
  const gameTreePath = asText(asRecord(asRecord(gameDocument).system).treePath);
  const validationDocument = await loadAssetDocumentByLinkedKey(gameTreePath, asText(linkedAssets.validationFixtures), resources);
  const deckModelDocument = await loadAssetDocumentByLinkedKey(gameTreePath, asText(linkedAssets.deckModel), resources);
  const actionSetDocument = await loadAssetDocumentByLinkedKey(gameTreePath, asText(linkedAssets.actionSet), resources);
  const mechanicsDocument = await loadAssetDocumentFromRef(gameData.mechanicsAsset, resources);

  const infoSections = normalizeInfoSections(
    asArray(infoData.sections).length > 0 ? asArray(infoData.sections) : fallbackSections,
  );
  const generatedSections = [
    buildRulesSection(rulesData, dataOf(actionSetDocument)),
    buildStrategySection(strategyData),
    buildScoringSection(scoringData, dataOf(validationDocument)),
    buildDeckSection(gameData, rulesData, scoringData, dataOf(deckModelDocument)),
    buildSystemsSection(infoData, dataOf(mechanicsDocument), dataOf(actionSetDocument)),
  ].filter((section): section is PageSection => section !== null);
  const existingTabs = new Set(infoSections.map((section) => section.tabLabel.toLowerCase()));

  return {
    sections: [
      ...infoSections,
      ...generatedSections.filter((section) => !existingTabs.has(section.tabLabel.toLowerCase())),
    ],
    summary: buildSummary(gameData, infoData, rulesData, scoringData),
  };
}

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function dataOf(document: unknown): LooseRecord {
  return asRecord(asRecord(document).data);
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

async function loadAssetDocumentFromRef(ref: unknown, resources: Array<{ guid?: string; path?: string; assetType?: string }>): Promise<LooseRecord | null> {
  const refRecord = asRecord(ref);
  const guid = asText(refRecord.guid) || findGuidByPath(resources, asText(refRecord.path), asText(refRecord.assetType));
  return guid ? await loadRawAssetDocumentByGuid(guid) : null;
}

async function loadAssetDocumentByPath(
  path: string,
  resources: Array<{ guid?: string; path?: string; assetType?: string }>,
  assetType = '',
): Promise<LooseRecord | null> {
  const guid = findGuidByPath(resources, path, assetType);
  return guid ? await loadRawAssetDocumentByGuid(guid) : null;
}

async function loadAssetDocumentByLinkedKey(
  gameTreePath: string,
  fileName: string,
  resources: Array<{ guid?: string; path?: string; assetType?: string }>,
): Promise<LooseRecord | null> {
  if (!gameTreePath || !fileName) {
    return null;
  }

  const basePath = gameTreePath.replace(/\\/g, '/').replace(/\/[^/]*$/, '');
  const guid = findGuidByPath(resources, `${basePath}/${fileName}`);
  return guid ? await loadRawAssetDocumentByGuid(guid) : null;
}

function findGuidByPath(resources: Array<{ guid?: string; path?: string; assetType?: string }>, path: string, assetType = ''): string {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    return '';
  }

  return resources.find((resource) => (
    resource.guid &&
    normalizePath(resource.path ?? '') === normalizedPath &&
    (!assetType || resource.assetType === assetType)
  ))?.guid ?? '';
}

function normalizeInfoSections(values: unknown[]): PageSection[] {
  return values
    .map((value) => asRecord(value))
    .filter((section) => asText(section.tabLabel))
    .map((section, index) => ({
      ...section,
      tabLabel: index === 0 ? 'About' : cleanText(asText(section.tabLabel)),
      pages: asArray(section.pages).map((page) => normalizePage(page)),
    } as PageSection));
}

function normalizePage(value: unknown): Page {
  const page = asRecord(value);
  return {
    title: cleanText(asText(page.title)),
    subtitle: cleanText(asText(page.subtitle)),
    content: asArray(page.content).map((block) => normalizeBlock(block)),
    linkedAssets: asArray(page.linkedAssets).map(asText).filter(Boolean),
  };
}

function normalizeBlock(value: unknown): ContentBlock {
  const block = asRecord(value);
  const type = asText(block.type);
  if (type === 'rule-block') {
    return {
      ...block,
      title: cleanText(asText(block.title)),
      content: asArray(block.content).map((child) => normalizeBlock(child)),
    } as ContentBlock;
  }
  if (type === 'list') {
    return {
      ...block,
      items: asArray(block.items).map((item) => ({
        ...asRecord(item),
        text: cleanText(asText(asRecord(item).text)),
      })),
    } as ContentBlock;
  }
  if ('text' in block) {
    return { ...block, text: cleanText(asText(block.text)) } as ContentBlock;
  }
  return block as ContentBlock;
}

function cleanText(value: string): string {
  return value
    .replace(/minimum viable playable table/gi, 'playable table')
    .replace(/local pilot/gi, 'local match')
    .replace(/playable pilot/gi, 'playable match')
    .replace(/pilot rule set/gi, 'rules at a glance')
    .replace(/\bpilot\b/gi, 'match')
    .trim();
}

function buildSummary(gameData: LooseRecord, infoData: LooseRecord, rulesData: LooseRecord, scoringData: LooseRecord): GameDetailAssetSummary {
  const playerCount = asRecord(rulesData.playerCount);
  const setup = asRecord(rulesData.setup);
  return {
    title: asText(asRecord(infoData.hero).title) || asText(gameData.displayName) || 'Claim',
    subtitle: cleanText(asText(infoData.tagline) || asText(asRecord(infoData.hero).subtitle) || asText(gameData.tagline)),
    description: cleanText(asText(infoData.description) || asText(gameData.description)),
    tags: asArray(infoData.tags).map(asText).filter(Boolean),
    metrics: [
      metric('Players', formatRange(asNumber(playerCount.min) ?? asNumber(gameData.minPlayers), asNumber(playerCount.max) ?? asNumber(gameData.maxPlayers))),
      metric('Deck', asText(setup.deck) || asText(asRecord(asRecord(scoringData.scoringRules).deckAsset).displayName) || 'Standard 52'),
      metric('Goal', `Final score ${asNumber(scoringData.targetScore) ?? asNumber(asRecord(rulesData.showdownRules).minimumFinalScore) ?? 27}+`),
      metric('Rounds', `${asNumber(setup.maxRounds) ?? asNumber(gameData.maxRounds) ?? 10}`),
      metric('Timer', `${asNumber(asRecord(rulesData.turnRules).timerSeconds) ?? asNumber(gameData.turnDuration) ?? 60}s`),
      metric('Bankroll', `${asNumber(setup.startingBankroll) ?? asNumber(gameData.initialPlayerCoins) ?? 1352}`),
    ].filter((item) => item.value),
  };
}

function metric(label: string, value: string): { label: string; value: string } {
  return { label, value };
}

function formatRange(min: number | null, max: number | null): string {
  if (min === null && max === null) {
    return '';
  }
  if (min !== null && max !== null && min !== max) {
    return `${min}-${max}`;
  }
  return `${min ?? max}`;
}

function buildRulesSection(rulesData: LooseRecord, actionSetData: LooseRecord): PageSection | null {
  const rulesById = new Map(asArray(rulesData.rules).map((rule) => {
    const record = asRecord(rule);
    return [asText(record.id), asText(record.text)] as const;
  }));
  const groups = asArray(rulesData.ruleGroups).map(asRecord).filter((group) => asText(group.label));
  const pages: Page[] = groups.map((group) => ({
    title: asText(group.label),
    subtitle: 'Authoritative rule group',
    content: [
      ruleBlock(asText(group.label), [
        list(asArray(group.ruleIds)
          .map(asText)
          .filter(Boolean)
          .map((id) => `${rulesById.get(id) || id}`)),
      ]),
    ],
  }));

  if (pages.length === 0) {
    const setup = asRecord(rulesData.setup);
    const turnRules = asRecord(rulesData.turnRules);
    const declarationRules = asRecord(rulesData.declarationRules);
    const showdownRules = asRecord(rulesData.showdownRules);
    const scoringRules = asRecord(rulesData.scoringRules);
    const settlementRules = asRecord(rulesData.settlementRules);

    if (Object.keys(setup).length > 0) {
      pages.push({
        title: 'Setup',
        subtitle: 'How each round starts',
        content: [
          setupGrid([
            ['Deck', formatIdentifier(asText(setup.deck))],
            ['Deal', `${asNumber(setup.dealCountPerPlayer) ?? 3} cards per player`],
            ['Opening discard', setup.openingDiscard === true ? 'Enabled' : 'None'],
            ['Stock top', setup.publicStockTop === true ? 'Public' : 'Hidden'],
            ['Discard top', setup.publicDiscardTop === true ? 'Public' : 'Hidden'],
          ]),
        ],
      });
    }

    if (Object.keys(turnRules).length > 0 || Object.keys(declarationRules).length > 0 || Object.keys(showdownRules).length > 0) {
      pages.push({
        title: 'Turn And Showdown',
        subtitle: 'Player turn limits and reveal conditions',
        content: [
          ruleBlock('Turn Rules', [
            list(recordBooleans(turnRules, {
              timerSeconds: (value) => `Turn timer is ${value} seconds.`,
              minHandSize: (value) => `Players must keep at least ${value} cards.`,
              takeLimitPerTurn: (value) => `Take limit per turn: ${value}.`,
              discardLimitPerTurn: (value) => `Discard limit per turn: ${value}.`,
            })),
          ]),
          ruleBlock('Declaration And Showdown', [
            list([
              ...recordBooleans(declarationRules),
              ...recordBooleans(showdownRules, {
                minimumFinalScore: (value) => `Minimum final score to call Showdown: ${value}.`,
                minCardsInHand: (value) => `Minimum hand size at Showdown: ${value}.`,
              }),
            ]),
          ]),
        ],
      });
    }

    if (Object.keys(scoringRules).length > 0 || Object.keys(settlementRules).length > 0) {
      pages.push({
        title: 'Scoring And Settlement',
        subtitle: 'Rule-level score signs and bankroll rules',
        content: [
          ruleBlock('Scoring Rules', [
            list(recordBooleans(scoringRules)),
          ]),
          ruleBlock('Settlement Rules', [
            list(recordBooleans(settlementRules)),
          ]),
        ],
      });
    }
  }

  if (pages.length === 0) {
    return null;
  }

  const edgeCases = asArray(rulesData.edgeCaseRules).map(asRecord).filter((edgeCase) => asText(edgeCase.text));
  if (edgeCases.length > 0) {
    pages.push({
      title: 'Edge Cases',
      subtitle: 'Boundary rules that affect table play',
      content: [
        ruleBlock('Edge Cases', [
          list(edgeCases.map((edgeCase) => asText(edgeCase.text))),
        ]),
      ],
    });
  }

  const actions = asRecord(actionSetData.actions);
  if (Object.keys(actions).length > 0) {
    pages.push({
      title: 'Player Actions',
      subtitle: 'Legal choices at the table',
      content: Object.entries(actions).map(([id, value]) => {
        const action = asRecord(value);
        return ruleBlock(formatIdentifier(id), [
          paragraph(asText(action.description)),
          paragraph(asText(action.constraints)),
        ]);
      }),
    });
  }

  return { type: 'rules', tabLabel: 'Rules', pages };
}

function buildScoringSection(scoringData: LooseRecord, validationData: LooseRecord): PageSection | null {
  if (Object.keys(scoringData).length === 0) {
    return null;
  }

  const cardValues = asRecord(scoringData.cardValues);
  const examples = asArray(validationData.validationSuites)
    .flatMap((suite) => asArray(asRecord(suite).fixtures))
    .map(asRecord)
    .filter((fixture) => asText(fixture.purpose) === 'scoring');

  const pages: Page[] = [
    {
      title: 'Scoring Model',
      subtitle: asText(scoringData.scoringProfileId),
      content: [
        paragraph(asText(scoringData.description)),
        formula(asText(scoringData.scoringFormula), 'Final score'),
        ruleBlock('Priority Order', [
          list(asArray(scoringData.priorityOrder).map(asText).filter(Boolean).map(formatIdentifier), 'ordered'),
        ]),
      ],
    },
    {
      title: 'Card Values',
      subtitle: 'Rank values used by Claim scoring',
      content: [
        cardValuesBlock(cardValues),
        paragraph(`Ace adjacency: ${asArray(asRecord(scoringData.scoringRules).aceAdjacency).map(asText).join(', ') || 'King and 2'}.`),
        paragraph(`Run policy: ${formatIdentifier(asText(asRecord(scoringData.scoringRules).runPolicy))}.`),
      ],
    },
    {
      title: 'Settlement',
      subtitle: 'How scores become bankroll movement',
      content: [
        paragraph(asText(scoringData.settlement)),
        ruleBlock('Settlement Policy', [
          list(Object.entries(asRecord(asRecord(scoringData.scoringRules).settlement))
            .filter(([, value]) => value === true)
            .map(([key]) => formatIdentifier(key))),
        ]),
      ],
    },
  ];

  if (examples.length > 0) {
    pages.push({
      title: 'Examples',
      subtitle: 'Executable scoring fixtures',
      content: examples.map((fixture) => example(
        asText(fixture.title),
        `${asArray(fixture.hand).map(asText).join(', ')}${fixture.declaredSuit ? ` declared as ${asText(fixture.declaredSuit)}` : ' undeclared'}. ${asText(fixture.explanation)}`,
        `Expected final score: ${asNumber(fixture.expectedFinalScore) ?? 0}`,
      )),
    });
  }

  return { type: 'scoring', tabLabel: 'Scoring', pages };
}

function buildDeckSection(gameData: LooseRecord, rulesData: LooseRecord, scoringData: LooseRecord, deckModelData: LooseRecord): PageSection | null {
  const setup = asRecord(rulesData.setup);
  const deckModel = asRecord(deckModelData.deckModel);
  const handRanks = asRecord(deckModelData.handRanks);
  const scoringRules = asRecord(scoringData.scoringRules);

  return {
    type: 'custom',
    tabLabel: 'Deck & Ranking',
    pages: [
      {
        title: 'Deck Composition',
        subtitle: 'Asset-backed card set used by this game',
        content: [
          setupGrid([
            ['Deck', asText(deckModel.includedCards) || asText(setup.deck) || 'Standard 52'],
            ['Deck count', `${asNumber(deckModel.deckCount) ?? asNumber(gameData.minDecks) ?? 1}`],
            ['Opening hand', `${asNumber(deckModelData.initialHandSize) ?? asNumber(setup.dealCountPerPlayer) ?? 3} cards`],
            ['Stock top', asRecord(deckModelData.drawConfig).stockTopVisible === true ? 'Visible' : 'Hidden'],
            ['Discard top', asRecord(deckModelData.drawConfig).discardTopVisible === true ? 'Visible' : 'Hidden'],
            ['Jokers', deckModel.jokers === true ? 'Included' : 'None'],
          ]),
          paragraph(`Deck asset: ${asText(setup.deckAsset) || asText(asRecord(scoringRules.deckAsset).path)}.`),
          paragraph(`Ranking asset: ${asText(setup.cardRankingAsset) || asText(asRecord(scoringData.cardRankingAsset).path)}.`),
        ],
      },
      {
        title: 'Ranking Logic',
        subtitle: 'How cards are ordered for runs and scoring',
        content: [
          cardValuesBlock(asRecord(scoringData.cardValues)),
          ruleBlock('Run Rules', [
            list([
              `Rank cycle: ${asArray(handRanks.rankCycle).join(', ') || asArray(scoringRules.rankCycle).join(', ')}.`,
              `Ace bridge: ${asArray(handRanks.aceAdjacency).map(asText).join(', ') || asArray(scoringRules.aceAdjacency).map(asText).join(', ')}.`,
              `Suit scope: ${formatIdentifier(asText(handRanks.suitScope) || 'same_suit_only')}.`,
              `Run policy: ${formatIdentifier(asText(handRanks.runPolicy) || asText(scoringRules.runPolicy))}.`,
            ]),
          ]),
        ],
      },
    ],
  };
}

function buildStrategySection(strategyData: LooseRecord): PageSection | null {
  if (Object.keys(strategyData).length === 0) {
    return null;
  }

  const botProfile = asRecord(strategyData.botProfile);
  return {
    type: 'strategy',
    tabLabel: 'Strategy',
    pages: [
      {
        title: 'Table Strategy',
        subtitle: 'Player-facing guidance',
        content: [
          ruleBlock('Practical Priorities', [
            list(splitLines(asText(strategyData.Player))),
          ]),
        ],
      },
      {
        title: 'AI Opponents',
        subtitle: 'Deterministic table behavior',
        content: [
          setupGrid([
            ['Preferred suit', formatIdentifier(asText(botProfile.preferredSuitPolicy))],
            ['Declaration', formatIdentifier(asText(botProfile.declarationPolicy))],
            ['Discard', formatIdentifier(asText(botProfile.discardPolicy))],
            ['Take', formatIdentifier(asText(botProfile.takePolicy))],
            ['Showdown', formatIdentifier(asText(botProfile.showdownPolicy))],
          ]),
          paragraph(asText(asRecord(strategyData.legalActionEvaluator).hiddenInformationPolicy)),
        ],
      },
    ],
  };
}

function buildSystemsSection(infoData: LooseRecord, mechanicsData: LooseRecord, actionSetData: LooseRecord): PageSection | null {
  const contract = asRecord(infoData.mechanicsContract);
  if (Object.keys(contract).length === 0 && Object.keys(mechanicsData).length === 0) {
    return null;
  }

  const linkedAssets = asRecord(contract.linkedAssetKeys);
  return {
    type: 'custom',
    tabLabel: 'Systems',
    pages: [
      {
        title: 'Mechanics Contract',
        subtitle: 'Runtime assets connected to the game',
        content: [
          setupGrid([
            ['Game', asText(contract.gameId) || asText(mechanicsData.gameId)],
            ['Mechanics', asText(contract.mechanicsId) || asText(mechanicsData.mechanicsId)],
            ['Version', asText(contract.mechanicsVersion) || asText(mechanicsData.mechanicsVersion)],
            ['Family', asText(contract.familyKernel) || asText(mechanicsData.familyKernel)],
            ['Executor', asText(contract.executorId) || asText(mechanicsData.executorId)],
            ['Strategy', asText(contract.strategyExecutorId) || asText(mechanicsData.strategyExecutorId)],
          ]),
        ],
      },
      {
        title: 'Linked Assets',
        subtitle: 'Authoring sources used by this page and runtime',
        content: [
          ruleBlock('Asset Set', [
            list(Object.entries(linkedAssets).map(([key, value]) => `${formatIdentifier(key)}: ${asText(value)}`)),
          ]),
          ruleBlock('Actions', [
            list(asArray(asRecord(actionSetData.actionModel).actionIds).map(asText).filter(Boolean).map(formatIdentifier)),
          ]),
        ],
      },
    ],
  };
}

function paragraph(text: string): ContentBlock {
  return { type: 'paragraph', text: cleanText(text) } as ContentBlock;
}

function list(items: string[], style: 'ordered' | 'unordered' = 'unordered'): ContentBlock {
  return {
    type: 'list',
    style,
    items: items.filter(Boolean).map((text) => ({ text: cleanText(text) })),
  } as ContentBlock;
}

function ruleBlock(title: string, content: ContentBlock[]): ContentBlock {
  return {
    type: 'rule-block',
    title: cleanText(title),
    content,
  } as ContentBlock;
}

function formula(value: string, label: string): ContentBlock {
  return { type: 'formula', formula: cleanText(value), label } as ContentBlock;
}

function example(title: string, text: string, result: string): ContentBlock {
  return { type: 'example', title: cleanText(title), text: cleanText(text), result } as ContentBlock;
}

function setupGrid(items: Array<[string, string]>): ContentBlock {
  return {
    type: 'setup-grid',
    items: items
      .filter(([, value]) => value)
      .map(([label, detail]) => ({ icon: '', label, detail: cleanText(detail) })),
  } as ContentBlock;
}

function cardValuesBlock(values: LooseRecord): ContentBlock {
  const rankOrder = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  return {
    type: 'card-values',
    values: rankOrder
      .filter((rank) => asNumber(values[rank]) !== null)
      .map((rank) => ({ card: rank, value: asNumber(values[rank]) ?? 0 })),
  } as ContentBlock;
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.replace(/^-+\s*/, '').trim())
    .filter(Boolean)
    .map(cleanText);
}

function recordBooleans(
  record: LooseRecord,
  formatters: Record<string, (value: string | number | boolean) => string> = {},
): string[] {
  return Object.entries(record)
    .filter(([, value]) => value !== null && value !== undefined && value !== false)
    .map(([key, value]) => {
      const primitive = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? value
        : '';
      const formatter = formatters[key];
      if (formatter && primitive !== '') {
        return formatter(primitive);
      }
      if (typeof value === 'boolean') {
        return formatIdentifier(key);
      }
      if (typeof value === 'string' || typeof value === 'number') {
        return `${formatIdentifier(key)}: ${value}`;
      }
      return formatIdentifier(key);
    });
}

function formatIdentifier(value: string): string {
  return cleanText(value)
    .replace(/[_.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
