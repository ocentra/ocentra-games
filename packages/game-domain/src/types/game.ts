export const Suit = {
  SPADES: 'spades',
  HEARTS: 'hearts',
  DIAMONDS: 'diamonds',
  CLUBS: 'clubs',
} as const;

export type Suit = (typeof Suit)[keyof typeof Suit];

export type CardValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  suit: Suit;
  value: CardValue;
  id: string;
}

export const GamePhase = {
  DEALING: 'dealing',
  FLOOR_REVEAL: 'floor_reveal',
  PLAYER_ACTION: 'player_action',
  SHOWDOWN: 'showdown',
  SCORING: 'scoring',
  GAME_END: 'game_end',
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

export const AIPersonality = {
  AGGRESSIVE: 'aggressive',
  CONSERVATIVE: 'conservative',
  ADAPTIVE: 'adaptive',
  UNPREDICTABLE: 'unpredictable',
} as const;

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
  familyState?: Record<string, unknown>;
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

export const PlayerActionType = {
  PICK_UP: 'pick_up',
  DECLINE: 'decline',
  DECLARE_INTENT: 'declare_intent',
  CALL_SHOWDOWN: 'call_showdown',
  REBUTTAL: 'rebuttal',
  REVEAL_FLOOR_CARD: 'reveal_floor_card',
} as const;

export type PlayerActionTypeValue =
  | (typeof PlayerActionType)[keyof typeof PlayerActionType]
  | string;

export interface PlayerAction {
  type: PlayerActionTypeValue;
  playerId: string;
  data?: unknown;
  timestamp: Date;
}
