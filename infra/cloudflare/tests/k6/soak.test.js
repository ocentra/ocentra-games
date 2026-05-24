/* eslint-env k6 */
/* global __ENV */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import {
  ApiEndpoint,
  HttpHeader,
  HttpStatus,
  HttpContentType,
  HttpAuthScheme,
  CreditAction,
  Currency,
  TestConfig,
  TestDefaults,
} from './constants.js';

const BASE_URL = __ENV.WORKER_URL || TestDefaults.DefaultWorkerUrl;
const SOAK_WARMUP = __ENV.SOAK_WARMUP || '30s';
const SOAK_DURATION = __ENV.SOAK_DURATION || '10m';
const SOAK_COOLDOWN = __ENV.SOAK_COOLDOWN || '30s';
const SOAK_TARGET_VUS = Number(__ENV.SOAK_TARGET_VUS || 20);
const BASE_TIMESTAMP = Date.now();

const serverErrors = new Rate('server_errors');
const invariantViolations = new Rate('invariant_violations');

export const options = {
  stages: [
    { duration: SOAK_WARMUP, target: SOAK_TARGET_VUS },
    { duration: SOAK_DURATION, target: SOAK_TARGET_VUS },
    { duration: SOAK_COOLDOWN, target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    server_errors: ['rate<0.05'],
    invariant_violations: ['rate<0.05'],
  },
};

export default function () {
  const userId = `${TestDefaults.LoadTestUserIdPrefix}${BASE_TIMESTAMP}-soak-vu${__VU}`;
  const token = `${TestDefaults.TestTokenPrefix}${userId}`;
  const headers = {
    [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${token}`,
    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    [HttpHeader.Origin]: TestConfig.LocalhostOrigin2,
  };

  const balanceUrl = `${BASE_URL}${ApiEndpoint.ApiCredits}/${userId}/${CreditAction.Balance}`;
  const purchaseUrl = `${BASE_URL}${ApiEndpoint.ApiCredits}/${userId}/${CreditAction.Purchase}`;

  const beforeRes = http.get(balanceUrl, { headers });
  const beforeOk = check(beforeRes, {
    'soak balance status acceptable': (r) =>
      [HttpStatus.Ok, HttpStatus.TooManyRequests, HttpStatus.Unauthorized].includes(r.status),
  });

  if (!beforeOk || beforeRes.status >= HttpStatus.InternalServerError) {
    serverErrors.add(true);
    sleep(TestDefaults.TestSleepSeconds);
    return;
  }
  serverErrors.add(false);

  if (beforeRes.status !== HttpStatus.Ok) {
    sleep(TestDefaults.TestSleepSeconds);
    return;
  }

  let before;
  try {
    before = JSON.parse(beforeRes.body);
  } catch {
    invariantViolations.add(true);
    sleep(TestDefaults.TestSleepSeconds);
    return;
  }

  const purchasePayload = JSON.stringify({
    ac_amount: 1,
    amount: 0.01,
    currency: Currency.USD,
  });

  const purchaseRes = http.post(purchaseUrl, purchasePayload, { headers });
  const purchaseOk = check(purchaseRes, {
    'soak purchase status acceptable': (r) =>
      [HttpStatus.Ok, HttpStatus.Forbidden, HttpStatus.TooManyRequests, HttpStatus.BadRequest].includes(r.status),
  });

  if (!purchaseOk || purchaseRes.status >= HttpStatus.InternalServerError) {
    serverErrors.add(true);
    sleep(TestDefaults.TestSleepSeconds);
    return;
  }
  serverErrors.add(false);

  if (purchaseRes.status === HttpStatus.Ok) {
    try {
      const purchaseData = JSON.parse(purchaseRes.body);
      const expected = before.ac_balance + 1;
      invariantViolations.add(!(purchaseData.new_balance === expected));
    } catch {
      invariantViolations.add(true);
    }
  } else if (purchaseRes.status === HttpStatus.Forbidden) {
    invariantViolations.add(false);
  } else {
    invariantViolations.add(false);
  }

  sleep(TestDefaults.TestSleepSeconds);
}

export function handleSummary(data) {
  return { stdout: JSON.stringify(data, null, 2) };
}
