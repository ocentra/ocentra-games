export const SEAT_LAYOUT_VALUES = [
  "circular",
  "linear",
  "teams_2v2",
  "teams_3v3",
  "fixed_partnerships",
  "variable_partnerships",
] as const;

export const PARTNERSHIP_FORMAT_VALUES = [
  "2v2",
  "3v3",
  "2v2v2",
  "individual",
  "variable",
  "NA",
  "not applicable",
  "Unknown",
] as const;

export type SeatLayout = (typeof SEAT_LAYOUT_VALUES)[number];
export type PartnershipFormat = (typeof PARTNERSHIP_FORMAT_VALUES)[number];
