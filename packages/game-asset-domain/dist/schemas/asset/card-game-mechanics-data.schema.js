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
    legalActions: z.array(z.union([
        z.enum(ACTION_ID_VALUES),
        z.string().regex(/^[a-z][a-z0-9_]*$/),
    ])).min(1),
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
    familyKernel: z.string().min(1),
    kernelVersion: z.string().min(1),
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
    finalHandSize: z.number().int().min(0).optional(),
    deckCount: z.number().int().min(1).optional(),
    implementationHints: ImplementationHintsSchema.optional(),
    progression: z.array(z.unknown()).default([]),
    roles: z.array(z.unknown()).default([]),
    determinismNotes: z.string().optional(),
}).superRefine((data, ctx) => {
    const phaseIds = new Set(data.phases.map((phase) => phase.id));
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
    });
});
