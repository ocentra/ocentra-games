export const BANKER_DETERMINATION_VALUES = [
  "fixed_dealer",
  "highest_cut",
  "auction",
  "rotating",
  "casino_house",
] as const;

export type BankerDetermination =
  (typeof BANKER_DETERMINATION_VALUES)[number];
