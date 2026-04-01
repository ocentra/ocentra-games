export const CHUNK_INTEGRITY_VERSION = 1 as const;

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function fallbackHash(bytes: Uint8Array): string {
  let hash = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function computeChunkChecksum(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return fallbackHash(bytes);
  }
  const normalized = Uint8Array.from(bytes);
  const digest = await subtle.digest('SHA-256', normalized.buffer);
  return `sha256:${toHex(new Uint8Array(digest))}`;
}

export async function verifyChunkChecksum(
  bytes: Uint8Array,
  expected: string | undefined
): Promise<boolean> {
  if (!expected) return true;
  const actual = await computeChunkChecksum(bytes);
  return actual === expected;
}

export function parseChecksums(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const checksums = raw.filter((v): v is string => typeof v === 'string');
  return checksums.length === raw.length ? checksums : null;
}
