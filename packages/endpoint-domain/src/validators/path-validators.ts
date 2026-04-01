import { validateMatchId } from '@/constants/match';
import { ParamName } from '@/constants/paths';
import { ErrorMessage } from '@/constants/errors';
import { ValidationPattern } from '@/constants/validation-patterns';

export interface PathValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

export class PathValidator {
  private static readonly INVISIBLE_CHARS = ValidationPattern.InvisibleChars;
  private static readonly PATH_TRAVERSAL = ValidationPattern.PathTraversal;
  private static readonly CONTROL_CHARS = ValidationPattern.ControlChars;
  private static readonly WHITESPACE_BOUNDARY = ValidationPattern.WhitespaceBoundary;
  private static readonly DOUBLE_ENCODING = ValidationPattern.DoubleEncoding;

  static hasInvisibleChars(value: string): boolean {
    return this.INVISIBLE_CHARS.test(value);
  }

  static hasPathTraversal(value: string): boolean {
    return this.PATH_TRAVERSAL.test(value);
  }

  static hasControlChars(value: string): boolean {
    return this.CONTROL_CHARS.test(value);
  }

  static hasWhitespaceBoundary(value: string): boolean {
    return this.WHITESPACE_BOUNDARY.test(value);
  }

  static hasDoubleEncoding(value: string): boolean {
    return this.DOUBLE_ENCODING.test(value);
  }

  static hasUnicodeNormalizationIssue(value: string): boolean {
    const hasCombiningChars = ValidationPattern.UnicodeCombiningChars.test(value);
    if (!hasCombiningChars) {
      return false;
    }
    const normalized = value.normalize('NFC');
    return normalized !== value;
  }

  static validate(id: string, paramName: string): PathValidationResult {
    if (!id || typeof id !== 'string') {
      return {
        valid: false,
        error: `${paramName} ${ErrorMessage.PathParamMustBeNonEmptyString}`
      };
    }

    if (this.hasInvisibleChars(id)) {
      return {
        valid: false,
        error: `${paramName} ${ErrorMessage.PathParamContainsInvalidChars}`
      };
    }

    if (this.hasPathTraversal(id)) {
      return {
        valid: false,
        error: `${paramName} ${ErrorMessage.PathParamContainsPathTraversal}`
      };
    }

    if (this.hasControlChars(id)) {
      return {
        valid: false,
        error: `${paramName} ${ErrorMessage.PathParamContainsControlChars}`
      };
    }

    if (this.hasDoubleEncoding(id)) {
      return {
        valid: false,
        error: `${paramName} ${ErrorMessage.PathParamContainsDoubleEncoding}`
      };
    }

    if (this.hasUnicodeNormalizationIssue(id)) {
      return {
        valid: false,
        error: `${paramName} ${ErrorMessage.PathParamContainsUnicodeNormalization}`
      };
    }

    const trimmed = id.trim();
    if (trimmed !== id) {
      return {
        valid: false,
        error: `${paramName} ${ErrorMessage.PathParamContainsWhitespace}`
      };
    }

    if (paramName === ParamName.MatchId) {
      const matchValidation = validateMatchId(trimmed);
      if (!matchValidation.valid) {
        return {
          valid: false,
          error: matchValidation.error || ErrorMessage.InvalidMatchIdFormatPath
        };
      }
    }

    return {
      valid: true,
      normalized: trimmed
    };
  }

  static normalizePathId(id: string): string {
    if (!id || typeof id !== 'string') {
      return '';
    }
    return id
      .replace(ValidationPattern.InvisibleCharsGlobal, '')
      .replace(ValidationPattern.ControlCharsGlobal, '')
      .trim();
  }
}
