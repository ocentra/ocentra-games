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
    } catch {
      return false;
    }
  }

  private static async getPublicKey(privateKey: CryptoKey): Promise<CryptoKey> {
    try {
      const jwk = await crypto.subtle.exportKey('jwk', privateKey);
      if (!jwk.x) {
        throw new Error('Ed25519 private key JWK missing public key component');
      }
      const publicJwk = {
        kty: 'OKP',
        crv: 'Ed25519',
        x: jwk.x,
      };
      return crypto.subtle.importKey(
        'jwk',
        publicJwk,
        { name: 'Ed25519' },
        true,
        ['verify']
      );
    } catch (error) {
      throw new Error(`Failed to extract public key from Ed25519 private key: ${error instanceof Error ? error.message : String(error)}.`);
    }
  }

  private static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }
}
