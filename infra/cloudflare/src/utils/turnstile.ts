const TurnstileSiteverifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const TurnstileTokenHeader = 'X-Turnstile-Token';

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; code: 'missing'; message: string }
  | { ok: false; code: 'invalid'; message: string };

export async function verifyTurnstileToken(
  token: string | null | undefined,
  secretKey: string | undefined,
  options: { testMode?: string; remoteip?: string } = {}
): Promise<TurnstileVerifyResult> {
  if (!secretKey) return { ok: true };
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return { ok: false, code: 'missing', message: 'Turnstile token required' };
  }
  if (options.testMode === 'true' && token === 'test-bypass-token') return { ok: true };
  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
    ...(options.remoteip ? { remoteip: options.remoteip } : {}),
  });
  try {
    const res = await fetch(TurnstileSiteverifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      await res.text().catch(() => undefined);
      return { ok: false, code: 'invalid', message: 'Bot detection failed' };
    }
    const data = (await res.json()) as { success?: boolean };
    if (data.success === true) return { ok: true };
    return { ok: false, code: 'invalid', message: 'Bot detection failed' };
  } catch {
    return { ok: false, code: 'invalid', message: 'Bot detection failed' };
  }
}
