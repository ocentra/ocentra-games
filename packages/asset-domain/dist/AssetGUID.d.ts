export declare class AssetGUID {
    private readonly _value;
    private static readonly UUID_REGEX;
    private constructor();
    static create(): AssetGUID;
    static from(value: string): AssetGUID;
    static tryFrom(value: string): AssetGUID | null;
    static fromJSON(value: unknown): AssetGUID | null;
    static isValid(value: string): boolean;
    toString(): string;
    valueOf(): string;
    toJSON(): string;
    equals(other: AssetGUID | string): boolean;
}
