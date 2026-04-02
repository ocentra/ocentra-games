import { env as workerTestEnv } from 'cloudflare:test';

const LOCAL_DEV_FALLBACK_STRIPE = 'sk_test_local_unit_tests_only';

const LOCAL_DEV_FALLBACK_FIREBASE_PRIVATE_KEY_PEM = [
  '-----' + 'BEGIN PRIVATE KEY-----',
  'AAAA',
  '-----' + 'END PRIVATE KEY-----',
].join('\n');

function allowLocalCredentialFallback(): boolean {
  return process.env.CI !== 'true' && process.env.CI !== '1';
}

function readCfTestsKey(key: string): string | undefined {
  const fromProcess = process.env[key];
  if (fromProcess !== undefined && fromProcess.trim() !== '') {
    return fromProcess;
  }
  const fromBindings = (workerTestEnv as Record<string, unknown>)[key];
  if (typeof fromBindings === 'string' && fromBindings.trim() !== '') {
    return fromBindings;
  }
  return undefined;
}

export function getTestStripeSecretKeyForEnv(): string {
  const fromEnv = readCfTestsKey('CF_TESTS_STRIPE_SECRET_KEY');
  if (fromEnv !== undefined && fromEnv.trim() !== '') {
    return fromEnv;
  }
  if (allowLocalCredentialFallback()) {
    return LOCAL_DEV_FALLBACK_STRIPE;
  }
  return '';
}

export function requireTestStripeSecretKey(): string {
  const k = readCfTestsKey('CF_TESTS_STRIPE_SECRET_KEY')?.trim() ?? '';
  if (k !== '') {
    return k;
  }
  if (allowLocalCredentialFallback()) {
    return LOCAL_DEV_FALLBACK_STRIPE;
  }
  throw new Error('CF_TESTS_STRIPE_SECRET_KEY must be set (repo-root .env or CI env)');
}

export function getTestAiApiCredential(): string {
  return readCfTestsKey('CF_TESTS_AI_API_KEY') ?? '';
}

export function buildTestFirebaseServiceAccountJson(options?: { clientEmail?: string }): string {
  let privateKey = readCfTestsKey('CF_TESTS_FIREBASE_PRIVATE_KEY_PEM');
  if (!privateKey || privateKey.trim() === '') {
    if (allowLocalCredentialFallback()) {
      privateKey = LOCAL_DEV_FALLBACK_FIREBASE_PRIVATE_KEY_PEM;
    }
  }
  if (!privateKey || privateKey.trim() === '') {
    throw new Error('CF_TESTS_FIREBASE_PRIVATE_KEY_PEM must be set (e.g. in repo-root .env) for Firebase auth tests');
  }
  return JSON.stringify({
    client_email: options?.clientEmail ?? 'svc@example.iam.gserviceaccount.com',
    private_key: privateKey,
    token_uri: 'https://oauth2.googleapis.com/token',
  });
}
