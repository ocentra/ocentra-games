export interface EncryptedKey {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
}

export async function encryptKey(
  plaintext: string,
  masterKey: CryptoKey
): Promise<EncryptedKey> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    encoded
  );
  return { ciphertext, iv };
}

export async function decryptKey(
  encrypted: EncryptedKey,
  masterKey: CryptoKey
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: encrypted.iv },
    masterKey,
    encrypted.ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

export async function importMasterKey(rawKey: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(rawKey), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}
