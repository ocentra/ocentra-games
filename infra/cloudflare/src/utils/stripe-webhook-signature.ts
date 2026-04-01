import { CryptoAlgorithm, HashAlgorithm, KeyFormat, KeyUsage } from '@/constants/crypto';

const STRIPE_SIGNATURE_TIMESTAMP_KEY = 't';
const STRIPE_SIGNATURE_V1_KEY = 'v1';
const STRIPE_SIGNATURE_PART_SEPARATOR = ',';
const STRIPE_SIGNATURE_KV_SEPARATOR = '=';
const STRIPE_SIGNATURE_PAYLOAD_SEPARATOR = '.';
const DEFAULT_TOLERANCE_SECONDS = 300;

type ParsedStripeSignature = {
  timestamp: number;
  signatures: string[];
};

function toHex(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  const aLen = aLower.length;
  const bLen = bLower.length;
  const maxLen = Math.max(aLen, bLen);
  let result = aLen === bLen ? 0 : 1;
  for (let i = 0; i < maxLen; i++) {
    const aChar = i < aLen ? aLower.charCodeAt(i) : 0;
    const bChar = i < bLen ? bLower.charCodeAt(i) : 0;
    result |= aChar ^ bChar;
  }
  return result === 0;
}

function parseStripeSignatureHeader(headerValue: string): ParsedStripeSignature | null {
  const parts = headerValue
    .split(STRIPE_SIGNATURE_PART_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const separatorIndex = part.indexOf(STRIPE_SIGNATURE_KV_SEPARATOR);
    if (separatorIndex <= 0) continue;

    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (!value) continue;

    if (key === STRIPE_SIGNATURE_TIMESTAMP_KEY) {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) timestamp = parsed;
      continue;
    }

    if (key === STRIPE_SIGNATURE_V1_KEY) signatures.push(value);
  }

  if (timestamp == null || signatures.length === 0) return null;
  return { timestamp, signatures };
}

async function computeStripeV1Signature(
  payload: string,
  secret: string,
  timestampSeconds: number
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    KeyFormat.Raw,
    encoder.encode(secret),
    { name: CryptoAlgorithm.Hmac, hash: HashAlgorithm.Sha256 },
    false,
    [KeyUsage.Sign]
  );
  const signedPayload = `${timestampSeconds}${STRIPE_SIGNATURE_PAYLOAD_SEPARATOR}${payload}`;
  const signature = await crypto.subtle.sign(
    { name: CryptoAlgorithm.Hmac },
    key,
    encoder.encode(signedPayload)
  );
  return toHex(signature);
}

export async function createStripeSignatureHeader(
  payload: string,
  secret: string,
  timestampSeconds: number = Math.floor(Date.now() / 1000)
): Promise<string> {
  const signature = await computeStripeV1Signature(payload, secret, timestampSeconds);
  return `${STRIPE_SIGNATURE_TIMESTAMP_KEY}=${timestampSeconds},${STRIPE_SIGNATURE_V1_KEY}=${signature}`;
}

export async function verifyStripeSignatureHeader(
  payload: string,
  headerValue: string,
  secret: string,
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS
): Promise<boolean> {
  if (!payload || !headerValue || !secret) return false;
  const parsed = parseStripeSignatureHeader(headerValue);
  if (!parsed) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (toleranceSeconds >= 0 && Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) {
    return false;
  }

  const expected = await computeStripeV1Signature(payload, secret, parsed.timestamp);
  for (const candidate of parsed.signatures) {
    if (timingSafeEqualHex(expected, candidate)) return true;
  }
  return false;
}
