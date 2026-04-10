export const FormField = {
  MatchId: 'match_id',
  Reason: 'reason',
  Description: 'description',
  DisputeId: 'dispute_id',
  Evidence: 'evidence',
  UserId: 'user_id',
  PlayerId: 'player_id',
} as const;

export type FormField = typeof FormField[keyof typeof FormField];
