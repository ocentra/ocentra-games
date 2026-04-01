export class AssetGUID {
  private readonly _value: string;
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  private constructor(value: string) {
    if (!AssetGUID.isValid(value)) {
      throw new Error(`Invalid GUID format: ${value}`);
    }
    this._value = value;
  }

  static create(): AssetGUID {
    const value = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
    return new AssetGUID(value);
  }

  static from(value: string): AssetGUID {
    return new AssetGUID(value);
  }

  static tryFrom(value: string): AssetGUID | null {
    if (AssetGUID.isValid(value)) {
      return new AssetGUID(value);
    }
    return null;
  }

  static fromJSON(value: unknown): AssetGUID | null {
    if (typeof value === 'string') {
      return AssetGUID.tryFrom(value);
    }
    if (value && typeof value === 'object' && '_value' in value && typeof (value as { _value: string })._value === 'string') {
      return AssetGUID.tryFrom((value as { _value: string })._value);
    }
    return null;
  }

  static isValid(value: string): boolean {
    return AssetGUID.UUID_REGEX.test(value);
  }

  toString(): string {
    return this._value;
  }

  valueOf(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }

  equals(other: AssetGUID | string): boolean {
    const otherValue = other instanceof AssetGUID ? other._value : other;
    return this._value === otherValue;
  }
}
