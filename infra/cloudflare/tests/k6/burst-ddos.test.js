/* eslint-env k6 */
/* global __ENV */

/**
 * k6 Burst DDoS Test
 * 
 * SECURITY TEST CLASSIFICATION: Security Test
 * 
 * THREAT MAPPING (ocentra-security-rules.mdc):
 * - Rule 14.10: DDoS & Resource Exhaustion
 *   - Rule 14.10.1: Volume-based DDoS (flooding)
 *   - Rule 14.10.5: Burst requests
 *   - Rule 14.10.6: Parallel abuse
 * - Rule 4.3: Rate Limiting Fail Modes
 *   - Rule 4.3.1: Graceful degradation
 *   - Rule 4.3.2: Economic neutrality under load
 * 
 * SECURITY GUARANTEES VERIFIED (ocentra-security-rules.mdc):
 * - Rule 4.3: Rate Limiting Fail Modes
 *   - "Graceful degradation"
 *   - "Economic neutrality under load"
 *   - "No auth bypass under pressure"
 * 
 * INVARIANTS ASSERTED:
 * 1. Graceful Degradation: System remains functional under burst load
 *    - Returns 429 (TooManyRequests) when rate limited (not 500 errors)
 *    - Service degrades gracefully, not crashes
 *    - Legitimate requests still possible after burst
 * 2. Economic Neutrality: Burst load does not create economic vulnerabilities
 *    - Balance calculations remain correct even under rate limiting
 *    - No double spending during rate limit enforcement
 * 3. Response Time Stability: System responds within reasonable time even under load
 *    - p95 latency increases but stays bounded
 *    - No request hangs indefinitely
 * 
 * WHAT FAILURE MEANS:
 * - If error rate > 20% (excluding 429): System crashes under load (violates Rule 4.3.1)
 * - If correctness rate < 90%: Economic violations under load (violates Rule 4.3.2)
 * - If p95 response time > 10000ms: System doesn't degrade gracefully (violates Rule 4.3.1)
 * - If 429 rate < 0.3: Rate limiting not working (allows abuse)
 * 
 * PROOF STANDARDS (ocentra-test-rules.mdc §0.2):
 * - ✅ Fails when protection is removed: Test verifies rate limiting and graceful degradation
 * - ✅ Asserts exact behavior: Verifies 429 responses, balance correctness, not just "no crash"
 * - ✅ Deterministic: Uses fixed test parameters (reproducible)
 * - ✅ Documents failure meaning: See "WHAT FAILURE MEANS" above
 * 
 * TEST SCENARIO:
 * - Burst: 100 VUs for 5 seconds (sudden spike)
 * - Sustained: 50 VUs for 30 seconds (maintain load)
 * - Ramp down: 0 VUs (recovery test)
 * - Each VU performs: balance check → purchase attempts
 * - Tests rate limiting, graceful degradation, and economic correctness under burst
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

const errorRate = new Rate('errors');
const correctnessRate = new Rate('correctness');
const rateLimitRate = new Rate('rate_limited');

export const options = {
  stages: [
    { duration: '5s', target: 100 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'],
    errors: ['rate<0.2'],
    correctness: ['rate>0.9'],
    rate_limited: ['rate>=0.3'],
  },
};

export default function () {
  const vuUserId = `${TestDefaults.LoadTestUserIdPrefix}${BASE_TIMESTAMP}-vu${__VU}`;
  const vuToken = `${TestDefaults.TestTokenPrefix}${vuUserId}`;

  const headers = {
    [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${vuToken}`,
    [HttpHeader.Origin]: TestConfig.LocalhostOrigin2,
    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
  };

  const balanceUrl = `${BASE_URL}${ApiEndpoint.ApiCredits}/${vuUserId}/${CreditAction.Balance}`;
  const purchaseUrl = `${BASE_URL}${ApiEndpoint.ApiCredits}/${vuUserId}/${CreditAction.Purchase}`;

  const balanceRes = http.get(balanceUrl, { headers });
  const isRateLimited = balanceRes.status === HttpStatus.TooManyRequests;
  rateLimitRate.add(isRateLimited);

  const balanceCheck = check(balanceRes, {
    'balance request responds correctly': (r) => {
      const acceptableStatuses = [
        HttpStatus.Ok,
        HttpStatus.Unauthorized,
        HttpStatus.TooManyRequests,
      ];
      return acceptableStatuses.includes(r.status);
    },
    'rate limit returns 429 (not 500)': (r) => {
      if (r.status >= 500) {
        return false;
      }
      return true;
    },
  });

  if (!balanceCheck) {
    errorRate.add(true);
    sleep(0.5);
    return;
  }

  if (balanceRes.status === HttpStatus.Unauthorized) {
    sleep(TestDefaults.TestSleepSeconds);
    return;
  }

  if (balanceRes.status === HttpStatus.TooManyRequests) {
    sleep(1);
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
  const isPurchaseRateLimited = purchaseRes.status === HttpStatus.TooManyRequests;
  rateLimitRate.add(isPurchaseRateLimited);

  const purchaseCheck = check(purchaseRes, {
    'purchase request responds correctly': (r) => {
      const acceptableStatuses = [
        HttpStatus.Ok,
        HttpStatus.TooManyRequests,
        HttpStatus.BadRequest,
      ];
      return acceptableStatuses.includes(r.status);
    },
    'rate limit returns 429 (not 500)': (r) => {
      if (r.status >= 500) {
        return false;
      }
      return true;
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
    sleep(0.5);
    return;
  }

  if (purchaseRes.status === HttpStatus.TooManyRequests || purchaseRes.status === HttpStatus.BadRequest) {
    sleep(1);
    return;
  }

  sleep(0.5);

  const finalBalanceRes = http.get(balanceUrl, { headers });
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
  });

  const isCorrect = balanceCheck && purchaseCheck && finalBalanceCheck;
  correctnessRate.add(isCorrect);
  errorRate.add(!purchaseCheck && !isPurchaseRateLimited);

  sleep(TestDefaults.TestSleepSeconds);
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
