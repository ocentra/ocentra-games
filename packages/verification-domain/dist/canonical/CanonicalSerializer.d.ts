import type { MatchRecord } from '../types';
export declare class CanonicalSerializer {
    static canonicalizeMatchRecord(match: MatchRecord): Uint8Array;
    private static validateVersion;
    private static normalizeMatchRecord;
    private static toISO8601;
}
