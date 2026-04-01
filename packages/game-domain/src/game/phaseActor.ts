export const PHASE_ACTOR_VALUES = [
  "each_player_clockwise",
  "each_player_counterclockwise",
  "dealer",
  "all_simultaneous",
  "active_players_clockwise",
  "active_players_counterclockwise",
  "current_player",
  "winning_player",
  "system",
] as const;

export type PhaseActor = (typeof PHASE_ACTOR_VALUES)[number];
