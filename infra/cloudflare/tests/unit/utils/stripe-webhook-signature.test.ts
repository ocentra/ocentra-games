import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, afterEach, vi } from 'vitest';
import { createStripeSignatureHeader, verifyStripeSignatureHeader } from '@/utils/stripe-webhook-signature';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

const TEST_SECRET = 'whsec_test_secret_value';
const TEST_PAYLOAD = JSON.stringify({ id: 'evt_test', type: 'payment_intent.succeeded' });

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('verifyStripeSignatureHeader: accepts valid signature at spring DST boundary when epoch delta is in tolerance'), async () => {
    const boundaryTimestampSeconds = Math.floor(new Date('2025-03-09T07:00:00Z').getTime() / 1000);
    const header = await createStripeSignatureHeader(TEST_PAYLOAD, TEST_SECRET, boundaryTimestampSeconds);
    vi.spyOn(Date, 'now').mockReturnValue((boundaryTimestampSeconds + 120) * 1000);

    const verified = await verifyStripeSignatureHeader(TEST_PAYLOAD, header, TEST_SECRET, 300);
    expect(verified).toBe(true);
  });

  it(testName('verifyStripeSignatureHeader: accepts valid signature at fall DST boundary when epoch delta is in tolerance'), async () => {
    const boundaryTimestampSeconds = Math.floor(new Date('2025-11-02T06:00:00Z').getTime() / 1000);
    const header = await createStripeSignatureHeader(TEST_PAYLOAD, TEST_SECRET, boundaryTimestampSeconds);
    vi.spyOn(Date, 'now').mockReturnValue((boundaryTimestampSeconds + 240) * 1000);

    const verified = await verifyStripeSignatureHeader(TEST_PAYLOAD, header, TEST_SECRET, 300);
    expect(verified).toBe(true);
  });

  it(testName('verifyStripeSignatureHeader: rejects when outside tolerance window'), async () => {
    const issuedAtSeconds = Math.floor(new Date('2025-03-09T07:00:00Z').getTime() / 1000);
    const header = await createStripeSignatureHeader(TEST_PAYLOAD, TEST_SECRET, issuedAtSeconds);
    vi.spyOn(Date, 'now').mockReturnValue((issuedAtSeconds + 301) * 1000);

    const verified = await verifyStripeSignatureHeader(TEST_PAYLOAD, header, TEST_SECRET, 300);
    expect(verified).toBe(false);
  });

  it(testName('verifyStripeSignatureHeader: accepts when any v1 signature candidate matches'), async () => {
    const issuedAtSeconds = Math.floor(new Date('2025-04-01T00:00:00Z').getTime() / 1000);
    const goodHeader = await createStripeSignatureHeader(TEST_PAYLOAD, TEST_SECRET, issuedAtSeconds);
    const headerWithExtraCandidate = goodHeader.replace('v1=', 'v1=deadbeef,v1=');
    vi.spyOn(Date, 'now').mockReturnValue((issuedAtSeconds + 60) * 1000);

    const verified = await verifyStripeSignatureHeader(TEST_PAYLOAD, headerWithExtraCandidate, TEST_SECRET, 300);
    expect(verified).toBe(true);
  });
});
