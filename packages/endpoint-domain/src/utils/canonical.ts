export class CanonicalJSON {

  private static sortObjectRecursively(obj: unknown, depth = 0): unknown {
    if (depth > 20) {
      throw new Error('Canonical JSON: Maximum recursion depth (20) exceeded');
    }

    if (obj === null || obj === undefined) {
      return null;
    }

    if (typeof obj === 'number') {
      return this.normalizeNumber(obj);
    }

    if (typeof obj === 'string' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectRecursively(item, depth + 1));
    }

    if (typeof obj === 'object') {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(obj).sort((a, b) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      });

      for (const key of keys) {
        sorted[key] = this.sortObjectRecursively((obj as Record<string, unknown>)[key], depth + 1);
      }

      return sorted;
    }

    return obj;
  }


  private static normalizeNumber(num: number): number | string {
    if (num === Infinity || num === -Infinity) {
      throw new Error(`Invalid number: Infinity is not allowed in canonical JSON`);
    }
    if (Number.isNaN(num)) {
      throw new Error(`Invalid number: NaN is not allowed in canonical JSON`);
    }
    if (!Number.isFinite(num)) {
      throw new Error(`Invalid number: ${num} is not finite`);
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
      const trimmed = this.trimTrailingZeros(expanded);
      if (!trimmed.includes('.')) {
        return parseInt(trimmed, 10);
      }
      return parseFloat(trimmed);
    }

    if (str.includes('.')) {
      const trimmed = this.trimTrailingZeros(str);
      if (!trimmed.includes('.')) {
        return parseInt(trimmed, 10);
      }
      return parseFloat(trimmed);
    }

    return num;
  }

  private static trimTrailingZeros(str: string): string {
    let end = str.length;
    while (end > 0 && str[end - 1] === '0') {
      end--;
    }
    if (end > 0 && str[end - 1] === '.') {
      end--;
    }
    return str.slice(0, end);
  }


  private static isControlChar(charCode: number): boolean {
    return (charCode >= 0x00 && charCode <= 0x1F) || (charCode >= 0x7F && charCode <= 0x9F);
  }


  private static unicodeReplacer(key: string, value: unknown): unknown {
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
          } else {
            escaped += value[i];
          }
        }
        return escaped;
      }
    }
    return value;
  }


  static stringify(obj: unknown): string {
    const sorted = this.sortObjectRecursively(obj);
    return JSON.stringify(sorted, this.unicodeReplacer.bind(this));
  }
}
