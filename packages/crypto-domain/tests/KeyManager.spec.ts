import { describe, it, expect } from 'vitest';
import { KeyManager } from '../src/services/KeyManager';
import { SignatureService } from '../src/services/SignatureService';

describe('crypto-domain KeyManager', () => {
  it('generateKeyPair: returns key pair with sign and verify usages', async () => {
    const pair = await KeyManager.generateKeyPair();
    expect(pair.privateKey).toBeDefined();
    expect(pair.publicKey).toBeDefined();
  });

  it('importPrivateKey/exportPrivateKey: round-trip preserves key', async () => {
    const pair = await KeyManager.generateKeyPair();
    const exported = await KeyManager.exportPrivateKey(pair.privateKey);
    expect(exported).toMatch(/^[0-9a-f]+$/);
    const imported = await KeyManager.importPrivateKey(exported);
    const reExported = await KeyManager.exportPrivateKey(imported);
    expect(reExported).toBe(exported);
  });

  it('importPublicKey/exportPublicKey: round-trip preserves key', async () => {
    const pair = await KeyManager.generateKeyPair();
    const payload = new TextEncoder().encode('derive');
    const sigRecord = await SignatureService.signMatchRecord(payload, pair.privateKey);
    const imported = await KeyManager.importPublicKey(sigRecord.publicKey);
    const reExported = await KeyManager.exportPublicKey(imported);
    expect(reExported).toBe(sigRecord.publicKey);
  });

  it('importPrivateKey: rejects invalid hex', async () => {
    await expect(KeyManager.importPrivateKey('zz')).rejects.toThrow();
  });

  it('importPublicKey: rejects invalid hex', async () => {
    await expect(KeyManager.importPublicKey('zz')).rejects.toThrow();
  });
});
