export const PathSeparator = {
  ForwardSlash: '/',
  Dash: '-',
} as const;

export const LeadingSlashPattern = /^\/+/;

export const PathValue = {
  Empty: '',
} as const;

export const PathPlaceholder = {
  wrap: (key: string) => `{${key}}`,
} as const;

export type PathSeparator = typeof PathSeparator[keyof typeof PathSeparator];

export const FileExtension = {
  Json: '.json',
} as const;

export type FileExtension = typeof FileExtension[keyof typeof FileExtension];

export const PathLimits = {
  MaxComponentLength: 255,
} as const;

export type PathLimits = typeof PathLimits[keyof typeof PathLimits];

export const RandomString = {
  Radix: 36,
  StartIndex: 2,
  Length: 8,
} as const;

export type RandomString = typeof RandomString[keyof typeof RandomString];

export const ParamName = {
  MatchId: 'matchId',
  UserId: 'userId',
  DisputeId: 'disputeId',
} as const;

export type ParamNameValue = typeof ParamName[keyof typeof ParamName];
