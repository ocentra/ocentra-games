export interface UIMessagePayload {
  title?: string
  message: string
  icon?: string
  durationMs?: number
  severity?: 'info' | 'success' | 'warning' | 'error'
}

export interface TimerOptions {
  durationMs: number
  autoStart?: boolean
  label?: string
}

export interface TurnStateUpdate {
  currentPlayerId: string
  remainingTimeMs?: number
  action?: string
  metadata?: Record<string, unknown>
}

export interface WildCardUpdate {
  cardId: string
  isWild: boolean
  metadata?: Record<string, unknown>
}

export interface RoundRecord<TRecord = Record<string, unknown>> {
  roundNumber: number
  record: TRecord
}

export interface GameManagerReference {
  id: string
  type: string
  metadata?: Record<string, unknown>
}

export interface ScoreManagerDetails {
  totalRounds: number
  currentRound: number
  pot: number
  currentBet: number
  metadata?: Record<string, unknown>
}

export interface PlayerActionContext {
  currentPlayerType?: string
  metadata?: Record<string, unknown>
}

export type PlayerDecisionId =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16

export interface PlayerDecision {
  id: PlayerDecisionId
  name: string
}

