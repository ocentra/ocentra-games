import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { getFirestoreAuthHeader } from '@/utils/firebase-service-auth';
import { getFirestoreUsersCollectionUrl } from '@/utils/firebase';
import { HttpHeader, HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

const hasFirebaseProjectId = typeof process.env.FIREBASE_PROJECT_ID === 'string' && process.env.FIREBASE_PROJECT_ID.trim().length > 0;
const hasServiceAccountJson = typeof process.env.FIREBASE_SERVICE_ACCOUNT_JSON === 'string' && process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim().length > 0;
const runFlagEnabled = process.env.RUN_REAL_FIREBASE_SMOKE === 'true';
const runRealFirebaseSmoke = runFlagEnabled && hasFirebaseProjectId && hasServiceAccountJson;

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  (runRealFirebaseSmoke ? it : it.skip)(
    testName('firebase service auth real smoke: mints access token and reads Firestore users collection'),
    async () => {
      const projectId = process.env.FIREBASE_PROJECT_ID!.trim();
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON!.trim();
      const authHeader = await getFirestoreAuthHeader({
        FIREBASE_PROJECT_ID: projectId,
        FIREBASE_SERVICE_ACCOUNT_JSON: serviceAccountJson,
      } as unknown as import('@/constants/env').Env);

      expect(typeof authHeader).toBe('string');
      expect(authHeader).toMatch(/^Bearer\s.+/);

      const usersUrl = `${getFirestoreUsersCollectionUrl(projectId)}?pageSize=1`;
      const response = await fetch(usersUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Authorization]: authHeader!,
        },
      });

      expect(response.status).toBe(HttpStatus.Ok);
      const body = (await response.json()) as { documents?: unknown[] };
      expect(Array.isArray(body.documents) || body.documents === undefined).toBe(true);
    },
    30000
  );
});
