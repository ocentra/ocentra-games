export const LEGAL_STATUS_VALUES = [
  "Public Domain",
  "Proprietary",
  "Trademarked",
  "Patent-Expired",
  "Unknown",
  "NA",
] as const;

export const LEGAL_STATUS_NA = "NA" as const;

export type LegalStatus = (typeof LEGAL_STATUS_VALUES)[number];
