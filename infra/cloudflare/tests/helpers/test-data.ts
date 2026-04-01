import { PathValidator } from '@ocentra/endpoint-domain/validators/path-validators';

export interface TestDataGenerator {
  generateValid(): string;
  generateInvalidUnicode(): string[];
  generateInvalidNormalization(): string[];
  generateInvalidDoubleEncoded(): string[];
  generateInvalidWhitespace(): string[];
  generateInvalidBoundary(): string[];
}

export class GuidTestData implements TestDataGenerator {
  generateValid(): string {
    return 'aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee';
  }

  generateInvalidUnicode(): string[] {
    const candidates = [
      `aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee\u200B`,
      `aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee\u200D`,
      `\u200Baaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee`,
      `aaaaaaaa-bbbb-\u20604ccc-9eee-eeeeeeeeeeee`,
      `aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee\uFEFF`,
    ];

    // Verify all candidates actually contain invisible chars
    // If this fails, test data is broken, not production code
    const validated = candidates.filter(c => PathValidator.hasInvisibleChars(c));
    if (validated.length !== candidates.length) {
      throw new Error(`Test data validation failed: ${candidates.length - validated.length} candidates don't contain invisible chars`);
    }

    return validated;
  }

  generateInvalidNormalization(): string[] {
    const candidates = [
      'aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeee\u0065\u0301',
      'aaaaa\u0065\u0301aa-bbbb-4ccc-9eee-eeeeeeeeeeee',
    ];

    // Verify all candidates contain normalization issues
    const validated = candidates.filter(c => PathValidator.hasUnicodeNormalizationIssue(c));
    if (validated.length !== candidates.length) {
      throw new Error(`Test data validation failed: ${candidates.length - validated.length} candidates don't have normalization issues`);
    }

    return validated;
  }

  generateInvalidDoubleEncoded(): string[] {
    const valid = this.generateValid();
    const validWithSlash = `${valid}/evil`;
    const candidates = [
      encodeURIComponent(encodeURIComponent(validWithSlash)),
      encodeURIComponent(valid) + '%252Fevil',
    ];

    const validated = candidates.filter(c => PathValidator.hasDoubleEncoding(c));
    if (validated.length !== candidates.length) {
      throw new Error(`Test data validation failed: ${candidates.length - validated.length} candidates don't have double-encoding`);
    }

    return validated;
  }

  generateInvalidWhitespace(): string[] {
    const candidates = [
      `aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee\n`,
      `aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee\r`,
      `aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee\t`,
      ` aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee`,
      `aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee `,
    ];

    // Control chars like \n, \r, \t should be caught by control char validator OR whitespace validator
    const validated = candidates.filter(c =>
      PathValidator.hasWhitespaceBoundary(c) || PathValidator.hasControlChars(c)
    );
    if (validated.length !== candidates.length) {
      throw new Error(`Test data validation failed: ${candidates.length - validated.length} candidates don't have whitespace/control issues`);
    }

    return validated;
  }

  generateInvalidBoundary(): string[] {
    return [
      '',
      'a',
      'not-a-valid-guid',
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      'aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee-trailing',
    ];
  }
}

export class HashTestData implements TestDataGenerator {
  generateValid(): string {
    return 'a'.repeat(64);
  }

  generateInvalidUnicode(): string[] {
    const valid = this.generateValid();
    return [
      `${valid}\u200B`,
      `${valid}\u200D`,
      `\u200B${valid}`,
      `${valid.substring(0, 32)}\u2060${valid.substring(32)}`,
    ];
  }

  generateInvalidNormalization(): string[] {
    return [
      'a'.repeat(31) + '\u0065\u0301' + 'a'.repeat(32),
    ];
  }

  generateInvalidDoubleEncoded(): string[] {
    const valid = this.generateValid();
    return [
      encodeURIComponent(encodeURIComponent(valid)),
    ];
  }

  generateInvalidWhitespace(): string[] {
    const valid = this.generateValid();
    return [
      `${valid}\n`,
      `${valid}\r`,
      ` ${valid}`,
      `${valid} `,
      `\t${valid}`,
    ];
  }

  generateInvalidBoundary(): string[] {
    return [
      '',
      'a',
      'a'.repeat(63),
      'a'.repeat(65),
      'g'.repeat(64),
      'A'.repeat(64),
      'not-a-valid-hex',
    ];
  }
}

export class MatchIdTestData implements TestDataGenerator {
  generateValid(): string {
    return 'test-match-123';
  }

  generateInvalidUnicode(): string[] {
    const valid = this.generateValid();
    return [
      `${valid}\u200B`,
      `\u200D${valid}`,
      `${valid.substring(0, 5)}\u2060${valid.substring(5)}`,
    ];
  }

  generateInvalidNormalization(): string[] {
    const valid = this.generateValid();
    return [
      valid.substring(0, 5) + '\u0065\u0301' + valid.substring(5),
    ];
  }

  generateInvalidDoubleEncoded(): string[] {
    const valid = this.generateValid();
    const validWithSlash = `${valid}/evil`;
    return [
      encodeURIComponent(encodeURIComponent(validWithSlash)),
      encodeURIComponent(valid) + '%252Fevil',
    ];
  }

  generateInvalidWhitespace(): string[] {
    const valid = this.generateValid();
    return [
      `${valid}\n`,
      ` ${valid}`,
      `${valid} `,
    ];
  }

  generateInvalidBoundary(): string[] {
    return [
      '',
      '../../etc/passwd',
      'test-match-123/../evil',
      'test-match-123%2Fevil',
    ];
  }
}

export class UserIdTestData implements TestDataGenerator {
  generateValid(): string {
    return 'test-user-123';
  }

  generateInvalidUnicode(): string[] {
    const valid = this.generateValid();
    return MatchIdTestData.prototype.generateInvalidUnicode.call({ generateValid: () => valid });
  }

  generateInvalidNormalization(): string[] {
    const valid = this.generateValid();
    return MatchIdTestData.prototype.generateInvalidNormalization.call({ generateValid: () => valid });
  }

  generateInvalidDoubleEncoded(): string[] {
    const valid = this.generateValid();
    return MatchIdTestData.prototype.generateInvalidDoubleEncoded.call({ generateValid: () => valid });
  }

  generateInvalidWhitespace(): string[] {
    const valid = this.generateValid();
    return MatchIdTestData.prototype.generateInvalidWhitespace.call({ generateValid: () => valid });
  }

  generateInvalidBoundary(): string[] {
    return [
      '',
      '../../../etc/passwd',
      'test-user-123/../admin',
    ];
  }
}

export class PathTestData implements TestDataGenerator {
  generateValid(): string {
    return 'test/path.asset';
  }

  generateInvalidUnicode(): string[] {
    const valid = this.generateValid();
    return [
      `${valid}\u200B`,
      `\u200D${valid}`,
    ];
  }

  generateInvalidNormalization(): string[] {
    const valid = this.generateValid();
    return [
      valid.substring(0, 2) + '\u0065\u0301' + valid.substring(2),
    ];
  }

  generateInvalidDoubleEncoded(): string[] {
    const valid = this.generateValid();
    return [
      encodeURIComponent(encodeURIComponent(valid)),
      `${valid}%252F../evil`,
    ];
  }

  generateInvalidWhitespace(): string[] {
    const valid = this.generateValid();
    return [
      `${valid}\n`,
      ` ${valid}`,
      `${valid} `,
    ];
  }

  generateInvalidBoundary(): string[] {
    return [
      '',
      '../../../etc/passwd',
      '../test.asset',
      'test/../../evil.asset',
      'test%2F..%2Fevil.asset',
    ];
  }
}

export class TokenTestData implements TestDataGenerator {
  generateValid(): string {
    return 'Bearer test-token-123';
  }

  generateInvalidUnicode(): string[] {
    const valid = this.generateValid();
    return [
      `${valid}\u200B`,
      `\u200D${valid}`,
    ];
  }

  generateInvalidNormalization(): string[] {
    return [];
  }

  generateInvalidDoubleEncoded(): string[] {
    const valid = this.generateValid();
    return [
      encodeURIComponent(encodeURIComponent(valid)),
    ];
  }

  generateInvalidWhitespace(): string[] {
    const valid = this.generateValid();
    return [
      `${valid}\n`,
      ` ${valid}`,
      `${valid} `,
    ];
  }

  generateInvalidBoundary(): string[] {
    return [
      '',
      'invalid-token',
      'not-bearer token',
    ];
  }
}

export function getTestDataGenerator(paramType: string, paramName?: string): TestDataGenerator {
  if (paramName === 'guid') {
    return new GuidTestData();
  }
  if (paramName === 'hash' || paramName === 'checksum') {
    return new HashTestData();
  }
  if (paramName === 'matchId' || paramName?.includes('match')) {
    return new MatchIdTestData();
  }
  if (paramName === 'userId' || paramName?.includes('user')) {
    return new UserIdTestData();
  }
  if (paramName === 'path') {
    return new PathTestData();
  }
  if (paramName === 'token' || paramType === 'header') {
    return new TokenTestData();
  }
  return new MatchIdTestData();
}
