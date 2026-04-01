import { z } from 'zod';
export declare const CardGameMechanicsDataSchema: z.ZodEffects<z.ZodObject<{
    familyKernel: z.ZodString;
    kernelVersion: z.ZodString;
    playerConfig: z.ZodObject<{
        playerMode: z.ZodEnum<["singleplayer", "multiplayer"]>;
        minPlayers: z.ZodNumber;
        maxPlayers: z.ZodNumber;
        optimalPlayers: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        dealerRotates: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        dealerRotates: boolean;
        optimalPlayers?: number | null | undefined;
    }, {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers?: number | null | undefined;
        dealerRotates?: boolean | undefined;
    }>;
    phases: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        actor: z.ZodEnum<["each_player_clockwise", "each_player_counterclockwise", "dealer", "all_simultaneous", "active_players_clockwise", "active_players_counterclockwise", "current_player", "winning_player", "system"]>;
        legalActions: z.ZodArray<z.ZodUnion<[z.ZodEnum<["ante", "deal", "reveal_market", "buy_market", "buy_stock", "fold", "check", "call", "bet", "raise", "declare", "reveal_hand", "award_pot", "play_card", "draw", "discard", "pass", "bid", "meld", "go_out"]>, z.ZodString]>, "many">;
        nextPhase: z.ZodNullable<z.ZodString>;
        isMandatory: z.ZodDefault<z.ZodBoolean>;
        loopIndex: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        totalLoops: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        conditionalNext: z.ZodDefault<z.ZodArray<z.ZodObject<{
            condition: z.ZodString;
            nextPhase: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            condition: string;
            nextPhase: string | null;
        }, {
            condition: string;
            nextPhase: string | null;
        }>, "many">>;
        cardVisibilityChanges: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
        nextPhase: string | null;
        actor: "each_player_clockwise" | "each_player_counterclockwise" | "dealer" | "all_simultaneous" | "active_players_clockwise" | "active_players_counterclockwise" | "current_player" | "winning_player" | "system";
        legalActions: string[];
        isMandatory: boolean;
        conditionalNext: {
            condition: string;
            nextPhase: string | null;
        }[];
        cardVisibilityChanges: Record<string, string>;
        loopIndex?: number | null | undefined;
        totalLoops?: number | null | undefined;
        notes?: string | undefined;
    }, {
        label: string;
        id: string;
        nextPhase: string | null;
        actor: "each_player_clockwise" | "each_player_counterclockwise" | "dealer" | "all_simultaneous" | "active_players_clockwise" | "active_players_counterclockwise" | "current_player" | "winning_player" | "system";
        legalActions: string[];
        isMandatory?: boolean | undefined;
        loopIndex?: number | null | undefined;
        totalLoops?: number | null | undefined;
        conditionalNext?: {
            condition: string;
            nextPhase: string | null;
        }[] | undefined;
        cardVisibilityChanges?: Record<string, string> | undefined;
        notes?: string | undefined;
    }>, "many">;
    actions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        supported: z.ZodBoolean;
        description: z.ZodString;
        constraints: z.ZodOptional<z.ZodString>;
        effectType: z.ZodString;
        cost: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodNull]>>;
        effectHints: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        isTerminating: z.ZodDefault<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        supported: boolean;
        effectType: string;
        effectHints: Record<string, unknown>;
        isTerminating: boolean;
        constraints?: string | undefined;
        cost?: string | number | Record<string, unknown> | null | undefined;
        reason?: string | undefined;
    }, {
        description: string;
        supported: boolean;
        effectType: string;
        constraints?: string | undefined;
        cost?: string | number | Record<string, unknown> | null | undefined;
        effectHints?: Record<string, unknown> | undefined;
        isTerminating?: boolean | undefined;
        reason?: string | undefined;
    }>>>;
    customActions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        supported: z.ZodBoolean;
        description: z.ZodString;
        cost: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodNull]>>;
        constraints: z.ZodOptional<z.ZodString>;
        effectType: z.ZodString;
        effectHints: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        isTerminating: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        id: string;
        supported: boolean;
        effectType: string;
        effectHints: Record<string, unknown>;
        isTerminating: boolean;
        constraints?: string | undefined;
        cost?: string | number | Record<string, unknown> | null | undefined;
    }, {
        description: string;
        id: string;
        supported: boolean;
        effectType: string;
        constraints?: string | undefined;
        cost?: string | number | Record<string, unknown> | null | undefined;
        effectHints?: Record<string, unknown> | undefined;
        isTerminating?: boolean | undefined;
    }>, "many">>;
    zones: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        owner: z.ZodString;
        visibility: z.ZodString;
        capacity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        id: string;
        owner: string;
        visibility: string;
        capacity?: number | null | undefined;
    }, {
        type: string;
        id: string;
        owner: string;
        visibility: string;
        capacity?: number | null | undefined;
    }>, "many">>;
    turnPolicy: z.ZodObject<{
        direction: z.ZodEnum<["clockwise", "counterclockwise", "variable"]>;
        startsWith: z.ZodEnum<["left_of_dealer", "right_of_dealer", "dealer", "eldest_hand", "fixed_player", "winner_of_previous"]>;
        timerSeconds: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        direction: "clockwise" | "counterclockwise" | "variable";
        startsWith: "dealer" | "left_of_dealer" | "right_of_dealer" | "eldest_hand" | "fixed_player" | "winner_of_previous";
        timerSeconds?: number | null | undefined;
    }, {
        direction: "clockwise" | "counterclockwise" | "variable";
        startsWith: "dealer" | "left_of_dealer" | "right_of_dealer" | "eldest_hand" | "fixed_player" | "winner_of_previous";
        timerSeconds?: number | null | undefined;
    }>;
    endConditions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        appliesToPhase: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        id: string;
        appliesToPhase?: string | null | undefined;
    }, {
        description: string;
        id: string;
        appliesToPhase?: string | null | undefined;
    }>, "many">>;
    cardVisibility: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    drawConfig: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    discardConfig: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    deckType: z.ZodOptional<z.ZodString>;
    suitSet: z.ZodOptional<z.ZodString>;
    rankSet: z.ZodOptional<z.ZodString>;
    initialHandSize: z.ZodOptional<z.ZodNumber>;
    trumpConfig: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    meldConfig: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    trickConfig: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    declarationMechanism: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    handRanks: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    buyCosts: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    marketConfig: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    specialCards: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    shedding: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    fishingConfig: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    patienceConfig: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    bankingConfig: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    roundConfig: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    constants: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    finalHandSize: z.ZodOptional<z.ZodNumber>;
    deckCount: z.ZodOptional<z.ZodNumber>;
    implementationHints: z.ZodOptional<z.ZodObject<{
        rngUsed: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        authoritativeServer: z.ZodDefault<z.ZodBoolean>;
        customLogicNeeded: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        rngUsed: string[];
        authoritativeServer: boolean;
        customLogicNeeded: string[];
    }, {
        rngUsed?: string[] | undefined;
        authoritativeServer?: boolean | undefined;
        customLogicNeeded?: string[] | undefined;
    }>>;
    progression: z.ZodDefault<z.ZodArray<z.ZodUnknown, "many">>;
    roles: z.ZodDefault<z.ZodArray<z.ZodUnknown, "many">>;
    determinismNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    familyKernel: string;
    kernelVersion: string;
    playerConfig: {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        dealerRotates: boolean;
        optimalPlayers?: number | null | undefined;
    };
    phases: {
        label: string;
        id: string;
        nextPhase: string | null;
        actor: "each_player_clockwise" | "each_player_counterclockwise" | "dealer" | "all_simultaneous" | "active_players_clockwise" | "active_players_counterclockwise" | "current_player" | "winning_player" | "system";
        legalActions: string[];
        isMandatory: boolean;
        conditionalNext: {
            condition: string;
            nextPhase: string | null;
        }[];
        cardVisibilityChanges: Record<string, string>;
        loopIndex?: number | null | undefined;
        totalLoops?: number | null | undefined;
        notes?: string | undefined;
    }[];
    customActions: {
        description: string;
        id: string;
        supported: boolean;
        effectType: string;
        effectHints: Record<string, unknown>;
        isTerminating: boolean;
        constraints?: string | undefined;
        cost?: string | number | Record<string, unknown> | null | undefined;
    }[];
    zones: {
        type: string;
        id: string;
        owner: string;
        visibility: string;
        capacity?: number | null | undefined;
    }[];
    turnPolicy: {
        direction: "clockwise" | "counterclockwise" | "variable";
        startsWith: "dealer" | "left_of_dealer" | "right_of_dealer" | "eldest_hand" | "fixed_player" | "winner_of_previous";
        timerSeconds?: number | null | undefined;
    };
    endConditions: {
        description: string;
        id: string;
        appliesToPhase?: string | null | undefined;
    }[];
    cardVisibility: Record<string, unknown>;
    constants: Record<string, unknown>;
    progression: unknown[];
    roles: unknown[];
    deckType?: string | undefined;
    suitSet?: string | undefined;
    rankSet?: string | undefined;
    actions?: Record<string, {
        description: string;
        supported: boolean;
        effectType: string;
        effectHints: Record<string, unknown>;
        isTerminating: boolean;
        constraints?: string | undefined;
        cost?: string | number | Record<string, unknown> | null | undefined;
        reason?: string | undefined;
    }> | undefined;
    drawConfig?: Record<string, unknown> | null | undefined;
    discardConfig?: Record<string, unknown> | null | undefined;
    initialHandSize?: number | undefined;
    trumpConfig?: Record<string, unknown> | null | undefined;
    meldConfig?: Record<string, unknown> | null | undefined;
    trickConfig?: Record<string, unknown> | null | undefined;
    declarationMechanism?: Record<string, unknown> | null | undefined;
    handRanks?: Record<string, unknown> | null | undefined;
    buyCosts?: Record<string, unknown> | null | undefined;
    marketConfig?: Record<string, unknown> | null | undefined;
    specialCards?: Record<string, unknown> | null | undefined;
    shedding?: Record<string, unknown> | null | undefined;
    fishingConfig?: Record<string, unknown> | null | undefined;
    patienceConfig?: Record<string, unknown> | null | undefined;
    bankingConfig?: Record<string, unknown> | null | undefined;
    roundConfig?: Record<string, unknown> | null | undefined;
    finalHandSize?: number | undefined;
    deckCount?: number | undefined;
    implementationHints?: {
        rngUsed: string[];
        authoritativeServer: boolean;
        customLogicNeeded: string[];
    } | undefined;
    determinismNotes?: string | undefined;
}, {
    familyKernel: string;
    kernelVersion: string;
    playerConfig: {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers?: number | null | undefined;
        dealerRotates?: boolean | undefined;
    };
    phases: {
        label: string;
        id: string;
        nextPhase: string | null;
        actor: "each_player_clockwise" | "each_player_counterclockwise" | "dealer" | "all_simultaneous" | "active_players_clockwise" | "active_players_counterclockwise" | "current_player" | "winning_player" | "system";
        legalActions: string[];
        isMandatory?: boolean | undefined;
        loopIndex?: number | null | undefined;
        totalLoops?: number | null | undefined;
        conditionalNext?: {
            condition: string;
            nextPhase: string | null;
        }[] | undefined;
        cardVisibilityChanges?: Record<string, string> | undefined;
        notes?: string | undefined;
    }[];
    turnPolicy: {
        direction: "clockwise" | "counterclockwise" | "variable";
        startsWith: "dealer" | "left_of_dealer" | "right_of_dealer" | "eldest_hand" | "fixed_player" | "winner_of_previous";
        timerSeconds?: number | null | undefined;
    };
    deckType?: string | undefined;
    suitSet?: string | undefined;
    rankSet?: string | undefined;
    actions?: Record<string, {
        description: string;
        supported: boolean;
        effectType: string;
        constraints?: string | undefined;
        cost?: string | number | Record<string, unknown> | null | undefined;
        effectHints?: Record<string, unknown> | undefined;
        isTerminating?: boolean | undefined;
        reason?: string | undefined;
    }> | undefined;
    customActions?: {
        description: string;
        id: string;
        supported: boolean;
        effectType: string;
        constraints?: string | undefined;
        cost?: string | number | Record<string, unknown> | null | undefined;
        effectHints?: Record<string, unknown> | undefined;
        isTerminating?: boolean | undefined;
    }[] | undefined;
    zones?: {
        type: string;
        id: string;
        owner: string;
        visibility: string;
        capacity?: number | null | undefined;
    }[] | undefined;
    endConditions?: {
        description: string;
        id: string;
        appliesToPhase?: string | null | undefined;
    }[] | undefined;
    cardVisibility?: Record<string, unknown> | undefined;
    drawConfig?: Record<string, unknown> | null | undefined;
    discardConfig?: Record<string, unknown> | null | undefined;
    initialHandSize?: number | undefined;
    trumpConfig?: Record<string, unknown> | null | undefined;
    meldConfig?: Record<string, unknown> | null | undefined;
    trickConfig?: Record<string, unknown> | null | undefined;
    declarationMechanism?: Record<string, unknown> | null | undefined;
    handRanks?: Record<string, unknown> | null | undefined;
    buyCosts?: Record<string, unknown> | null | undefined;
    marketConfig?: Record<string, unknown> | null | undefined;
    specialCards?: Record<string, unknown> | null | undefined;
    shedding?: Record<string, unknown> | null | undefined;
    fishingConfig?: Record<string, unknown> | null | undefined;
    patienceConfig?: Record<string, unknown> | null | undefined;
    bankingConfig?: Record<string, unknown> | null | undefined;
    roundConfig?: Record<string, unknown> | null | undefined;
    constants?: Record<string, unknown> | undefined;
    finalHandSize?: number | undefined;
    deckCount?: number | undefined;
    implementationHints?: {
        rngUsed?: string[] | undefined;
        authoritativeServer?: boolean | undefined;
        customLogicNeeded?: string[] | undefined;
    } | undefined;
    progression?: unknown[] | undefined;
    roles?: unknown[] | undefined;
    determinismNotes?: string | undefined;
}>, {
    familyKernel: string;
    kernelVersion: string;
    playerConfig: {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        dealerRotates: boolean;
        optimalPlayers?: number | null | undefined;
    };
    phases: {
        label: string;
        id: string;
        nextPhase: string | null;
        actor: "each_player_clockwise" | "each_player_counterclockwise" | "dealer" | "all_simultaneous" | "active_players_clockwise" | "active_players_counterclockwise" | "current_player" | "winning_player" | "system";
        legalActions: string[];
        isMandatory: boolean;
        conditionalNext: {
            condition: string;
            nextPhase: string | null;
        }[];
        cardVisibilityChanges: Record<string, string>;
        loopIndex?: number | null | undefined;
        totalLoops?: number | null | undefined;
        notes?: string | undefined;
    }[];
    customActions: {
        description: string;
        id: string;
        supported: boolean;
        effectType: string;
        effectHints: Record<string, unknown>;
        isTerminating: boolean;
        constraints?: string | undefined;
        cost?: string | number | Record<string, unknown> | null | undefined;
    }[];
    zones: {
        type: string;
        id: string;
        owner: string;
        visibility: string;
        capacity?: number | null | undefined;
    }[];
    turnPolicy: {
        direction: "clockwise" | "counterclockwise" | "variable";
        startsWith: "dealer" | "left_of_dealer" | "right_of_dealer" | "eldest_hand" | "fixed_player" | "winner_of_previous";
        timerSeconds?: number | null | undefined;
    };
    endConditions: {
        description: string;
        id: string;
        appliesToPhase?: string | null | undefined;
    }[];
    cardVisibility: Record<string, unknown>;
    constants: Record<string, unknown>;
    progression: unknown[];
    roles: unknown[];
    deckType?: string | undefined;
    suitSet?: string | undefined;
    rankSet?: string | undefined;
    actions?: Record<string, {
        description: string;
        supported: boolean;
        effectType: string;
        effectHints: Record<string, unknown>;
        isTerminating: boolean;
        constraints?: string | undefined;
        cost?: string | number | Record<string, unknown> | null | undefined;
        reason?: string | undefined;
    }> | undefined;
    drawConfig?: Record<string, unknown> | null | undefined;
    discardConfig?: Record<string, unknown> | null | undefined;
    initialHandSize?: number | undefined;
    trumpConfig?: Record<string, unknown> | null | undefined;
    meldConfig?: Record<string, unknown> | null | undefined;
    trickConfig?: Record<string, unknown> | null | undefined;
    declarationMechanism?: Record<string, unknown> | null | undefined;
    handRanks?: Record<string, unknown> | null | undefined;
    buyCosts?: Record<string, unknown> | null | undefined;
    marketConfig?: Record<string, unknown> | null | undefined;
    specialCards?: Record<string, unknown> | null | undefined;
    shedding?: Record<string, unknown> | null | undefined;
    fishingConfig?: Record<string, unknown> | null | undefined;
    patienceConfig?: Record<string, unknown> | null | undefined;
    bankingConfig?: Record<string, unknown> | null | undefined;
    roundConfig?: Record<string, unknown> | null | undefined;
    finalHandSize?: number | undefined;
    deckCount?: number | undefined;
    implementationHints?: {
        rngUsed: string[];
        authoritativeServer: boolean;
        customLogicNeeded: string[];
    } | undefined;
    determinismNotes?: string | undefined;
}, {
    familyKernel: string;
    kernelVersion: string;
    playerConfig: {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers?: number | null | undefined;
        dealerRotates?: boolean | undefined;
    };
    phases: {
        label: string;
        id: string;
        nextPhase: string | null;
        actor: "each_player_clockwise" | "each_player_counterclockwise" | "dealer" | "all_simultaneous" | "active_players_clockwise" | "active_players_counterclockwise" | "current_player" | "winning_player" | "system";
        legalActions: string[];
        isMandatory?: boolean | undefined;
        loopIndex?: number | null | undefined;
        totalLoops?: number | null | undefined;
        conditionalNext?: {
            condition: string;
            nextPhase: string | null;
        }[] | undefined;
        cardVisibilityChanges?: Record<string, string> | undefined;
        notes?: string | undefined;
    }[];
    turnPolicy: {
        direction: "clockwise" | "counterclockwise" | "variable";
        startsWith: "dealer" | "left_of_dealer" | "right_of_dealer" | "eldest_hand" | "fixed_player" | "winner_of_previous";
        timerSeconds?: number | null | undefined;
    };
    deckType?: string | undefined;
    suitSet?: string | undefined;
    rankSet?: string | undefined;
    actions?: Record<string, {
        description: string;
        supported: boolean;
        effectType: string;
        constraints?: string | undefined;
        cost?: string | number | Record<string, unknown> | null | undefined;
        effectHints?: Record<string, unknown> | undefined;
        isTerminating?: boolean | undefined;
        reason?: string | undefined;
    }> | undefined;
    customActions?: {
        description: string;
        id: string;
        supported: boolean;
        effectType: string;
        constraints?: string | undefined;
        cost?: string | number | Record<string, unknown> | null | undefined;
        effectHints?: Record<string, unknown> | undefined;
        isTerminating?: boolean | undefined;
    }[] | undefined;
    zones?: {
        type: string;
        id: string;
        owner: string;
        visibility: string;
        capacity?: number | null | undefined;
    }[] | undefined;
    endConditions?: {
        description: string;
        id: string;
        appliesToPhase?: string | null | undefined;
    }[] | undefined;
    cardVisibility?: Record<string, unknown> | undefined;
    drawConfig?: Record<string, unknown> | null | undefined;
    discardConfig?: Record<string, unknown> | null | undefined;
    initialHandSize?: number | undefined;
    trumpConfig?: Record<string, unknown> | null | undefined;
    meldConfig?: Record<string, unknown> | null | undefined;
    trickConfig?: Record<string, unknown> | null | undefined;
    declarationMechanism?: Record<string, unknown> | null | undefined;
    handRanks?: Record<string, unknown> | null | undefined;
    buyCosts?: Record<string, unknown> | null | undefined;
    marketConfig?: Record<string, unknown> | null | undefined;
    specialCards?: Record<string, unknown> | null | undefined;
    shedding?: Record<string, unknown> | null | undefined;
    fishingConfig?: Record<string, unknown> | null | undefined;
    patienceConfig?: Record<string, unknown> | null | undefined;
    bankingConfig?: Record<string, unknown> | null | undefined;
    roundConfig?: Record<string, unknown> | null | undefined;
    constants?: Record<string, unknown> | undefined;
    finalHandSize?: number | undefined;
    deckCount?: number | undefined;
    implementationHints?: {
        rngUsed?: string[] | undefined;
        authoritativeServer?: boolean | undefined;
        customLogicNeeded?: string[] | undefined;
    } | undefined;
    progression?: unknown[] | undefined;
    roles?: unknown[] | undefined;
    determinismNotes?: string | undefined;
}>;
export type CardGameMechanicsData = z.infer<typeof CardGameMechanicsDataSchema>;
