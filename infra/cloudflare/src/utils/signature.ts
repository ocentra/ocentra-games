import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { CanonicalJSON } from '@ocentra/endpoint-domain/utils/canonical';
import { CryptoAlgorithm, KeyFormat, KeyUsage } from '@/constants/crypto';

const log = Logger.instance;
log.register(import.meta.url);


const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logDebug(message, stackTrace, data, enabled);
};

export function hexToBytes(hex: string): Uint8Array {
  if (!hex || typeof hex !== 'string') {
    throw new Error('Hex string must be a non-empty string');
  }
  if (hex.length % 2 !== 0) {
    throw new Error(`Hex string must have even length, got length ${hex.length}`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byteValue = parseInt(hex.substring(i, i + 2), 16);
    if (isNaN(byteValue)) {
      throw new Error(`Invalid hex character at position ${i}: "${hex.substring(i, i + 2)}"`);
    }
    bytes[i / 2] = byteValue;
  }
  return bytes;
}

export async function verifySignature(
  body: string,
  signature: string,
  coordinatorPublicKey: string
): Promise<boolean> {
  try {

    const data = JSON.parse(body);

    const providedSignature = signature || data.signature;
    if (!providedSignature || !coordinatorPublicKey) {
      return false;
    }

    const dataWithoutSig = { ...data };
    delete dataWithoutSig.signature;

    const canonicalData = CanonicalJSON.stringify(dataWithoutSig);
    const canonicalBytes = new TextEncoder().encode(canonicalData);

    const signatureBytes = hexToBytes(providedSignature);

    const publicKeyBytes = hexToBytes(coordinatorPublicKey);

    const publicKeyBuffer = new ArrayBuffer(publicKeyBytes.byteLength)
    new Uint8Array(publicKeyBuffer).set(publicKeyBytes)
    const cryptoKey = await crypto.subtle.importKey(
      KeyFormat.Raw,
      publicKeyBuffer,
      {
        name: CryptoAlgorithm.Ed25519,
      },
      false,
      [KeyUsage.Verify]
    );

    const signatureBuffer = new ArrayBuffer(signatureBytes.byteLength)
    new Uint8Array(signatureBuffer).set(signatureBytes)
    const canonicalBuffer = new ArrayBuffer(canonicalBytes.byteLength)
    new Uint8Array(canonicalBuffer).set(canonicalBytes)
    const isValid = await crypto.subtle.verify(
      {
        name: CryptoAlgorithm.Ed25519,
      },
      cryptoKey,
      signatureBuffer,
      canonicalBuffer
    );

    return isValid;
  } catch (error) {
    logError('Signature verification error', getStackTrace(), error);
    return false;
  }
}
