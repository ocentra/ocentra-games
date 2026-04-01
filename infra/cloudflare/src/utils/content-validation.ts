import JSON5 from 'json5';
import { computeSha256 } from '@/utils/crypto-utils';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import {
  isValidGuid,
  isValidHash,
  normalizeGuid,
  normalizeHash,
} from '@ocentra/endpoint-domain/utils/content-validation';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_CONTENT_VALIDATION_WARNINGS = false;

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

export interface ContentValidationResult {
  isValid: boolean;
  guid?: string;
  checksum: string;
  error?: string;
}

export interface AssetMetadata {
  system?: {
    guid?: string;
    assetType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export async function computeContentChecksum(content: ArrayBuffer | Uint8Array | string): Promise<string> {
  return await computeSha256(content, false);
}

export async function extractGuidFromAsset(content: string): Promise<string | null> {
  try {
    const asset = JSON5.parse(content) as AssetMetadata;
    const guid = asset.system?.guid;
    if (!guid || typeof guid !== 'string') return null;
    const normalized = normalizeGuid(guid);
    if (!isValidGuid(normalized)) {
      logWarn(`Invalid GUID format in asset: ${guid}`, getStackTrace(), undefined, LOG_CONTENT_VALIDATION_WARNINGS);
      return null;
    }
    return normalized;
  } catch (error) {
    logWarn('Failed to parse asset for GUID extraction', getStackTrace(), error, LOG_CONTENT_VALIDATION_WARNINGS);
    return null;
  }
}

export async function validateContentIntegrity(
  content: ArrayBuffer | Uint8Array | string,
  expectedHash?: string,
  expectedGuid?: string
): Promise<ContentValidationResult> {
  const checksum = await computeContentChecksum(content);
  if (expectedHash) {
    const normalizedExpected = normalizeHash(expectedHash);
    const normalizedComputed = normalizeHash(checksum);
    if (normalizedExpected !== normalizedComputed) {
      return { isValid: false, checksum, error: `Content checksum mismatch: expected ${normalizedExpected}, computed ${normalizedComputed}` };
    }
  }
  let guid: string | undefined;
  if (expectedGuid) {
    if (!isValidGuid(expectedGuid)) return { isValid: false, checksum, error: `Invalid GUID format: ${expectedGuid}` };
    guid = normalizeGuid(expectedGuid);
  } else if (typeof content === 'string') {
    const extractedGuid = await extractGuidFromAsset(content);
    if (extractedGuid) guid = extractedGuid;
  }
  return { isValid: true, guid, checksum };
}

export async function validateHashMatchesContent(
  content: ArrayBuffer | Uint8Array | string,
  providedHash: string
): Promise<{ valid: boolean; error?: string }> {
  if (!isValidHash(providedHash)) return { valid: false, error: `Invalid hash format: ${providedHash}` };
  const computedChecksum = await computeContentChecksum(content);
  const normalizedProvided = normalizeHash(providedHash);
  const normalizedComputed = normalizeHash(computedChecksum);
  if (normalizedProvided !== normalizedComputed) {
    return { valid: false, error: `Hash mismatch: provided ${normalizedProvided}, computed ${normalizedComputed}` };
  }
  return { valid: true };
}

export async function validateContentTypeMatchesContent(
  content: ArrayBuffer | Uint8Array,
  declaredContentType: string
): Promise<{ valid: boolean; error?: string }> {
  if (!declaredContentType || declaredContentType === HttpContentType.OctetStream) {
    return { valid: false, error: 'Content-Type header is required and cannot be application/octet-stream' };
  }
  const bytes = new Uint8Array(content.slice(0, Math.min(12, content.byteLength)));
  if (declaredContentType.startsWith('image/png')) {
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    const matches = bytes.length >= 8 && pngSignature.every((byte, i) => bytes[i] === byte);
    if (!matches) return { valid: false, error: 'Content-Type mismatch: declared image/png but content is not a valid PNG file' };
  } else if (declaredContentType === HttpContentType.ApplicationJson) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(content);
      JSON5.parse(text);
    } catch {
      return { valid: false, error: 'Content-Type mismatch: declared application/json but content is not valid JSON' };
    }
  }
  return { valid: true };
}

export async function validateGuidFromContent(
  content: ArrayBuffer | Uint8Array | string,
  providedGuid: string
): Promise<{ valid: boolean; extractedGuid?: string; error?: string }> {
  if (!isValidGuid(providedGuid)) return { valid: false, error: `Invalid GUID format: ${providedGuid}` };
  if (typeof content !== 'string') return { valid: true, extractedGuid: normalizeGuid(providedGuid) };
  const extractedGuid = await extractGuidFromAsset(content);
  if (!extractedGuid) {
    logWarn(`Could not extract GUID from content, using provided: ${providedGuid}`, getStackTrace(), undefined, LOG_CONTENT_VALIDATION_WARNINGS);
    return { valid: true, extractedGuid: normalizeGuid(providedGuid) };
  }
  const normalizedProvided = normalizeGuid(providedGuid);
  const normalizedExtracted = normalizeGuid(extractedGuid);
  if (normalizedProvided !== normalizedExtracted) {
    return { valid: false, extractedGuid: normalizedExtracted, error: `GUID mismatch: provided ${normalizedProvided}, extracted from content ${normalizedExtracted}` };
  }
  return { valid: true, extractedGuid: normalizedExtracted };
}
