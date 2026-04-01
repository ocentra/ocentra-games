export const PlayerActionType = {
  PICK_UP: 'pick_up',
  DECLINE: 'decline',
  DECLARE_INTENT: 'declare_intent',
  CALL_SHOWDOWN: 'call_showdown',
  REBUTTAL: 'rebuttal',
  REVEAL_FLOOR_CARD: 'reveal_floor_card',
} as const;

export type PlayerActionType = typeof PlayerActionType[keyof typeof PlayerActionType];

export interface PlayerAction {
  type: PlayerActionType;
  playerId: string;
  data?: unknown;
  timestamp: Date;
}
