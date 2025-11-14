export class HashService {
  static async hashMatchRecord(canonicalBytes: Uint8Array): Promise<string> {
    // Cast to BufferSource for compatibility with Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', canonicalBytes as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  static async hash(data: Uint8Array | string): Promise<string> {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    return this.hashMatchRecord(bytes);
  }
}

