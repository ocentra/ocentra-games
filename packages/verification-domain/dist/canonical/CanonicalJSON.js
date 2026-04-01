export class CanonicalJSON {
    static sortObjectRecursively(obj) {
        if (obj === null || obj === undefined) {
            return null;
        }
        if (typeof obj === 'number') {
            return this.normalizeNumber(obj);
        }
        if (typeof obj === 'string') {
            return obj;
        }
        if (typeof obj === 'boolean') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.sortObjectRecursively(item));
        }
        if (typeof obj === 'object') {
            const sorted = {};
            const keys = Object.keys(obj).sort((a, b) => {
                if (a < b)
                    return -1;
                if (a > b)
                    return 1;
                return 0;
            });
            for (const key of keys) {
                sorted[key] = this.sortObjectRecursively(obj[key]);
            }
            return sorted;
        }
        return obj;
    }
    static normalizeNumber(num) {
        if (num === Infinity || num === -Infinity) {
            throw new Error(`Invalid number: Infinity is not allowed in canonical JSON (spec Section 4)`);
        }
        if (Number.isNaN(num)) {
            throw new Error(`Invalid number: NaN is not allowed in canonical JSON (spec Section 4)`);
        }
        if (!Number.isFinite(num)) {
            throw new Error(`Invalid number: ${num} is not finite (spec Section 4)`);
        }
        if (Object.is(num, -0)) {
            return 0;
        }
        if (Number.isInteger(num)) {
            return num;
        }
        const str = num.toString();
        if (str.includes('e') || str.includes('E')) {
            const absNum = Math.abs(num);
            const precision = Math.max(0, -Math.floor(Math.log10(absNum)) + 15);
            const expanded = num.toFixed(precision);
            const trimmed = expanded.replace(/\.?0+$/, '');
            if (!trimmed.includes('.')) {
                return parseInt(trimmed, 10);
            }
            return parseFloat(trimmed);
        }
        if (str.includes('.')) {
            const trimmed = str.replace(/\.?0+$/, '');
            if (!trimmed.includes('.')) {
                return parseInt(trimmed, 10);
            }
            return parseFloat(trimmed);
        }
        return num;
    }
    static isControlChar(charCode) {
        return (charCode >= 0x00 && charCode <= 0x1F) || (charCode >= 0x7F && charCode <= 0x9F);
    }
    static unicodeReplacer(_key, value) {
        if (typeof value === 'string') {
            let needsEscaping = false;
            for (let i = 0; i < value.length; i++) {
                if (this.isControlChar(value.charCodeAt(i))) {
                    needsEscaping = true;
                    break;
                }
            }
            if (needsEscaping) {
                let escaped = '';
                for (let i = 0; i < value.length; i++) {
                    const charCode = value.charCodeAt(i);
                    if (this.isControlChar(charCode)) {
                        escaped += '\\u' + charCode.toString(16).toUpperCase().padStart(4, '0');
                    }
                    else {
                        escaped += value[i];
                    }
                }
                return escaped;
            }
        }
        return value;
    }
    static stringify(obj) {
        const sorted = this.sortObjectRecursively(obj);
        return JSON.stringify(sorted, this.unicodeReplacer.bind(this));
    }
    static parse(text) {
        return JSON.parse(text);
    }
}
