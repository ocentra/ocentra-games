export function createDraftSessionId(scope: string): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return `${scope}-${cryptoApi.randomUUID()}`;
  }
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    const token = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
    return `${scope}-${token}`;
  }
  throw new Error('Secure random source is unavailable');
}
