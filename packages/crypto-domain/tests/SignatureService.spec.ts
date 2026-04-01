import { describe, it, expect } from 'vitest';
import { KeyManager } from '../src/services/KeyManager';
import { SignatureService } from '../src/services/SignatureService';

describe('crypto-domain SignatureService', () => {
  it('signMatchRecord then verifySignature: round-trip succeeds', async () => {
    const pair = await KeyManager.generateKeyPair();
    const payload = new TextEncoder().encode('canonical match data');
    const record = await SignatureService.signMatchRecord(payload, pair.privateKey);
    expect(record.signature).toMatch(/^[0-9a-f]+$/);
    expect(record.publicKey).toMatch(/^[0-9a-f]+$/);
    expect(record.algorithm).toBe('Ed25519');
    expect(record.timestamp).toBeGreaterThan(0);
    const verified = await SignatureService.verifySignature(payload, record.signature, record.publicKey);
    expect(verified).toBe(true);
  });

  it('verifySignature: rejects tampered payload', async () => {
    const pair = await KeyManager.generateKeyPair();
    const payload = new TextEncoder().encode('original');
    const record = await SignatureService.signMatchRecord(payload, pair.privateKey);
    const tampered = new TextEncoder().encode('tampered');
    const verified = await SignatureService.verifySignature(tampered, record.signature, record.publicKey);
    expect(verified).toBe(false);
  });

  it('verifySignature: rejects wrong public key', async () => {
    const pair1 = await KeyManager.generateKeyPair();
    const pair2 = await KeyManager.generateKeyPair();
    const payload = new TextEncoder().encode('data');
    const record = await SignatureService.signMatchRecord(payload, pair1.privateKey);
    const wrongPublicKey = await KeyManager.exportPublicKey(pair2.publicKey);
    const verified = await SignatureService.verifySignature(payload, record.signature, wrongPublicKey);
    expect(verified).toBe(false);
  });

  it('verifySignature: rejects invalid signature hex', async () => {
    const pair = await KeyManager.generateKeyPair();
    const publicKey = await KeyManager.exportPublicKey(pair.publicKey);
    const payload = new TextEncoder().encode('data');
    const verified = await SignatureService.verifySignature(payload, 'invalid-hex', publicKey);
    expect(verified).toBe(false);
  });
});
