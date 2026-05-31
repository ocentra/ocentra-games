import { schema } from '@ocentra/schema-domain/effect-builder';
import {
  DEFAULT_SELECTED_GAME_TAB_ORDER,
  type SelectedGamePresentation,
  type SelectedGamePresentationChunk,
  type SelectedGameTabId,
} from '@/ui/selectedGame/SelectedGamePresentation';
import {
  buildSelectedGamePresentation,
  type BuildSelectedGamePresentationInput,
} from '@/ui/selectedGame/buildSelectedGamePresentation';
import { GameModeStatus } from '@/constants/game-mode-status';

export const SelectedGameReadinessSeveritySchema = schema.enum(['error', 'warning']);

export const SelectedGameReadinessIssueSchema = schema.object({
  severity: SelectedGameReadinessSeveritySchema,
  code: schema.string(),
  path: schema.string(),
  message: schema.string(),
});

export const SelectedGameReadinessReportSchema = schema.object({
  ok: schema.boolean(),
  label: schema.string(),
  issues: schema.array(SelectedGameReadinessIssueSchema),
});

export type SelectedGameReadinessIssue = schema.infer<typeof SelectedGameReadinessIssueSchema>;
export type SelectedGameReadinessReport = schema.infer<typeof SelectedGameReadinessReportSchema>;

export interface SelectedGameReadinessOptions {
  label?: string;
  requireTabs?: readonly SelectedGameTabId[];
  requireRichGameInfo?: boolean;
  requireValidationFixtures?: boolean;
}

const PROVENANCE_PATTERN = /\b(provenance|scraper|audit)\b|https?:\/\//i;
const REQUIRED_VALIDATION_PURPOSES = ['setup', 'flow', 'scoring'] as const;
const PUBLIC_RELEASE_STATUSES = new Set<GameModeStatus>([
  GameModeStatus.Available,
  GameModeStatus.ComingSoon,
]);
type RequiredValidationPurpose = typeof REQUIRED_VALIDATION_PURPOSES[number];

interface ValidationFixtureContractInput {
  validationFixtures: Record<string, unknown>;
  gameMode: Record<string, unknown>;
  mechanics: Record<string, unknown>;
  deckModel: Record<string, unknown>;
  actions: Record<string, unknown>;
}

export function validateSelectedGamePresentationReadiness(
  presentation: SelectedGamePresentation,
  options: SelectedGameReadinessOptions = {},
): SelectedGameReadinessReport {
  const label = options.label ?? presentation.hero.title ?? 'selected-game';
  const requiredTabs = options.requireTabs ?? DEFAULT_SELECTED_GAME_TAB_ORDER;
  const issues: SelectedGameReadinessIssue[] = [];

  for (const tabId of requiredTabs) {
    const tab = presentation.tabs.find((item) => item.id === tabId);
    if (!tab) {
      issues.push(issue('error', 'missing-tab', `tabs.${tabId}`, `Missing selected-game tab: ${tabId}.`));
      continue;
    }

    if (tab.chunks.length === 0) {
      issues.push(issue('error', 'empty-tab', `tabs.${tabId}.chunks`, `Selected-game tab has no public chunks: ${tab.label}.`));
      continue;
    }

    tab.chunks.forEach((chunkItem, index) => {
      if (!chunkHasPublicContent(chunkItem)) {
        issues.push(issue('warning', 'empty-chunk', `tabs.${tabId}.chunks.${index}`, `Chunk has no body, bullets, or visual refs: ${chunkItem.title}.`));
      }
    });
  }

  const publicText = presentation.tabs
    .flatMap((tab) => tab.chunks)
    .flatMap((chunkItem) => [
      chunkItem.title,
      chunkItem.eyebrow ?? '',
      ...chunkItem.body,
      ...chunkItem.bullets,
      ...(chunkItem.visualRefs ?? []).map((ref) => ref.label),
    ])
    .join(' ');

  if (PROVENANCE_PATTERN.test(publicText)) {
    issues.push(issue('error', 'provenance-leak', 'tabs', 'Public selected-game chunks include scraper, audit, provenance, or URL text.'));
  }

  return SelectedGameReadinessReportSchema.parse({
    ok: !issues.some((item) => item.severity === 'error'),
    label,
    issues,
  });
}

export function validateSelectedGameBundleReadiness(
  bundle: BuildSelectedGamePresentationInput,
  options: SelectedGameReadinessOptions = {},
): SelectedGameReadinessReport {
  const presentation = buildSelectedGamePresentation(bundle);
  const report = validateSelectedGamePresentationReadiness(presentation, options);
  const issues = [...report.issues];
  const gameInfo = dataOf(bundle.gameInfo);
  const gameMode = dataOf(bundle.gameMode);
  const scoring = dataOf(bundle.scoring);
  const mechanics = dataOf(bundle.mechanics);
  const deckModel = dataOf(bundle.deckModel);
  const actions = dataOf(bundle.actions);
  const validationFixtures = dataOf(bundle.validationFixtures);

  if (options.requireRichGameInfo !== false) {
    for (const field of ['historyContent', 'setupContent', 'variationsContent', 'aiContent'] as const) {
      if (!isMeaningful(gameInfo[field])) {
        issues.push(issue('warning', 'missing-rich-game-info', `gameInfo.${field}`, `GameInfo is missing ${field}; selected-game About will be thinner than the processed source allows.`));
      }
    }
  }

  if (!isMeaningful(gameMode.deckAsset) && !isMeaningful(dataOf(bundle.deck))) {
    issues.push(issue('error', 'missing-deck', 'gameMode.deckAsset', 'Selected-game Deck tab needs a deck asset reference or loaded deck asset.'));
  }

  if (!isMeaningful(gameMode.rankingAsset) && !isMeaningful(scoring.rankingAsset) && !isMeaningful(dataOf(bundle.ranking))) {
    issues.push(issue('warning', 'missing-ranking', 'scoring.rankingAsset', 'Selected-game Ranking tab has no ranking asset reference; it will fall back to text only.'));
  }

  if (options.requireValidationFixtures !== false) {
    issues.push(...validateValidationFixtureContract({
      validationFixtures,
      gameMode,
      mechanics,
      deckModel,
      actions,
    }));
  }
  issues.push(...validateReleaseReviewContract(gameMode, gameInfo));

  const linkedKeys = {
    ...asRecord(asRecord(gameInfo.mechanicsContract).linkedAssetKeys),
    ...asRecord(mechanics.modelRefs),
  };
  for (const key of ['deckModel', 'deck', 'actionSet', 'actions', 'validationFixtures', 'validation']) {
    if (isMeaningful(linkedKeys[key])) {
      return SelectedGameReadinessReportSchema.parse({
        ok: !issues.some((item) => item.severity === 'error'),
        label: report.label,
        issues,
      });
    }
  }

  issues.push(issue('warning', 'missing-mechanics-model-links', 'mechanics.modelRefs', 'Selected-game Systems/Deck/Scoring tabs have no linked deck, action, or validation model assets.'));

  return SelectedGameReadinessReportSchema.parse({
    ok: !issues.some((item) => item.severity === 'error'),
    label: report.label,
    issues,
  });
}

export function assertSelectedGameReadiness(report: SelectedGameReadinessReport, failOnWarnings = false): void {
  const blocking = report.issues.filter((item) => item.severity === 'error' || failOnWarnings);
  if (blocking.length === 0) {
    return;
  }
  const details = blocking.map((item) => `${item.severity.toUpperCase()} ${item.path}: ${item.message}`).join('\n');
  throw new Error(`Selected-game readiness failed for ${report.label}\n${details}`);
}

function validateValidationFixtureContract(input: ValidationFixtureContractInput): SelectedGameReadinessIssue[] {
  const issues: SelectedGameReadinessIssue[] = [];
  const suites = asArray(input.validationFixtures.validationSuites).map(asRecord);
  const fixtures = suites.flatMap((suite, suiteIndex) => {
    const suiteFixtures = asArray(suite.fixtures).map(asRecord);
    const suitePath = `validationFixtures.validationSuites.${suiteIndex}`;
    if (!asText(suite.id)) {
      issues.push(issue('error', 'validation-suite-missing-id', `${suitePath}.id`, 'Validation suite must have a stable id.'));
    }
    if (suiteFixtures.length === 0) {
      issues.push(issue('error', 'validation-suite-empty', `${suitePath}.fixtures`, 'Validation suite must include at least one fixture.'));
    }
    return suiteFixtures.map((fixture, fixtureIndex) => ({
      fixture,
      path: `${suitePath}.fixtures.${fixtureIndex}`,
    }));
  });

  if (suites.length === 0) {
    issues.push(issue('error', 'missing-validation-suites', 'validationFixtures.validationSuites', 'GameValidationFixtures must contain setup, flow, and scoring suites before migration can be trusted.'));
    return issues;
  }

  if (fixtures.length === 0) {
    issues.push(issue('error', 'missing-validation-fixtures', 'validationFixtures.validationSuites', 'GameValidationFixtures must contain concrete runtime fixtures.'));
    return issues;
  }

  for (const { fixture, path: fixturePath } of fixtures) {
    if (!asText(fixture.id)) {
      issues.push(issue('error', 'validation-fixture-missing-id', `${fixturePath}.id`, 'Validation fixture must have a stable id.'));
    }
    if (!asText(fixture.title)) {
      issues.push(issue('error', 'validation-fixture-missing-title', `${fixturePath}.title`, 'Validation fixture must have a public title.'));
    }
    if (!asText(fixture.purpose)) {
      issues.push(issue('error', 'validation-fixture-missing-purpose', `${fixturePath}.purpose`, 'Validation fixture must declare purpose.'));
    }
    if (!isMeaningful(fixture.explanation)) {
      issues.push(issue('error', 'validation-fixture-missing-explanation', `${fixturePath}.explanation`, 'Validation fixture must explain the expected result.'));
    }
    if (asTextArray(fixture.linkedRuleIds).length === 0) {
      issues.push(issue('error', 'validation-fixture-missing-rule-links', `${fixturePath}.linkedRuleIds`, 'Validation fixture must link to at least one authored rule id.'));
    }
  }

  const fixturePurposes = new Set(fixtures.map(({ fixture }) => asText(fixture.purpose)));
  for (const purpose of REQUIRED_VALIDATION_PURPOSES) {
    if (!fixturePurposes.has(purpose)) {
      issues.push(issue('error', `missing-${purpose}-fixture`, 'validationFixtures.validationSuites', `GameValidationFixtures must include a ${purpose} fixture.`));
    }
  }

  validateSetupFixture(issues, fixtures, input);
  validateFlowFixture(issues, fixtures, input);
  validateScoringFixture(issues, fixtures);
  return issues;
}

function validateSetupFixture(
  issues: SelectedGameReadinessIssue[],
  fixtures: Array<{ fixture: Record<string, unknown>; path: string }>,
  input: ValidationFixtureContractInput,
): void {
  const setup = findFixtureByPurpose(fixtures, 'setup');
  if (!setup) {
    return;
  }
  const fixture = setup.fixture;
  const playerCounts = asRecord(fixture.expectedPlayerCounts);
  const expectedInitialHandSize = requireNumber(issues, fixture.expectedInitialHandSize, `${setup.path}.expectedInitialHandSize`, 'Setup fixture expectedInitialHandSize');
  const expectedMinPlayers = requireNumber(issues, playerCounts.min, `${setup.path}.expectedPlayerCounts.min`, 'Setup fixture minimum player count');
  const expectedMaxPlayers = requireNumber(issues, playerCounts.max, `${setup.path}.expectedPlayerCounts.max`, 'Setup fixture maximum player count');
  const expectedDeckCount = requireNumber(issues, fixture.expectedDeckCount, `${setup.path}.expectedDeckCount`, 'Setup fixture expectedDeckCount');

  if (!asText(fixture.expectedVisibility)) {
    issues.push(issue('error', 'validation-setup-missing-visibility', `${setup.path}.expectedVisibility`, 'Setup fixture must declare expected initial card visibility.'));
  }

  assertSameNumber(issues, expectedInitialHandSize, requireNumber(issues, input.gameMode.initialNumberOfCards, 'gameMode.initialNumberOfCards', 'Game mode initialNumberOfCards'), `${setup.path}.expectedInitialHandSize`, 'gameMode.initialNumberOfCards', 'Initial hand size');
  assertSameNumber(issues, expectedInitialHandSize, requireNumber(issues, input.mechanics.initialHandSize, 'mechanics.initialHandSize', 'Mechanics initialHandSize'), `${setup.path}.expectedInitialHandSize`, 'mechanics.initialHandSize', 'Initial hand size');
  assertSameNumber(issues, expectedInitialHandSize, requireNumber(issues, input.deckModel.initialHandSize, 'deckModel.initialHandSize', 'Deck model initialHandSize'), `${setup.path}.expectedInitialHandSize`, 'deckModel.initialHandSize', 'Initial hand size');

  const mechanicsPlayerConfig = asRecord(input.mechanics.playerConfig);
  assertSameNumber(issues, expectedMinPlayers, requireNumber(issues, input.gameMode.minPlayers, 'gameMode.minPlayers', 'Game mode minPlayers'), `${setup.path}.expectedPlayerCounts.min`, 'gameMode.minPlayers', 'Minimum player count');
  assertSameNumber(issues, expectedMaxPlayers, requireNumber(issues, input.gameMode.maxPlayers, 'gameMode.maxPlayers', 'Game mode maxPlayers'), `${setup.path}.expectedPlayerCounts.max`, 'gameMode.maxPlayers', 'Maximum player count');
  assertSameNumber(issues, expectedMinPlayers, requireNumber(issues, mechanicsPlayerConfig.minPlayers, 'mechanics.playerConfig.minPlayers', 'Mechanics minPlayers'), `${setup.path}.expectedPlayerCounts.min`, 'mechanics.playerConfig.minPlayers', 'Minimum player count');
  assertSameNumber(issues, expectedMaxPlayers, requireNumber(issues, mechanicsPlayerConfig.maxPlayers, 'mechanics.playerConfig.maxPlayers', 'Mechanics maxPlayers'), `${setup.path}.expectedPlayerCounts.max`, 'mechanics.playerConfig.maxPlayers', 'Maximum player count');

  const nestedDeckModel = asRecord(input.deckModel.deckModel);
  const deckModelDeckCount = input.deckModel.deckCount ?? nestedDeckModel.deckCount;
  assertSameNumber(issues, expectedDeckCount, requireNumber(issues, input.gameMode.minDecks, 'gameMode.minDecks', 'Game mode minDecks'), `${setup.path}.expectedDeckCount`, 'gameMode.minDecks', 'Deck count');
  assertSameNumber(issues, expectedDeckCount, requireNumber(issues, input.mechanics.deckCount, 'mechanics.deckCount', 'Mechanics deckCount'), `${setup.path}.expectedDeckCount`, 'mechanics.deckCount', 'Deck count');
  assertSameNumber(issues, expectedDeckCount, requireNumber(issues, deckModelDeckCount, 'deckModel.deckCount', 'Deck model deckCount'), `${setup.path}.expectedDeckCount`, 'deckModel.deckCount', 'Deck count');
}

function validateFlowFixture(
  issues: SelectedGameReadinessIssue[],
  fixtures: Array<{ fixture: Record<string, unknown>; path: string }>,
  input: ValidationFixtureContractInput,
): void {
  const flow = findFixtureByPurpose(fixtures, 'flow');
  if (!flow) {
    return;
  }
  const fixture = flow.fixture;
  const firstPhase = asRecord(asArray(input.mechanics.phases)[0]);
  const expectedFirstPhase = asText(fixture.expectedFirstPhase);
  const expectedActor = asText(fixture.expectedActor);
  const expectedNextPhase = asText(fixture.expectedNextPhase);
  const expectedLegalActions = asTextArray(fixture.expectedLegalActions);
  const supportedActionIds = asTextArray(fixture.supportedActionIds);
  const actualPhaseId = asText(firstPhase.id);
  const actualLegalActions = asTextArray(firstPhase.legalActions);

  if (!expectedFirstPhase) {
    issues.push(issue('error', 'validation-flow-missing-first-phase', `${flow.path}.expectedFirstPhase`, 'Flow fixture must declare the expected first phase.'));
  } else if (actualPhaseId && expectedFirstPhase !== actualPhaseId) {
    issues.push(issue('error', 'validation-flow-first-phase-mismatch', `${flow.path}.expectedFirstPhase / mechanics.phases.0.id`, `Flow fixture first phase ${expectedFirstPhase} must match mechanics first phase ${actualPhaseId}.`));
  }

  if (expectedActor && asText(firstPhase.actor) && expectedActor !== asText(firstPhase.actor)) {
    issues.push(issue('error', 'validation-flow-actor-mismatch', `${flow.path}.expectedActor / mechanics.phases.0.actor`, `Flow fixture actor ${expectedActor} must match mechanics first actor ${asText(firstPhase.actor)}.`));
  }
  if (expectedNextPhase && asText(firstPhase.nextPhase) && expectedNextPhase !== asText(firstPhase.nextPhase)) {
    issues.push(issue('error', 'validation-flow-next-phase-mismatch', `${flow.path}.expectedNextPhase / mechanics.phases.0.nextPhase`, `Flow fixture next phase ${expectedNextPhase} must match mechanics next phase ${asText(firstPhase.nextPhase)}.`));
  }

  if (expectedLegalActions.length === 0) {
    issues.push(issue('error', 'validation-flow-missing-legal-actions', `${flow.path}.expectedLegalActions`, 'Flow fixture must declare opening legal actions.'));
  } else {
    assertSameStringSet(issues, expectedLegalActions, actualLegalActions, `${flow.path}.expectedLegalActions`, 'mechanics.phases.0.legalActions', 'Opening legal actions');
  }

  if (supportedActionIds.length === 0) {
    issues.push(issue('error', 'validation-flow-missing-supported-actions', `${flow.path}.supportedActionIds`, 'Flow fixture must declare the supported action ids it depends on.'));
  }

  const authoredActionIds = collectSupportedActionIds(input.actions, input.mechanics);
  for (const actionId of expectedLegalActions) {
    if (supportedActionIds.length > 0 && !supportedActionIds.includes(actionId)) {
      issues.push(issue('error', 'validation-flow-action-not-supported', `${flow.path}.supportedActionIds`, `Opening action ${actionId} is not listed in supportedActionIds.`));
    }
    if (authoredActionIds.size > 0 && !authoredActionIds.has(actionId)) {
      issues.push(issue('error', 'validation-flow-action-not-authored', `${flow.path}.expectedLegalActions`, `Opening action ${actionId} is not present in the authored action set.`));
    }
  }
}

function validateScoringFixture(
  issues: SelectedGameReadinessIssue[],
  fixtures: Array<{ fixture: Record<string, unknown>; path: string }>,
): void {
  const scoring = findFixtureByPurpose(fixtures, 'scoring');
  if (!scoring) {
    return;
  }
  if (!isMeaningful(scoring.fixture.expectedFinalScore)) {
    issues.push(issue('error', 'validation-scoring-missing-expected-score', `${scoring.path}.expectedFinalScore`, 'Scoring fixture must declare the expected final score or outcome.'));
  }
}

function findFixtureByPurpose(
  fixtures: Array<{ fixture: Record<string, unknown>; path: string }>,
  purpose: RequiredValidationPurpose,
): { fixture: Record<string, unknown>; path: string } | undefined {
  return fixtures.find(({ fixture }) => asText(fixture.purpose) === purpose);
}

function collectSupportedActionIds(actions: Record<string, unknown>, mechanics: Record<string, unknown>): Set<string> {
  const ids = new Set<string>([
    ...asTextArray(asRecord(actions.actionModel).actionIds),
    ...asTextArray(asRecord(mechanics.actionModel).actionIds),
  ]);
  collectSupportedActionIdsFromRecord(ids, asRecord(actions.actions));
  collectSupportedActionIdsFromRecord(ids, asRecord(mechanics.actions));
  collectSupportedActionIdsFromArray(ids, asArray(actions.customActions));
  collectSupportedActionIdsFromArray(ids, asArray(mechanics.customActions));
  return ids;
}

function collectSupportedActionIdsFromRecord(ids: Set<string>, actions: Record<string, unknown>): void {
  for (const [actionId, action] of Object.entries(actions)) {
    if (asRecord(action).supported === true) {
      ids.add(actionId);
    }
  }
}

function collectSupportedActionIdsFromArray(ids: Set<string>, actions: unknown[]): void {
  for (const action of actions.map(asRecord)) {
    const actionId = asText(action.id);
    if (actionId && action.supported === true) {
      ids.add(actionId);
    }
  }
}

function requireNumber(
  issues: SelectedGameReadinessIssue[],
  value: unknown,
  path: string,
  label: string,
): number | null {
  const numberValue = asFiniteNumber(value);
  if (numberValue === null) {
    issues.push(issue('error', 'validation-contract-missing-number', path, `${label} must be a finite number.`));
  }
  return numberValue;
}

function validateReleaseReviewContract(
  gameMode: Record<string, unknown>,
  gameInfo: Record<string, unknown>,
): SelectedGameReadinessIssue[] {
  const releaseStatus = asText(gameMode.releaseStatus);
  if (!PUBLIC_RELEASE_STATUSES.has(releaseStatus as GameModeStatus)) {
    return [];
  }

  const migrationReview = asRecord(asRecord(gameInfo.editorOnly).migrationReview);
  const reviewStatus = asText(migrationReview.status);
  if (!reviewStatus || reviewStatus === 'verified') {
    return [];
  }

  return [
    issue(
      'error',
      'release-review-not-verified',
      'gameInfo.editorOnly.migrationReview.status',
      `Public migrated game cannot be ${releaseStatus} while migrationReview.status is ${reviewStatus}.`,
    ),
  ];
}

function assertSameNumber(
  issues: SelectedGameReadinessIssue[],
  left: number | null,
  right: number | null,
  leftPath: string,
  rightPath: string,
  label: string,
): void {
  if (left !== null && right !== null && left !== right) {
    issues.push(issue('error', 'validation-contract-number-mismatch', `${leftPath} / ${rightPath}`, `${label} must match; found ${left} and ${right}.`));
  }
}

function assertSameStringSet(
  issues: SelectedGameReadinessIssue[],
  left: string[],
  right: string[],
  leftPath: string,
  rightPath: string,
  label: string,
): void {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const missing = left.filter((value) => !rightSet.has(value));
  const extra = right.filter((value) => !leftSet.has(value));
  if (missing.length > 0 || extra.length > 0) {
    issues.push(issue('error', 'validation-contract-string-set-mismatch', `${leftPath} / ${rightPath}`, `${label} must match; missing ${missing.join(', ') || 'none'}, extra ${extra.join(', ') || 'none'}.`));
  }
}

function chunkHasPublicContent(chunkItem: SelectedGamePresentationChunk): boolean {
  return chunkItem.body.length > 0 || chunkItem.bullets.length > 0 || Boolean(chunkItem.visualRefs?.length);
}

function issue(
  severity: SelectedGameReadinessIssue['severity'],
  code: string,
  path: string,
  message: string,
): SelectedGameReadinessIssue {
  return { severity, code, path, message };
}

function dataOf(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  const data = asRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
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

function asTextArray(value: unknown): string[] {
  return asArray(value).map(asText).filter(Boolean);
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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
