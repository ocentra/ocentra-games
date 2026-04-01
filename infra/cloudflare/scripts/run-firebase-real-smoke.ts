import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getFirestoreAuthHeader } from '@/utils/firebase-service-auth';
import { getFirestoreUsersCollectionUrl } from '@/utils/firebase';
import { HttpHeader, HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import type { Env } from '@/constants/env';

type ServiceAccountPayload = {
  project_id?: string;
};

type EnvMap = Record<string, string>;

function parseEnvFile(filePath: string): EnvMap {
  if (!existsSync(filePath)) {
    return {};
  }
  const raw = readFileSync(filePath, 'utf8');
  const parsed: EnvMap = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!key) {
      continue;
    }
    parsed[key] = value;
  }
  return parsed;
}

function readServiceAccountJsonFromPath(pathValue: string): string {
  const resolvedPath = resolve(pathValue);
  if (!existsSync(resolvedPath)) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON_PATH does not exist: ${resolvedPath}`);
  }
  return readFileSync(resolvedPath, 'utf8');
}

function parseServiceAccountPayload(rawJson: string): ServiceAccountPayload {
  try {
    return JSON.parse(rawJson) as ServiceAccountPayload;
  } catch {
    throw new Error('FIREBASE service account JSON is invalid');
  }
}

function run(): void {
  const devVars = parseEnvFile(resolve('.dev.vars'));
  const envLocal = parseEnvFile(resolve('.env.local'));
  const mergedLocalEnv = { ...devVars, ...envLocal };

  const existingServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() || mergedLocalEnv.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_PATH?.trim() || mergedLocalEnv.FIREBASE_SERVICE_ACCOUNT_JSON_PATH?.trim();
  const loadedServiceAccountJson = existingServiceAccountJson && existingServiceAccountJson.length > 0
    ? existingServiceAccountJson
    : serviceAccountPath && serviceAccountPath.length > 0
      ? readServiceAccountJsonFromPath(serviceAccountPath)
      : '';

  if (!loadedServiceAccountJson) {
    throw new Error('Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_JSON_PATH before running this script');
  }

  const parsed = parseServiceAccountPayload(loadedServiceAccountJson);
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || mergedLocalEnv.FIREBASE_PROJECT_ID?.trim() || parsed.project_id?.trim() || '';
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is missing and could not be derived from service account JSON');
  }

  const env = {
    FIREBASE_PROJECT_ID: projectId,
    FIREBASE_SERVICE_ACCOUNT_JSON: loadedServiceAccountJson,
  } as Env;

  void (async () => {
    const authHeader = await getFirestoreAuthHeader(env);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Failed to mint Firestore OAuth bearer token');
    }

    const usersUrl = `${getFirestoreUsersCollectionUrl(projectId)}?pageSize=1`;
    const response = await fetch(usersUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Authorization]: authHeader,
      },
    });

    if (response.status !== HttpStatus.Ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Firestore smoke check failed with status ${response.status}: ${body}`);
    }

    const body = (await response.json().catch(() => ({} as { documents?: unknown[] }))) as { documents?: unknown[] };
    if (!(Array.isArray(body.documents) || body.documents === undefined)) {
      throw new Error('Firestore smoke check response shape is invalid');
    }

    process.stdout.write('Firebase real smoke check passed.\n');
  })().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Firebase real smoke check failed: ${message}\n`);
    process.exit(1);
  });
}

run();
