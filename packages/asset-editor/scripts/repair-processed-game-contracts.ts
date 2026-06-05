import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import JSON5 from 'json5';
import { DEFAULT_SELECTED_GAME_CONTENT_PLAN } from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const resourcesRoot = path.resolve(repoRoot, 'packages/asset-editor/Resources');
const gamesRoot = path.resolve(resourcesRoot, 'GameMode/CardGames/Games');
const SETUP_ROUND_ACTION_ID = 'setup_round';
const PUBLIC_JUNK_TEXT_PATTERN = /\[.{1,120}\]|\b(T\.?B\.?D\.?|T\.?B\.A\.?|TODO|FIXME|placeholder|lorem ipsum|fill in|insert here|see pagat|see wikipedia|refer to source|documented in source)\b/i;

interface AssetEnvelope {
  system?: {
    assetType?: string;
    displayName?: string;
    treePath?: string;
    guid?: string;
  };
  data?: Record<string, unknown>;
}

interface AssetWriteStats {
  checksum: string;
  fileSize: number;
}

function findAssetFiles(dir: string, fileList: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findAssetFiles(fullPath, fileList);
      continue;
    }
    if (entry.name.endsWith('.asset')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function readAsset(filePath: string): AssetEnvelope {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as AssetEnvelope;
}

function serializeAsset(asset: AssetEnvelope): string {
  return JSON5.stringify({ system: asset.system, data: asset.data }, null, 2);
}

function writeAsset(filePath: string, asset: AssetEnvelope): AssetWriteStats {
  const content = `${serializeAsset(asset)}\n`;
  fs.writeFileSync(filePath, content, 'utf8');
  return {
    checksum: crypto.createHash('sha256').update(content).digest('hex'),
    fileSize: content.length,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  return JSON.stringify(value, null, 2);
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const numberValue = asOptionalNumber(value);
    if (numberValue !== null) {
      return numberValue;
    }
  }
  return null;
}

function firstNumberFromText(text: unknown, pattern: RegExp): number | null {
  const value = asText(text);
  const match = value.match(pattern);
  if (!match?.[1]) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildDealSummary(source: Record<string, unknown>, initialHandSize: number | null): string {
  const dealing = asText(asRecord(source.setup).dealing);
  const deals = Array.from(dealing.matchAll(/(\d+)(?:\s*-\s*(\d+))?\s+players?\s+(\d+)\s+cards?\s+each/gi))
    .map((match) => {
      const players = match[2] ? `${match[1]}-${match[2]} players` : `${match[1]} players`;
      return `${players}: ${match[3]} cards`;
    });
  if (deals.length > 0) {
    return deals.join('; ');
  }
  if (initialHandSize !== null) {
    return `${initialHandSize} card(s) per player`;
  }
  return firstPublicText(dealing.replace(/\s+/g, ' '), 'deal policy requires source review');
}

function cleanRuleExampleText(value: string): string {
  return value.replace(/\bnull\b/gi, 'none');
}

function sourceSlug(source: Record<string, unknown>): string {
  return firstPublicText(asText(source.filename).replace(/\.json$/i, ''), source.name, 'card-game');
}

function publicSetupEquipment(source: Record<string, unknown>): string {
  const setup = asRecord(source.setup);
  const overview = asRecord(source.overview);
  return firstPublicText(setup.equipment, setup.deck, overview.deck);
}

function authoredRule(id: string, title: string, text: unknown, sourcePath: string): Record<string, unknown> | null {
  const ruleText = publicText(text);
  if (!ruleText) {
    return null;
  }
  return {
    id,
    title,
    text: ruleText,
    sourceFields: [sourcePath],
  };
}

function buildRuleRecords(source: Record<string, unknown>): Record<string, unknown>[] {
  const slug = sourceSlug(source);
  const rules = asRecord(source.rules);
  const setup = asRecord(source.setup);
  const scoring = asRecord(source.scoring);
  return [
    authoredRule(`${slug}.rules.objective`, 'Objective', rules.objective, 'rules.objective'),
    authoredRule(`${slug}.rules.gameplay`, 'Turn flow', rules.gameplay, 'rules.gameplay'),
    authoredRule(`${slug}.setup.players`, 'Players', setup.players, 'setup.players'),
    authoredRule(`${slug}.setup.deck`, 'Deck', setup.deck, 'setup.deck'),
    authoredRule(`${slug}.setup.equipment`, 'Equipment', publicSetupEquipment(source), 'setup.equipment'),
    authoredRule(`${slug}.setup.dealing`, 'Deal', setup.dealing, 'setup.dealing'),
    authoredRule(`${slug}.score.win-condition`, 'Win condition', scoring.winCondition, 'scoring.winCondition'),
    authoredRule(`${slug}.score.description`, 'Scoring', scoring.description, 'scoring.description'),
    ...asArray(rules.keyRules).map((ruleText, index) => (
      authoredRule(`${slug}.rules.key.${index + 1}`, `Key rule ${index + 1}`, ruleText, `rules.keyRules.${index}`)
    )),
  ].filter((rule): rule is Record<string, unknown> => rule !== null);
}

function buildRuleGroups(source: Record<string, unknown>): Record<string, unknown>[] {
  const slug = sourceSlug(source);
  const keyRuleIds = asArray(asRecord(source.rules).keyRules)
    .map((ruleText, index) => publicText(ruleText) ? `${slug}.rules.key.${index + 1}` : '')
    .filter(Boolean);
  return [
    {
      id: `${slug}.group.overview`,
      label: 'Objective',
      ruleIds: [`${slug}.rules.objective`, `${slug}.rules.gameplay`],
    },
    {
      id: `${slug}.group.setup`,
      label: 'Setup',
      ruleIds: [
        `${slug}.setup.players`,
        `${slug}.setup.deck`,
        `${slug}.setup.equipment`,
        `${slug}.setup.dealing`,
      ],
    },
    ...(keyRuleIds.length > 0
      ? [{
          id: `${slug}.group.key-rules`,
          label: 'Key Rules',
          ruleIds: keyRuleIds,
        }]
      : []),
    {
      id: `${slug}.group.scoring`,
      label: 'Scoring',
      ruleIds: [`${slug}.score.description`, `${slug}.score.win-condition`],
    },
  ];
}

function buildActionRuleLinks(source: Record<string, unknown>): Record<string, string[]> {
  const slug = sourceSlug(source);
  const engine = asRecord(source.engine);
  const links: Record<string, string[]> = {
    [SETUP_ROUND_ACTION_ID]: [`${slug}.setup.dealing`, `${slug}.rules.objective`],
  };
  for (const [actionId, action] of Object.entries(asRecord(engine.playerActions))) {
    if (asRecord(action).supported === true) {
      links[actionId] = [`${slug}.rules.gameplay`];
    }
  }
  for (const action of asArray(engine.customActions).map(asRecord)) {
    const actionId = asText(action.id);
    if (actionId && action.supported === true) {
      links[actionId] = [`${slug}.rules.gameplay`];
    }
  }
  return links;
}

function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return Boolean(publicText(value));
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(isMeaningful);
  }
  if (typeof value === 'object') {
    return Object.values(value).some(isMeaningful);
  }
  return false;
}

function normalizeNumericRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entryValue]) => {
      if (typeof entryValue === 'number' && Number.isFinite(entryValue)) {
        return [[key, entryValue]];
      }
      if (typeof entryValue === 'string') {
        const numericTokens = entryValue.match(/-?\d+(?:\.\d+)?/g) ?? [];
        const parsed = numericTokens.length === 1 ? Number(numericTokens[0]) : Number(entryValue);
        if (Number.isFinite(parsed)) {
          return [[key, parsed]];
        }
      }
      return [];
    }),
  );
}

function buildScoringRulesSourceCardValues(value: unknown, numericValues: Record<string, number>): Record<string, unknown> | null {
  const sourceValues = asRecord(value);
  if (Object.keys(sourceValues).length === 0 || Object.keys(sourceValues).length === Object.keys(numericValues).length) {
    return null;
  }
  return {
    raw: sourceValues,
    note: 'Some source card values are descriptive or non-numeric and are preserved here for source review.',
  };
}

function buildScoringNullReasons(scoring: Record<string, unknown>, numericCardValues: Record<string, number>): Record<string, unknown> {
  const sourceNullReasons = asRecord(scoring.nullReasons);
  if (Object.keys(numericCardValues).length > 0 || isMeaningful(sourceNullReasons.cardValues)) {
    return sourceNullReasons;
  }
  return {
    ...sourceNullReasons,
    cardValues: 'Processed source does not define per-card numeric values; scoring is described by scoring.description and scoring.winCondition.',
  };
}

function buildScoringRules(source: Record<string, unknown>): Record<string, unknown> {
  const scoring = asRecord(source.scoring);
  const numericCardValues = normalizeNumericRecord(scoring.cardValues);
  const sourceCardValues = buildScoringRulesSourceCardValues(scoring.cardValues, numericCardValues);
  return {
    summary: scoring.description,
    winCondition: scoring.winCondition,
    targetScore: typeof scoring.targetScore === 'number' ? scoring.targetScore : null,
    scoringDirection: scoring.scoringDirection,
    cardValues: scoring.cardValues,
    ...(sourceCardValues ? { sourceCardValues } : {}),
    nullReasons: buildScoringNullReasons(scoring, numericCardValues),
    splitRules: scoring.splitRules ?? null,
    sourceFields: [
      'scoring.description',
      'scoring.winCondition',
      'scoring.cardValues',
      'scoring.targetScore',
      'scoring.scoringDirection',
      'scoring.nullReasons',
      'scoring.splitRules',
    ],
  };
}

function normalizeResourcePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^Resources\//i, '');
}

function filePathFromRef(ref: unknown): string | null {
  const refPath = asText(asRecord(ref).path);
  if (!refPath) {
    return null;
  }
  return path.resolve(resourcesRoot, normalizeResourcePath(refPath).replace(/\//g, path.sep));
}

function loadAssetFromRef(ref: unknown): { filePath: string; asset: AssetEnvelope } | null {
  const filePath = filePathFromRef(ref);
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return { filePath, asset: readAsset(filePath) };
}

function loadSiblingAsset(gameDir: string, fileName: unknown): { filePath: string; asset: AssetEnvelope } | null {
  const normalizedFileName = asText(fileName);
  if (!normalizedFileName) {
    return null;
  }
  const filePath = path.resolve(gameDir, normalizedFileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return { filePath, asset: readAsset(filePath) };
}

function setRefStats(ref: unknown, stats: AssetWriteStats): void {
  const record = asRecord(ref);
  if (Object.keys(record).length === 0) {
    return;
  }
  record.checksum = stats.checksum;
  record.fileSize = stats.fileSize;
  record.mimeType = 'application/json';
}

function normalizeSourceList(value: unknown): Record<string, unknown>[] {
  return asArray(value).flatMap((source) => {
    const record = asRecord(source);
    const name = asText(record.name);
    const url = asText(record.url);
    if (!name || !url) {
      return [];
    }
    return [{
      id: asText(record.id),
      name,
      url,
      retrievedAt: asText(record.retrievedAt),
    }];
  });
}

function buildSourcesContent(source: Record<string, unknown>): Record<string, unknown> {
  const sources = asRecord(source.sources);
  return {
    primary: normalizeSourceList(sources.primary),
    additional: normalizeSourceList(sources.additional),
  };
}

function publicText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed && !PUBLIC_JUNK_TEXT_PATTERN.test(trimmed) ? trimmed : '';
}

function firstPublicText(...values: unknown[]): string {
  for (const value of values) {
    const text = publicText(value);
    if (text) {
      return text;
    }
  }
  return '';
}

function paragraphBlocks(text: unknown): Record<string, unknown>[] {
  return publicText(text)
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => ({
      type: 'paragraph',
      text: entry,
    }));
}

function listBlock(items: string[]): Record<string, unknown> | null {
  const filtered = items.map((item) => item.trim()).filter(Boolean);
  if (filtered.length === 0) {
    return null;
  }
  return {
    type: 'list',
    style: 'unordered',
    items: filtered.map((item) => ({ text: item })),
  };
}

function buildPublicVariationList(source: Record<string, unknown>): Record<string, unknown>[] {
  return asArray(asRecord(source.variations).list).flatMap((variation) => {
    const record = asRecord(variation);
    const name = publicText(record.name);
    const description = publicText(record.description);
    if (!name || !description) {
      return [];
    }
    const id = publicText(record.id);
    return [{
      ...(id ? { id } : {}),
      name,
      description,
    }];
  });
}

function buildGameInfoSections(source: Record<string, unknown>): Record<string, unknown>[] {
  const overview = asRecord(source.overview);
  const history = asRecord(source.history);
  const setup = asRecord(source.setup);
  const synthesis = asRecord(source.synthesis);
  const hero = asRecord(synthesis.hero);
  const name = firstPublicText(source.name, source.filename, 'Card Game');
  const aboutContent = [
    ...paragraphBlocks(overview.description),
    ...paragraphBlocks(history.origins),
  ];
  const setupContent = [
    ...paragraphBlocks(setup.players),
    ...paragraphBlocks(setup.deck),
    ...paragraphBlocks(firstPublicText(setup.equipment, setup.deck, overview.deck)),
    ...paragraphBlocks(setup.dealing),
  ];
  const variationsBlock = listBlock(
    buildPublicVariationList(source).map((variation) => `${String(variation.name)}: ${String(variation.description)}`)
  );

  return [
    {
      type: 'about',
      tabLabel: 'About',
      pages: [
        {
          title: name,
          subtitle: firstPublicText(hero.subtitle, 'Game Overview'),
          content: aboutContent,
        },
        {
          title: 'Setup',
          subtitle: 'Table, deck, equipment, and deal',
          content: setupContent,
        },
        ...(variationsBlock
          ? [{
              title: 'Variations',
              subtitle: 'Known ways this game changes',
              content: [variationsBlock],
            }]
          : []),
      ],
    },
  ];
}

function buildCanonicalTagline(source: Record<string, unknown>): string {
  const description = publicText(asRecord(source.overview).description);
  if (description.length <= 140) {
    return description;
  }
  const sentence = description.match(/^.{40,140}?[.!?](?:\s|$)/)?.[0]?.trim();
  return sentence || `${description.slice(0, 137).trimEnd()}...`;
}

function buildAiConsiderations(source: Record<string, unknown>): string[] {
  const rules = asRecord(source.rules);
  return [
    rules.objective,
    rules.gameplay,
    ...asArray(rules.keyRules),
  ].map(publicText).filter(Boolean).slice(0, 4);
}

function buildAiContent(source: Record<string, unknown>): Record<string, unknown> {
  const ai = asRecord(source.ai);
  const overview = asRecord(source.overview);
  return {
    difficulty: isMeaningful(ai.difficulty) ? ai.difficulty : overview.difficulty,
    considerations: isMeaningful(ai.considerations) ? ai.considerations : buildAiConsiderations(source),
  };
}

function buildMoveValidityConditions(source: Record<string, unknown>): Record<string, string> {
  const actions = asRecord(asRecord(source.engine).playerActions);
  return Object.fromEntries(Object.entries(actions).flatMap(([actionId, action]) => {
    const record = asRecord(action);
    const supported = record.supported === true;
    const text = supported ? firstPublicText(record.constraints) : firstPublicText(record.reason);
    return text ? [[actionId, text]] : [];
  }));
}

function buildRuleExampleHands(source: Record<string, unknown>): string[] {
  const engine = asRecord(source.engine);
  const rules = asRecord(source.rules);
  const initialHandSize = firstNumber(engine.initialHandSize, firstNumberFromText(asRecord(source.setup).dealing, /(\d+)\s+cards?\s+each/i));
  const dealSummary = buildDealSummary(source, initialHandSize);
  const phases = asArray(engine.phases).map(asRecord);
  const firstPhase = phases[0];
  const scoring = asRecord(source.scoring);
  return [
    `Setup example: ${dealSummary}.`,
    `Rule example: ${rules.objective}`,
    asText(firstPhase.id) || publicText(rules.gameplay)
      ? `Turn-flow example: ${rules.gameplay}`
      : '',
    `Scoring example: ${scoring.description} ${stringifyUnknown(scoring.winCondition)}.`,
  ].map(cleanRuleExampleText).map(publicText).filter(Boolean);
}

function buildStrategySummary(source: Record<string, unknown>): string {
  const strategy = asRecord(source.strategy);
  const rules = asRecord(source.rules);
  const authored = [strategy.basic, strategy.intermediate, strategy.advanced]
    .map(publicText)
    .filter(Boolean)
    .join('\n\n');
  if (authored.length >= 20) {
    return authored;
  }
  return [rules.objective, rules.gameplay].map(publicText).filter(Boolean).join('\n\n');
}

function updateGameInfoFromSource(asset: AssetEnvelope, source: Record<string, unknown>): void {
  const data = asRecord(asset.data);
  const overview = asRecord(source.overview);
  const history = asRecord(source.history);
  const setup = asRecord(source.setup);
  const name = firstPublicText(source.name, source.filename, data.hero);
  data.hero = {
    title: name,
    subtitle: firstPublicText(overview.category, 'Card Game'),
  };
  data.description = overview.description;
  data.LLM = overview.description;
  data.Player = overview.description;
  data.tagline = buildCanonicalTagline(source);
  data.tags = Array.from(new Set(['card-game', ...asArray(source.tags).map(asText).filter(Boolean)]));
  data.minPlayers = asNumber(asRecord(overview.players).minPlayers, asNumber(data.minPlayers, 2));
  data.maxPlayers = asNumber(asRecord(overview.players).maxPlayers, asNumber(data.maxPlayers, 4));
  data.routePath = asText(data.routePath) || asText(source.filename).replace(/\.json$/i, '');
  data.gameCategory = firstPublicText(overview.category, data.gameCategory);
  data.subcategory = firstPublicText(overview.subCategory, data.subcategory);
  data.playerMode = firstPublicText(overview.playerMode, data.playerMode);
  data.difficulty = firstPublicText(overview.difficulty, data.difficulty);
  data.duration = firstPublicText(overview.duration, data.duration);
  data.origin = firstPublicText(overview.origin, data.origin);
  data.originName = firstPublicText(overview.originName, source.name);
  data.deck = firstPublicText(overview.deck, data.deck);
  data.alsoKnownAs = asArray(source.alsoKnownAs).map(asText).filter(Boolean);
  data.playersDisplay = firstPublicText(asRecord(overview.players).display, data.playersDisplay);
  data.quality = source.quality;
  data.completeness = source.completeness;
  data.historyContent = {
    origins: history.origins,
    originCountries: asArray(history.originCountries).map(asText).filter(Boolean),
    timeline: asArray(history.timeline).map(asText).filter(Boolean),
    evolution: firstPublicText(history.evolution),
    cultural: firstPublicText(history.cultural),
  };
  data.setupContent = {
    players: setup.players,
    deck: setup.deck,
    equipment: firstPublicText(setup.equipment, setup.deck, overview.deck),
    dealing: setup.dealing,
  };
  const variations = asRecord(source.variations);
  const variationList = buildPublicVariationList(source);
  data.variationsContent = {
    list: variationList,
    noVariationsReason: variationList.length === 0 ? firstPublicText(variations.noVariationsReason, 'Base ruleset only.') : '',
  };
  data.aiContent = buildAiContent(source);
  data.sourcesContent = buildSourcesContent(source);
  data.sections = buildGameInfoSections(source);
  asset.data = data;
}

function updateRulesFromSource(asset: AssetEnvelope, source: Record<string, unknown>): void {
  const data = asRecord(asset.data);
  const rules = asRecord(source.rules);
  const setup = asRecord(source.setup);
  const engine = asRecord(source.engine);
  const audienceText = firstPublicText(rules.gameplay, rules.objective, asRecord(source.overview).description);
  data.LLM = audienceText;
  data.Player = audienceText;
  data.objective = rules.objective;
  data.gameplay = rules.gameplay;
  data.keyRules = asArray(rules.keyRules).map(asText).filter(Boolean);
  data.setup = {
    players: setup.players,
    deck: setup.deck,
    equipment: firstPublicText(setup.equipment, setup.deck, asRecord(source.overview).deck),
    dealing: setup.dealing,
  };
  data.turnFlow = rules.gameplay;
  data.moveValidityConditions = buildMoveValidityConditions(source);
  data.exampleHands = buildRuleExampleHands(source);
  data.rules = buildRuleRecords(source);
  data.ruleGroups = buildRuleGroups(source);
  data.actionRuleLinks = buildActionRuleLinks(source);
  data.useTrump = engine.useTrump;
  data.trumpBonusValues = engine.trumpBonusValues ?? null;
  asset.data = data;
}

function updateStrategyFromSource(asset: AssetEnvelope, source: Record<string, unknown>): void {
  const data = asRecord(asset.data);
  const strategy = asRecord(source.strategy);
  const summary = buildStrategySummary(source);
  data.LLM = summary;
  data.Player = summary;
  data.basic = firstPublicText(strategy.basic, asRecord(source.rules).objective);
  data.intermediate = firstPublicText(strategy.intermediate);
  data.advanced = firstPublicText(strategy.advanced);
  data.tips = asArray(strategy.tips).map(publicText).filter(Boolean).map((tip) => ({
    title: 'Tip',
    description: tip,
  }));
  asset.data = data;
}

function updateScoringFromSource(asset: AssetEnvelope, source: Record<string, unknown>): void {
  const data = asRecord(asset.data);
  const scoring = asRecord(source.scoring);
  data.description = scoring.description;
  data.winCondition = scoring.winCondition;
  data.cardValues = normalizeNumericRecord(scoring.cardValues);
  data.penalties = JSON.stringify(scoring.penalties ?? '');
  data.targetScore = typeof scoring.targetScore === 'number' ? scoring.targetScore : null;
  data.scoringDirection = scoring.scoringDirection;
  data.scoringRules = buildScoringRules(source);
  asset.data = data;
}

function updateSelectedGameLayoutFromSource(asset: AssetEnvelope): void {
  const data = asRecord(asset.data);
  data.contentPlan = DEFAULT_SELECTED_GAME_CONTENT_PLAN;
  asset.data = data;
}

function normalizePhase(value: unknown): Record<string, unknown> | null {
  const phase = asRecord(value);
  if (!asText(phase.id)) {
    return null;
  }
  const next = { ...phase };
  if (!asText(next.notes)) {
    delete next.notes;
  }
  if (!Array.isArray(next.conditionalNext)) {
    next.conditionalNext = [];
  }
  if (!next.cardVisibilityChanges || typeof next.cardVisibilityChanges !== 'object' || Array.isArray(next.cardVisibilityChanges)) {
    next.cardVisibilityChanges = {};
  }
  return next;
}

function buildSetupRoundAction(source: Record<string, unknown>): Record<string, unknown> {
  const engine = asRecord(source.engine);
  const cardVisibility = asRecord(engine.cardVisibility);
  const initialHandSize = asNumber(engine.initialHandSize, 0);
  const deckCount = asNumber(engine.deckCount, 1);
  return {
    supported: true,
    system: true,
    description: `Deal ${initialHandSize} card(s) to each active player and initialize the table before player actions begin.`,
    cost: 'none',
    constraints: 'System-only setup action before the first player phase.',
    isTerminating: true,
    effectType: SETUP_ROUND_ACTION_ID,
    effectHints: {
      initialHandSize,
      deckCount,
      visibility: asText(cardVisibility.initialDeal),
    },
  };
}

function sourcePlayablePhases(source: Record<string, unknown>, fallbackPhases: unknown): Record<string, unknown>[] {
  const sourcePhases = asArray(asRecord(source.engine).phases)
    .map(normalizePhase)
    .filter((phase): phase is Record<string, unknown> => Boolean(phase));
  const fallback = asArray(fallbackPhases)
    .map(normalizePhase)
    .filter((phase): phase is Record<string, unknown> => Boolean(phase))
    .filter((phase) => asText(phase.id) !== SETUP_ROUND_ACTION_ID);
  return sourcePhases.length > 0 ? sourcePhases : fallback;
}

function buildRuntimePhases(source: Record<string, unknown>, fallbackPhases: unknown): Record<string, unknown>[] {
  const playablePhases = sourcePlayablePhases(source, fallbackPhases);
  if (playablePhases[0]?.id === SETUP_ROUND_ACTION_ID) {
    return playablePhases;
  }
  const engine = asRecord(source.engine);
  const initialHandSize = asNumber(engine.initialHandSize, 0);
  return [
    {
      id: SETUP_ROUND_ACTION_ID,
      label: 'Setup Round',
      actor: 'system',
      legalActions: [SETUP_ROUND_ACTION_ID],
      nextPhase: asText(playablePhases[0]?.id) || null,
      isMandatory: true,
      loopIndex: null,
      totalLoops: null,
      conditionalNext: [],
      cardVisibilityChanges: {},
      notes: `Deal ${initialHandSize} card(s) to each active player before player action begins.`,
    },
    ...playablePhases,
  ];
}

function buildProgression(source: Record<string, unknown>, runtimePhases: Record<string, unknown>[]): string[] {
  const sourceProgression = asArray(asRecord(source.engine).progression).map(asText).filter(Boolean);
  const phaseIds = runtimePhases.map((phase) => asText(phase.id)).filter(Boolean);
  return Array.from(new Set([SETUP_ROUND_ACTION_ID, ...(sourceProgression.length > 0 ? sourceProgression : phaseIds.filter((id) => id !== SETUP_ROUND_ACTION_ID))]));
}

function actionIdsFromActions(actions: Record<string, unknown>, customActions: unknown): string[] {
  const supported = Object.entries(actions)
    .filter(([, action]) => asRecord(action).supported === true)
    .map(([id]) => id);
  const custom = asArray(customActions)
    .map(asRecord)
    .filter((action) => action.supported === true)
    .map((action) => asText(action.id))
    .filter(Boolean);
  return Array.from(new Set([SETUP_ROUND_ACTION_ID, ...supported, ...custom]));
}

function legalActionIdsFromPhases(runtimePhases: Record<string, unknown>[]): string[] {
  return Array.from(new Set(runtimePhases.flatMap((phase) => asArray(phase.legalActions).map(asText).filter(Boolean))));
}

function buildLegalActionStub(actionId: string, existing: Record<string, unknown>): Record<string, unknown> {
  return {
    ...existing,
    supported: true,
    generatedFromPhase: true,
    implementationStatus: asText(existing.implementationStatus) || 'needs_executor_review',
    description: asText(existing.description) && asText(existing.description) !== 'NA'
      ? existing.description
      : `Legal phase action ${actionId} is authored in the phase flow and needs executor-specific handling before public release.`,
    cost: asText(existing.cost) && asText(existing.cost) !== 'NA' ? existing.cost : 'none',
    constraints: asText(existing.constraints) && asText(existing.constraints) !== 'NA' ? existing.constraints : 'See phase flow and rules asset.',
    isTerminating: typeof existing.isTerminating === 'boolean' ? existing.isTerminating : true,
    effectType: asText(existing.effectType) && asText(existing.effectType) !== 'NA' ? existing.effectType : actionId,
    effectHints: {
      ...asRecord(existing.effectHints),
      requiresExecutorReview: true,
    },
  };
}

function addSetupAction(asset: AssetEnvelope, source: Record<string, unknown>, runtimePhases: Record<string, unknown>[]): string[] {
  const data = asRecord(asset.data);
  const existingActions = asRecord(data.actions);
  const { [SETUP_ROUND_ACTION_ID]: _oldSetup, ...restActions } = existingActions;
  const actions: Record<string, unknown> = {
    [SETUP_ROUND_ACTION_ID]: buildSetupRoundAction(source),
    ...restActions,
  };
  for (const actionId of legalActionIdsFromPhases(runtimePhases)) {
    if (actionId === SETUP_ROUND_ACTION_ID) {
      continue;
    }
    const action = asRecord(actions[actionId]);
    if (action.supported !== true) {
      actions[actionId] = buildLegalActionStub(actionId, action);
    }
  }
  data.actions = actions;

  const actionModel = asRecord(data.actionModel);
  const existingIds = asArray(actionModel.actionIds).map(asText).filter(Boolean);
  actionModel.actionIds = Array.from(new Set([
    SETUP_ROUND_ACTION_ID,
    ...existingIds,
    ...legalActionIdsFromPhases(runtimePhases),
    ...actionIdsFromActions(actions, data.customActions),
  ]));
  actionModel.actionEndsTurn = {
    ...asRecord(actionModel.actionEndsTurn),
    [SETUP_ROUND_ACTION_ID]: true,
  };
  data.actionModel = actionModel;
  asset.data = data;
  return actionModel.actionIds as string[];
}

function updateValidationFixtures(asset: AssetEnvelope, source: Record<string, unknown>, runtimePhases: Record<string, unknown>[], supportedActionIds: string[]): void {
  const data = asRecord(asset.data);
  const firstPlayablePhase = runtimePhases.find((phase) => asText(phase.id) !== SETUP_ROUND_ACTION_ID);
  for (const suite of asArray(data.validationSuites).map(asRecord)) {
    for (const fixture of asArray(suite.fixtures).map(asRecord)) {
      if (asText(fixture.purpose) !== 'flow') {
        continue;
      }
      fixture.expectedFirstPhase = SETUP_ROUND_ACTION_ID;
      fixture.expectedActor = 'system';
      fixture.expectedLegalActions = [SETUP_ROUND_ACTION_ID];
      fixture.expectedNextPhase = asText(firstPlayablePhase?.id) || null;
      fixture.supportedActionIds = supportedActionIds;
      fixture.firstPlayablePhase = asText(firstPlayablePhase?.id) || null;
      fixture.firstPlayableLegalActions = Array.isArray(firstPlayablePhase?.legalActions) ? firstPlayablePhase.legalActions : [];
      fixture.explanation = `${asText(source.name) || 'Game'} must run setup_round first, then enter ${asText(firstPlayablePhase?.id) || 'the authored first phase'} with the processed legal actions.`;
      fixture.linkedRuleIds = [
        `${asText(source.filename).replace(/\.json$/i, '') || asText(source.name)}.setup.initial-deal`,
        `${asText(source.filename).replace(/\.json$/i, '') || asText(source.name)}.flow.${asText(firstPlayablePhase?.id) || 'first-playable'}`,
      ];
      fixture.sourceFields = ['setup.dealing', 'engine.phases.0', 'engine.playerActions', 'engine.customActions'];
    }
  }
  asset.data = data;
}

function updateStateEventModel(asset: AssetEnvelope, runtimePhases: Record<string, unknown>[], actionIds: string[]): void {
  const data = asRecord(asset.data);
  const eventModel = asRecord(data.eventModel);
  eventModel.phases = runtimePhases.map((phase) => asText(phase.id)).filter(Boolean);
  eventModel.actions = actionIds;
  data.eventModel = eventModel;
  asset.data = data;
}

function repairGameMode(gameModePath: string): boolean {
  const gameMode = readAsset(gameModePath);
  if (gameMode.system?.assetType !== 'CardGameMode') {
    return false;
  }
  const gameModeData = asRecord(gameMode.data);
  const infoEntry = loadAssetFromRef(gameModeData.gameInfoAsset);
  if (!infoEntry) {
    return false;
  }
  const infoData = asRecord(infoEntry.asset.data);
  const source = asRecord(asRecord(infoData.editorOnly).processedSource);
  if (Object.keys(source).length === 0) {
    return false;
  }

  const gameDir = path.dirname(gameModePath);
  const linkedKeys = asRecord(asRecord(infoData.mechanicsContract).linkedAssetKeys);
  const rulesEntry = loadAssetFromRef(gameModeData.gameRulesAsset);
  const strategyEntry = loadAssetFromRef(gameModeData.strategyAsset);
  const scoringEntry = loadAssetFromRef(gameModeData.scoringAsset);
  const mechanicsEntry = loadAssetFromRef(gameModeData.mechanicsAsset);
  const selectedGameLayoutEntry = loadAssetFromRef(gameModeData.selectedGameLayoutAsset);
  const actionEntry = loadSiblingAsset(gameDir, linkedKeys.actionSet);
  const phaseFlowEntry = loadSiblingAsset(gameDir, linkedKeys.phaseFlowModel);
  const stateEventEntry = loadSiblingAsset(gameDir, linkedKeys.stateEventModel);
  const validationEntry = loadSiblingAsset(gameDir, linkedKeys.validationFixtures);
  if (!mechanicsEntry || !actionEntry || !validationEntry) {
    throw new Error(`Missing linked mechanics assets for ${gameModePath}`);
  }

  updateGameInfoFromSource(infoEntry.asset, source);
  if (rulesEntry) {
    updateRulesFromSource(rulesEntry.asset, source);
  }
  if (strategyEntry) {
    updateStrategyFromSource(strategyEntry.asset, source);
  }
  if (scoringEntry) {
    updateScoringFromSource(scoringEntry.asset, source);
  }
  if (selectedGameLayoutEntry) {
    updateSelectedGameLayoutFromSource(selectedGameLayoutEntry.asset);
  }

  const runtimePhases = buildRuntimePhases(source, asRecord(mechanicsEntry.asset.data).phases);
  const actionIds = addSetupAction(actionEntry.asset, source, runtimePhases);
  updateValidationFixtures(validationEntry.asset, source, runtimePhases, actionIds);

  if (phaseFlowEntry) {
    const phaseFlowData = asRecord(phaseFlowEntry.asset.data);
    phaseFlowData.phases = runtimePhases;
    phaseFlowData.progression = buildProgression(source, runtimePhases);
    phaseFlowEntry.asset.data = phaseFlowData;
  }

  if (stateEventEntry) {
    updateStateEventModel(stateEventEntry.asset, runtimePhases, actionIds);
  }

  const rulesStats = rulesEntry ? writeAsset(rulesEntry.filePath, rulesEntry.asset) : null;
  const strategyStats = strategyEntry ? writeAsset(strategyEntry.filePath, strategyEntry.asset) : null;
  const scoringStats = scoringEntry ? writeAsset(scoringEntry.filePath, scoringEntry.asset) : null;
  const selectedGameLayoutStats = selectedGameLayoutEntry ? writeAsset(selectedGameLayoutEntry.filePath, selectedGameLayoutEntry.asset) : null;
  const actionStats = writeAsset(actionEntry.filePath, actionEntry.asset);
  const phaseFlowStats = phaseFlowEntry ? writeAsset(phaseFlowEntry.filePath, phaseFlowEntry.asset) : null;
  const stateEventStats = stateEventEntry ? writeAsset(stateEventEntry.filePath, stateEventEntry.asset) : null;
  const validationStats = writeAsset(validationEntry.filePath, validationEntry.asset);

  const mechanicsData = asRecord(mechanicsEntry.asset.data);
  mechanicsData.phases = runtimePhases;
  mechanicsData.progression = buildProgression(source, runtimePhases);
  mechanicsEntry.asset.data = mechanicsData;
  addSetupAction(mechanicsEntry.asset, source, runtimePhases);
  const updatedMechanicsData = asRecord(mechanicsEntry.asset.data);
  const modelRefs = asRecord(mechanicsData.modelRefs);
  setRefStats(modelRefs.actions, actionStats);
  if (phaseFlowStats) {
    setRefStats(modelRefs.phaseFlow, phaseFlowStats);
  }
  if (stateEventStats) {
    setRefStats(modelRefs.stateEvents, stateEventStats);
  }
  setRefStats(modelRefs.validation, validationStats);
  updatedMechanicsData.modelRefs = modelRefs;
  mechanicsEntry.asset.data = updatedMechanicsData;

  const infoStats = writeAsset(infoEntry.filePath, infoEntry.asset);
  const mechanicsStats = writeAsset(mechanicsEntry.filePath, mechanicsEntry.asset);
  if (rulesStats) {
    setRefStats(gameModeData.gameRulesAsset, rulesStats);
  }
  if (strategyStats) {
    setRefStats(gameModeData.strategyAsset, strategyStats);
  }
  if (scoringStats) {
    setRefStats(gameModeData.scoringAsset, scoringStats);
  }
  if (selectedGameLayoutStats) {
    setRefStats(gameModeData.selectedGameLayoutAsset, selectedGameLayoutStats);
  }
  setRefStats(gameModeData.gameInfoAsset, infoStats);
  setRefStats(gameModeData.mechanicsAsset, mechanicsStats);
  gameMode.data = gameModeData;
  writeAsset(gameModePath, gameMode);
  return true;
}

let repaired = 0;
for (const filePath of findAssetFiles(gamesRoot)) {
  if (repairGameMode(filePath)) {
    repaired += 1;
  }
}

process.stdout.write(`Repaired ${repaired} processed CardGameMode asset contract(s).\n`);
