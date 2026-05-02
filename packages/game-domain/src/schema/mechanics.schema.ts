import type {
  MechanicsAction,
  MechanicsAssetReference,
  MechanicsCustomAction,
  MechanicsEnabledModule,
  MechanicsEndCondition,
  MechanicsPhase,
  MechanicsPlayerConfig,
  MechanicsRuntimeIntegration,
  MechanicsSpec,
  MechanicsTurnPolicy,
  MechanicsZone,
} from '@/engine/mechanics/MechanicsSpec';
import * as Schema from 'effect/Schema';
import { HandSize, TimerSeconds } from './amounts.schema';
import {
  ActionId,
  ExecutorId,
  FamilyKernelId,
  FamilyVariantId,
  GameId,
  MechanicsId,
  MechanicsVersion,
  PhaseId,
  ZoneId,
} from './ids.schema';

const NonEmptyString = Schema.String.pipe(Schema.minLength(1));
const NonNegativeInteger = Schema.Number.pipe(Schema.int(), Schema.nonNegative());
const PositiveInteger = Schema.Number.pipe(Schema.int(), Schema.positive());
const UnknownRecord = Schema.Record({ key: Schema.String, value: Schema.Unknown });
const StringRecord = Schema.Record({ key: Schema.String, value: NonEmptyString });
const NullableUnknownRecord = Schema.NullOr(UnknownRecord);
const OptionalUnknownRecord = Schema.optional(UnknownRecord);
const CostValue = Schema.Union(NonEmptyString, Schema.Number, UnknownRecord, Schema.Null);

export const MechanicsAssetReferenceSchema = Schema.asSchema(
  Schema.Struct({
    path: Schema.optional(NonEmptyString),
    guid: Schema.optional(NonEmptyString),
    assetType: Schema.optional(NonEmptyString),
    displayName: Schema.optional(NonEmptyString),
  }).pipe(Schema.extend(UnknownRecord))
);

export const MechanicsEnabledModuleSchema = Schema.asSchema(
  Schema.Struct({
    id: NonEmptyString,
    kind: NonEmptyString,
    executorId: ExecutorId,
    enabled: Schema.optional(Schema.Boolean),
    config: OptionalUnknownRecord,
    assetRefs: Schema.optional(Schema.Record({ key: Schema.String, value: MechanicsAssetReferenceSchema })),
  }).pipe(Schema.extend(UnknownRecord))
);

export const MechanicsPlayerConfigSchema = Schema.Struct({
  playerMode: Schema.Literal('singleplayer', 'multiplayer'),
  minPlayers: PositiveInteger,
  maxPlayers: PositiveInteger,
  optimalPlayers: Schema.optional(Schema.NullOr(PositiveInteger)),
  dealerRotates: Schema.Boolean,
});

export const MechanicsPhaseConditionSchema = Schema.Struct({
  condition: NonEmptyString,
  nextPhase: Schema.NullOr(PhaseId),
});

export const MechanicsPhaseSchema = Schema.Struct({
  id: PhaseId,
  label: NonEmptyString,
  actor: NonEmptyString,
  legalActions: Schema.Array(ActionId),
  nextPhase: Schema.NullOr(PhaseId),
  isMandatory: Schema.Boolean,
  loopIndex: Schema.optional(Schema.NullOr(NonNegativeInteger)),
  totalLoops: Schema.optional(Schema.NullOr(NonNegativeInteger)),
  conditionalNext: Schema.Array(MechanicsPhaseConditionSchema),
  cardVisibilityChanges: StringRecord,
  notes: Schema.optional(NonEmptyString),
});

export const MechanicsActionSchema = Schema.Struct({
  supported: Schema.Boolean,
  description: NonEmptyString,
  constraints: Schema.optional(NonEmptyString),
  effectType: NonEmptyString,
  cost: Schema.optional(CostValue),
  effectHints: UnknownRecord,
  isTerminating: Schema.Boolean,
  reason: Schema.optional(NonEmptyString),
});

export const MechanicsCustomActionSchema = Schema.Struct({
  id: ActionId,
  supported: Schema.Boolean,
  description: NonEmptyString,
  cost: Schema.optional(CostValue),
  constraints: Schema.optional(Schema.String),
  effectType: NonEmptyString,
  effectHints: UnknownRecord,
  isTerminating: Schema.Boolean,
});

export const MechanicsZoneSchema = Schema.Struct({
  id: ZoneId,
  type: NonEmptyString,
  owner: NonEmptyString,
  visibility: NonEmptyString,
  capacity: Schema.optional(Schema.NullOr(NonNegativeInteger)),
});

export const MechanicsTurnPolicySchema = Schema.Struct({
  direction: NonEmptyString,
  startsWith: NonEmptyString,
  timerSeconds: Schema.optional(Schema.NullOr(TimerSeconds)),
});

export const MechanicsEndConditionSchema = Schema.Struct({
  id: NonEmptyString,
  description: NonEmptyString,
  appliesToPhase: Schema.optional(Schema.NullOr(PhaseId)),
});

export const MechanicsRuntimeIntegrationSchema = Schema.asSchema(
  Schema.Struct({
    resolverName: Schema.optional(ExecutorId),
    requiredEngineCapabilities: Schema.optional(Schema.Array(NonEmptyString)),
    deterministicSeed: Schema.optional(Schema.Boolean),
    authority: Schema.optional(NonEmptyString),
    multiplayerSyncModel: Schema.optional(NonEmptyString),
    replaySnapshotCompatible: Schema.optional(Schema.Boolean),
  }).pipe(Schema.extend(UnknownRecord))
);

export const MechanicsDeckModelSchema = Schema.asSchema(
  Schema.Struct({
    deckAssetRef: NonEmptyString,
    rankingAssetRef: Schema.optional(NonEmptyString),
    deckCount: Schema.optional(PositiveInteger),
    initialHandSize: Schema.optional(HandSize),
    shufflePolicy: Schema.optional(NonEmptyString),
    drawDirection: Schema.optional(NonEmptyString),
    drawConfig: OptionalUnknownRecord,
    discardConfig: OptionalUnknownRecord,
    runtimePolicy: OptionalUnknownRecord,
  }).pipe(Schema.extend(UnknownRecord))
);

export const MechanicsImplementationHintsSchema = Schema.Struct({
  rngUsed: Schema.Array(NonEmptyString),
  authoritativeServer: Schema.Boolean,
  customLogicNeeded: Schema.Array(NonEmptyString),
});

export const MechanicsManifestSchema = Schema.Struct({
  gameId: Schema.optional(GameId),
  mechanicsId: Schema.optional(MechanicsId),
  mechanicsVersion: Schema.optional(MechanicsVersion),
  familyKernel: FamilyKernelId,
  familyVariant: Schema.optional(FamilyVariantId),
  kernelVersion: NonEmptyString,
  inheritsFrom: Schema.optional(Schema.NullOr(NonEmptyString)),
  enabledModules: Schema.optional(Schema.Array(MechanicsEnabledModuleSchema)),
  assetRefs: Schema.optional(Schema.Record({ key: Schema.String, value: MechanicsAssetReferenceSchema })),
  modelRefs: Schema.optional(Schema.Record({ key: Schema.String, value: MechanicsAssetReferenceSchema })),
  playerConfig: MechanicsPlayerConfigSchema,
  phases: Schema.Array(MechanicsPhaseSchema),
  actions: Schema.optional(Schema.Record({ key: Schema.String, value: MechanicsActionSchema })),
  customActions: Schema.optional(Schema.Array(MechanicsCustomActionSchema)),
  zones: Schema.optional(Schema.Array(MechanicsZoneSchema)),
  turnPolicy: MechanicsTurnPolicySchema,
  endConditions: Schema.optional(Schema.Array(MechanicsEndConditionSchema)),
  cardVisibility: OptionalUnknownRecord,
  drawConfig: Schema.optional(NullableUnknownRecord),
  discardConfig: Schema.optional(NullableUnknownRecord),
  deckType: Schema.optional(NonEmptyString),
  suitSet: Schema.optional(NonEmptyString),
  rankSet: Schema.optional(NonEmptyString),
  initialHandSize: Schema.optional(HandSize),
  trumpConfig: Schema.optional(NullableUnknownRecord),
  meldConfig: Schema.optional(NullableUnknownRecord),
  trickConfig: Schema.optional(NullableUnknownRecord),
  declarationMechanism: Schema.optional(NullableUnknownRecord),
  handRanks: Schema.optional(NullableUnknownRecord),
  buyCosts: Schema.optional(NullableUnknownRecord),
  marketConfig: Schema.optional(NullableUnknownRecord),
  specialCards: Schema.optional(NullableUnknownRecord),
  shedding: Schema.optional(NullableUnknownRecord),
  fishingConfig: Schema.optional(NullableUnknownRecord),
  patienceConfig: Schema.optional(NullableUnknownRecord),
  bankingConfig: Schema.optional(NullableUnknownRecord),
  roundConfig: Schema.optional(NullableUnknownRecord),
  constants: OptionalUnknownRecord,
  familyConfig: Schema.optional(NullableUnknownRecord),
  finalHandSize: Schema.optional(HandSize),
  deckCount: Schema.optional(PositiveInteger),
  implementationHints: Schema.optional(MechanicsImplementationHintsSchema),
  playerModel: OptionalUnknownRecord,
  sessionModel: OptionalUnknownRecord,
  deckModel: Schema.optional(MechanicsDeckModelSchema),
  zoneModel: OptionalUnknownRecord,
  setupModel: OptionalUnknownRecord,
  turnModel: OptionalUnknownRecord,
  actionModel: OptionalUnknownRecord,
  ruleModel: OptionalUnknownRecord,
  scoringModel: OptionalUnknownRecord,
  strategyHooks: OptionalUnknownRecord,
  stateModel: OptionalUnknownRecord,
  eventModel: OptionalUnknownRecord,
  validationSuites: Schema.optional(Schema.Array(Schema.Unknown)),
  runtimeIntegration: Schema.optional(MechanicsRuntimeIntegrationSchema),
  examples: Schema.optional(Schema.Array(Schema.Unknown)),
  progression: Schema.optional(Schema.Array(Schema.Unknown)),
  roles: Schema.optional(Schema.Array(Schema.Unknown)),
  determinismNotes: Schema.optional(NonEmptyString),
});

export type MechanicsManifest = typeof MechanicsManifestSchema.Type;
export type MechanicsManifestEncoded = typeof MechanicsManifestSchema.Encoded;

export interface MechanicsConsistencyIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export function collectMechanicsConsistencyIssues(spec: MechanicsManifest): MechanicsConsistencyIssue[] {
  const phaseIds = new Set(spec.phases.map((phase) => phase.id));
  const actions = spec.actions ?? {};
  const customActions = spec.customActions ?? [];
  const actionIds = new Set([
    ...Object.entries(actions)
      .filter(([, action]) => action.supported !== false)
      .map(([actionId]) => actionId),
    ...customActions.filter((action) => action.supported !== false).map((action) => action.id),
  ]);
  const issues: MechanicsConsistencyIssue[] = [];

  spec.phases.forEach((phase, phaseIndex) => {
    if (phase.nextPhase && !phaseIds.has(phase.nextPhase)) {
      issues.push({
        path: ['phases', phaseIndex, 'nextPhase'],
        message: `nextPhase must refer to another phase ID, got "${phase.nextPhase}"`,
      });
    }

    phase.conditionalNext.forEach((conditional, conditionIndex) => {
      if (conditional.nextPhase && !phaseIds.has(conditional.nextPhase)) {
        issues.push({
          path: ['phases', phaseIndex, 'conditionalNext', conditionIndex, 'nextPhase'],
          message: 'conditional next phase must reference an existing phase ID',
        });
      }
    });

    phase.legalActions.forEach((actionId, actionIndex) => {
      if (!actionIds.has(actionId)) {
        issues.push({
          path: ['phases', phaseIndex, 'legalActions', actionIndex],
          message: `legal action must reference a supported action or custom action ID, got "${actionId}"`,
        });
      }
    });
  });

  return issues;
}

export function assertMechanicsConsistency(spec: MechanicsManifest): MechanicsManifest {
  const issues = collectMechanicsConsistencyIssues(spec);

  if (issues.length === 0) {
    return spec;
  }

  const details = issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');

  throw new Error(`Invalid mechanics manifest: ${details}`);
}

export const decodeMechanicsManifestEither = Schema.decodeUnknownEither(MechanicsManifestSchema);
export const encodeMechanicsManifestEither = Schema.encodeEither(MechanicsManifestSchema);

export function decodeMechanicsManifest(input: unknown): MechanicsManifest {
  return assertMechanicsConsistency(Schema.decodeUnknownSync(MechanicsManifestSchema)(normalizeMechanicsManifestBoundaryInput(input)));
}

export function encodeMechanicsManifest(input: MechanicsManifest): MechanicsManifestEncoded {
  return Schema.encodeSync(MechanicsManifestSchema)(input);
}

function copyAssetRefs(
  refs: Readonly<Record<string, typeof MechanicsAssetReferenceSchema.Type>> | undefined
): Record<string, MechanicsAssetReference> {
  return Object.fromEntries(Object.entries(refs ?? {}).map(([key, value]) => [key, { ...value }]));
}

function normalizeMechanicsManifestBoundaryInput(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }

  const record = { ...(input as Record<string, unknown>) };
  normalizeLegacyOptionalTextFields(record, [
    'gameId',
    'mechanicsId',
    'mechanicsVersion',
    'familyVariant',
  ]);
  if (isLegacyAbsentText(record.determinismNotes)) {
    delete record.determinismNotes;
  }
  normalizeLegacyNullableRecordFields(record, [
    'drawConfig',
    'discardConfig',
    'trumpConfig',
    'meldConfig',
    'trickConfig',
    'declarationMechanism',
    'handRanks',
    'buyCosts',
    'marketConfig',
    'specialCards',
    'shedding',
    'fishingConfig',
    'patienceConfig',
    'bankingConfig',
    'roundConfig',
    'familyConfig',
  ]);
  normalizeLegacyOptionalRecordFields(record, [
    'cardVisibility',
    'constants',
    'playerModel',
    'sessionModel',
    'deckModel',
    'zoneModel',
    'setupModel',
    'turnModel',
    'actionModel',
    'ruleModel',
    'scoringModel',
    'strategyHooks',
    'stateModel',
    'eventModel',
  ]);

  if (Array.isArray(record.phases)) {
    record.phases = record.phases.map((phase) => {
      if (!phase || typeof phase !== 'object' || Array.isArray(phase)) {
        return phase;
      }
      const phaseRecord = { ...(phase as Record<string, unknown>) };
      if (isLegacyAbsentText(phaseRecord.notes)) {
        delete phaseRecord.notes;
      }
      return phaseRecord;
    });
  }

  if (record.actions && typeof record.actions === 'object' && !Array.isArray(record.actions)) {
    record.actions = Object.fromEntries(Object.entries(record.actions as Record<string, unknown>).map(([actionId, action]) => {
      if (!action || typeof action !== 'object' || Array.isArray(action)) {
        return [actionId, action];
      }
      const actionRecord = { ...(action as Record<string, unknown>) };
      if (isLegacyAbsentText(actionRecord.constraints)) {
        delete actionRecord.constraints;
      }
      if (isLegacyAbsentText(actionRecord.reason)) {
        delete actionRecord.reason;
      }
      return [actionId, actionRecord];
    }));
  }

  if (record.deckModel && typeof record.deckModel === 'object' && !Array.isArray(record.deckModel)) {
    const deckModel = { ...(record.deckModel as Record<string, unknown>) };
    if (typeof deckModel.cardRankingAssetRef === 'string' && typeof deckModel.rankingAssetRef !== 'string') {
      deckModel.rankingAssetRef = deckModel.cardRankingAssetRef;
    }
    if (deckModel.rankingAssetRef === 'cardRanking') {
      deckModel.rankingAssetRef = 'ranking';
    }
    if (typeof deckModel.deckAssetRef !== 'string') {
      deckModel.deckAssetRef = 'deck';
    }
    if (typeof deckModel.rankingAssetRef !== 'string' && record.assetRefs && typeof record.assetRefs === 'object' && !Array.isArray(record.assetRefs)) {
      const refs = record.assetRefs as Record<string, unknown>;
      if (refs.ranking) {
        deckModel.rankingAssetRef = 'ranking';
      } else if (refs.cardRanking) {
        deckModel.rankingAssetRef = 'cardRanking';
      }
    }
    record.deckModel = deckModel;
  }

  return record;
}

function isLegacyAbsentText(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toUpperCase();
  return normalized === '' || normalized === 'NA' || normalized === 'N/A' || normalized === 'NONE' || normalized === 'NULL';
}

function normalizeLegacyNullableRecordFields(record: Record<string, unknown>, fields: readonly string[]): void {
  for (const field of fields) {
    if (isLegacyAbsentText(record[field])) {
      record[field] = null;
    }
  }
}

function normalizeLegacyOptionalRecordFields(record: Record<string, unknown>, fields: readonly string[]): void {
  for (const field of fields) {
    if (isLegacyAbsentText(record[field])) {
      delete record[field];
    }
  }
}

function normalizeLegacyOptionalTextFields(record: Record<string, unknown>, fields: readonly string[]): void {
  for (const field of fields) {
    if (isLegacyAbsentText(record[field])) {
      delete record[field];
    }
  }
}

function copyEnabledModules(modules: readonly (typeof MechanicsEnabledModuleSchema.Type)[] | undefined): MechanicsEnabledModule[] {
  return (modules ?? []).map((module) => ({
    ...module,
    config: module.config ? { ...module.config } : undefined,
    assetRefs: module.assetRefs ? copyAssetRefs(module.assetRefs) : undefined,
  }));
}

function copyPlayerConfig(playerConfig: typeof MechanicsPlayerConfigSchema.Type): MechanicsPlayerConfig {
  return {
    playerMode: playerConfig.playerMode,
    minPlayers: playerConfig.minPlayers,
    maxPlayers: playerConfig.maxPlayers,
    optimalPlayers: playerConfig.optimalPlayers ?? null,
    dealerRotates: playerConfig.dealerRotates,
  };
}

function copyPhases(phases: readonly (typeof MechanicsPhaseSchema.Type)[]): MechanicsPhase[] {
  return phases.map((phase) => ({
    id: phase.id,
    label: phase.label,
    actor: phase.actor,
    legalActions: [...phase.legalActions],
    nextPhase: phase.nextPhase,
    isMandatory: phase.isMandatory,
    loopIndex: phase.loopIndex,
    totalLoops: phase.totalLoops,
    conditionalNext: phase.conditionalNext.map((conditional) => ({ ...conditional })),
    cardVisibilityChanges: { ...phase.cardVisibilityChanges },
    notes: phase.notes,
  }));
}

function copyActions(actions: Readonly<Record<string, typeof MechanicsActionSchema.Type>> | undefined): Record<string, MechanicsAction> {
  return Object.fromEntries(
    Object.entries(actions ?? {}).map(([actionId, action]) => [
      actionId,
      {
        ...action,
        effectHints: { ...action.effectHints },
      },
    ])
  );
}

function copyCustomActions(actions: readonly (typeof MechanicsCustomActionSchema.Type)[] | undefined): MechanicsCustomAction[] {
  return (actions ?? []).map((action) => ({
    ...action,
    effectHints: { ...action.effectHints },
  }));
}

function copyZones(zones: readonly (typeof MechanicsZoneSchema.Type)[] | undefined): MechanicsZone[] {
  return (zones ?? []).map((zone) => ({ ...zone }));
}

function copyTurnPolicy(turnPolicy: typeof MechanicsTurnPolicySchema.Type): MechanicsTurnPolicy {
  return { ...turnPolicy };
}

function copyEndConditions(conditions: readonly (typeof MechanicsEndConditionSchema.Type)[] | undefined): MechanicsEndCondition[] {
  return (conditions ?? []).map((condition) => ({ ...condition }));
}

function copyRuntimeIntegration(integration: typeof MechanicsRuntimeIntegrationSchema.Type | undefined): MechanicsRuntimeIntegration {
  return {
    ...(integration ?? {}),
    requiredEngineCapabilities: integration?.requiredEngineCapabilities ? [...integration.requiredEngineCapabilities] : undefined,
  };
}

function copyImplementationHints(
  hints: typeof MechanicsImplementationHintsSchema.Type | undefined
): MechanicsSpec['implementationHints'] {
  if (!hints) {
    return undefined;
  }

  return {
    rngUsed: [...hints.rngUsed],
    authoritativeServer: hints.authoritativeServer,
    customLogicNeeded: [...hints.customLogicNeeded],
  };
}

export function mechanicsManifestToSpec(manifest: MechanicsManifest): MechanicsSpec {
  return {
    gameId: manifest.gameId,
    mechanicsId: manifest.mechanicsId,
    mechanicsVersion: manifest.mechanicsVersion,
    familyKernel: manifest.familyKernel,
    familyVariant: manifest.familyVariant,
    kernelVersion: manifest.kernelVersion,
    inheritsFrom: manifest.inheritsFrom ?? null,
    enabledModules: copyEnabledModules(manifest.enabledModules),
    assetRefs: copyAssetRefs(manifest.assetRefs),
    modelRefs: copyAssetRefs(manifest.modelRefs),
    playerConfig: copyPlayerConfig(manifest.playerConfig),
    phases: copyPhases(manifest.phases),
    actions: copyActions(manifest.actions),
    customActions: copyCustomActions(manifest.customActions),
    zones: copyZones(manifest.zones),
    turnPolicy: copyTurnPolicy(manifest.turnPolicy),
    endConditions: copyEndConditions(manifest.endConditions),
    cardVisibility: manifest.cardVisibility ? { ...manifest.cardVisibility } : {},
    drawConfig: manifest.drawConfig ? { ...manifest.drawConfig } : null,
    discardConfig: manifest.discardConfig ? { ...manifest.discardConfig } : null,
    deckType: manifest.deckType,
    suitSet: manifest.suitSet,
    rankSet: manifest.rankSet,
    initialHandSize: manifest.initialHandSize,
    trumpConfig: manifest.trumpConfig ? { ...manifest.trumpConfig } : null,
    meldConfig: manifest.meldConfig ? { ...manifest.meldConfig } : null,
    trickConfig: manifest.trickConfig ? { ...manifest.trickConfig } : null,
    declarationMechanism: manifest.declarationMechanism ? { ...manifest.declarationMechanism } : null,
    handRanks: manifest.handRanks ? { ...manifest.handRanks } : null,
    buyCosts: manifest.buyCosts ? { ...manifest.buyCosts } : null,
    marketConfig: manifest.marketConfig ? { ...manifest.marketConfig } : null,
    specialCards: manifest.specialCards ? { ...manifest.specialCards } : null,
    shedding: manifest.shedding ? { ...manifest.shedding } : null,
    fishingConfig: manifest.fishingConfig ? { ...manifest.fishingConfig } : null,
    patienceConfig: manifest.patienceConfig ? { ...manifest.patienceConfig } : null,
    bankingConfig: manifest.bankingConfig ? { ...manifest.bankingConfig } : null,
    roundConfig: manifest.roundConfig ? { ...manifest.roundConfig } : null,
    constants: manifest.constants ? { ...manifest.constants } : {},
    familyConfig: manifest.familyConfig ? { ...manifest.familyConfig } : null,
    finalHandSize: manifest.finalHandSize,
    deckCount: manifest.deckCount,
    implementationHints: copyImplementationHints(manifest.implementationHints),
    playerModel: manifest.playerModel ? { ...manifest.playerModel } : {},
    sessionModel: manifest.sessionModel ? { ...manifest.sessionModel } : {},
    deckModel: manifest.deckModel ? { ...manifest.deckModel } : undefined,
    zoneModel: manifest.zoneModel ? { ...manifest.zoneModel } : {},
    setupModel: manifest.setupModel ? { ...manifest.setupModel } : {},
    turnModel: manifest.turnModel ? { ...manifest.turnModel } : {},
    actionModel: manifest.actionModel ? { ...manifest.actionModel } : {},
    ruleModel: manifest.ruleModel ? { ...manifest.ruleModel } : {},
    scoringModel: manifest.scoringModel ? { ...manifest.scoringModel } : {},
    strategyHooks: manifest.strategyHooks ? { ...manifest.strategyHooks } : {},
    stateModel: manifest.stateModel ? { ...manifest.stateModel } : {},
    eventModel: manifest.eventModel ? { ...manifest.eventModel } : {},
    validationSuites: manifest.validationSuites ? [...manifest.validationSuites] : [],
    runtimeIntegration: copyRuntimeIntegration(manifest.runtimeIntegration),
    examples: manifest.examples ? [...manifest.examples] : [],
    progression: manifest.progression ? [...manifest.progression] : [],
    roles: manifest.roles ? [...manifest.roles] : [],
    determinismNotes: manifest.determinismNotes,
  };
}

export function decodeMechanicsSpec(input: unknown): MechanicsSpec {
  return mechanicsManifestToSpec(decodeMechanicsManifest(input));
}
