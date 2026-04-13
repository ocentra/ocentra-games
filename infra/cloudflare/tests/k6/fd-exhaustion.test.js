/* eslint-env k6 */
/* global __ENV */

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import {
  HttpHeader,
  HttpStatus,
  HttpAuthScheme,
  TestConfig,
  TestDefaults,
} from './constants.js';

const BASE_HTTP_URL = __ENV.WORKER_URL || TestDefaults.DefaultWorkerUrl;
const WS_BASE_URL = BASE_HTTP_URL.replace(/^http/, 'ws');
const FD_STAGE_DURATION = __ENV.FD_STAGE_DURATION || '30s';
const FD_TARGET_VUS = Number(__ENV.FD_TARGET_VUS || 60);
const WS_HOLD_MS = Number(__ENV.WS_HOLD_MS || 4000);
const BASE_TIMESTAMP = Date.now();

const wsSuccess = new Rate('ws_handshake_success');
const wsServerErrors = new Rate('ws_server_errors');
const wsConnectionAttempts = new Counter('ws_connection_attempts');

export const options = {
  stages: [
    { duration: '10s', target: FD_TARGET_VUS },
    { duration: FD_STAGE_DURATION, target: FD_TARGET_VUS },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    ws_handshake_success: ['rate>0.1'],
    ws_server_errors: ['rate<0.1'],
  },
};

export default function () {
  const sessionId = `fd-${BASE_TIMESTAMP}-vu${__VU}-i${__ITER}`;
  const token = `${TestDefaults.TestTokenPrefix}${TestDefaults.LoadTestUserIdPrefix}${sessionId}`;
  const url = `${WS_BASE_URL}/ws/signaling/${sessionId}`;
  wsConnectionAttempts.add(1);

  const response = ws.connect(
    url,
    {
      headers: {
        [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${token}`,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin2,
        [HttpHeader.Upgrade]: 'websocket',
        [HttpHeader.Connection]: 'Upgrade',
      },
    },
    (socket) => {
      socket.setTimeout(() => {
        socket.close();
      }, WS_HOLD_MS);
    }
  );

  const status = response && typeof response.status === 'number' ? response.status : 0;
  const validStatus = [
    HttpStatus.SwitchingProtocols,
    HttpStatus.TooManyRequests,
    HttpStatus.ServiceUnavailable,
    HttpStatus.BadRequest,
    HttpStatus.Unauthorized,
  ].includes(status);

  check(response, {
    'fd exhaustion websocket status acceptable': () => validStatus,
  });

  wsSuccess.add(status === HttpStatus.SwitchingProtocols);
  wsServerErrors.add(status >= HttpStatus.InternalServerError);
  sleep(TestDefaults.TestSleepSeconds);
}

export function handleSummary(data) {
  return { stdout: JSON.stringify(data, null, 2) };
}
