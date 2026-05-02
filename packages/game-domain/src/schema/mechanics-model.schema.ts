import type {
  MechanicsAction,
  MechanicsAssetReference,
  MechanicsCustomAction,
  MechanicsEndCondition,
  MechanicsPhase,
  MechanicsPlayerConfig,
  MechanicsRuntimeIntegration,
  MechanicsSpec,
  MechanicsTurnPolicy,
  MechanicsZone,
} from '@/engine/mechanics/MechanicsSpec';
import * as Schema from 'effect/Schema';
import {
  MechanicsActionSchema,
  MechanicsAssetReferenceSchema,
  MechanicsCustomActionSchema,
  MechanicsDeckModelSchema,
  MechanicsEndConditionSchema,
  MechanicsPhaseSchema,
  MechanicsPlayerConfigSchema,
  MechanicsRuntimeIntegrationSchema,
  MechanicsTurnPolicySchema,
  MechanicsZoneSchema,
} from './mechanics.schema';

const NonEmptyString = Schema.String.pipe(Schema.minLength(1));
const PositiveInteger = Schema.Number.pipe(Schema.int(), Schema.positive());
const UnknownRecord = Schema.Record({ key: Schema.String, value: Schema.Unknown });
const BooleanRecord = Schema.Record({ key: Schema.String, value: Schema.Boolean });
const AssetRefRecord = Schema.Record({ key: Schema.String, value: MechanicsAssetReferenceSchema });

const ModelMetadataSchema = Schema.Struct({
  modelId: NonEmptyString,
  modelVersion: NonEmptyString,
  familyKernel: Schema.optional(NonEmptyString),
  familyVariant: Schema.optional(NonEmptyString),
  inheritsFrom: Schema.optional(Schema.NullOr(NonEmptyString)),
  executorId: Schema.optional(NonEmptyString),
  assetRefs: Schema.optional(AssetRefRecord),
  examples: Schema.optional(Schema.Array(Schema.Unknown)),
});

export const PlayerMechanicsModelSchema = Schema.Struct({
  playerConfig: MechanicsPlayerConfigSchema,
  playerModel: UnknownRecord,
});

export const SessionMechanicsModelSchema = Schema.Struct({
  sessionModel: UnknownRecord,
  bankingConfig: Schema.optional(UnknownRecord),
  roundConfig: Schema.optional(UnknownRecord),
  endConditions: Schema.Array(MechanicsEndConditionSchema),
});

export const DeckMechanicsModelSchema = Schema.Struct({
  deckType: NonEmptyString,
  suitSet: NonEmptyString,
  rankSet: NonEmptyString,
  deckCount: PositiveInteger,
  initialHandSize: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  drawConfig: UnknownRecord,
  discardConfig: UnknownRecord,
  deckModel: MechanicsDeckModelSchema,
  handRanks: UnknownRecord,
  specialCards: UnknownRecord,
});

export const ZoneMechanicsModelSchema = Schema.Struct({
  zones: Schema.Array(MechanicsZoneSchema),
  zoneModel: UnknownRecord,
  cardVisibility: UnknownRecord,
});

export const PhaseFlowMechanicsModelSchema = Schema.Struct({
  phases: Schema.Array(MechanicsPhaseSchema),
  turnPolicy: MechanicsTurnPolicySchema,
  setupModel: UnknownRecord,
  turnModel: UnknownRecord,
  runtimeIntegration: MechanicsRuntimeIntegrationSchema,
  progression: Schema.Array(NonEmptyString),
});

export const ActionSetMechanicsModelSchema = Schema.Struct({
  actionModel: Schema.Struct({
    actionIds: Schema.Array(NonEmptyString),
    payloadSchemas: Schema.optional(UnknownRecord),
    actionEndsTurn: BooleanRecord,
  }).pipe(Schema.extend(UnknownRecord)),
  actions: Schema.Record({ key: Schema.String, value: MechanicsActionSchema }),
  customActions: Schema.Array(MechanicsCustomActionSchema),
});

export const StateEventMechanicsModelSchema = Schema.Struct({
  stateModel: UnknownRecord,
  eventModel: UnknownRecord,
});

export const ValidationFixtureMechanicsModelSchema = Schema.Struct({
  validationSuites: Schema.Array(Schema.Unknown),
});

export const PlayerMechanicsModelAssetSchema = Schema.asSchema(
  ModelMetadataSchema.pipe(Schema.extend(Schema.Struct({
    modelKind: Schema.Literal('player_model'),
  }))).pipe(Schema.extend(PlayerMechanicsModelSchema)),
);

export const SessionMechanicsModelAssetSchema = Schema.asSchema(
  ModelMetadataSchema.pipe(Schema.extend(Schema.Struct({
    modelKind: Schema.Literal('session_model'),
  }))).pipe(Schema.extend(SessionMechanicsModelSchema)),
);

export const DeckMechanicsModelAssetSchema = Schema.asSchema(
  ModelMetadataSchema.pipe(Schema.extend(Schema.Struct({
    modelKind: Schema.Literal('deck_model'),
  }))).pipe(Schema.extend(DeckMechanicsModelSchema)),
);

export const ZoneMechanicsModelAssetSchema = Schema.asSchema(
  ModelMetadataSchema.pipe(Schema.extend(Schema.Struct({
    modelKind: Schema.Literal('zone_model'),
  }))).pipe(Schema.extend(ZoneMechanicsModelSchema)),
);

export const PhaseFlowMechanicsModelAssetSchema = Schema.asSchema(
  ModelMetadataSchema.pipe(Schema.extend(Schema.Struct({
    modelKind: Schema.Literal('phase_flow_model'),
  }))).pipe(Schema.extend(PhaseFlowMechanicsModelSchema)),
);

export const ActionSetMechanicsModelAssetSchema = Schema.asSchema(
  ModelMetadataSchema.pipe(Schema.extend(Schema.Struct({
    modelKind: Schema.Literal('action_set_model'),
  }))).pipe(Schema.extend(ActionSetMechanicsModelSchema)),
);

export const StateEventMechanicsModelAssetSchema = Schema.asSchema(
  ModelMetadataSchema.pipe(Schema.extend(Schema.Struct({
    modelKind: Schema.Literal('state_event_model'),
  }))).pipe(Schema.extend(StateEventMechanicsModelSchema)),
);

export const ValidationFixtureMechanicsModelAssetSchema = Schema.asSchema(
  ModelMetadataSchema.pipe(Schema.extend(Schema.Struct({
    modelKind: Schema.Literal('validation_fixture_model'),
  }))).pipe(Schema.extend(ValidationFixtureMechanicsModelSchema)),
);

export const MechanicsModelAssetSchema = Schema.Union(
  PlayerMechanicsModelAssetSchema,
  SessionMechanicsModelAssetSchema,
  DeckMechanicsModelAssetSchema,
  ZoneMechanicsModelAssetSchema,
  PhaseFlowMechanicsModelAssetSchema,
  ActionSetMechanicsModelAssetSchema,
  StateEventMechanicsModelAssetSchema,
  ValidationFixtureMechanicsModelAssetSchema,
);
export type MechanicsModelAsset = typeof MechanicsModelAssetSchema.Type;
export type MechanicsModelKind = MechanicsModelAsset['modelKind'];

const MECHANICS_MODEL_KIND_BY_ASSET_TYPE: Readonly<Record<string, MechanicsModelKind>> = {
  GamePlayerModel: 'player_model',
  GameSessionModel: 'session_model',
  CardGameDeckModel: 'deck_model',
  GameZoneModel: 'zone_model',
  GamePhaseFlowModel: 'phase_flow_model',
  GameActionSet: 'action_set_model',
  GameStateEventModel: 'state_event_model',
  GameValidationFixtures: 'validation_fixture_model',
};

export interface MechanicsModelCompileIssue {
  readonly path: string;
  readonly message: string;
}

export interface MechanicsModelCompileResult {
  readonly issues: readonly MechanicsModelCompileIssue[];
  readonly spec: MechanicsSpec;
}

export const decodeMechanicsModelAsset = (input: unknown): MechanicsModelAsset => {
  const assetType = getEnvelopeAssetType(input);
  const decoded = Schema.decodeUnknownSync(MechanicsModelAssetSchema)(
    normalizeMechanicsModelInput(unwrapAssetData(input), assetType),
  );
  const expectedKind = assetType ? MECHANICS_MODEL_KIND_BY_ASSET_TYPE[assetType] : undefined;

  if (expectedKind && decoded.modelKind !== expectedKind) {
    throw new Error(`Invalid mechanics model asset: system.assetType ${assetType} requires modelKind ${expectedKind}, received ${decoded.modelKind}`);
  }

  return decoded;
};

export const decodeMechanicsModelAssetForAssetType = (
  data: unknown,
  assetType: string,
): MechanicsModelAsset => decodeMechanicsModelAsset({
  system: { assetType },
  data,
});

export function compileMechanicsWithModels(
  baseSpec: MechanicsSpec,
  modelAssets: readonly unknown[],
): MechanicsModelCompileResult {
  const issues: MechanicsModelCompileIssue[] = [];
  const decodedModels = modelAssets.flatMap((asset, index) => {
    try {
      return [decodeMechanicsModelAsset(asset)];
    } catch (error) {
      issues.push({
        path: `models.${index}`,
        message: formatDecodeError(error),
      });
      return [];
    }
  });

  let spec: MechanicsSpec = {
    ...baseSpec,
    assetRefs: { ...(baseSpec.assetRefs ?? {}) },
    modelRefs: { ...(baseSpec.modelRefs ?? {}) },
  };

  decodedModels.forEach((model) => {
    spec = applyMechanicsModel(spec, model);
  });

  issues.push(...collectRequiredModelIssues(spec, decodedModels));
  return { spec, issues };
}

export function applyMechanicsModel(baseSpec: MechanicsSpec, modelAsset: MechanicsModelAsset): MechanicsSpec {
  switch (modelAsset.modelKind) {
    case 'player_model':
      return {
        ...baseSpec,
        playerConfig: mutableObject<MechanicsPlayerConfig>(modelAsset.playerConfig),
        playerModel: mutableRecord(modelAsset.playerModel),
      };
    case 'session_model':
      return {
        ...baseSpec,
        bankingConfig: optionalMutableRecord(modelAsset.bankingConfig, baseSpec.bankingConfig),
        endConditions: mutableArray<MechanicsEndCondition>(modelAsset.endConditions),
        roundConfig: optionalMutableRecord(modelAsset.roundConfig, baseSpec.roundConfig),
        sessionModel: mutableRecord(modelAsset.sessionModel),
      };
    case 'deck_model':
      return {
        ...baseSpec,
        assetRefs: mergeAssetRefs(baseSpec.assetRefs, modelAsset.assetRefs),
        deckCount: modelAsset.deckCount,
        deckModel: mutableObject(modelAsset.deckModel),
        deckType: modelAsset.deckType,
        discardConfig: mutableRecord(modelAsset.discardConfig),
        drawConfig: mutableRecord(modelAsset.drawConfig),
        handRanks: mutableRecord(modelAsset.handRanks),
        initialHandSize: modelAsset.initialHandSize,
        rankSet: modelAsset.rankSet,
        specialCards: mutableRecord(modelAsset.specialCards),
        suitSet: modelAsset.suitSet,
      };
    case 'zone_model':
      return {
        ...baseSpec,
        cardVisibility: mutableRecord(modelAsset.cardVisibility),
        zoneModel: mutableRecord(modelAsset.zoneModel),
        zones: mutableArray<MechanicsZone>(modelAsset.zones),
      };
    case 'phase_flow_model':
      return {
        ...baseSpec,
        phases: mutableArray<MechanicsPhase>(modelAsset.phases),
        progression: mutableArray<unknown>(modelAsset.progression),
        runtimeIntegration: mutableObject<MechanicsRuntimeIntegration>(modelAsset.runtimeIntegration),
        setupModel: mutableRecord(modelAsset.setupModel),
        turnModel: mutableRecord(modelAsset.turnModel),
        turnPolicy: mutableObject<MechanicsTurnPolicy>(modelAsset.turnPolicy),
      };
    case 'action_set_model':
      return {
        ...baseSpec,
        actionModel: mutableRecord(modelAsset.actionModel),
        actions: mutableRecord<MechanicsAction>(modelAsset.actions),
        customActions: mutableArray<MechanicsCustomAction>(modelAsset.customActions),
      };
    case 'state_event_model':
      return {
        ...baseSpec,
        eventModel: mutableRecord(modelAsset.eventModel),
        stateModel: mutableRecord(modelAsset.stateModel),
      };
    case 'validation_fixture_model':
      return {
        ...baseSpec,
        examples: mutableArray(modelAsset.examples ?? []),
        validationSuites: mutableArray(modelAsset.validationSuites),
      };
  }
}

function collectRequiredModelIssues(
  spec: MechanicsSpec,
  models: readonly MechanicsModelAsset[],
): MechanicsModelCompileIssue[] {
  const refs = Object.keys(spec.modelRefs ?? {});
  const decodedKinds = new Set(models.map((model) => model.modelKind));
  return refs.flatMap((key) => {
    const expectedKind = normalizeModelRefKey(key);
    if (!expectedKind || decodedKinds.has(expectedKind)) {
      return [];
    }

    return [{
      path: `modelRefs.${key}`,
      message: `Referenced ${expectedKind} was not loaded into the mechanics compiler`,
    }];
  });
}

function normalizeModelRefKey(key: string): MechanicsModelKind | null {
  switch (key) {
    case 'player':
    case 'playerModel':
      return 'player_model';
    case 'session':
    case 'sessionModel':
      return 'session_model';
    case 'deck':
    case 'deckModel':
      return 'deck_model';
    case 'zones':
    case 'zoneModel':
      return 'zone_model';
    case 'flow':
    case 'phaseFlow':
      return 'phase_flow_model';
    case 'actions':
    case 'actionSet':
      return 'action_set_model';
    case 'stateEvents':
    case 'stateEventModel':
      return 'state_event_model';
    case 'validation':
    case 'validationFixtures':
      return 'validation_fixture_model';
    default:
      return null;
  }
}

function unwrapAssetData(input: unknown): unknown {
  const root = asRecord(input);
  return asRecord(root?.data) ?? input;
}

function normalizeMechanicsModelInput(data: unknown, assetType: string | null): unknown {
  const record = asRecord(data);
  if (!record) {
    return data;
  }

  const modelKind = typeof record.modelKind === 'string'
    ? record.modelKind
    : assetType ? MECHANICS_MODEL_KIND_BY_ASSET_TYPE[assetType] : undefined;

  if (!modelKind) {
    return record;
  }

  const legacyModel = asRecord(record.model);
  const recordWithoutLegacyModel = { ...record };
  delete recordWithoutLegacyModel.model;
  if (modelKind === 'deck_model') {
    normalizeDeckModel(recordWithoutLegacyModel);
  }
  return {
    ...(legacyModel ?? {}),
    ...recordWithoutLegacyModel,
    modelKind,
  };
}

function normalizeDeckModel(record: Record<string, unknown>): void {
  const deckModel = asRecord(record.deckModel);
  if (!deckModel) {
    record.deckModel = {
      deckAssetRef: 'deck',
      rankingAssetRef: 'ranking',
      deckCount: record.deckCount,
      initialHandSize: record.initialHandSize,
      shufflePolicy: 'seeded_round_shuffle',
      drawDirection: 'top_is_index_0',
      drawConfig: asRecord(record.drawConfig) ?? {},
      discardConfig: asRecord(record.discardConfig) ?? {},
    };
    return;
  }

  if (typeof deckModel.cardRankingAssetRef === 'string' && typeof deckModel.rankingAssetRef !== 'string') {
    deckModel.rankingAssetRef = deckModel.cardRankingAssetRef;
  }
  if (deckModel.rankingAssetRef === 'cardRanking') {
    deckModel.rankingAssetRef = 'ranking';
  }
  if (typeof deckModel.deckAssetRef !== 'string') {
    deckModel.deckAssetRef = 'deck';
  }
  if (typeof deckModel.rankingAssetRef !== 'string') {
    deckModel.rankingAssetRef = 'ranking';
  }
  record.deckModel = deckModel;
}

function getEnvelopeAssetType(input: unknown): string | null {
  const root = asRecord(input);
  const system = asRecord(root?.system);
  const assetType = system?.assetType;
  return typeof assetType === 'string' ? assetType : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function mutableRecord<T = unknown>(value: unknown): Record<string, T> {
  return mutableObject<Record<string, T>>(value);
}

function optionalMutableRecord<T extends Readonly<Record<string, unknown>> | null | undefined>(
  value: T,
  fallback: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (value) {
    return mutableObject(value);
  }
  return fallback ? { ...fallback } : null;
}

function mutableObject<T extends object>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mutableArray<T>(value: unknown): T[] {
  return JSON.parse(JSON.stringify(value)) as T[];
}

function mergeAssetRefs(
  current: Record<string, MechanicsAssetReference> | undefined,
  ...refs: readonly (Readonly<Record<string, MechanicsAssetReference>> | undefined)[]
): Record<string, MechanicsAssetReference> {
  return refs.reduce<Record<string, MechanicsAssetReference>>((merged, entry) => ({
    ...merged,
    ...(entry ?? {}),
  }), { ...(current ?? {}) });
}

function formatDecodeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
