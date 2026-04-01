export const EXTRACTION_STATUS_VALUES = ["validated"] as const;

export const FIELD_STATUS_VALUES = ["known", "na", "unknown"] as const;

export type ExtractionStatus = (typeof EXTRACTION_STATUS_VALUES)[number];
export type FieldStatus = (typeof FIELD_STATUS_VALUES)[number];
