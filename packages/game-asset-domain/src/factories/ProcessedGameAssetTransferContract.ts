import { schema } from '@ocentra/schema-domain/effect-builder';
import type { Game } from '@ocentra/card-games/schema/effect/game-schema';
import type { CreateGameModeOptions } from '@/factories/GameModeAssetFactory';

export const ProcessedGameTransferSeveritySchema = schema.enum(['error', 'warning']);

export const ProcessedGameTransferIssueSchema = schema.object({
  severity: ProcessedGameTransferSeveritySchema,
  sourcePath: schema.string(),
  targetPath: schema.string(),
  message: schema.string(),
});

export const ProcessedGameTransferReportSchema = schema.object({
  ok: schema.boolean(),
  processedGame: schema.string(),
  issues: schema.array(ProcessedGameTransferIssueSchema),
});

export type ProcessedGameTransferIssue = schema.infer<typeof ProcessedGameTransferIssueSchema>;
export type ProcessedGameTransferReport = schema.infer<typeof ProcessedGameTransferReportSchema>;

type TransferMatch = 'presence' | 'exact';

interface TransferCheck {
  sourcePath: string;
  targetPath: string;
  match?: TransferMatch;
  severity?: ProcessedGameTransferIssue['severity'];
  message: string;
}

const PUBLIC_TRANSFER_CHECKS: TransferCheck[] = [
  { sourcePath: 'name', targetPath: 'displayName', match: 'exact', message: 'Game name must become the generated game display name.' },
  { sourcePath: 'overview.description', targetPath: 'assetDataOverrides.gameInfo.description', match: 'exact', message: 'Overview description must land in GameInfo.' },
  { sourcePath: 'overview.description', targetPath: 'assetDataOverrides.gameInfo.Player', message: 'Player-facing overview must land in GameInfo.' },
  { sourcePath: 'overview.origin', targetPath: 'assetDataOverrides.gameInfo.origin', match: 'exact', message: 'Origin must land in GameInfo.' },
  { sourcePath: 'overview.originName', targetPath: 'assetDataOverrides.gameInfo.originName', match: 'exact', message: 'Origin name must land in GameInfo.' },
  { sourcePath: 'overview.players.minPlayers', targetPath: 'assetDataOverrides.gameInfo.minPlayers', match: 'exact', message: 'Minimum player count must land in GameInfo.' },
  { sourcePath: 'overview.players.maxPlayers', targetPath: 'assetDataOverrides.gameInfo.maxPlayers', match: 'exact', message: 'Maximum player count must land in GameInfo.' },
  { sourcePath: 'overview.deck', targetPath: 'assetDataOverrides.gameInfo.deck', match: 'exact', message: 'Deck summary must land in GameInfo.' },
  { sourcePath: 'history.origins', targetPath: 'assetDataOverrides.gameInfo.historyContent.origins', match: 'exact', message: 'History origins must land in GameInfo historyContent.' },
  { sourcePath: 'history.originCountries', targetPath: 'assetDataOverrides.gameInfo.historyContent.originCountries', match: 'exact', message: 'Origin countries must land in GameInfo historyContent.' },
  { sourcePath: 'history.timeline', targetPath: 'assetDataOverrides.gameInfo.historyContent.timeline', match: 'exact', message: 'History timeline must land in GameInfo historyContent.' },
  { sourcePath: 'setup.players', targetPath: 'assetDataOverrides.gameInfo.setupContent.players', match: 'exact', message: 'Setup players must land in GameInfo setupContent.' },
  { sourcePath: 'setup.deck', targetPath: 'assetDataOverrides.gameInfo.setupContent.deck', match: 'exact', message: 'Setup deck must land in GameInfo setupContent.' },
  { sourcePath: 'setup.equipment', targetPath: 'assetDataOverrides.gameInfo.setupContent.equipment', match: 'exact', message: 'Setup equipment must land in GameInfo setupContent.' },
  { sourcePath: 'setup.dealing', targetPath: 'assetDataOverrides.gameInfo.setupContent.dealing', match: 'exact', message: 'Setup dealing must land in GameInfo setupContent.' },
  { sourcePath: 'variations.list', targetPath: 'assetDataOverrides.gameInfo.variationsContent.list', match: 'exact', message: 'Variations must land in GameInfo variationsContent.' },
  { sourcePath: 'ai.difficulty', targetPath: 'assetDataOverrides.gameInfo.aiContent.difficulty', match: 'exact', message: 'AI difficulty notes must land in GameInfo aiContent.' },
  { sourcePath: 'ai.considerations', targetPath: 'assetDataOverrides.gameInfo.aiContent.considerations', match: 'exact', message: 'AI considerations must land in GameInfo aiContent.' },
  { sourcePath: 'rules.objective', targetPath: 'assetDataOverrides.rules.objective', match: 'exact', message: 'Rule objective must land in CardGameRules.' },
  { sourcePath: 'rules.gameplay', targetPath: 'assetDataOverrides.rules.gameplay', match: 'exact', message: 'Gameplay rules must land in CardGameRules.' },
  { sourcePath: 'rules.keyRules', targetPath: 'assetDataOverrides.rules.keyRules', match: 'exact', message: 'Key rules must land in CardGameRules.' },
  { sourcePath: 'strategy.basic', targetPath: 'assetDataOverrides.strategy.basic', match: 'exact', message: 'Basic strategy must land in Strategy.' },
  { sourcePath: 'strategy.intermediate', targetPath: 'assetDataOverrides.strategy.intermediate', match: 'exact', message: 'Intermediate strategy must land in Strategy.' },
  { sourcePath: 'strategy.advanced', targetPath: 'assetDataOverrides.strategy.advanced', match: 'exact', message: 'Advanced strategy must land in Strategy.' },
  { sourcePath: 'strategy.tips', targetPath: 'assetDataOverrides.strategy.tips', message: 'Strategy tips must land in Strategy.' },
  { sourcePath: 'scoring.description', targetPath: 'assetDataOverrides.scoring.description', match: 'exact', message: 'Scoring description must land in CardGameScoring.' },
  { sourcePath: 'scoring.winCondition', targetPath: 'assetDataOverrides.scoring.winCondition', match: 'exact', message: 'Win condition must land in CardGameScoring.' },
  { sourcePath: 'scoring.cardValues', targetPath: 'assetDataOverrides.scoring.cardValues', message: 'Card values must land in CardGameScoring.' },
  { sourcePath: 'engine.deckType', targetPath: 'mechanicsModelDataOverrides.deck.deckType', match: 'exact', message: 'Engine deck type must land in the deck model asset.' },
  { sourcePath: 'engine.suitSet', targetPath: 'mechanicsModelDataOverrides.deck.suitSet', match: 'exact', message: 'Engine suit set must land in the deck model asset.' },
  { sourcePath: 'engine.rankSet', targetPath: 'mechanicsModelDataOverrides.deck.rankSet', match: 'exact', message: 'Engine rank set must land in the deck model asset.' },
  { sourcePath: 'engine.deckCount', targetPath: 'mechanicsModelDataOverrides.deck.deckCount', match: 'exact', message: 'Engine deck count must land in the deck model asset.' },
  { sourcePath: 'engine.initialHandSize', targetPath: 'mechanicsModelDataOverrides.deck.initialHandSize', match: 'exact', message: 'Initial hand size must land in the deck model asset.' },
  { sourcePath: 'engine.drawConfig', targetPath: 'mechanicsModelDataOverrides.deck.drawConfig', message: 'Draw config must land in the deck model asset.' },
  { sourcePath: 'engine.discardConfig', targetPath: 'mechanicsModelDataOverrides.deck.discardConfig', message: 'Discard config must land in the deck model asset.' },
  { sourcePath: 'engine.handRanks', targetPath: 'mechanicsModelDataOverrides.deck.handRanks', message: 'Hand ranking model must land in the deck model asset.' },
  { sourcePath: 'engine.playerConfig', targetPath: 'mechanicsModelDataOverrides.player.playerConfig', message: 'Player config must land in the player model asset.' },
  { sourcePath: 'engine.roundConfig', targetPath: 'mechanicsModelDataOverrides.session.roundConfig', message: 'Round config must land in the session model asset.' },
  { sourcePath: 'engine.zones', targetPath: 'mechanicsModelDataOverrides.zones.zones', message: 'Zones must land in the zone model asset.' },
  { sourcePath: 'engine.cardVisibility', targetPath: 'mechanicsModelDataOverrides.zones.cardVisibility', message: 'Card visibility must land in the zone model asset.' },
  { sourcePath: 'engine.phases', targetPath: 'mechanicsModelDataOverrides.phaseFlow.phases', message: 'Phases must land in the phase flow model asset.' },
  { sourcePath: 'engine.turnOrder', targetPath: 'mechanicsModelDataOverrides.phaseFlow.turnPolicy', message: 'Turn order must land in the phase flow model asset.' },
  { sourcePath: 'engine.playerActions', targetPath: 'mechanicsModelDataOverrides.actions.actions', message: 'Player actions must land in the action set asset.' },
  { sourcePath: 'engine.customActions', targetPath: 'mechanicsModelDataOverrides.actions.customActions', message: 'Custom actions must land in the action set asset.' },
];

const EDITOR_ONLY_CHECKS: TransferCheck[] = [
  { sourcePath: 'sources', targetPath: 'assetDataOverrides.gameInfo.editorOnly.sources', message: 'Sources must stay in GameInfo editorOnly metadata.' },
  { sourcePath: 'evidence', targetPath: 'assetDataOverrides.gameInfo.editorOnly.evidence', message: 'Evidence must stay in GameInfo editorOnly metadata.' },
  { sourcePath: 'extraction', targetPath: 'assetDataOverrides.gameInfo.editorOnly.extraction', message: 'Extraction audit data must stay in GameInfo editorOnly metadata.' },
  { sourcePath: 'fieldStatus', targetPath: 'assetDataOverrides.gameInfo.editorOnly.fieldStatus', message: 'Field status must stay in GameInfo editorOnly metadata.' },
];

const REQUIRED_MECHANICS_MODEL_KEYS = [
  'player',
  'session',
  'deck',
  'zones',
  'phaseFlow',
  'actions',
  'stateEvents',
  'validation',
] as const;

const REQUIRED_LINKED_ASSET_KEYS = [
  'playerModel',
  'sessionModel',
  'deckModel',
  'zoneModel',
  'phaseFlowModel',
  'actionSet',
  'stateEventModel',
  'validationFixtures',
] as const;

export function validateProcessedGameTransferCoverage(
  game: Game,
  options: CreateGameModeOptions,
): ProcessedGameTransferReport {
  const issues: ProcessedGameTransferIssue[] = [];

  for (const check of [...PUBLIC_TRANSFER_CHECKS, ...EDITOR_ONLY_CHECKS]) {
    validateCheck(game, options, check, issues);
  }

  for (const key of REQUIRED_MECHANICS_MODEL_KEYS) {
    const targetPath = `mechanicsModelDataOverrides.${key}`;
    if (!isMeaningful(readPath(options, targetPath))) {
      issues.push({
        severity: 'error',
        sourcePath: 'engine',
        targetPath,
        message: `Processed game import must create a ${key} mechanics model override.`,
      });
    }
  }

  for (const key of REQUIRED_LINKED_ASSET_KEYS) {
    const targetPath = `assetDataOverrides.gameInfo.mechanicsContract.linkedAssetKeys.${key}`;
    if (!isMeaningful(readPath(options, targetPath))) {
      issues.push({
        severity: 'error',
        sourcePath: 'engine',
        targetPath,
        message: `GameInfo mechanicsContract must link ${key} for selected-game loading.`,
      });
    }
  }

  const publicText = stringifyPublicTransferPayload(options);
  for (const blocked of collectBlockedPublicTokens(game)) {
    if (publicText.includes(blocked)) {
      issues.push({
        severity: 'error',
        sourcePath: 'sources',
        targetPath: 'assetDataOverrides',
        message: `Editor-only provenance token leaked into public generated asset data: ${blocked}`,
      });
    }
  }

  return ProcessedGameTransferReportSchema.parse({
    ok: !issues.some((issue) => issue.severity === 'error'),
    processedGame: game.filename || game.name,
    issues,
  });
}

export function assertProcessedGameTransferCoverage(game: Game, options: CreateGameModeOptions): void {
  const report = validateProcessedGameTransferCoverage(game, options);
  if (report.ok) {
    return;
  }
  const details = report.issues
    .filter((issue) => issue.severity === 'error')
    .map((issue) => `${issue.targetPath}: ${issue.message}`)
    .join('\n');
  throw new Error(`Processed game transfer coverage failed for ${report.processedGame}\n${details}`);
}

function validateCheck(
  game: Game,
  options: CreateGameModeOptions,
  check: TransferCheck,
  issues: ProcessedGameTransferIssue[],
): void {
  const source = readPath(game, check.sourcePath);
  if (!isMeaningful(source)) {
    return;
  }

  const target = readPath(options, check.targetPath);
  if (!isMeaningful(target)) {
    issues.push({
      severity: check.severity ?? 'error',
      sourcePath: check.sourcePath,
      targetPath: check.targetPath,
      message: check.message,
    });
    return;
  }

  if ((check.match ?? 'presence') === 'exact' && !valuesEqual(source, target)) {
    issues.push({
      severity: check.severity ?? 'error',
      sourcePath: check.sourcePath,
      targetPath: check.targetPath,
      message: `${check.message} Expected ${stringifyComparable(source)} but got ${stringifyComparable(target)}.`,
    });
  }
}

function readPath(value: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, value);
}

function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
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

function valuesEqual(left: unknown, right: unknown): boolean {
  return stringifyComparable(left) === stringifyComparable(right);
}

function stringifyComparable(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stringifyComparable).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entryValue]) => `${key}:${stringifyComparable(entryValue)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function stringifyPublicTransferPayload(options: CreateGameModeOptions): string {
  const publicPayload = {
    ...options.assetDataOverrides,
    gameInfo: {
      ...options.assetDataOverrides?.gameInfo,
      editorOnly: undefined,
      sourcesContent: undefined,
    },
  };
  return JSON.stringify(publicPayload);
}

function collectBlockedPublicTokens(game: Game): string[] {
  const tokens = new Set<string>();
  const sourceCandidates = [
    ...Object.values(game.sources ?? {}).flatMap((value) => Array.isArray(value) ? value : [value]),
    ...game.evidence,
  ];
  for (const candidate of sourceCandidates) {
    for (const value of Object.values(asRecord(candidate))) {
      if (typeof value === 'string' && value.length >= 12) {
        tokens.add(value);
      }
    }
  }
  return [...tokens];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
