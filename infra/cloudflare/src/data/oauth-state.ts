import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';

const OAUTH_STATE_TTL_SEC = 600;

export interface OAuthStatePayload {
  userId: string;
  providerId: string;
  nonce: string;
  createdAt: number;
}

export async function putOAuthState(
  kv: KVNamespace,
  state: string,
  payload: OAuthStatePayload
): Promise<void> {
  const key = `${KvKeyPrefix.OAuthState}${state}`;
  await kv.put(key, JSON.stringify(payload), { expirationTtl: OAUTH_STATE_TTL_SEC });
}

export async function getAndDeleteOAuthState(
  kv: KVNamespace,
  state: string
): Promise<OAuthStatePayload | null> {
  const key = `${KvKeyPrefix.OAuthState}${state}`;
  const raw = await kv.get(key);
  if (!raw) return null;
  await kv.delete(key);
  try {
    return JSON.parse(raw) as OAuthStatePayload;
  } catch {
    return null;
  }
}
