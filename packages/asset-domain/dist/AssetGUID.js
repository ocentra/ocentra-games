export class AssetGUID {
    _value;
    static UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    constructor(value) {
        if (!AssetGUID.isValid(value)) {
            throw new Error(`Invalid GUID format: ${value}`);
        }
        this._value = value;
    }
    static create() {
        const value = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            });
        return new AssetGUID(value);
    }
    static from(value) {
        return new AssetGUID(value);
    }
    static tryFrom(value) {
        if (AssetGUID.isValid(value)) {
            return new AssetGUID(value);
        }
        return null;
    }
    static fromJSON(value) {
        if (typeof value === 'string') {
            return AssetGUID.tryFrom(value);
        }
        if (value && typeof value === 'object' && '_value' in value && typeof value._value === 'string') {
            return AssetGUID.tryFrom(value._value);
        }
        return null;
    }
    static isValid(value) {
        return AssetGUID.UUID_REGEX.test(value);
    }
    toString() {
        return this._value;
    }
    valueOf() {
        return this._value;
    }
    toJSON() {
        return this._value;
    }
    equals(other) {
        const otherValue = other instanceof AssetGUID ? other._value : other;
        return this._value === otherValue;
    }
}
