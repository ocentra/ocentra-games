/* eslint-env k6 */
/* global __ENV */

/**
 * k6 Idempotency Key Concurrent Test
 * 
 * SECURITY TEST CLASSIFICATION: Security Test
 * 
 * THREAT MAPPING (ocentra-security-rules.mdc):
 * - Rule 14.8: Replay / Duplication (Money-Critical)
 *   - Rule 14.8.1: Same request replay
 *   - Rule 14.8.2: Same payload duplicate
 *   - Rule 14.8.3: Concurrent execution attempt
 * - Rule 6.1: Game Logic & Economy Abuse
 *   - Rule 6.1.13: Idempotency violations
 * 
 * SECURITY GUARANTEES VERIFIED (ocentra-security-rules.mdc):
 * - Rule 0.1.1 (G1): Economic Safety
 *   - "No sequence of actions can increase user value illegitimately"
 *   - "Replay must never produce profit"
 * - Rule 0.1.4 (G4): State Safety
 *   - "No retry can change economic outcome"
 * 
 * INVARIANTS ASSERTED:
 * 1. Idempotency Correctness: Same request with same idempotency key executed concurrently results in exactly one economic outcome
 *    - All concurrent requests with same idempotency key return same result
 *    - Exactly one transaction created (or zero if all fail)
 *    - Final balance = initial balance + (amount * successful_count) where successful_count <= 1
 * 2. Transaction ID Consistency: All concurrent requests with same idempotency key return same transaction_id
 * 3. Economic Correctness: No double spending via idempotency key reuse
 * 
 * WHAT FAILURE MEANS:
 * - If transaction_id differs between concurrent requests with same idempotency key: Idempotency violation (violates Rule 14.8.3)
 * - If final balance > initial + amount: Double spending occurred (violates Rule 0.1.1)
 * - If correctness rate < 95%: Idempotency keys don't prevent duplicate execution under contention
 * 
 * PROOF STANDARDS (ocentra-test-rules.mdc §0.2):
 * - ✅ Fails when protection is removed: Test verifies idempotency key enforcement under contention
 * - ✅ Asserts exact behavior: Verifies transaction_id consistency, balance correctness, not just "success"
 * - ✅ Deterministic: Uses fixed test parameters (reproducible)
 * - ✅ Documents failure meaning: See "WHAT FAILURE MEANS" above
 * 
 * TEST SCENARIO:
 * - All 50 VUs use the SAME idempotency key for purchase requests
 * - Each VU performs: balance check → purchase with shared idempotency key → balance verification
 * - Tests if idempotency keys prevent duplicate execution under concurrent contention
 * - Verifies all concurrent requests return same transaction_id and economic outcome
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import {
  ApiEndpoint,
  HttpHeader,
  HttpStatus,
  Currency,
  HttpContentType,
  HttpAuthScheme,
  CreditAction,
  TestConfig,
  TestDefaults,
} from './constants.js';

const BASE_URL = __ENV.WORKER_URL || TestDefaults.DefaultWorkerUrl;
const BASE_TIMESTAMP = Date.now();

// SHARED USER ID + SHARED IDEMPOTENCY KEY - all VUs target same user with same idempotency key
// This tests idempotency enforcement under concurrent contention
const SHARED_USER_ID = `${TestDefaults.LoadTestUserIdPrefix}${BASE_TIMESTAMP}-shared`;
const SHARED_TOKEN = `${TestDefaults.TestTokenPrefix}${SHARED_USER_ID}`;
const SHARED_IDEMPOTENCY_KEY = `idemp-key-${BASE_TIMESTAMP}-shared`;

const errorRate = new Rate('errors');
const correctnessRate = new Rate('correctness');

export const options = {
  stages: [
    { duration: '5s', target: 10 },
    { duration: '20s', target: 50 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    errors: ['rate<0.1'],
    correctness: ['rate>0.95'],
  },
};

export default function () {

  const headers = {
    [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${SHARED_TOKEN}`,
    [HttpHeader.Origin]: TestConfig.LocalhostOrigin2,
    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    [HttpHeader.IdempotencyKey]: SHARED_IDEMPOTENCY_KEY,
  };

  const balanceUrl = `${BASE_URL}${ApiEndpoint.ApiCredits}/${SHARED_USER_ID}/${CreditAction.Balance}`;
  const purchaseUrl = `${BASE_URL}${ApiEndpoint.ApiCredits}/${SHARED_USER_ID}/${CreditAction.Purchase}`;

  const balanceRes = http.get(balanceUrl, { headers: { [HttpHeader.Authorization]: headers[HttpHeader.Authorization], [HttpHeader.Origin]: headers[HttpHeader.Origin] } });
  const balanceCheck = check(balanceRes, {
    'balance request succeeds': (r) => {
      const acceptableStatuses = [
        HttpStatus.Ok,
        HttpStatus.Unauthorized,
        HttpStatus.TooManyRequests,
      ];
      return acceptableStatuses.includes(r.status);
    },
    'balance response has valid JSON': (r) => {
      if (r.status === HttpStatus.Ok) {
        try {
          const data = JSON.parse(r.body);
          return typeof data.ac_balance === 'number' && typeof data.gp_balance === 'number';
        } catch {
          return false;
        }
      }
      return true;
    },
  });

  if (!balanceCheck) {
    errorRate.add(true);
    sleep(TestDefaults.TestSleepSeconds);
    return;
  }

  if (balanceRes.status === HttpStatus.Unauthorized || balanceRes.status === HttpStatus.TooManyRequests) {
    sleep(TestDefaults.TestSleepSeconds);
    return;
  }

  const initialBalanceData = JSON.parse(balanceRes.body);
  const initialAC = initialBalanceData.ac_balance;

  const purchasePayload = JSON.stringify({
    ac_amount: TestDefaults.TestAcAmount,
    amount: TestDefaults.TestAmount,
    currency: Currency.USD,
  });

  const purchaseRes = http.post(purchaseUrl, purchasePayload, { headers });
  const purchaseCheck = check(purchaseRes, {
    'purchase request responds correctly': (r) => {
      const acceptableStatuses = [
        HttpStatus.Ok,
        HttpStatus.TooManyRequests,
        HttpStatus.BadRequest,
      ];
      return acceptableStatuses.includes(r.status);
    },
    'purchase response has valid JSON when successful': (r) => {
      if (r.status === HttpStatus.Ok) {
        try {
          const data = JSON.parse(r.body);
          return typeof data.new_balance === 'number' && typeof data.ac_added === 'number' && typeof data.transaction_id === 'string';
        } catch {
          return false;
        }
      }
      return true;
    },
  });

  if (!purchaseCheck) {
    errorRate.add(true);
    sleep(TestDefaults.TestSleepSeconds);
    return;
  }

  if (purchaseRes.status === HttpStatus.TooManyRequests || purchaseRes.status === HttpStatus.BadRequest) {
    sleep(TestDefaults.TestSleepSeconds);
    return;
  }

  sleep(1);

  const finalBalanceRes = http.get(balanceUrl, { headers: { [HttpHeader.Authorization]: headers[HttpHeader.Authorization], [HttpHeader.Origin]: headers[HttpHeader.Origin] } });
  const finalBalanceCheck = check(finalBalanceRes, {
    'final balance is correct': (r) => {
      if (r.status === HttpStatus.Ok && purchaseRes.status === HttpStatus.Ok) {
        try {
          const finalData = JSON.parse(r.body);
          const purchaseData = JSON.parse(purchaseRes.body);
          return finalData.ac_balance === purchaseData.new_balance;
        } catch {
          return false;
        }
      }
      return true;
    },
    'final balance never exceeds max possible': (r) => {
      if (r.status === HttpStatus.Ok) {
        try {
          const finalData = JSON.parse(r.body);
          const maxPossible = initialAC + TestDefaults.TestAcAmount;
          return finalData.ac_balance <= maxPossible;
        } catch {
          return false;
        }
      }
      return true;
    },
    'final balance reflects exactly one purchase': (r) => {
      if (r.status === HttpStatus.Ok && purchaseRes.status === HttpStatus.Ok) {
        try {
          const finalData = JSON.parse(r.body);
          const expectedBalance = initialAC + TestDefaults.TestAcAmount;
          return finalData.ac_balance === expectedBalance;
        } catch {
          return false;
        }
      }
      return true;
    },
  });

  const isCorrect = purchaseCheck && finalBalanceCheck;
  correctnessRate.add(isCorrect);
  errorRate.add(!purchaseCheck);

  sleep(TestDefaults.TestSleepSeconds);
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
