import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';
import {
  CLAIM_RANK_CYCLE,
  validateClaimScoringFixtures,
  type ClaimScoringFixture,
} from '@/engine/mechanics/family/ClaimScoring';
import * as Schema from 'effect/Schema';
import {
  Bankroll,
  HandSize,
  PositiveGamePoints,
  RoundNumber,
  TimerSeconds,
} from './amounts.schema';
import { ExampleId, ScoringProfileId, StrategyProfileId } from './ids.schema';
import { decodeMechanicsManifest, mechanicsManifestToSpec, type MechanicsManifest } from './mechanics.schema';

const NonEmptyString = Schema.String.pipe(Schema.minLength(1));
const Integer = Schema.Number.pipe(Schema.int());
const PositiveInteger = Integer.pipe(Schema.positive());
const UnknownRecord = Schema.Record({ key: Schema.String, value: Schema.Unknown });
const StringRecord = Schema.Record({ key: Schema.String, value: NonEmptyString });
const NumberRecord = Schema.Record({ key: Schema.String, value: Integer });
const ClaimStrategyRatioSchema = Schema.Number.pipe(
  Schema.between(0, 1),
  Schema.brand('ClaimStrategyRatio'),
);

export const CLAIM_ACTION_IDS = [
  'take_stock',
  'take_discard',
  'discard_card',
  'declare_suit',
  'end_turn',
  'timeout_turn',
  'call_showdown',
] as const;

export const CLAIM_SYSTEM_ACTION_IDS = ['setup_round', 'score_round'] as const;

export const ClaimSuitSchema = Schema.Literal('spades', 'hearts', 'diamonds', 'clubs');
export type ClaimSuit = typeof ClaimSuitSchema.Type;

export const ClaimBotProfileSchema = Schema.Struct({
  aggressiveness: ClaimStrategyRatioSchema,
  riskTolerance: ClaimStrategyRatioSchema,
  bluffFrequency: ClaimStrategyRatioSchema,
});
export type ClaimBotProfile = typeof ClaimBotProfileSchema.Type;

export const ClaimStrategyDataSchema = Schema.asSchema(
  Schema.Struct({
    strategyProfileId: Schema.optional(StrategyProfileId),
    aggressiveness: Schema.optional(ClaimStrategyRatioSchema),
    riskTolerance: Schema.optional(ClaimStrategyRatioSchema),
    bluffFrequency: Schema.optional(ClaimStrategyRatioSchema),
    bluffSettings: Schema.optional(UnknownRecord),
    LLM: Schema.optional(NonEmptyString),
    Player: Schema.optional(NonEmptyString),
  }).pipe(Schema.extend(UnknownRecord)),
);
export type ClaimStrategyData = typeof ClaimStrategyDataSchema.Type;

export const ClaimRulesDataSchema = Schema.asSchema(
  Schema.Struct({
    rulesVersion: NonEmptyString,
    useTrump: Schema.Boolean,
    playerCount: Schema.Struct({
      min: PositiveInteger,
      max: PositiveInteger,
      reason: NonEmptyString,
    }),
    setup: Schema.Struct({
      deck: NonEmptyString,
      deckAsset: NonEmptyString,
      cardRankingAsset: NonEmptyString,
      dealCountPerPlayer: HandSize,
      openingDiscard: Schema.Boolean,
      publicStockTop: Schema.Boolean,
      publicDiscardTop: Schema.Boolean,
      startingBankroll: Bankroll,
      maxRounds: RoundNumber,
    }),
    turnRules: Schema.Struct({
      timerSeconds: TimerSeconds,
      minHandSize: HandSize,
      maxHandSize: Schema.NullOr(PositiveInteger),
      takeLimitPerTurn: PositiveInteger,
      discardLimitPerTurn: PositiveInteger,
      allowDiscardOnly: Schema.Boolean,
      allowTakeOnly: Schema.Boolean,
      allowDiscardThenTakeSameCard: Schema.Boolean,
      noActionTimeoutPenalty: Schema.Boolean,
      actionTimeoutCountsAsUndeclaredTurn: Schema.Boolean,
    }),
    declarationRules: Schema.Struct({
      visibility: NonEmptyString,
      requiresCardInSuit: Schema.Boolean,
      redeclareAllowed: Schema.Boolean,
      multiplePlayersMayDeclareSameSuit: Schema.Boolean,
      undeclaredTurnDebt: NonEmptyString,
      debtPersistsAfterDiscard: Schema.Boolean,
    }),
    showdownRules: Schema.Struct({
      callerMustBeDeclared: Schema.Boolean,
      minCardsInHand: HandSize,
      minimumFinalScore: PositiveGamePoints,
      autoRevealAllHands: Schema.Boolean,
      autoShowdownWhenStockAndDiscardExhausted: Schema.Boolean,
    }),
    scoringRules: Schema.Struct({
      rankCycle: Schema.Array(PositiveInteger),
      aceBridgesKingAndTwo: Schema.Boolean,
      declaredSuitScoresPositive: Schema.Boolean,
      otherSuitsScoreNegative: Schema.Boolean,
      undeclaredAllCardsScoreNegative: Schema.Boolean,
      runFormula: NonEmptyString,
      singleCardFormula: NonEmptyString,
      cardsCountOnceInMaximalRuns: Schema.Boolean,
      debtSubtractedFromFinalScore: Schema.Boolean,
    }),
    settlementRules: UnknownRecord,
    moveValidityConditions: StringRecord,
    LLM: NonEmptyString,
    Player: NonEmptyString,
  }).pipe(Schema.extend(UnknownRecord)),
);
export type ClaimRulesData = typeof ClaimRulesDataSchema.Type;

export const ClaimScoringDataSchema = Schema.asSchema(
  Schema.Struct({
    scoringType: ScoringProfileId,
    scoringDirection: NonEmptyString,
    targetScore: PositiveGamePoints,
    winCondition: NonEmptyString,
    scoringFormula: NonEmptyString,
    description: NonEmptyString,
    cardValues: NumberRecord,
    priorityOrder: Schema.Array(NonEmptyString),
    rankCycle: Schema.Array(PositiveInteger),
    scoringRules: UnknownRecord,
    declaredSuit: UnknownRecord,
    offSuit: UnknownRecord,
    undeclared: UnknownRecord,
    debt: UnknownRecord,
    showdownMinimumFinalScore: PositiveGamePoints,
    penalties: NonEmptyString,
    settlement: NonEmptyString,
  }).pipe(Schema.extend(UnknownRecord)),
);
export type ClaimScoringData = typeof ClaimScoringDataSchema.Type;

export const ClaimScoringFixtureSchema = Schema.asSchema(
  Schema.Struct({
    id: Schema.optional(ExampleId),
    title: Schema.optional(NonEmptyString),
    purpose: Schema.optional(NonEmptyString),
    hand: Schema.Array(NonEmptyString),
    declaredSuit: Schema.NullOr(ClaimSuitSchema),
    expectedFinalScore: Integer,
    debt: Schema.optional(Integer),
    explanation: Schema.optional(NonEmptyString),
    linkedRuleIds: Schema.optional(Schema.Array(NonEmptyString)),
    sourceAsset: Schema.optional(NonEmptyString),
  }).pipe(Schema.extend(UnknownRecord)),
);
export type ClaimScoringFixtureData = typeof ClaimScoringFixtureSchema.Type;

export const ClaimRuntimeConfigSchema = Schema.Struct({
  startingBankroll: Bankroll,
  minHandSize: HandSize,
  maxRounds: RoundNumber,
  showdownMinimum: PositiveGamePoints,
  timerSeconds: TimerSeconds,
  strategy: ClaimBotProfileSchema,
});
export type ClaimRuntimeConfig = typeof ClaimRuntimeConfigSchema.Type;

export interface ClaimAssetValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface ClaimAssetBundleInput {
  readonly mechanics: unknown;
  readonly rules?: unknown;
  readonly scoring?: unknown;
  readonly strategy?: unknown;
}

export const DEFAULT_CLAIM_BOT_PROFILE = Schema.decodeUnknownSync(ClaimBotProfileSchema)({
  aggressiveness: 0.6,
  riskTolerance: 0.5,
  bluffFrequency: 0.25,
});

export const decodeClaimRulesData = (input: unknown): ClaimRulesData =>
  Schema.decodeUnknownSync(ClaimRulesDataSchema)(unwrapAssetData(input));

export const decodeClaimScoringData = (input: unknown): ClaimScoringData =>
  Schema.decodeUnknownSync(ClaimScoringDataSchema)(unwrapAssetData(input));

export const decodeClaimStrategyData = (input: unknown): ClaimStrategyData =>
  Schema.decodeUnknownSync(ClaimStrategyDataSchema)(unwrapAssetData(input));

export const encodeClaimBotProfile = Schema.encodeSync(ClaimBotProfileSchema);

export function extractClaimStrategyProfile(input: unknown): ClaimBotProfile {
  const data = decodeClaimStrategyData(input);
  return Schema.decodeUnknownSync(ClaimBotProfileSchema)({
    aggressiveness: data.aggressiveness ?? DEFAULT_CLAIM_BOT_PROFILE.aggressiveness,
    riskTolerance: data.riskTolerance ?? DEFAULT_CLAIM_BOT_PROFILE.riskTolerance,
    bluffFrequency: data.bluffFrequency ?? DEFAULT_CLAIM_BOT_PROFILE.bluffFrequency,
  });
}

export function withClaimStrategyProfile(spec: MechanicsSpec, strategy: ClaimBotProfile): MechanicsSpec {
  return {
    ...spec,
    strategyHooks: {
      ...(spec.strategyHooks ?? {}),
      botProfile: encodeClaimBotProfile(strategy),
    },
  };
}

export function compileClaimRuntimeConfig(spec: MechanicsSpec): ClaimRuntimeConfig {
  const familyConfig = asRecord(spec.familyConfig);
  const constants = asRecord(spec.constants);
  const setupModel = asRecord(spec.setupModel);
  const turnModel = asRecord(spec.turnModel);
  const scoringModel = asRecord(spec.scoringModel);
  const strategyHooks = asRecord(spec.strategyHooks);
  const botProfile = asRecord(strategyHooks?.botProfile) ?? strategyHooks ?? {};

  return Schema.decodeUnknownSync(ClaimRuntimeConfigSchema)({
    startingBankroll: readNumber([familyConfig, constants, setupModel], 'startingBankroll', 1352),
    minHandSize: readNumber([familyConfig, constants, turnModel, setupModel], 'minHandSize', spec.initialHandSize ?? 3),
    maxRounds: readNumber([familyConfig, constants, asRecord(spec.roundConfig)], 'maxRounds', 10),
    showdownMinimum: readNumber([familyConfig, constants, scoringModel], 'showdownMinimum', readNumber([scoringModel], 'minimumFinalScore', 27)),
    timerSeconds: spec.turnPolicy.timerSeconds ?? readNumber([turnModel], 'timerSeconds', 60),
    strategy: extractClaimStrategyProfile(botProfile),
  });
}

export function validateClaimAssetBundle(input: ClaimAssetBundleInput): ClaimAssetValidationIssue[] {
  const issues: ClaimAssetValidationIssue[] = [];
  const mechanics = decodeBundlePart('mechanics', input.mechanics, decodeClaimMechanicsManifest, issues);
  const rules = input.rules === undefined ? null : decodeBundlePart('rules', input.rules, decodeClaimRulesData, issues);
  const scoring = input.scoring === undefined ? null : decodeBundlePart('scoring', input.scoring, decodeClaimScoringData, issues);
  const strategy = input.strategy === undefined ? null : decodeBundlePart('strategy', input.strategy, extractClaimStrategyProfile, issues);

  if (!mechanics) {
    return issues;
  }

  validateClaimMechanics(mechanics, issues);

  if (rules) {
    validateClaimRules(mechanics, rules, issues);
  }

  if (scoring) {
    validateClaimScoring(mechanics, scoring, issues);
  }

  if (strategy) {
    validateClaimStrategy(mechanics, strategy, issues);
  }

  validateClaimScoringExamples(mechanics, issues);

  return issues;
}

function decodeClaimMechanicsManifest(input: unknown): MechanicsManifest {
  return decodeMechanicsManifest(unwrapAssetData(input));
}

function validateClaimMechanics(mechanics: MechanicsManifest, issues: ClaimAssetValidationIssue[]): void {
  addIssueIf(mechanics.familyKernel !== 'claim', issues, 'mechanics.familyKernel', 'Claim mechanics must use the claim family kernel');
  addIssueIf(mechanics.playerConfig.minPlayers !== 4, issues, 'mechanics.playerConfig.minPlayers', 'Claim requires exactly four minimum players');
  addIssueIf(mechanics.playerConfig.maxPlayers !== 4, issues, 'mechanics.playerConfig.maxPlayers', 'Claim requires exactly four maximum players');
  addIssueIf((mechanics.playerConfig.optimalPlayers ?? 4) !== 4, issues, 'mechanics.playerConfig.optimalPlayers', 'Claim optimal player count must be four');
  addIssueIf(mechanics.initialHandSize !== 3, issues, 'mechanics.initialHandSize', 'Claim initial deal must be three cards');
  addIssueIf(mechanics.turnPolicy.timerSeconds !== 60, issues, 'mechanics.turnPolicy.timerSeconds', 'Claim turn timer must be 60 seconds');
  addIssueIf(mechanics.deckType !== 'Standard 52', issues, 'mechanics.deckType', 'Claim must use the Standard 52 deck');
  addIssueIf(mechanics.rankSet !== 'Standard_52', issues, 'mechanics.rankSet', 'Claim must use the Standard_52 ranking set');

  ['rules', 'scoring', 'strategy', 'deck', 'cardRanking', 'layout', 'info'].forEach((key) => {
    addIssueIf(!mechanics.assetRefs?.[key], issues, `mechanics.assetRefs.${key}`, `Claim mechanics must link the ${key} asset`);
  });

  const enabledExecutorIds = new Set<string>((mechanics.enabledModules ?? [])
    .filter((module) => module.enabled !== false)
    .map((module) => module.executorId));
  addIssueIf(!enabledExecutorIds.has('claim.hoarder.v1'), issues, 'mechanics.enabledModules', 'Claim must enable the hoarder executor');
  addIssueIf(!enabledExecutorIds.has('claim.bot.deterministic.v1'), issues, 'mechanics.enabledModules', 'Claim must enable the deterministic bot executor');

  const supportedActionIds = new Set(Object.entries(mechanics.actions ?? {})
    .filter(([, action]) => action.supported)
    .map(([actionId]) => actionId));
  CLAIM_ACTION_IDS.forEach((actionId) => {
    addIssueIf(!supportedActionIds.has(actionId), issues, `mechanics.actions.${actionId}`, `Claim action ${actionId} must be supported`);
  });

  const customActionIds = new Set<string>((mechanics.customActions ?? []).filter((action) => action.supported).map((action) => action.id));
  CLAIM_SYSTEM_ACTION_IDS.forEach((actionId) => {
    addIssueIf(!customActionIds.has(actionId), issues, `mechanics.customActions.${actionId}`, `Claim system action ${actionId} must be supported`);
  });

  const actionModelIds = new Set(readStringArray(asRecord(mechanics.actionModel), 'actionIds'));
  CLAIM_ACTION_IDS.forEach((actionId) => {
    addIssueIf(!actionModelIds.has(actionId), issues, `mechanics.actionModel.actionIds.${actionId}`, `Claim action model must include ${actionId}`);
  });
}

function validateClaimRules(mechanics: MechanicsManifest, rules: ClaimRulesData, issues: ClaimAssetValidationIssue[]): void {
  const runtime = compileClaimRuntimeConfig(mechanicsToSpecLike(mechanics));
  addIssueIf(rules.playerCount.min !== 4 || rules.playerCount.max !== 4, issues, 'rules.playerCount', 'Claim rules must lock player count to four');
  addIssueIf(rules.setup.dealCountPerPlayer !== runtime.minHandSize, issues, 'rules.setup.dealCountPerPlayer', 'Rules deal count must match mechanics min hand size');
  addIssueIf(rules.setup.startingBankroll !== runtime.startingBankroll, issues, 'rules.setup.startingBankroll', 'Rules starting bankroll must match mechanics');
  addIssueIf(rules.setup.maxRounds !== runtime.maxRounds, issues, 'rules.setup.maxRounds', 'Rules max rounds must match mechanics');
  addIssueIf(rules.turnRules.timerSeconds !== runtime.timerSeconds, issues, 'rules.turnRules.timerSeconds', 'Rules turn timer must match mechanics');
  addIssueIf(rules.showdownRules.minimumFinalScore !== runtime.showdownMinimum, issues, 'rules.showdownRules.minimumFinalScore', 'Rules showdown minimum must match mechanics');

  CLAIM_ACTION_IDS.forEach((actionId) => {
    addIssueIf(!rules.moveValidityConditions[actionId], issues, `rules.moveValidityConditions.${actionId}`, `Rules must describe ${actionId}`);
  });
}

function validateClaimScoring(mechanics: MechanicsManifest, scoring: ClaimScoringData, issues: ClaimAssetValidationIssue[]): void {
  const runtime = compileClaimRuntimeConfig(mechanicsToSpecLike(mechanics));
  const scoringModel = asRecord(mechanics.scoringModel);
  const scoringProfileId = readString(scoringModel, 'scoringProfileId');
  addIssueIf(scoring.scoringType !== 'claim_hoarder_circular_runs', issues, 'scoring.scoringType', 'Claim scoring must use claim_hoarder_circular_runs');
  addIssueIf(scoringProfileId !== scoring.scoringType, issues, 'mechanics.scoringModel.scoringProfileId', 'Mechanics scoring profile must match the scoring asset');
  addIssueIf(scoring.targetScore !== runtime.showdownMinimum, issues, 'scoring.targetScore', 'Scoring target score must match mechanics showdown minimum');
  addIssueIf(scoring.showdownMinimumFinalScore !== runtime.showdownMinimum, issues, 'scoring.showdownMinimumFinalScore', 'Scoring showdown minimum must match mechanics');
  addIssueIf(!sameNumbers(scoring.rankCycle, CLAIM_RANK_CYCLE), issues, 'scoring.rankCycle', 'Claim scoring rank cycle must match the runtime circular rank cycle');
}

function validateClaimStrategy(mechanics: MechanicsManifest, strategy: ClaimBotProfile, issues: ClaimAssetValidationIssue[]): void {
  const strategyHooks = asRecord(mechanics.strategyHooks);
  addIssueIf(readString(strategyHooks, 'deterministicBotExecutorId') !== 'claim.bot.deterministic.v1', issues, 'mechanics.strategyHooks.deterministicBotExecutorId', 'Claim strategy hooks must point at the deterministic bot executor');
  addIssueIf(strategy.aggressiveness < 0 || strategy.aggressiveness > 1, issues, 'strategy.aggressiveness', 'Claim strategy aggressiveness must be between 0 and 1');
  addIssueIf(strategy.riskTolerance < 0 || strategy.riskTolerance > 1, issues, 'strategy.riskTolerance', 'Claim strategy risk tolerance must be between 0 and 1');
  addIssueIf(strategy.bluffFrequency < 0 || strategy.bluffFrequency > 1, issues, 'strategy.bluffFrequency', 'Claim strategy bluff frequency must be between 0 and 1');
}

function validateClaimScoringExamples(mechanics: MechanicsManifest, issues: ClaimAssetValidationIssue[]): void {
  const fixtures = extractScoringFixtures(mechanics, issues);
  validateClaimScoringFixtures(fixtures).forEach((message) => {
    issues.push({
      path: 'mechanics.validationSuites',
      message,
    });
  });
}

function extractScoringFixtures(mechanics: MechanicsManifest, issues: ClaimAssetValidationIssue[]): ClaimScoringFixture[] {
  return (mechanics.validationSuites ?? []).flatMap((suite, suiteIndex) => {
    const suiteRecord = asRecord(suite);
    const fixtures = suiteRecord?.fixtures;
    if (!Array.isArray(fixtures)) {
      return [];
    }

    return fixtures.flatMap((fixture, fixtureIndex) => {
      try {
        const decoded = Schema.decodeUnknownSync(ClaimScoringFixtureSchema)(fixture);
        return [{
          id: decoded.id,
          title: decoded.title,
          purpose: decoded.purpose,
          hand: decoded.hand,
          declaredSuit: decoded.declaredSuit,
          debt: decoded.debt,
          expectedFinalScore: decoded.expectedFinalScore,
          explanation: decoded.explanation,
          linkedRuleIds: decoded.linkedRuleIds,
          sourceAsset: decoded.sourceAsset,
        }];
      } catch (error) {
        issues.push({
          path: `mechanics.validationSuites.${suiteIndex}.fixtures.${fixtureIndex}`,
          message: formatDecodeError(error),
        });
        return [];
      }
    });
  });
}

function decodeBundlePart<T>(
  path: string,
  input: unknown,
  decoder: (value: unknown) => T,
  issues: ClaimAssetValidationIssue[],
): T | null {
  try {
    return decoder(input);
  } catch (error) {
    issues.push({
      path,
      message: formatDecodeError(error),
    });
    return null;
  }
}

function unwrapAssetData(input: unknown): unknown {
  const root = asRecord(input);
  return asRecord(root?.data) ?? input;
}

function mechanicsToSpecLike(mechanics: MechanicsManifest): MechanicsSpec {
  return mechanicsManifestToSpec(mechanics);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readNumber(records: readonly (Record<string, unknown> | null | undefined)[], key: string, fallback: number): number {
  for (const record of records) {
    const value = record?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return fallback;
}

function readString(record: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = record?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readStringArray(record: Record<string, unknown> | null | undefined, key: string): string[] {
  const value = record?.[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function addIssueIf(condition: boolean, issues: ClaimAssetValidationIssue[], path: string, message: string): void {
  if (condition) {
    issues.push({ path, message });
  }
}

function formatDecodeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
