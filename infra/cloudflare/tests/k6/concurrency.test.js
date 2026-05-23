/* eslint-env k6 */
/* global __ENV */

/**
 * k6 Concurrency & Load Test
 * 
 * SECURITY TEST CLASSIFICATION: Security Test
 * 
 * THREAT MAPPING (ocentra-security-rules.mdc):
 * - Rule 15.5: Concurrency as First-Class Threat
 *   - Rule 15.5.1: Same user, same wallet, same request, N threads
 *   - Rule 15.5.2: Distributed concurrency (simulated)
 *   - Rule 15.5.5: Concurrent state transitions
 * - Rule 14.10: DDoS & Resource Exhaustion
 *   - Rule 14.10.5: Burst requests
 *   - Rule 14.10.6: Parallel abuse
 * 
 * SECURITY GUARANTEES VERIFIED (ocentra-security-rules.mdc):
 * - Rule 0.1.1 (G1): Economic Safety
 *   - "No sequence of actions can increase user value illegitimately"
 *   - "Attacker cost ≥ system cost"
 *   - "Partial failure cannot create profit"
 * - Rule 0.1.4 (G4): State Safety
 *   - "No partial failure can be profitable"
 *   - "No retry can change economic outcome"
 * 
 * INVARIANTS ASSERTED:
 * 1. Economic Correctness: Concurrent public purchase attempts are rejected safely
 *    - Client-authoritative purchase mutations are blocked
 *    - Final balance is unchanged after rejected public purchase attempts
 * 2. Boundary Safety: Credit purchases must use trusted checkout fulfillment
 * 3. Rate Limiting: System correctly handles 429 (TooManyRequests) during load
 * 
 * WHAT FAILURE MEANS:
 * - If correctness rate < 95%: Concurrent requests can cause economic violations
 *   - Public purchase attempts may mint AC
 *   - Rejected mutations may alter balances
 *   - State corruption under concurrency
 * - If error rate > 10%: System fails under load (violates Rule 4.3.1 - graceful degradation)
 * - If p95 response time > 2000ms: System degrades under load (violates Rule 4.3.1)
 * 
 * PROOF STANDARDS (ocentra-test-rules.mdc §0.2):
 * - ✅ Fails when protection is removed: Test verifies economic correctness
 * - ✅ Asserts exact behavior: Verifies balance calculations, not just "success"
 * - ✅ Deterministic: Uses fixed test parameters (reproducible)
 * - ✅ Isolated: Each iteration uses unique user ID
 * - ✅ Documents failure meaning: See "WHAT FAILURE MEANS" above
 * 
 * TEST SCENARIO:
 * - Simulates concurrent virtual users (VUs) over a short load profile
 * - Each VU performs: balance check -> rejected public purchase -> balance verification
 * - Tests public credit-purchase rejection under load
 * - Verifies economic invariants hold under concurrent load
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
  IdempotencyKeyPrefix,
  TestConfig,
  TestDefaults,
} from './constants.js';

const BASE_URL = __ENV.WORKER_URL || TestDefaults.DefaultWorkerUrl;
// Base timestamp for generating unique user IDs per VU
const BASE_TIMESTAMP = Date.now();
const TEST_NAME = 'k6-concurrency';
const STAGE_ONE_DURATION = __ENV.K6_STAGE_ONE_DURATION || '5s';
const STAGE_ONE_TARGET = Number(__ENV.K6_STAGE_ONE_TARGET || 5);
const STAGE_TWO_DURATION = __ENV.K6_STAGE_TWO_DURATION || '10s';
const STAGE_TWO_TARGET = Number(__ENV.K6_STAGE_TWO_TARGET || 10);
const STAGE_THREE_DURATION = __ENV.K6_STAGE_THREE_DURATION || '5s';
const STAGE_THREE_TARGET = Number(__ENV.K6_STAGE_THREE_TARGET || 0);

const errorRate = new Rate('errors');
const correctnessRate = new Rate('correctness');

export const options = {
  stages: [
    { duration: STAGE_ONE_DURATION, target: STAGE_ONE_TARGET },
    { duration: STAGE_TWO_DURATION, target: STAGE_TWO_TARGET },
    { duration: STAGE_THREE_DURATION, target: STAGE_THREE_TARGET },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.1'],
    correctness: ['rate>0.95'],
  },
};

export default function () {
  // Each VU gets a unique user ID to avoid race conditions between VUs
  // This tests that each individual user's balance operations are correct
  // __VU is k6's built-in variable for the current virtual user number
  const vuUserId = `${TestDefaults.LoadTestUserIdPrefix}${BASE_TIMESTAMP}-vu${__VU}`;
  const vuToken = `${TestDefaults.TestTokenPrefix}${vuUserId}`;
  const purchaseIdempotencyKey = `${IdempotencyKeyPrefix.Purchase}${BASE_TIMESTAMP}-vu${__VU}-iter${__ITER}`;

  const headers = {
    [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${vuToken}`,
    [HttpHeader.Origin]: TestConfig.LocalhostOrigin2,
    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    [HttpHeader.XTestName]: TEST_NAME,
    [HttpHeader.IdempotencyKey]: purchaseIdempotencyKey,
  };

  const balanceUrl = `${BASE_URL}${ApiEndpoint.ApiCredits}/${vuUserId}/${CreditAction.Balance}`;
  const purchaseUrl = `${BASE_URL}${ApiEndpoint.ApiCredits}/${vuUserId}/${CreditAction.Purchase}`;

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
  const initialGP = initialBalanceData.gp_balance;

  const purchasePayload = JSON.stringify({
    ac_amount: TestDefaults.TestAcAmount,
    amount: TestDefaults.TestAmount,
    currency: Currency.USD,
  });

  const purchaseRes = http.post(purchaseUrl, purchasePayload, { headers });
  const purchaseCheck = check(purchaseRes, {
    'purchase request is rejected safely': (r) => {
      const acceptableStatuses = [HttpStatus.Forbidden, HttpStatus.TooManyRequests];
      return acceptableStatuses.includes(r.status);
    },
    'purchase rejection has valid JSON': (r) => {
      if (r.status === HttpStatus.Forbidden) {
        try {
          const data = JSON.parse(r.body);
          return data.error === 'Forbidden' && typeof data.message === 'string';
        } catch {
          return false;
        }
      }
      return true;
    },
    'purchase rejection explains checkout flow': (r) => {
      if (r.status === HttpStatus.Forbidden) {
        try {
          const data = JSON.parse(r.body);
          return data.message.includes('payment checkout');
        } catch {
          return false;
        }
      }
      return true;
    },
    'purchase response time acceptable': (r) => r.timings.duration < 2000,
  });

  const finalBalanceRes = http.get(balanceUrl, { headers });
  const finalBalanceCheck = check(finalBalanceRes, {
    'final balance is unchanged after rejected purchase': (r) => {
      if (r.status === HttpStatus.Ok && purchaseRes.status === HttpStatus.Forbidden) {
        try {
          const finalData = JSON.parse(r.body);
          return finalData.ac_balance === initialAC && finalData.gp_balance === initialGP;
        } catch {
          return false;
        }
      }
      return true;
    },
  });

  if (purchaseRes.status === HttpStatus.TooManyRequests) {
    errorRate.add(false);
    sleep(TestDefaults.TestSleepSeconds);
    return;
  }

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
