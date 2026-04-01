import { HashPrefix } from '@/constants/crypto';
import { HashAlgorithm } from '@/constants/crypto';

export function formatHashHex(hex: string, prefix: string = HashPrefix.Sha256): string {
  return `${prefix}${hex}`;
}

export async function computeSha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  return computeSha256(data, false);
}

export async function computeSha256(data: ArrayBuffer | Uint8Array | string, includePrefix: boolean = true): Promise<string> {
  let dataBuffer: BufferSource;
  if (typeof data === 'string') {
    dataBuffer = new TextEncoder().encode(data);
  } else if (data instanceof Uint8Array) {
    dataBuffer = data as BufferSource;
  } else {
    dataBuffer = data;
  }
  
  const hashBuffer = await crypto.subtle.digest(HashAlgorithm.Sha256, dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return includePrefix ? formatHashHex(hashHex) : hashHex;
}
