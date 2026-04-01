export declare class Timestamp {
    readonly seconds: number;
    readonly nanoseconds: number;
    constructor(seconds: number, nanoseconds: number);
    static now(): Timestamp;
    static fromDate(date: Date): Timestamp;
    static fromMillis(milliseconds: number): Timestamp;
    static fromJSON(json: {
        seconds: number;
        nanoseconds: number;
    }): Timestamp;
    static from(value: string | Date): Timestamp;
    static tryFrom(value: string | Date): Timestamp | null;
    toISOString(): string;
    toDate(): Date;
    toMillis(): number;
    isEqual(other: Timestamp): boolean;
    toString(): string;
    toJSON(): {
        seconds: number;
        nanoseconds: number;
        type: string;
    };
    valueOf(): string;
}
