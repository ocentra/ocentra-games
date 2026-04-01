export declare const Suit: {
    readonly SPADES: "spades";
    readonly HEARTS: "hearts";
    readonly DIAMONDS: "diamonds";
    readonly CLUBS: "clubs";
};
export type Suit = (typeof Suit)[keyof typeof Suit];
export type CardValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export interface Card {
    suit: Suit;
    value: CardValue;
    id: string;
}
export declare const GamePhase: {
    readonly DEALING: "dealing";
    readonly FLOOR_REVEAL: "floor_reveal";
    readonly PLAYER_ACTION: "player_action";
    readonly SHOWDOWN: "showdown";
    readonly SCORING: "scoring";
    readonly GAME_END: "game_end";
};
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];
export declare const AIPersonality: {
    readonly AGGRESSIVE: "aggressive";
    readonly CONSERVATIVE: "conservative";
    readonly ADAPTIVE: "adaptive";
    readonly UNPREDICTABLE: "unpredictable";
};
export type AIPersonality = (typeof AIPersonality)[keyof typeof AIPersonality];
export interface Player {
    id: string;
    name: string;
    avatar: string;
    hand: Card[];
    declaredSuit: Suit | null;
    intentCard: Card | null;
    score: number;
    isConnected: boolean;
    isAI: boolean;
    aiPersonality?: AIPersonality;
}
export interface MechanicsRuntimeContext {
    dealerIndex: number;
    showdownCallerId: string | null;
    revealedPlayerIds: string[];
    lastMechanicsAction: string | null;
    tableCards: Array<{
        playerId: string;
        card: Card;
    }>;
    capturedCardsByPlayerId: Record<string, Card[]>;
    foldedPlayerIds: string[];
    roundPot: number;
    trumpCard: Card | null;
}
export interface GameState {
    id: string;
    players: Player[];
    currentPlayer: number;
    phase: GamePhase;
    deck: Card[];
    floorCard: Card | null;
    discardPile: Card[];
    round: number;
    startTime: Date;
    lastAction: Date;
    mechanicsPhaseId?: string | null;
    mechanicsContext?: MechanicsRuntimeContext;
}
export declare const PlayerActionType: {
    readonly PICK_UP: "pick_up";
    readonly DECLINE: "decline";
    readonly DECLARE_INTENT: "declare_intent";
    readonly CALL_SHOWDOWN: "call_showdown";
    readonly REBUTTAL: "rebuttal";
    readonly REVEAL_FLOOR_CARD: "reveal_floor_card";
};
export type PlayerActionTypeValue = (typeof PlayerActionType)[keyof typeof PlayerActionType] | string;
export interface PlayerAction {
    type: PlayerActionTypeValue;
    playerId: string;
    data?: unknown;
    timestamp: Date;
}
