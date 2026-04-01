import { z } from 'zod';

export const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
    /\[.{1,120}\]/,
    /\bT\.?B\.?D\.?\b/i,
    /\bT\.?B\.?A\.?\b/i,
    /\bTODO\b/i,
    /\bFIXME\b/i,
    /\bplaceholder\b/i,
    /\bto be (?:determined|completed|filled(?:\s+in)?|added|written|updated|researched)\b/i,
    /\blorem ipsum\b/i,
    /\b(?:INSERT|ADD|FILL IN?|DESCRIBE|EXPLAIN|WRITE|INCLUDE)\s+(?:HERE|CONTENT|TEXT|INFO|DATA|DETAILS)\b/i,
];

export function containsPlaceholder(s: string): boolean {
    return PLACEHOLDER_PATTERNS.some((re) => re.test(s));
}

export function wordCount(s: string): number {
    return s.trim().split(/\s+/).filter(Boolean).length;
}

export function allFreeOfPlaceholders(...values: Array<string | null | undefined>): boolean {
    return values.every((v) => v == null || !containsPlaceholder(v));
}

export const BANNED_SOURCE_MENTION = /\b(pagat(?!\s+ultimo)|wikipedia|wiki)\b/i;

export const BANNED_URL_PATTERNS: ReadonlyArray<RegExp> = [
    /^https?:\/\/(?:www\.)?example\.com\b/i,
    /^https?:\/\/(?:www\.)?placeholder\.com\b/i,
    /^https?:\/\/(?:www\.)?example\.org\b/i,
    /\bTBD\b/i,
    /\bTODO\b/i,
    /\bplaceholder\b/i,
    /^https?:\/\/\s*$/,
];

export function isBannedUrl(url: string | null | undefined): boolean {
    if (url == null || typeof url !== 'string') return false;
    const t = url.trim();
    if (t.length === 0) return true;
    return BANNED_URL_PATTERNS.some((re) => re.test(t));
}

const ALLOWED_NAME_CHARS = /^[\p{L}\p{N}\s\-'.,()|]+$/u;
const NAME_STUB_PATTERNS = [
    /\bsee\s+/i,
    /\bT\.?B\.?D\.?\b/i,
    /\bTODO\b/i,
    /\bN\/?A\b/i,
    /\bUnknown\b/i,
    /\bplaceholder\b/i,
    /^[.\s\-|]+$/,
];

export function isValidNameBrand(s: string | null | undefined): boolean {
    if (s == null || typeof s !== 'string') return false;
    const t = s.trim();
    if (t.length < 2) return false;
    if (!/\p{L}/u.test(t)) return false;
    if (!ALLOWED_NAME_CHARS.test(t)) return false;
    return !NAME_STUB_PATTERNS.some((re) => re.test(t));
}

export function containsBannedSourceMention(s: string | null | undefined): boolean {
    return s != null && typeof s === 'string' && BANNED_SOURCE_MENTION.test(s);
}

// Zod refinements
export const NoPlaceholdersValid = z.string().superRefine((val, ctx) => {
    if (containsPlaceholder(val)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Text must not contain placeholder text (e.g., TBD, TODO, or bracketed text)',
        });
    }
});
