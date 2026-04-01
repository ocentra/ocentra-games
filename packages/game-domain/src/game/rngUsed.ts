export const RNG_USED_VALUES = [
  "shuffle",
  "deal",
  "dice",
  "draw",
  "random_select",
] as const;

export type RngUsed = (typeof RNG_USED_VALUES)[number];
