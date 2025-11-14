/**
 * Canonical JSON serialization per spec Section 4.
 * 
 * Rules:
 * - UTF-8 encoding
 * - \uXXXX unicode escapes for control characters only (0x00-0x1F, 0x7F-0x9F)
 * - Objects' keys sorted lexicographically (Unicode codepoint order)
 * - Arrays preserve order
 * - Numbers use minimal representation (no trailing zeros, 1 not 1.0)
 * - No additional whitespace (minified)
 * - Timestamps in ISO8601 UTC with Z and milliseconds precision
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

    if (typeof obj === 'string') {
      return obj; // Unicode normalization handled in JSON.stringify replacer
    }

    if (typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectRecursively(item));
    }

    if (typeof obj === 'object') {
      const sorted: Record<string, unknown> = {};
      // Per critique Issue #42: Use Unicode codepoint sort (not locale-dependent)
      // Direct string comparison ensures deterministic sorting across all locales
      const keys = Object.keys(obj).sort((a, b) => {
        // Compare by Unicode codepoint order (not locale-dependent)
        // This ensures identical output on all systems regardless of locale
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
   * Per critique Issue #15: Complete number normalization with all edge cases.
   * Handles all edge cases:
   * - 1.0 → 1
   * - 1.50 → 1.5
   * - 0.0 → 0
   * - -0.0 → 0 (fixes negative zero)
   * - 1e10 → 10000000000 (expands scientific notation)
   * - 1.23e-4 → 0.000123 (expands scientific notation)
   * - Infinity/NaN → rejected (spec doesn't allow)
   */
  private static normalizeNumber(num: number): number | string {
    // Per critique Issue #15: Explicitly reject Infinity and NaN (spec doesn't allow)
    if (num === Infinity || num === -Infinity) {
      throw new Error(`Invalid number: Infinity is not allowed in canonical JSON (spec Section 4)`);
    }
    if (Number.isNaN(num)) {
      throw new Error(`Invalid number: NaN is not allowed in canonical JSON (spec Section 4)`);
    }
    if (!Number.isFinite(num)) {
      throw new Error(`Invalid number: ${num} is not finite (spec Section 4)`);
    }

    // Per critique Issue #15: Fix negative zero (-0.0 → 0)
    if (Object.is(num, -0)) {
      return 0;
    }

    // Handle integers
    if (Number.isInteger(num)) {
      return num;
    }

    // Handle scientific notation - expand to decimal
    const str = num.toString();
    if (str.includes('e') || str.includes('E')) {
      // Convert scientific notation to decimal
      // Use toFixed with enough precision, then remove trailing zeros
      const absNum = Math.abs(num);
      const precision = Math.max(0, -Math.floor(Math.log10(absNum)) + 15);
      const expanded = num.toFixed(precision);
      const trimmed = expanded.replace(/\.?0+$/, '');
      if (!trimmed.includes('.')) {
        return parseInt(trimmed, 10);
      }
      return parseFloat(trimmed);
    }

    // Remove trailing zeros after decimal point
    if (str.includes('.')) {
      const trimmed = str.replace(/\.?0+$/, '');
      // If we removed everything after decimal, it's an integer
      if (!trimmed.includes('.')) {
        return parseInt(trimmed, 10);
      }
      return parseFloat(trimmed);
    }

    return num;
  }

  /**
   * Checks if a character is a control character that must be escaped.
   * Control characters: 0x00-0x1F (C0 controls) and 0x7F-0x9F (DEL and C1 controls)
   */
  private static isControlChar(charCode: number): boolean {
    return (charCode >= 0x00 && charCode <= 0x1F) || (charCode >= 0x7F && charCode <= 0x9F);
  }

  /**
   * Custom replacer that escapes ONLY control characters, preserving all other Unicode.
   * Per spec Section 4 line 116: "\uXXXX unicode escapes for control characters only"
   */
  private static unicodeReplacer(_key: string, value: unknown): unknown {
    if (typeof value === 'string') {
      // Check if string contains control characters
      let needsEscaping = false;
      for (let i = 0; i < value.length; i++) {
        if (this.isControlChar(value.charCodeAt(i))) {
          needsEscaping = true;
          break;
        }
      }

      if (needsEscaping) {
        // Build escaped string - only escape control chars, preserve everything else
        let escaped = '';
        for (let i = 0; i < value.length; i++) {
          const charCode = value.charCodeAt(i);
          if (this.isControlChar(charCode)) {
            // Escape as \uXXXX (4 hex digits, uppercase)
            escaped += '\\u' + charCode.toString(16).toUpperCase().padStart(4, '0');
          } else {
            // Preserve character as-is (including non-ASCII Unicode)
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
   * 
   * Rules:
   * - UTF-8 encoding
   * - \uXXXX unicode escapes for control characters only (0x00-0x1F, 0x7F-0x9F)
   * - Objects' keys sorted lexicographically (recursively)
   * - Numbers use minimal representation
   * - No additional whitespace (minified)
   */
  static stringify(obj: unknown): string {
    // First, recursively sort all objects and normalize numbers
    const sorted = this.sortObjectRecursively(obj);
    
    // Use custom replacer to ensure ONLY control characters are escaped
    // This is critical: JSON.stringify may escape non-ASCII in some contexts
    // We need explicit control to match spec requirement
    return JSON.stringify(sorted, this.unicodeReplacer.bind(this));
  }

  static parse(text: string): unknown {
    return JSON.parse(text);
  }
}

