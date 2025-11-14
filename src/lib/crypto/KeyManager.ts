export class KeyManager {
  static async generateKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
      {
        name: 'Ed25519',
      },
      true,
      ['sign', 'verify']
    );
  }

  static async exportPrivateKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('pkcs8', key);
    const exportedArray = Array.from(new Uint8Array(exported));
    return exportedArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  static async exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    const exportedArray = Array.from(new Uint8Array(exported));
    return exportedArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  static async importPrivateKey(hexKey: string): Promise<CryptoKey> {
    const keyBytes = this.hexToBytes(hexKey);
    // Cast to BufferSource for compatibility with Web Crypto API
    return await crypto.subtle.importKey(
      'pkcs8',
      keyBytes as BufferSource,
      {
        name: 'Ed25519',
      },
      true,
      ['sign']
    );
  }

  static async importPublicKey(hexKey: string): Promise<CryptoKey> {
    const keyBytes = this.hexToBytes(hexKey);
    // Cast to BufferSource for compatibility with Web Crypto API
    return await crypto.subtle.importKey(
      'raw',
      keyBytes as BufferSource,
      {
        name: 'Ed25519',
      },
      false,
      ['verify']
    );
  }

  private static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }
}

