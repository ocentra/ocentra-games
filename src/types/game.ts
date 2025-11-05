export const Suit = {
  SPADES: 'spades',
  HEARTS: 'hearts',
  DIAMONDS: 'diamonds',
  CLUBS: 'clubs',
} as const

export type Suit = (typeof Suit)[keyof typeof Suit]

export type CardValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  suit: Suit
  value: CardValue
  id: string
}

export const GamePhase = {
  DEALING: 'dealing',
  FLOOR_REVEAL: 'floor_reveal',
  PLAYER_ACTION: 'player_action',
  SHOWDOWN: 'showdown',
  SCORING: 'scoring',
  GAME_END: 'game_end',
} as const

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase]

export const AIPersonality = {
  AGGRESSIVE: 'aggressive',
  CONSERVATIVE: 'conservative',
  ADAPTIVE: 'adaptive',
  UNPREDICTABLE: 'unpredictable',
} as const

export type AIPersonality = (typeof AIPersonality)[keyof typeof AIPersonality]

export interface Player {
  id: string
  name: string
  avatar: string
  hand: Card[]
  declaredSuit: Suit | null
  intentCard: Card | null
  score: number
  isConnected: boolean
  isAI: boolean
  aiPersonality?: AIPersonality
}

export interface GameState {
  id: string
  players: Player[]
  currentPlayer: number
  phase: GamePhase
  deck: Card[]
  floorCard: Card | null
  discardPile: Card[]
  round: number
  startTime: Date
  lastAction: Date
}

export interface PlayerAction {
  type: 'pick_up' | 'decline' | 'declare_intent' | 'call_showdown' | 'rebuttal'
  playerId: string
  data?: unknown
  timestamp: Date
}
