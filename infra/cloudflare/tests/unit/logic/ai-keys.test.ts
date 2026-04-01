import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import {
  encryptKey,
  decryptKey,
  importMasterKey,
  type EncryptedKey,
} from '@/logic/ai-keys';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

const TestMasterKeyB64 = btoa(String.fromCharCode(...new Uint8Array(32).fill(97)));

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('encryptKey/decryptKey: roundtrip preserves plaintext'), async () => {
    const masterKey = await importMasterKey(TestMasterKeyB64);
    const plaintext = 'sk-test-secret-key-12345';
    const encrypted = await encryptKey(plaintext, masterKey);
    const decrypted = await decryptKey(encrypted, masterKey);
    expect(decrypted).toBe(plaintext);
  });

  it(testName('encryptKey: produces unique IVs for same plaintext'), async () => {
    const masterKey = await importMasterKey(TestMasterKeyB64);
    const plaintext = 'sk-same-plaintext';
    const e1 = await encryptKey(plaintext, masterKey);
    const e2 = await encryptKey(plaintext, masterKey);
    expect(e1.iv).not.toEqual(e2.iv);
    const d1 = await decryptKey(e1, masterKey);
    const d2 = await decryptKey(e2, masterKey);
    expect(d1).toBe(plaintext);
    expect(d2).toBe(plaintext);
  });

  it(testName('decryptKey: throws when using wrong master key'), async () => {
    const masterKey1 = await importMasterKey(TestMasterKeyB64);
    const wrongKeyB64 = btoa(String.fromCharCode(...new Uint8Array(32).fill(98)));
    const masterKey2 = await importMasterKey(wrongKeyB64);
    const plaintext = 'sk-secret';
    const encrypted = await encryptKey(plaintext, masterKey1);
    await expect(decryptKey(encrypted, masterKey2)).rejects.toThrow();
  });

  it(testName('decryptKey: throws when ciphertext is tampered'), async () => {
    const masterKey = await importMasterKey(TestMasterKeyB64);
    const encrypted = await encryptKey('sk-secret', masterKey);
    const bytes = new Uint8Array(encrypted.ciphertext);
    bytes[0] ^= 0xff;
    const tampered: EncryptedKey = {
      ciphertext: bytes.buffer,
      iv: encrypted.iv,
    };
    await expect(decryptKey(tampered, masterKey)).rejects.toThrow();
  });

  it(testName('importMasterKey: produces key usable for encrypt/decrypt'), async () => {
    const masterKey = await importMasterKey(TestMasterKeyB64);
    const plaintext = 'my-api-key';
    const encrypted = await encryptKey(plaintext, masterKey);
    const decrypted = await decryptKey(encrypted, masterKey);
    expect(decrypted).toBe(plaintext);
  });
});
