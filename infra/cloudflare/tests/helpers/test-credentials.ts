import { env as workerTestEnv } from 'cloudflare:test';

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
  return readCfTestsKey('CF_TESTS_STRIPE_SECRET_KEY') ?? '';
}

export function requireTestStripeSecretKey(): string {
  const k = readCfTestsKey('CF_TESTS_STRIPE_SECRET_KEY')?.trim() ?? '';
  if (k === '') {
    throw new Error('CF_TESTS_STRIPE_SECRET_KEY must be set (repo-root .env or CI env)');
  }
  return k;
}

export function getTestAiApiCredential(): string {
  return readCfTestsKey('CF_TESTS_AI_API_KEY') ?? '';
}

export function buildTestFirebaseServiceAccountJson(options?: { clientEmail?: string }): string {
  const privateKey = readCfTestsKey('CF_TESTS_FIREBASE_PRIVATE_KEY_PEM');
  if (!privateKey || privateKey.trim() === '') {
    throw new Error('CF_TESTS_FIREBASE_PRIVATE_KEY_PEM must be set (e.g. in repo-root .env) for Firebase auth tests');
  }
  return JSON.stringify({
    client_email: options?.clientEmail ?? 'svc@example.iam.gserviceaccount.com',
    private_key: privateKey,
    token_uri: 'https://oauth2.googleapis.com/token',
  });
}
