export const VISIBILITY_VALUES = ["face_up", "face_down"] as const;
export const VISIBILITY_MIXED_VALUES = ["face_up", "face_down", "mixed"] as const;
export const VISIBILITY_NA_VALUES = [
  "face_up",
  "face_down",
  "NA",
  "Unknown",
] as const;

export type Visibility = (typeof VISIBILITY_VALUES)[number];
export type VisibilityMixed = (typeof VISIBILITY_MIXED_VALUES)[number];
export type VisibilityNA = (typeof VISIBILITY_NA_VALUES)[number] | null;
