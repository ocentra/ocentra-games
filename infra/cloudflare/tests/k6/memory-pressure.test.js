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
const MEMORY_STAGE_DURATION = __ENV.MEMORY_STAGE_DURATION || '30s';
const MEMORY_TARGET_VUS = Number(__ENV.MEMORY_TARGET_VUS || 20);
const MEMORY_PAYLOAD_KB = Number(__ENV.MEMORY_PAYLOAD_KB || 256);
const PAYLOAD_PADDING = 'x'.repeat(Math.max(1, MEMORY_PAYLOAD_KB) * 1024);
const BASE_TIMESTAMP = Date.now();

const serverErrors = new Rate('server_errors');
const memoryPressureViolations = new Rate('memory_pressure_violations');

export const options = {
  stages: [
    { duration: '10s', target: MEMORY_TARGET_VUS },
    { duration: MEMORY_STAGE_DURATION, target: MEMORY_TARGET_VUS },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    server_errors: ['rate<0.05'],
    memory_pressure_violations: ['rate<0.1'],
    http_req_duration: ['p(95)<5000'],
  },
};

export default function () {
  const userId = `${TestDefaults.LoadTestUserIdPrefix}${BASE_TIMESTAMP}-memory-vu${__VU}-i${__ITER}`;
  const token = `${TestDefaults.TestTokenPrefix}${userId}`;
  const headers = {
    [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${token}`,
    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    [HttpHeader.Origin]: TestConfig.LocalhostOrigin2,
  };
  const purchaseUrl = `${BASE_URL}${ApiEndpoint.ApiCredits}/${userId}/${CreditAction.Purchase}`;

  const payload = JSON.stringify({
    ac_amount: 1,
    amount: 0.01,
    currency: Currency.USD,
    padding: PAYLOAD_PADDING,
  });

  const response = http.post(purchaseUrl, payload, { headers });
  const ok = check(response, {
    'memory pressure status acceptable': (r) =>
      [
        HttpStatus.Ok,
        HttpStatus.Forbidden,
        HttpStatus.BadRequest,
        HttpStatus.PayloadTooLarge,
        HttpStatus.TooManyRequests,
      ].includes(r.status),
    'memory pressure does not produce 5xx': (r) => r.status < HttpStatus.InternalServerError,
  });

  serverErrors.add(response.status >= HttpStatus.InternalServerError);
  memoryPressureViolations.add(!ok);
  sleep(TestDefaults.TestSleepSeconds);
}

export function handleSummary(data) {
  return { stdout: JSON.stringify(data, null, 2) };
}
