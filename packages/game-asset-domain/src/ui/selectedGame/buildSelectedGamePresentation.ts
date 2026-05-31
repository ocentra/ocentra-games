import {
  DEFAULT_SELECTED_GAME_CONTENT_PLAN,
  type SelectedGameContentPlan,
  type SelectedGamePresentation,
  type SelectedGamePresentationChunk,
  type SelectedGamePresentationMetric,
  type SelectedGamePresentationTab,
  type SelectedGamePresentationVisualRef,
  type SelectedGameTabId,
  selectedGameActionsForAuthoredState,
} from '@/ui/selectedGame/SelectedGamePresentation';

type LooseRecord = Record<string, unknown>;

interface PublicGameInfoPage extends LooseRecord {
  pageIndex: number;
  sectionIndex: number;
  sectionLabel: string;
}

export interface BuildSelectedGamePresentationInput {
  layout?: unknown;
  gameMode?: unknown;
  gameInfo?: unknown;
  rules?: unknown;
  strategy?: unknown;
  scoring?: unknown;
  deckModel?: unknown;
  deck?: unknown;
  ranking?: unknown;
  mechanics?: unknown;
  actions?: unknown;
  validationFixtures?: unknown;
  images?: unknown;
}

const TAB_LABELS: Record<SelectedGameTabId, string> = {
  about: 'About',
  rules: 'Rules',
  deck: 'Deck',
  ranking: 'Ranking',
  scoring: 'Scoring',
  strategy: 'Strategy',
  systems: 'Systems',
};

const TAB_TIPS: Record<SelectedGameTabId, string> = {
  about: 'Start with the table goal, player count, and what creates pressure.',
  rules: 'Read setup and turn flow first, then use edge cases when a move feels ambiguous.',
  deck: 'Deck configuration controls what can appear at the table before any strategy matters.',
  ranking: 'Ranking explains why one card is valuable, dangerous, or useful as a blocker.',
  scoring: 'Check the formula and examples before deciding when a hand is ready.',
  strategy: 'Use public information to read intent without overcommitting to blockers.',
  systems: 'These assets describe what the runtime can execute, validate, and explain.',
};

const EMPTY_PRESENTATION: SelectedGamePresentation = {
  hero: {
    title: 'Game',
    taglineLines: [],
    badges: [],
    media: [],
  },
  sideA: {
    stats: [],
    media: [],
  },
  tabs: [],
  quickInfo: {
    about: [],
    rules: [],
    deck: [],
    ranking: [],
    scoring: [],
    strategy: [],
    systems: [],
  },
  tip: TAB_TIPS,
  actions: selectedGameActionsForAuthoredState(true),
};

export function buildSelectedGamePresentation(input: BuildSelectedGamePresentationInput): SelectedGamePresentation {
  const layoutData = dataOf(input.layout);
  const contentPlan = normalizeContentPlan(layoutData.contentPlan);
  const gameMode = dataOf(input.gameMode);
  const gameInfo = dataOf(input.gameInfo);
  const rules = dataOf(input.rules);
  const strategy = dataOf(input.strategy);
  const scoring = dataOf(input.scoring);
  const deckModel = dataOf(input.deckModel);
  const deck = dataOf(input.deck);
  const ranking = dataOf(input.ranking);
  const mechanics = dataOf(input.mechanics);
  const actions = dataOf(input.actions);
  const validationFixtures = dataOf(input.validationFixtures);
  const images = dataOf(input.images);

  const media = buildMedia(gameMode, gameInfo, images);
  const tabs = contentPlan.tabs
    .filter((tab) => tab.enabled)
    .map((tab): SelectedGamePresentationTab => ({
      id: tab.id,
      label: tab.label || TAB_LABELS[tab.id],
      chunks: chunksForTab(tab.id, {
        gameMode,
        gameInfo,
        rules,
        strategy,
        scoring,
        deckModel,
        deck,
        ranking,
        mechanics,
        actions,
        validationFixtures,
      }).slice(0, tab.maxChunks),
      tip: TAB_TIPS[tab.id],
    }));

  return {
    ...EMPTY_PRESENTATION,
    hero: {
      title: firstText(asRecord(gameInfo.hero).title, gameMode.displayName, gameInfo.title, 'Game'),
      taglineLines: splitSentences(firstText(gameInfo.tagline, asRecord(gameInfo.hero).subtitle, gameMode.tagline, gameInfo.description)).slice(0, 2),
      badges: [
        ...asArray(gameInfo.tags).map(asText),
        ...asArray(gameInfo.featuredTopBadges).map((badge) => asText(asRecord(badge).label)),
      ].filter(Boolean).slice(0, 4),
      media,
    },
    sideA: {
      stats: buildStats(gameMode, gameInfo, rules, scoring, deckModel),
      media,
    },
    tabs,
    quickInfo: {
      about: quickInfoFor(tabs, 'about'),
      rules: quickInfoFor(tabs, 'rules'),
      deck: quickInfoFor(tabs, 'deck'),
      ranking: quickInfoFor(tabs, 'ranking'),
      scoring: quickInfoFor(tabs, 'scoring'),
      strategy: quickInfoFor(tabs, 'strategy'),
      systems: quickInfoFor(tabs, 'systems'),
    },
    tip: TAB_TIPS,
    actions: selectedGameActionsForAuthoredState(true),
  };
}

function chunksForTab(tab: SelectedGameTabId, data: Record<string, LooseRecord>): SelectedGamePresentationChunk[] {
  switch (tab) {
    case 'about':
      return buildAboutChunks(data.gameInfo);
    case 'rules':
      return buildRuleChunks(data.rules, data.validationFixtures);
    case 'deck':
      return buildDeckChunks(data.gameMode, data.rules, data.deckModel, data.deck);
    case 'ranking':
      return buildRankingChunks(data.scoring, data.deckModel, data.ranking, data.validationFixtures);
    case 'scoring':
      return buildScoringChunks(data.scoring, data.validationFixtures);
    case 'strategy':
      return buildStrategyChunks(data.strategy, data.gameInfo);
    case 'systems':
      return buildSystemChunks(data.gameInfo, data.mechanics, data.actions, data.validationFixtures);
  }
}

function buildAboutChunks(gameInfo: LooseRecord): SelectedGamePresentationChunk[] {
  const chunks: SelectedGamePresentationChunk[] = [];
  const pages = publicGameInfoPages(gameInfo);
  const playerText = firstText(gameInfo.Player, gameInfo.shortDescription, gameInfo.description);
  const overviewPage = pages.find((page) => titleMatches(page, /\boverview\b/i));
  const overviewBody = uniqueLines([
    ...splitSentences(playerText).slice(0, 3),
    ...textFromBlocks(asArray(overviewPage?.content)).slice(0, 2),
  ]).slice(0, 4);
  const overviewBullets = bulletsFromBlocks(asArray(overviewPage?.content)).slice(0, 4);
  if (overviewBody.length > 0 || overviewBullets.length > 0) {
    appendPublicChunk(chunks, chunk('about-overview', 'Overview', overviewBody, overviewBullets, 'text', 'Overview'));
  }

  const history = asRecord(gameInfo.historyContent);
  const historyBody = splitSentences(firstText(history.origins, history.evolution, history.cultural)).slice(0, 3);
  const historyBullets = asArray(history.timeline).map(asText).filter(Boolean).slice(0, 5);
  if (historyBody.length > 0 || historyBullets.length > 0) {
    appendPublicChunk(chunks, chunk('about-history', 'History', historyBody, historyBullets, 'text', 'History'));
  }

  const originBullets = buildOriginBullets(gameInfo, history);
  if (originBullets.length > 0) {
    appendPublicChunk(chunks, chunk('about-origin', 'Origin', [], originBullets, 'list', 'Origin'));
  }

  const howToBullets = buildHowToBullets(gameInfo, pages);
  if (howToBullets.length > 0) {
    appendPublicChunk(chunks, chunk('about-how-to-play', 'How To Play', [], howToBullets, 'list', 'How'));
  }

  const variations = asArray(asRecord(gameInfo.variationsContent).list).map(asRecord);
  if (variations.length > 0) {
    appendPublicChunk(chunks, chunk('about-variations', 'Variants', [], variations.map((item) => `${firstText(item.name, item.id)}: ${firstText(item.description)}`).filter(Boolean).slice(0, 4), 'list', 'Variants'));
  }

  const profileBullets = buildProfileBullets(gameInfo);
  if (profileBullets.length > 0) {
    appendPublicChunk(chunks, chunk('about-profile', 'Profile', [], profileBullets, 'metric', 'Profile'));
  }

  for (const item of pages) {
    if (chunks.length >= 6) {
      break;
    }
    if (titleMatches(item, /\b(overview|history|origin|setup|turn|showdown|score|scoring|strategy|variant|source|provenance|asset|executable|mechanic|validation|fixture|bot|llm)\b/i)) {
      continue;
    }
    appendPublicChunk(chunks, chunk(`about-page-${item.sectionIndex}-${item.pageIndex}`, firstText(item.title, item.sectionLabel), textFromBlocks(asArray(item.content)).slice(0, 2), bulletsFromBlocks(asArray(item.content)).slice(0, 5), 'text', firstText(item.subtitle, item.sectionLabel)));
  }

  return chunks;
}

function publicGameInfoPages(gameInfo: LooseRecord): PublicGameInfoPage[] {
  return asArray(gameInfo.sections).flatMap((section, sectionIndex) => {
    const sectionRecord = asRecord(section);
    const sectionType = firstText(sectionRecord.type);
    const sectionLabel = firstText(sectionRecord.tabLabel, `About ${sectionIndex + 1}`);
    if (isEditorOnlyChunkTitle(sectionLabel) || (sectionType && sectionType !== 'about' && !/\b(about|overview|how|plays?)\b/i.test(sectionLabel))) {
      return [];
    }
    return asArray(sectionRecord.pages)
      .map((page, pageIndex): PublicGameInfoPage => ({
        ...asRecord(page),
        pageIndex,
        sectionIndex,
        sectionLabel,
      }))
      .filter((page) => !isEditorOnlyChunkTitle(firstText(page.title, page.sectionLabel)));
  });
}

function titleMatches(page: LooseRecord, pattern: RegExp): boolean {
  return pattern.test(firstText(page.title, page.subtitle, page.sectionLabel));
}

function buildOriginBullets(gameInfo: LooseRecord, history: LooseRecord): string[] {
  const originCountries = asArray(history.originCountries).map(asText).filter(Boolean);
  const names = asArray(gameInfo.alsoKnownAs).map(asText).filter(Boolean);
  return uniqueLines([
    line('Origin', firstText(gameInfo.origin, originCountries.join(', '))),
    line('Original name', firstText(gameInfo.originName)),
    line('Countries', originCountries.join(', ')),
    line('Also known as', names.join(', ')),
    line('Category', [firstText(gameInfo.gameCategory), firstText(gameInfo.subcategory)].filter(Boolean).join(' / ')),
  ]);
}

function buildHowToBullets(gameInfo: LooseRecord, pages: PublicGameInfoPage[]): string[] {
  const setup = asRecord(gameInfo.setupContent);
  const setupBullets = uniqueLines([
    line('Players', setup.players),
    line('Deck', setup.deck),
    line('Equipment', setup.equipment),
    line('Deal', setup.dealing),
  ]);
  const pageBullets = pages
    .filter((page) => titleMatches(page, /\b(setup|turn|showdown|how|play)\b/i))
    .flatMap((page) => {
      const title = firstText(page.title, page.sectionLabel);
      const bullets = bulletsFromBlocks(asArray(page.content));
      const text = textFromBlocks(asArray(page.content)).slice(0, 2);
      return uniqueLines([
        ...bullets,
        ...text.map((value) => (title ? `${title}: ${value}` : value)),
      ]).slice(0, 4);
    });
  return uniqueLines([...setupBullets, ...pageBullets]).slice(0, 10);
}

function buildProfileBullets(gameInfo: LooseRecord): string[] {
  return uniqueLines([
    line('Players', firstText(gameInfo.playersDisplay, formatRange(firstNumber(gameInfo.minPlayers), firstNumber(gameInfo.maxPlayers)))),
    line('Duration', gameInfo.duration),
    line('Difficulty', gameInfo.difficulty),
    line('Deck', gameInfo.deck),
    line('Mode', gameInfo.playerMode),
  ]);
}

function buildRuleChunks(rules: LooseRecord, validationFixtures: LooseRecord): SelectedGamePresentationChunk[] {
  const rulesById = new Map(asArray(rules.rules).map((rule) => {
    const record = asRecord(rule);
    return [asText(record.id), asText(record.text)] as const;
  }));

  const groups = asArray(rules.ruleGroups).map(asRecord).filter((group) => asText(group.label));
  const chunks = groups.map((group) => chunk(
    `rules-${asText(group.id) || asText(group.label)}`,
    asText(group.label),
    [],
    asArray(group.ruleIds).map(asText).map((id) => rulesById.get(id) || id).filter(Boolean).slice(0, 5),
    'list',
    'Rule group',
  ));

  if (chunks.length === 0 && asText(rules.Player)) {
    chunks.push(chunk('rules-player', 'Rules At A Glance', splitSentences(asText(rules.Player)), [], 'text', 'Rules'));
  }

  const edgeCases = asArray(rules.edgeCaseRules).map(asRecord).map((edge) => asText(edge.text)).filter(Boolean);
  if (edgeCases.length > 0) {
    chunks.push(chunk('rules-edge-cases', 'Edge Cases', [], edgeCases.slice(0, 5), 'list', 'Boundary rules'));
  }

  const exampleHands = asArray(rules.exampleHands).map(asText).filter(Boolean);
  if (exampleHands.length > 0) {
    chunks.push(chunk('rules-example-hands', 'Example Hands', [], exampleHands.slice(0, 5), 'example', 'Examples'));
  }

  const runtimeExamples = validationFixturesForPurposes(validationFixtures, ['setup', 'flow']);
  if (runtimeExamples.length > 0) {
    chunks.push(chunk('rules-runtime-examples', 'Runtime Examples', [], runtimeExamples.map(formatValidationFixture).slice(0, 5), 'example', 'Fixtures'));
  }

  return chunks;
}

function buildDeckChunks(gameMode: LooseRecord, rules: LooseRecord, deckModel: LooseRecord, deck: LooseRecord): SelectedGamePresentationChunk[] {
  if (
    Object.keys(gameMode).length === 0
    && Object.keys(rules).length === 0
    && Object.keys(deckModel).length === 0
    && Object.keys(deck).length === 0
  ) {
    return [];
  }

  const refs = [
    assetRef(asRecord(asRecord(deckModel.assetRefs).deck), 'deck'),
    assetRef(asRecord(gameMode.deckAsset), 'deck'),
  ].filter((ref): ref is SelectedGamePresentationVisualRef => ref !== null);
  const setup = asRecord(rules.setup);
  const model = asRecord(deckModel.deckModel);
  const draw = asRecord(deckModel.drawConfig);
  const discard = asRecord(deckModel.discardConfig);
  const bullets = [
    line('Deck', firstText(deckModel.deckType, model.includedCards, setup.deck, deck.displayName)),
    line('Deck count', firstText(deckModel.deckCount, model.deckCount, gameMode.minDecks)),
    line('Opening hand', firstText(deckModel.initialHandSize, setup.dealCountPerPlayer)),
    line('Draw sources', asArray(draw.sources).map(asText).filter(Boolean).join(', ')),
    line('Discard limit', firstText(discard.maxDiscardPerTurn, setup.discardLimitPerTurn)),
  ].filter(Boolean);

  return [
    chunk('deck-model', 'Deck Model', [firstText(deckModel.modelId, 'Asset-backed deck setup')], bullets, 'visual', 'Deck', refs),
  ];
}

function buildRankingChunks(scoring: LooseRecord, deckModel: LooseRecord, ranking: LooseRecord, validationFixtures: LooseRecord): SelectedGamePresentationChunk[] {
  if (
    Object.keys(scoring).length === 0
    && Object.keys(deckModel).length === 0
    && Object.keys(ranking).length === 0
  ) {
    return [];
  }

  const refs = [
    assetRef(asRecord(asRecord(deckModel.assetRefs).ranking), 'ranking'),
    assetRef(asRecord(scoring.rankingAsset), 'ranking'),
  ].filter((ref): ref is SelectedGamePresentationVisualRef => ref !== null);
  const handRanks = asRecord(deckModel.handRanks);
  const scoringRules = asRecord(scoring.scoringRules);
  const bullets = [
    line('Rank cycle', [...asArray(handRanks.rankCycle), ...asArray(scoringRules.rankCycle)].slice(0, 13).map(String).join(', ')),
    line('Ace adjacency', firstText(asArray(handRanks.aceAdjacency).map(asText).join(', '), asArray(scoringRules.aceAdjacency).map(asText).join(', '))),
    line('Run policy', firstText(handRanks.runPolicy, scoringRules.runPolicy)),
    line('Suit scope', firstText(handRanks.suitScope, scoringRules.suitSet)),
    line('Ranking asset', firstText(ranking.displayName, asRecord(scoring.rankingAsset).displayName)),
  ].filter(Boolean);
  const chunks = [
    chunk('ranking-model', 'Card Ranking', [firstText(handRanks.valueSystem, scoring.description)], bullets, 'visual', 'Ranking', refs),
  ];
  const examples = validationFixturesForPurposes(validationFixtures, ['ranking']);
  if (examples.length > 0) {
    chunks.push(chunk('ranking-examples', 'Ranking Examples', [], examples.map(formatValidationFixture).slice(0, 5), 'example', 'Examples'));
  }
  return chunks;
}

function buildScoringChunks(scoring: LooseRecord, validationFixtures: LooseRecord): SelectedGamePresentationChunk[] {
  const chunks: SelectedGamePresentationChunk[] = [];
  if (Object.keys(scoring).length > 0) {
    chunks.push(chunk('scoring-formula', 'Scoring Model', splitSentences(firstText(scoring.description, scoring.scoringFormula)).slice(0, 2), [
      line('Target score', firstText(scoring.targetScore, scoring.showdownMinimumFinalScore)),
      line('Win condition', asText(scoring.winCondition)),
      line('Direction', asText(scoring.scoringDirection)),
    ].filter(Boolean), 'text', 'Formula'));
  }

  const cardValues = asRecord(scoring.cardValues);
  const values = Object.entries(cardValues).map(([card, value]) => `${card}=${String(value)}`);
  if (values.length > 0) {
    chunks.push(chunk('scoring-card-values', 'Card Values', [], values, 'metric', 'Values'));
  }

  const examples = validationFixturesForPurposes(validationFixtures, ['scoring']);
  if (examples.length > 0) {
    chunks.push(chunk('scoring-examples', 'Examples', [], examples.map(formatValidationFixture).filter(Boolean).slice(0, 5), 'example', 'Examples'));
  }

  return chunks;
}

function buildStrategyChunks(strategy: LooseRecord, gameInfo: LooseRecord): SelectedGamePresentationChunk[] {
  const chunks: SelectedGamePresentationChunk[] = [];
  const player = firstText(strategy.Player, gameInfo.Player);
  if (player) {
    chunks.push(chunk('strategy-player', 'Player Strategy', [], splitLines(player).slice(0, 5), 'list', 'Strategy'));
  }

  const bot = asRecord(strategy.botProfile);
  if (Object.keys(bot).length > 0) {
    chunks.push(chunk('strategy-bot', 'Opponent Model', [firstText(asRecord(gameInfo.aiContent).considerations)], [
      line('Preferred suit', asText(bot.preferredSuitPolicy)),
      line('Declaration', asText(bot.declarationPolicy)),
      line('Discard', asText(bot.discardPolicy)),
      line('Showdown', asText(bot.showdownPolicy)),
    ].filter(Boolean), 'text', 'AI'));
  }

  return chunks;
}

function buildSystemChunks(gameInfo: LooseRecord, mechanics: LooseRecord, actions: LooseRecord, validationFixtures: LooseRecord): SelectedGamePresentationChunk[] {
  const contract = asRecord(gameInfo.mechanicsContract);
  const chunks: SelectedGamePresentationChunk[] = [];
  if (Object.keys(contract).length > 0 || Object.keys(mechanics).length > 0) {
    chunks.push(chunk('systems-mechanics', 'Mechanics Contract', [], [
      line('Mechanics', firstText(contract.mechanicsId, mechanics.mechanicsId)),
      line('Version', firstText(contract.mechanicsVersion, mechanics.mechanicsVersion)),
      line('Family', firstText(contract.familyKernel, mechanics.familyKernel)),
      line('Executor', firstText(contract.executorId, mechanics.executorId)),
      line('Strategy executor', firstText(contract.strategyExecutorId, mechanics.strategyExecutorId)),
    ].filter(Boolean), 'metric', 'Runtime'));
  }

  const linkedAssets = Object.entries(asRecord(contract.linkedAssetKeys))
    .map(([key, value]) => line(formatIdentifier(key), value))
    .filter(Boolean);
  if (linkedAssets.length > 0) {
    chunks.push(chunk('systems-linked-assets', 'Linked Assets', [], linkedAssets.slice(0, 8), 'list', 'Asset contract'));
  }

  const actionIds = [
    ...asArray(asRecord(actions.actionModel).actionIds).map(asText),
    ...Object.keys(asRecord(actions.actions)),
  ].filter(Boolean);
  if (actionIds.length > 0) {
    chunks.push(chunk('systems-actions', 'Actions', [], actionIds.map(formatIdentifier).slice(0, 8), 'list', 'Action model'));
  }

  const fixtures = validationFixturesForPurposes(validationFixtures, []);
  if (fixtures.length > 0) {
    chunks.push(chunk('systems-validation-fixtures', 'Validation Fixtures', [], fixtures.map(formatValidationFixture).slice(0, 6), 'example', 'Validation'));
  }

  return chunks;
}

function validationFixturesForPurposes(validationFixtures: LooseRecord, purposes: readonly string[]): LooseRecord[] {
  const purposeSet = new Set(purposes);
  return asArray(validationFixtures.validationSuites)
    .flatMap((suite) => asArray(asRecord(suite).fixtures))
    .map(asRecord)
    .filter((fixture) => purposeSet.size === 0 || purposeSet.has(asText(fixture.purpose)));
}

function formatValidationFixture(fixture: LooseRecord): string {
  const hand = asArray(fixture.hand).map(asText).filter(Boolean).join(', ');
  const expected = firstText(fixture.expectedFinalScore, fixture.expectedOutcome, fixture.expectedNextPhase, fixture.expectedFirstPhase, fixture.expectedInitialHandSize);
  const detail = uniqueLines([
    line('Hand', hand),
    line('Declared', fixture.declaredSuit),
    line('Debt', fixture.debt),
    line('Expected', expected),
    line('Calculation', fixture.explanation),
  ]).join(' | ');
  return [firstText(fixture.title, fixture.id), detail].filter(Boolean).join(': ');
}

function buildStats(gameMode: LooseRecord, gameInfo: LooseRecord, rules: LooseRecord, scoring: LooseRecord, deckModel: LooseRecord): SelectedGamePresentationMetric[] {
  const playerCount = asRecord(rules.playerCount);
  return [
    metric('Players', formatRange(firstNumber(playerCount.min, gameInfo.minPlayers, gameMode.minPlayers), firstNumber(playerCount.max, gameInfo.maxPlayers, gameMode.maxPlayers)), '#'),
    metric('Deck', firstText(deckModel.deckType, asRecord(rules.setup).deck, gameMode.deckType, 'Cards'), 'D'),
    metric('Goal', `${firstText(scoring.targetScore, scoring.showdownMinimumFinalScore, asRecord(rules.showdownRules).minimumFinalScore) || '0'}+`, 'G'),
    metric('Timer', `${firstText(asRecord(rules.turnRules).timerSeconds, gameMode.turnDuration) || '0'}s`, 'T'),
  ].filter((item) => item.value);
}

function buildMedia(gameMode: LooseRecord, gameInfo: LooseRecord, images: LooseRecord): SelectedGamePresentationVisualRef[] {
  const slides = asArray(images.slides)
    .map(asRecord)
    .map((slide) => ({
      kind: 'image' as const,
      label: firstText(slide.label, slide.alt, 'Game image'),
      imageHash: firstText(slide.imageHash),
    }))
    .filter((slide) => slide.imageHash);
  const refs = [
    ...slides,
    imageRef(firstText(gameMode.bannerImage), 'Banner'),
    imageRef(firstText(gameInfo.gameIconImage, images.logoImageHash), 'Logo'),
  ].filter((ref): ref is SelectedGamePresentationVisualRef => ref !== null);
  return dedupeVisualRefs(refs);
}

function normalizeContentPlan(value: unknown): SelectedGameContentPlan {
  const record = asRecord(value);
  const tabs = asArray(record.tabs)
    .map(asRecord)
    .filter((tab) => isTabId(tab.id))
    .map((tab) => ({
      id: tab.id as SelectedGameTabId,
      enabled: tab.enabled !== false,
      label: firstText(tab.label, TAB_LABELS[tab.id as SelectedGameTabId]),
      source: firstText(tab.source),
      maxChunks: firstNumber(tab.maxChunks) ?? 6,
    }));
  return tabs.length > 0 ? { tabs } : DEFAULT_SELECTED_GAME_CONTENT_PLAN;
}

function quickInfoFor(tabs: SelectedGamePresentationTab[], id: SelectedGameTabId): SelectedGamePresentationChunk[] {
  return tabs.find((tab) => tab.id === id)?.chunks.slice(0, 6) ?? [];
}

function appendPublicChunk(chunks: SelectedGamePresentationChunk[], value: SelectedGamePresentationChunk): void {
  const title = normalizeTitle(value.title);
  if (!title || isEditorOnlyChunkTitle(title) || chunks.some((item) => normalizeTitle(item.title) === title)) {
    return;
  }
  chunks.push(value);
}

function normalizeTitle(value: string): string {
  return cleanText(value).toLowerCase();
}

function isEditorOnlyChunkTitle(value: string): boolean {
  return /\b(source|sources|provenance|scraper|audit)\b/i.test(value);
}

function chunk(
  id: string,
  title: string,
  body: string[],
  bullets: string[],
  kind: SelectedGamePresentationChunk['kind'],
  eyebrow = '',
  visualRefs: SelectedGamePresentationVisualRef[] = [],
): SelectedGamePresentationChunk {
  return {
    id: sanitizeId(id),
    title: cleanText(title),
    eyebrow: cleanText(eyebrow),
    kind,
    body: body.map(cleanText).filter(Boolean),
    bullets: bullets.map(cleanText).filter(Boolean),
    visualRefs,
  };
}

function metric(label: string, value: string, icon: string): SelectedGamePresentationMetric {
  return { label: cleanText(label), value: cleanText(value), icon };
}

function dataOf(value: unknown): LooseRecord {
  const record = asRecord(value);
  const data = asRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
}

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  if (typeof value === 'string') {
    return cleanText(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (Array.isArray(value)) {
      const text = value.map(asText).filter(Boolean).join(' ');
      if (text) return text;
      continue;
    }
    const text = asText(value);
    if (text) return text;
  }
  return '';
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function splitSentences(value: string): string[] {
  return cleanText(value)
    .split(/(?<=[.!?])\s+/)
    .map(cleanText)
    .filter(Boolean);
}

function splitLines(value: string): string[] {
  return cleanText(value)
    .split('\n')
    .map((lineText) => lineText.replace(/^-+\s*/, '').trim())
    .filter(Boolean);
}

function textFromBlocks(blocks: unknown[]): string[] {
  return blocks.flatMap((block) => {
    const record = asRecord(block);
    const children = textFromBlocks(asArray(record.content));
    return [asText(record.text), asText(record.paragraph), asText(record.description), ...children].filter(Boolean);
  });
}

function bulletsFromBlocks(blocks: unknown[]): string[] {
  return blocks.flatMap((block) => {
    const record = asRecord(block);
    const items = asArray(record.items).map((item) => {
      const itemRecord = asRecord(item);
      const label = firstText(itemRecord.label, itemRecord.title);
      const value = firstText(itemRecord.value, itemRecord.text, itemRecord.detail, itemRecord.description);
      if (label && value) {
        return `${label}: ${value}`;
      }
      return firstText(value, label);
    });
    return [...items, ...bulletsFromBlocks(asArray(record.content))].filter(Boolean);
  });
}

function uniqueLines(values: string[]): string[] {
  const seen = new Set<string>();
  return values.map(cleanText).filter((value) => {
    if (!value) {
      return false;
    }
    const key = value.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function assetRef(value: LooseRecord, kind: SelectedGamePresentationVisualRef['kind']): SelectedGamePresentationVisualRef | null {
  const label = firstText(value.displayName, value.path, value.assetType);
  if (!label) {
    return null;
  }
  return {
    kind,
    label,
    guid: firstText(value.guid),
    assetType: firstText(value.assetType),
  };
}

function imageRef(imageHash: string, label: string): SelectedGamePresentationVisualRef | null {
  return imageHash ? { kind: 'image', label, imageHash } : null;
}

function dedupeVisualRefs(refs: SelectedGamePresentationVisualRef[]): SelectedGamePresentationVisualRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.kind}:${ref.guid ?? ref.imageHash ?? ref.label}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function line(label: string, value: unknown): string {
  const text = firstText(value);
  return text ? `${label}: ${text}` : '';
}

function formatRange(min: number | null, max: number | null): string {
  if (min === null && max === null) {
    return '';
  }
  if (min !== null && max !== null && min !== max) {
    return `${min}-${max}`;
  }
  return String(min ?? max ?? '');
}

function formatIdentifier(value: string): string {
  return cleanText(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'chunk';
}

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/minimum viable playable table/gi, 'playable table')
    .replace(/local pilot/gi, 'local match')
    .replace(/playable pilot/gi, 'playable match')
    .replace(/pilot rule set/gi, 'rules at a glance')
    .replace(/\bpilot\b/gi, 'match')
    .trim();
}

function isTabId(value: unknown): value is SelectedGameTabId {
  return value === 'about'
    || value === 'rules'
    || value === 'deck'
    || value === 'ranking'
    || value === 'scoring'
    || value === 'strategy'
    || value === 'systems';
}
