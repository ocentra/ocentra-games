import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { PhaseActor } from '@ocentra/game-domain/game/phaseActor';
import { PlayerMode } from '@ocentra/game-domain/game/playerMode';
import { TurnDirection, TurnStartsWith } from '@ocentra/game-domain/game/turnOrder';
import type { AssetCreationContext, CreatedAsset } from '../../AssetCreation';
declare class MechanicsPlayerConfig {
    playerMode: PlayerMode;
    minPlayers: number;
    maxPlayers: number;
    optimalPlayers: number | null;
    dealerRotates: boolean;
}
declare class MechanicsPhaseConditional {
    condition: string;
    nextPhase: string | null;
}
declare class MechanicsPhase {
    id: string;
    label: string;
    actor: PhaseActor;
    legalActions: string[];
    nextPhase: string | null;
    isMandatory: boolean;
    loopIndex?: number | null;
    totalLoops?: number | null;
    conditionalNext: MechanicsPhaseConditional[];
    cardVisibilityChanges: Record<string, string>;
    notes: string;
}
declare class MechanicsCustomAction {
    id: string;
    supported: boolean;
    description: string;
    cost: string | number | Record<string, unknown> | null;
    constraints: string;
    effectType: string;
    effectHints: Record<string, unknown>;
    isTerminating: boolean;
}
declare class MechanicsZone {
    id: string;
    type: string;
    owner: string;
    visibility: string;
    capacity?: number | null;
}
declare class MechanicsAction {
    supported: boolean;
    description: string;
    constraints: string;
    effectType: string;
    cost: string | number | Record<string, unknown> | null;
    effectHints: Record<string, unknown>;
    isTerminating: boolean;
    reason?: string;
}
declare class MechanicsTurnPolicy {
    direction: TurnDirection;
    startsWith: TurnStartsWith;
    timerSeconds: number | null;
}
declare class MechanicsEndCondition {
    id: string;
    description: string;
    appliesToPhase: string | null;
}
declare class MechanicsImplementationHints {
    rngUsed: string[];
    authoritativeServer: boolean;
    customLogicNeeded: string[];
}
export declare class CardGameMechanics extends ScriptableObject {
    static schemaVersion: number;
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    familyKernel: string;
    kernelVersion: string;
    playerConfig: MechanicsPlayerConfig;
    phases: MechanicsPhase[];
    actions: Record<string, MechanicsAction>;
    customActions: MechanicsCustomAction[];
    zones: MechanicsZone[];
    turnPolicy: MechanicsTurnPolicy;
    endConditions: MechanicsEndCondition[];
    cardVisibility: Record<string, unknown>;
    drawConfig: Record<string, unknown> | null;
    discardConfig: Record<string, unknown> | null;
    deckType: string;
    suitSet: string;
    rankSet: string;
    initialHandSize: number;
    trumpConfig: Record<string, unknown> | null;
    meldConfig: Record<string, unknown> | null;
    trickConfig: Record<string, unknown> | null;
    declarationMechanism: Record<string, unknown> | null;
    handRanks: Record<string, unknown> | null;
    buyCosts: Record<string, unknown> | null;
    marketConfig: Record<string, unknown> | null;
    specialCards: Record<string, unknown> | null;
    shedding: Record<string, unknown> | null;
    fishingConfig: Record<string, unknown> | null;
    patienceConfig: Record<string, unknown> | null;
    bankingConfig: Record<string, unknown> | null;
    roundConfig: Record<string, unknown> | null;
    constants: Record<string, unknown>;
    finalHandSize: number;
    deckCount: number;
    implementationHints: MechanicsImplementationHints;
    progression: unknown[];
    roles: unknown[];
    determinismNotes: string;
    static create(context: AssetCreationContext, dataOverrides?: Record<string, unknown>): Promise<CreatedAsset>;
}
export {};
