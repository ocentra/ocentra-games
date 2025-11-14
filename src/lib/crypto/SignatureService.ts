export interface SignatureRecord {
  signature: string;
  publicKey: string;
  algorithm: 'Ed25519';
  timestamp: number;
}

export class SignatureService {
  static async signMatchRecord(
    canonicalBytes: Uint8Array,
    privateKey: CryptoKey
  ): Promise<SignatureRecord> {
    // Cast to BufferSource for compatibility with Web Crypto API
    const signatureBuffer = await crypto.subtle.sign(
      {
        name: 'Ed25519',
      },
      privateKey,
      canonicalBytes as BufferSource
    );

    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signature = signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const publicKeyBuffer = await crypto.subtle.exportKey('raw', await this.getPublicKey(privateKey));
    const publicKeyArray = Array.from(new Uint8Array(publicKeyBuffer));
    const publicKey = publicKeyArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return {
      signature,
      publicKey,
      algorithm: 'Ed25519',
      timestamp: Date.now(),
    };
  }

  static async verifySignature(
    canonicalBytes: Uint8Array,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      const signatureBytes = this.hexToBytes(signature);
      const publicKeyBytes = this.hexToBytes(publicKey);

      // Cast to BufferSource for compatibility with Web Crypto API
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        publicKeyBytes as BufferSource,
        {
          name: 'Ed25519',
        },
        false,
        ['verify']
      );

      return await crypto.subtle.verify(
        {
          name: 'Ed25519',
        },
        cryptoKey,
        signatureBytes as BufferSource,
        canonicalBytes as BufferSource
      );
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Per critique Issue #12: Use raw format for Ed25519 keys (not pkcs8/spki).
   * Ed25519 keys in Web Crypto API use raw format.
   * 
   * For Ed25519, the private key contains the public key:
   * - Raw private key is 64 bytes: [32-byte private seed | 32-byte public key]
   * - We extract the last 32 bytes as the public key
   */
  private static async getPublicKey(privateKey: CryptoKey): Promise<CryptoKey> {
    try {
      // Try to export as raw format (preferred for Ed25519)
      const privateKeyBytes = await crypto.subtle.exportKey('raw', privateKey);
      
      // For Ed25519, raw private key is 64 bytes: [private seed (32) | public key (32)]
      // Extract the public key (last 32 bytes)
      if (privateKeyBytes.byteLength === 64) {
        const publicKeyBytes = privateKeyBytes.slice(32, 64);
        // Cast to BufferSource for compatibility with Web Crypto API
        return crypto.subtle.importKey(
          'raw',
          publicKeyBytes as BufferSource,
          {
            name: 'Ed25519',
          },
          false,
          ['verify']
        );
      }
      
      // Fallback: if key format is different, try pkcs8 (for compatibility)
      // This shouldn't happen for Ed25519, but handle it gracefully
      throw new Error('Ed25519 private key must be 64 bytes in raw format');
    } catch (error) {
      // If raw export fails, the key might be in pkcs8 format
      // For Ed25519, we should always use raw format
      throw new Error(`Failed to extract public key from Ed25519 private key: ${error instanceof Error ? error.message : String(error)}. Ensure private key is in raw format.`);
    }
  }

  /**
   * Per critique Issue #42: Fix deprecated substr() → substring().
   */
  private static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }
}

