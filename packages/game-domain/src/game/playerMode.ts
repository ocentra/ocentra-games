export const PLAYER_MODE_VALUES = ["singleplayer", "multiplayer"] as const;

export const PLAYER_MODE_SINGLEPLAYER = "singleplayer" as const;

export type PlayerMode = (typeof PLAYER_MODE_VALUES)[number];
