export class Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;

  constructor(seconds: number, nanoseconds: number) {
    if (nanoseconds < 0 || nanoseconds >= 1e9) {
      throw new Error(`Invalid nanoseconds: ${nanoseconds}. Must be between 0 and 999,999,999.`);
    }
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  static now(): Timestamp {
    const now = Date.now();
    return Timestamp.fromMillis(now);
  }

  static fromDate(date: Date): Timestamp {
    return Timestamp.fromMillis(date.getTime());
  }

  static fromMillis(milliseconds: number): Timestamp {
    const seconds = Math.floor(milliseconds / 1000);
    const nanoseconds = (milliseconds % 1000) * 1e6;
    return new Timestamp(seconds, Math.floor(nanoseconds));
  }

  static fromJSON(json: { seconds: number; nanoseconds: number }): Timestamp {
    return new Timestamp(json.seconds, json.nanoseconds);
  }

  static from(value: string | Date): Timestamp {
    if (value instanceof Date) {
      return Timestamp.fromDate(value);
    }
    return Timestamp.fromDate(new Date(value));
  }

  static tryFrom(value: string | Date): Timestamp | null {
    try {
      return Timestamp.from(value);
    } catch {
      return null;
    }
  }

  toISOString(): string {
    return this.toDate().toISOString();
  }

  toDate(): Date {
    return new Date(this.toMillis());
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }

  isEqual(other: Timestamp): boolean {
    return this.seconds === other.seconds && this.nanoseconds === other.nanoseconds;
  }

  toString(): string {
    return this.toDate().toISOString();
  }

  toJSON(): { seconds: number; nanoseconds: number; type: string } {
    return {
      seconds: this.seconds,
      nanoseconds: this.nanoseconds,
      type: 'timestamp',
    };
  }

  valueOf(): string {
    return this.toString();
  }
}

