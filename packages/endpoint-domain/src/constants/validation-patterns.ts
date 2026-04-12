import { PathSeparator } from '@/constants/paths';

export const PathTraversalLiteral = {
  ParentDir: '..',
  ForwardSlash: PathSeparator.ForwardSlash,
  Backslash: '\\',
} as const;

export const ValidationPattern = {
  InvisibleChars: /[\u200B-\u200D\u2060\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2061-\u2063]/,
  InvisibleCharsGlobal: /[\u200B-\u200D\u2060\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2061-\u2063]/g,
  PathTraversal: /\.\.|%2F|%2f|%5C|%5c/,
  ControlChars: /[\u0000-\u001F\u007F-\u009F]/,
  ControlCharsGlobal: /[\u0000-\u001F\u007F-\u009F]/g,
  ControlCharsAndSpaceGlobal: /[\s\u0000-\u001F\u007F-\u009F]/g,
  ControlCharsAndSpaceOneOrMore: /[\s\u0000-\u001F\u007F-\u009F]+/g,
  WhitespaceBoundary: /^\s|\s$/,
  DoubleEncoding: /%25[0-9a-fA-F]{2}/,
  UnicodeCombiningChars: /[\u0300-\u036F]/,
  UuidV4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  HashHex64: /^[0-9a-f]{64}$/i,
  PathComponentAllowed: /[^a-zA-Z0-9_-]/g,
  PathComponentTrimUnderscores: /^_+|_+$/g,
  UrlPathFromFull: /^https?:\/\/[^/]+(\/[^?#]*)/,
  UrlPathOnly: /^(\/[^?#]*)/,
  UserId: /^[A-Za-z0-9._-]+$/,
  IsoDateTime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
  SemanticVersion: /^[0-9]+\.[0-9]+\.[0-9]+$/,
  SeasonId: /^(current|season-[A-Za-z0-9_-]+)$/,
  DisputeId: /^[A-Za-z0-9_-]+$/,
  TournamentId: /^[A-Za-z0-9_-]+$/,
  PrintableAscii: /^[ -~]*$/,
} as const;
