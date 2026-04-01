export const TRUMP_DETERMINATION_VALUES = [
  "turned_card",
  "bid_winner_chooses",
  "fixed_suit",
  "last_card_dealt",
  "highest_bidder",
  "called_by_contract",
  "permanent_rank",
] as const;

export type TrumpDetermination = (typeof TRUMP_DETERMINATION_VALUES)[number];
