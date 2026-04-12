export declare class CanonicalJSON {
    private static sortObjectRecursively;
    private static normalizeNumber;
    private static trimTrailingZeros;
    private static isControlChar;
    private static unicodeReplacer;
    static stringify(obj: unknown): string;
    static parse(text: string): unknown;
}
