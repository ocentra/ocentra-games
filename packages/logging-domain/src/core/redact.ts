const REDACTED = 'xxx-xxx-xxx';
const MAX_DEPTH = 10;
const MAX_STRING_LENGTH = 1024;
const TRUNCATED_STRING_LENGTH = 256;
const MAX_ARRAY_LENGTH = 100;
const TRUNCATED_ARRAY_LENGTH = 20;

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'setcookie',
  'xauthtoken',
  'token',
  'idtoken',
  'accesstoken',
  'refreshtoken',
  'bearer',
  'apikey',
  'secret',
  'privatekey',
  'xapikey',
  'seed',
  'mnemonic',
  'wallet',
  'signingkey',
  'password',
  'pass',
  'pwd',
  'passphrase',
  'stripe',
  'stripesecret',
  'firebase',
  'firebasetoken',
]);

const BEARER_REGEX = /Bearer\s+\S{1,500}/gi;
const JWT_REGEX = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const SK_LIVE_REGEX = /sk_live_[A-Za-z0-9]{20,}/g;
const SK_TEST_REGEX = /sk_test_[A-Za-z0-9]{20,}/g;
const AIZA_REGEX = /AIza[A-Za-z0-9_-]{20,}/g;
const PEM_REGEX = /-----BEGIN [A-Z ]{1,50}-----[A-Za-z0-9+/=\s\n\r]{1,10000}-----END [A-Z ]{1,50}-----/g;
const BASE64_LONG_REGEX = /[A-Za-z0-9+/]{33,10000}={0,2}/g;
const HEX_64_REGEX = /\b[a-fA-F0-9]{64}\b/g;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_\s]/g, '');
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(normalizeKey(key));
}

function maskPatternsInString(str: string): string {
  let result = str;
  result = result.replace(BEARER_REGEX, REDACTED);
  result = result.replace(JWT_REGEX, REDACTED);
  result = result.replace(SK_LIVE_REGEX, REDACTED);
  result = result.replace(SK_TEST_REGEX, REDACTED);
  result = result.replace(AIZA_REGEX, REDACTED);
  result = result.replace(PEM_REGEX, REDACTED);
  result = result.replace(HEX_64_REGEX, REDACTED);
  result = result.replace(BASE64_LONG_REGEX, (m) => (m.length > 32 ? REDACTED : m));
  return result;
}

export function redactString(str: string): string {
  if (typeof str !== 'string') return str;
  const masked = maskPatternsInString(str);
  if (masked.length > MAX_STRING_LENGTH) {
    return masked.substring(0, TRUNCATED_STRING_LENGTH) + '...[TRUNCATED]';
  }
  return masked;
}

export function redact(obj: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return REDACTED;

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    const masked = maskPatternsInString(obj);
    if (masked.length > MAX_STRING_LENGTH) {
      return masked.substring(0, TRUNCATED_STRING_LENGTH) + '...[TRUNCATED]';
    }
    return masked;
  }

  if (Array.isArray(obj)) {
    if (obj.length > MAX_ARRAY_LENGTH) {
      const truncated = obj.slice(0, TRUNCATED_ARRAY_LENGTH).map((item) => redact(item, depth + 1));
      truncated.push(`...[TRUNCATED ${obj.length - TRUNCATED_ARRAY_LENGTH} more]` as unknown);
      return truncated;
    }
    return obj.map((item) => redact(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveKey(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = redact(value, depth + 1);
      }
    }
    return result;
  }

  return obj;
}
