import { z } from 'zod';
import { ACTION_ID_VALUES } from '@ocentra/game-domain/game/actionId';
import { PHASE_ACTOR_VALUES } from '@ocentra/game-domain/game/phaseActor';
import { PLAYER_MODE_VALUES } from '@ocentra/game-domain/game/playerMode';
import { TURN_DIRECTION_VALUES, TURN_STARTS_WITH_VALUES } from '@ocentra/game-domain/game/turnOrder';

const ConditionSchema = z.object({
  condition: z.string().min(1),
  nextPhase: z.string().min(1).nullable(),
});

const PhaseSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  actor: z.enum(PHASE_ACTOR_VALUES),
  legalActions: z.array(
    z.union([
      z.enum(ACTION_ID_VALUES),
      z.string().regex(/^[a-z][a-z0-9_]*$/),
    ])
  ).min(1),
  nextPhase: z.string().min(1).nullable(),
  isMandatory: z.boolean().default(true),
  loopIndex: z.number().int().nullable().optional(),
  totalLoops: z.number().int().nullable().optional(),
  conditionalNext: z.array(ConditionSchema).default([]),
  cardVisibilityChanges: z.record(z.string().min(1)).default({}),
  notes: z.string().optional(),
});

const ActionSchema = z.object({
  supported: z.boolean(),
  description: z.string().min(1),
  constraints: z.string().min(1).optional(),
  effectType: z.string().min(1),
  cost: z.union([z.string().min(1), z.number(), z.record(z.unknown()), z.null()]).optional(),
  effectHints: z.record(z.unknown()).default({}),
  isTerminating: z.boolean().default(false),
  reason: z.string().min(1).optional(),
});

const CustomActionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/i),
  supported: z.boolean(),
  description: z.string().min(1),
  cost: z.union([z.string().min(1), z.number(), z.record(z.unknown()), z.null()]).optional(),
  constraints: z.string().optional(),
  effectType: z.string().min(1),
  effectHints: z.record(z.unknown()).default({}),
  isTerminating: z.boolean().default(false),
});

const ZoneSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  owner: z.string().min(1),
  visibility: z.string().min(1),
  capacity: z.number().int().min(0).nullable().optional(),
});

const TurnPolicySchema = z.object({
  direction: z.enum(TURN_DIRECTION_VALUES),
  startsWith: z.enum(TURN_STARTS_WITH_VALUES),
  timerSeconds: z.number().int().min(0).nullable().optional(),
});

const EndConditionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  appliesToPhase: z.string().min(1).nullable().optional(),
});

const AssetReferenceSchema = z.object({
  path: z.string().min(1).optional(),
  guid: z.string().min(1).optional(),
  assetType: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
}).passthrough();

const EnabledModuleSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  executorId: z.string().min(1),
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
  assetRefs: z.record(AssetReferenceSchema).optional(),
}).passthrough();

const RuntimeIntegrationSchema = z.object({
  resolverName: z.string().min(1).optional(),
  requiredEngineCapabilities: z.array(z.string()).default([]).optional(),
  deterministicSeed: z.boolean().optional(),
  authority: z.string().min(1).optional(),
  multiplayerSyncModel: z.string().min(1).optional(),
  replaySnapshotCompatible: z.boolean().optional(),
}).passthrough();

const ImplementationHintsSchema = z.object({
  rngUsed: z.array(z.string()).default([]),
  authoritativeServer: z.boolean().default(false),
  customLogicNeeded: z.array(z.string()).default([]),
});

const PlayerConfigSchema = z.object({
  playerMode: z.enum(PLAYER_MODE_VALUES),
  minPlayers: z.number().int().min(1),
  maxPlayers: z.number().int().min(1),
  optimalPlayers: z.number().int().nullable().optional(),
  dealerRotates: z.boolean().default(true),
});

export const CardGameMechanicsDataSchema = z.object({
  gameId: z.string().min(1).optional(),
  mechanicsId: z.string().min(1).optional(),
  mechanicsVersion: z.string().min(1).optional(),
  familyKernel: z.string().min(1),
  familyVariant: z.string().min(1).optional(),
  kernelVersion: z.string().min(1),
  inheritsFrom: z.string().min(1).nullable().optional(),
  enabledModules: z.array(EnabledModuleSchema).default([]),
  assetRefs: z.record(AssetReferenceSchema).default({}),
  playerConfig: PlayerConfigSchema,
  phases: z.array(PhaseSchema).min(1),
  actions: z.record(ActionSchema).optional(),
  customActions: z.array(CustomActionSchema).default([]),
  zones: z.array(ZoneSchema).default([]),
  turnPolicy: TurnPolicySchema,
  endConditions: z.array(EndConditionSchema).default([]),
  cardVisibility: z.record(z.unknown()).default({}),
  drawConfig: z.record(z.unknown()).nullable().optional(),
  discardConfig: z.record(z.unknown()).nullable().optional(),
  deckType: z.string().optional(),
  suitSet: z.string().optional(),
  rankSet: z.string().optional(),
  initialHandSize: z.number().int().min(0).optional(),
  trumpConfig: z.record(z.unknown()).nullable().optional(),
  meldConfig: z.record(z.unknown()).nullable().optional(),
  trickConfig: z.record(z.unknown()).nullable().optional(),
  declarationMechanism: z.record(z.unknown()).nullable().optional(),
  handRanks: z.record(z.unknown()).nullable().optional(),
  buyCosts: z.record(z.unknown()).nullable().optional(),
  marketConfig: z.record(z.unknown()).nullable().optional(),
  specialCards: z.record(z.unknown()).nullable().optional(),
  shedding: z.record(z.unknown()).nullable().optional(),
  fishingConfig: z.record(z.unknown()).nullable().optional(),
  patienceConfig: z.record(z.unknown()).nullable().optional(),
  bankingConfig: z.record(z.unknown()).nullable().optional(),
  roundConfig: z.record(z.unknown()).nullable().optional(),
  constants: z.record(z.unknown()).default({}),
  familyConfig: z.record(z.unknown()).nullable().optional(),
  finalHandSize: z.number().int().min(0).optional(),
  deckCount: z.number().int().min(1).optional(),
  implementationHints: ImplementationHintsSchema.optional(),
  playerModel: z.record(z.unknown()).default({}),
  sessionModel: z.record(z.unknown()).default({}),
  deckModel: z.record(z.unknown()).default({}),
  zoneModel: z.record(z.unknown()).default({}),
  setupModel: z.record(z.unknown()).default({}),
  turnModel: z.record(z.unknown()).default({}),
  actionModel: z.record(z.unknown()).default({}),
  ruleModel: z.record(z.unknown()).default({}),
  scoringModel: z.record(z.unknown()).default({}),
  strategyHooks: z.record(z.unknown()).default({}),
  stateModel: z.record(z.unknown()).default({}),
  eventModel: z.record(z.unknown()).default({}),
  validationSuites: z.array(z.unknown()).default([]),
  runtimeIntegration: RuntimeIntegrationSchema.default({}),
  examples: z.array(z.unknown()).default([]),
  progression: z.array(z.unknown()).default([]),
  roles: z.array(z.unknown()).default([]),
  determinismNotes: z.string().optional(),
}).superRefine((data, ctx) => {
  const phaseIds = new Set(data.phases.map((phase) => phase.id));
  const actionIds = new Set([
    ...Object.keys(data.actions ?? {}).filter((actionId) => data.actions?.[actionId]?.supported !== false),
    ...data.customActions.filter((action) => action.supported !== false).map((action) => action.id),
  ]);

  data.phases.forEach((phase, index) => {
    if (phase.nextPhase && !phaseIds.has(phase.nextPhase)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phases', index, 'nextPhase'],
        message: `nextPhase must refer to another phase ID, got "${phase.nextPhase}"`,
      });
    }

    phase.conditionalNext.forEach((conditional, idx) => {
      if (conditional.nextPhase && !phaseIds.has(conditional.nextPhase)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['phases', index, 'conditionalNext', idx, 'nextPhase'],
          message: `conditional next phase must reference an existing phase ID`,
        });
      }
    });

    phase.legalActions.forEach((actionId, actionIndex) => {
      if (!actionIds.has(actionId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['phases', index, 'legalActions', actionIndex],
          message: `legal action must reference a supported action or custom action ID, got "${actionId}"`,
        });
      }
    });
  });
});

export type CardGameMechanicsData = z.infer<typeof CardGameMechanicsDataSchema>;
