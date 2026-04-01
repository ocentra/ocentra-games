export const ZONE_TYPE_VALUES = [
  "stack",
  "hand",
  "pool",
  "grid",
  "track",
  "area",
] as const;

export const ZONE_VISIBILITY_VALUES = ["hidden", "private", "public"] as const;

export const ZONE_OWNER_VALUES = ["table", "player", "team"] as const;

export type ZoneType = (typeof ZONE_TYPE_VALUES)[number];
export type ZoneVisibility = (typeof ZONE_VISIBILITY_VALUES)[number];
export type ZoneOwner = (typeof ZONE_OWNER_VALUES)[number];
