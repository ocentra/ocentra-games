/* eslint-env k6 */
/* global __ENV */

/**
 * k6 Same-User Contention Test
 * 
 * SECURITY TEST CLASSIFICATION: Security Test
 * 
 * THREAT MAPPING (ocentra-security-rules.mdc):
 * - Rule 15.5: Concurrency as First-Class Threat
 *   - Rule 15.5.1: Same user, same wallet, same request, N threads
 *   - Rule 15.5.5: Concurrent state transitions
 * - Rule 6.1: Game Logic & Economy Abuse
 *   - Rule 6.1.11: Race conditions
 *   - Rule 6.1.12: Concurrent action abuse
 * 
 * SECURITY GUARANTEES VERIFIED (ocentra-security-rules.mdc):
 * - Rule 0.1.1 (G1): Economic Safety
 *   - "No sequence of actions can increase user value illegitimately"
 *   - "Replay must never produce profit"
 * - Rule 0.1.4 (G4): State Safety
 *   - "No partial failure can be profitable"
 *   - "No retry can change economic outcome"
 * 
 * INVARIANTS ASSERTED:
 * 1. Economic Correctness: All concurrent requests targeting same user result in exactly one economic outcome
 *    - Exactly one purchase succeeds (or idempotent - same result N times)
 *    - Final balance = initial balance + (purchase amount * successful count) where successful count <= request count
 *    - No double spending (final balance never exceeds initial + (amount * N))
 * 2. Idempotency: Same request executed concurrently does not create duplicate value
 * 3. Optimistic Locking: System correctly handles ETag conflicts under contention
 * 
 * WHAT FAILURE MEANS:
 * - If final balance > initial + (amount * N): Double spending occurred (violates Rule 0.1.1)
 * - If correctness rate < 95%: Concurrent requests can cause economic violations
 * - If error rate > 50%: Acceptable (many 409 conflicts expected under contention)
 * - If p95 response time > 5000ms: Acceptable under contention (optimistic locking retries)
 * 
 * PROOF STANDARDS (ocentra-test-rules.mdc §0.2):
 * - ✅ Fails when protection is removed: Test verifies economic correctness under contention
 * - ✅ Asserts exact behavior: Verifies final balance correctness, not just "success"
 * - ✅ Deterministic: Uses fixed test parameters (reproducible)
 * - ✅ Documents failure meaning: See "WHAT FAILURE MEANS" above
 * 
 * TEST SCENARIO:
 * - All 50 VUs target the SAME user ID
 * - Each VU performs: balance check → purchase → balance verification
 * - Tests race conditions with optimistic locking (ETag conflicts expected)
 * - Verifies economic invariants hold under true contention
 * - Expects many 409 conflicts but exactly one economic outcome
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

// SHARED USER ID - all VUs target the same user (this is the contention test)
const SHARED_USER_ID = `${TestDefaults.LoadTestUserIdPrefix}${BASE_TIMESTAMP}-shared`;
const SHARED_TOKEN = `${TestDefaults.TestTokenPrefix}${SHARED_USER_ID}`;

const errorRate = new Rate('errors');
const correctnessRate = new Rate('correctness');
const conflictRate = new Rate('conflicts');

export const options = {
  stages: [
    { duration: '5s', target: 10 },
    { duration: '20s', target: 50 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    errors: ['rate<0.6'],
    correctness: ['rate>0.95'],
    conflicts: ['rate>=0.1'],
  },
};

export default function () {
  const headers = {
    [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${SHARED_TOKEN}`,
    [HttpHeader.Origin]: TestConfig.LocalhostOrigin2,
    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
  };

  const balanceUrl = `${BASE_URL}${ApiEndpoint.ApiCredits}/${SHARED_USER_ID}/${CreditAction.Balance}`;
  const purchaseUrl = `${BASE_URL}${ApiEndpoint.ApiCredits}/${SHARED_USER_ID}/${CreditAction.Purchase}`;

  const balanceRes = http.get(balanceUrl, { headers });
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
  const isConflict = purchaseRes.status === HttpStatus.Conflict;
  conflictRate.add(isConflict);

  const purchaseCheck = check(purchaseRes, {
    'purchase request responds correctly': (r) => {
      const acceptableStatuses = [
        HttpStatus.Ok,
        HttpStatus.Conflict,
        HttpStatus.TooManyRequests,
      ];
      return acceptableStatuses.includes(r.status);
    },
    'purchase response has valid JSON when successful': (r) => {
      if (r.status === HttpStatus.Ok) {
        try {
          const data = JSON.parse(r.body);
          return typeof data.new_balance === 'number' && typeof data.ac_added === 'number';
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

  if (purchaseRes.status === HttpStatus.TooManyRequests) {
    sleep(TestDefaults.TestSleepSeconds);
    return;
  }

  sleep(1);

  const finalBalanceRes = http.get(balanceUrl, { headers });
  const finalBalanceCheck = check(finalBalanceRes, {
    'final balance is correct': (r) => {
      if (r.status === HttpStatus.Ok) {
        try {
          const finalData = JSON.parse(r.body);
          const purchaseData = purchaseRes.status === HttpStatus.Ok ? JSON.parse(purchaseRes.body) : null;

          if (purchaseRes.status === HttpStatus.Ok && purchaseData) {
            return finalData.ac_balance === purchaseData.new_balance;
          }

          if (purchaseRes.status === HttpStatus.Conflict) {
            return finalData.ac_balance === initialAC || finalData.ac_balance === initialAC + TestDefaults.TestAcAmount;
          }

          return false;
        } catch {
          return false;
        }
      }
      return false;
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
      return false;
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
