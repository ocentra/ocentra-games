export class Timestamp {
    seconds;
    nanoseconds;
    constructor(seconds, nanoseconds) {
        if (nanoseconds < 0 || nanoseconds >= 1e9) {
            throw new Error(`Invalid nanoseconds: ${nanoseconds}. Must be between 0 and 999,999,999.`);
        }
        this.seconds = seconds;
        this.nanoseconds = nanoseconds;
    }
    static now() {
        const now = Date.now();
        return Timestamp.fromMillis(now);
    }
    static fromDate(date) {
        return Timestamp.fromMillis(date.getTime());
    }
    static fromMillis(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const nanoseconds = (milliseconds % 1000) * 1e6;
        return new Timestamp(seconds, Math.floor(nanoseconds));
    }
    static fromJSON(json) {
        return new Timestamp(json.seconds, json.nanoseconds);
    }
    static from(value) {
        if (value instanceof Date) {
            return Timestamp.fromDate(value);
        }
        return Timestamp.fromDate(new Date(value));
    }
    static tryFrom(value) {
        try {
            return Timestamp.from(value);
        }
        catch {
            return null;
        }
    }
    toISOString() {
        return this.toDate().toISOString();
    }
    toDate() {
        return new Date(this.toMillis());
    }
    toMillis() {
        return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
    }
    isEqual(other) {
        return this.seconds === other.seconds && this.nanoseconds === other.nanoseconds;
    }
    toString() {
        return this.toDate().toISOString();
    }
    toJSON() {
        return {
            seconds: this.seconds,
            nanoseconds: this.nanoseconds,
            type: 'timestamp',
        };
    }
    valueOf() {
        return this.toString();
    }
}
