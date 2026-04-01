export interface MechanicsPlayerConfig {
    playerMode: 'singleplayer' | 'multiplayer';
    minPlayers: number;
    maxPlayers: number;
    optimalPlayers?: number | null;
    dealerRotates: boolean;
}
export interface MechanicsPhaseCondition {
    condition: string;
    nextPhase: string | null;
}
export interface MechanicsPhase {
    id: string;
    label: string;
    actor: string;
    legalActions: string[];
    nextPhase: string | null;
    isMandatory: boolean;
    loopIndex?: number | null;
    totalLoops?: number | null;
    conditionalNext: MechanicsPhaseCondition[];
    cardVisibilityChanges: Record<string, string>;
    notes?: string;
}
export interface MechanicsAction {
    supported: boolean;
    description: string;
    constraints?: string;
    effectType: string;
    cost?: string | number | Record<string, unknown> | null;
    effectHints: Record<string, unknown>;
    isTerminating: boolean;
    reason?: string;
}
export interface MechanicsCustomAction {
    id: string;
    supported: boolean;
    description: string;
    cost?: string | number | Record<string, unknown> | null;
    constraints?: string;
    effectType: string;
    effectHints: Record<string, unknown>;
    isTerminating: boolean;
}
export interface MechanicsZone {
    id: string;
    type: string;
    owner: string;
    visibility: string;
    capacity?: number | null;
}
export interface MechanicsTurnPolicy {
    direction: string;
    startsWith: string;
    timerSeconds?: number | null;
}
export interface MechanicsEndCondition {
    id: string;
    description: string;
    appliesToPhase?: string | null;
}
export interface MechanicsSpec {
    familyKernel: string;
    kernelVersion: string;
    playerConfig: MechanicsPlayerConfig;
    phases: MechanicsPhase[];
    actions: Record<string, MechanicsAction>;
    customActions: MechanicsCustomAction[];
    zones: MechanicsZone[];
    turnPolicy: MechanicsTurnPolicy;
    endConditions: MechanicsEndCondition[];
    cardVisibility?: Record<string, unknown>;
    drawConfig?: Record<string, unknown> | null;
    discardConfig?: Record<string, unknown> | null;
    deckType?: string;
    suitSet?: string;
    rankSet?: string;
    initialHandSize?: number;
    trumpConfig?: Record<string, unknown> | null;
    meldConfig?: Record<string, unknown> | null;
    trickConfig?: Record<string, unknown> | null;
    declarationMechanism?: Record<string, unknown> | null;
    handRanks?: Record<string, unknown> | null;
    buyCosts?: Record<string, unknown> | null;
    marketConfig?: Record<string, unknown> | null;
    specialCards?: Record<string, unknown> | null;
    shedding?: Record<string, unknown> | null;
    fishingConfig?: Record<string, unknown> | null;
    patienceConfig?: Record<string, unknown> | null;
    bankingConfig?: Record<string, unknown> | null;
    roundConfig?: Record<string, unknown> | null;
    constants?: Record<string, unknown>;
    finalHandSize?: number;
    deckCount?: number;
    implementationHints?: {
        rngUsed: string[];
        authoritativeServer: boolean;
        customLogicNeeded: string[];
    };
    progression?: unknown[];
    roles?: unknown[];
    determinismNotes?: string;
}
