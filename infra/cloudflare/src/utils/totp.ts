const TOTP_STEP_SEC = 30;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(encoded: string): Uint8Array {
  const clean = encoded.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

function randomBase32Secret(length: number = 20): string {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 32);
  }
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += BASE32_ALPHABET[bytes[i] % 32];
  }
  return out;
}

export async function generateTotpSecret(): Promise<{ secret: string; qrUrl: string }> {
  const secret = randomBase32Secret(20);
  const qrUrl = `otpauth://totp/Ocentra:user?secret=${secret}&issuer=Ocentra&period=${TOTP_STEP_SEC}`;
  return { secret, qrUrl };
}

export async function verifyTotpCode(secretBase32: string, code: string): Promise<boolean> {
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / TOTP_STEP_SEC);
  for (let drift = -1; drift <= 1; drift++) {
    const c = counter + drift;
    const expected = await hotp(secret, c);
    const codeNum = parseInt(code, 10);
    if (!isNaN(codeNum) && expected === codeNum) return true;
  }
  return false;
}

async function hotp(secret: Uint8Array, counter: number): Promise<number> {
  const data = new ArrayBuffer(8);
  new DataView(data).setUint32(4, counter, false);
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  const arr = new Uint8Array(sig);
  const offset = arr[arr.length - 1] & 0x0f;
  const bin = ((arr[offset] & 0x7f) << 24) | (arr[offset + 1] << 16) | (arr[offset + 2] << 8) | arr[offset + 3];
  return bin % 1000000;
}

export async function getCurrentTotpCode(secretBase32: string): Promise<string> {
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / TOTP_STEP_SEC);
  const code = await hotp(secret, counter);
  return code.toString().padStart(6, '0');
}
