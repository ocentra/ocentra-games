export const BUILD_DIRECTION_VALUES = [
  "ascending",
  "descending",
  "both",
] as const;
export const BUILD_SUIT_RULE_VALUES = [
  "same_suit",
  "alternate_color",
  "any_suit",
  "opposite_suit",
] as const;

export type BuildDirection =
  | (typeof BUILD_DIRECTION_VALUES)[number]
  | null;
export type BuildSuitRule = (typeof BUILD_SUIT_RULE_VALUES)[number] | null;
