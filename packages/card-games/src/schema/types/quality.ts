export const QUALITY_VALUES = [
  "complete",
  "stub",
  "partial",
  "draft",
  "Unknown",
] as const;

export const QUALITY_PARTIAL = "partial" as const;

export type Quality = (typeof QUALITY_VALUES)[number];
