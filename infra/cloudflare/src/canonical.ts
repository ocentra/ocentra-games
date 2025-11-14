/**
 * Canonical JSON serialization per spec Section 4.
 * Simplified version for Cloudflare Workers.
 * 
 * Rules:
 * - UTF-8 encoding
 * - \uXXXX unicode escapes for control characters only (0x00-0x1F, 0x7F-0x9F)
 * - Objects' keys sorted lexicographically (Unicode codepoint order)
 * - Arrays preserve order
 * - Numbers use minimal representation (no trailing zeros, 1 not 1.0)
 * - No additional whitespace (minified)
 */
export class CanonicalJSON {
  /**
   * Recursively sorts object keys and normalizes values.
   */
  private static sortObjectRecursively(obj: unknown): unknown {
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
      return obj.map(item => this.sortObjectRecursively(item));
    }

    if (typeof obj === 'object') {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(obj).sort((a, b) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      });
      
      for (const key of keys) {
        sorted[key] = this.sortObjectRecursively((obj as Record<string, unknown>)[key]);
      }
      
      return sorted;
    }

    return obj;
  }

  /**
   * Normalizes numbers to minimal representation per spec Section 4.
   */
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

  /**
   * Checks if a character is a control character that must be escaped.
   */
  private static isControlChar(charCode: number): boolean {
    return (charCode >= 0x00 && charCode <= 0x1F) || (charCode >= 0x7F && charCode <= 0x9F);
  }

  /**
   * Custom replacer that escapes ONLY control characters.
   */
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

  /**
   * Canonicalizes and stringifies an object according to spec Section 4.
   */
  static stringify(obj: unknown): string {
    const sorted = this.sortObjectRecursively(obj);
    return JSON.stringify(sorted, this.unicodeReplacer.bind(this));
  }
}

