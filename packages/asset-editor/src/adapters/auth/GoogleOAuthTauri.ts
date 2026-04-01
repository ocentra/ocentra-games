import { invoke } from '@tauri-apps/api/core';
import { once } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-shell';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = true) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = true) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

// ---- PKCE helpers ----

function generateCodeVerifier(): string {
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier).buffer as ArrayBuffer;
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ---- Main flow ----

export async function signInWithGoogleNative(): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string;
  logInfo('[OAuth] signInWithGoogleNative started', { hasClientId: Boolean(clientId?.trim()) });
  if (!clientId) {
    throw new Error(
      'VITE_GOOGLE_OAUTH_CLIENT_ID is not set. ' +
      'Create a Desktop app OAuth client in Google Cloud Console ' +
      '(APIs & Services → Credentials → Create → OAuth client ID → Desktop app).'
    );
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const port = await invoke<number>('start_oauth_server');
  const redirectUri = `http://127.0.0.1:${port}`;
  logInfo('[OAuth] OAuth server started, opening browser', { port, redirectUri });

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'select_account');

  // Open system browser and wait for the callback event from Rust
  const callbackUrl = await new Promise<string>((resolve, reject) => {
    once<string>('oauth://url', (event) => {
      if (event.payload.startsWith('error://')) {
        reject(new Error(event.payload.replace('error://', '')));
      } else {
        resolve(event.payload);
      }
    }).catch(reject);
    open(authUrl.toString()).catch(reject);
  });

  logInfo('[OAuth] Callback received', { callbackUrl: callbackUrl.slice(0, 120) });
  const url = new URL(callbackUrl);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    logError('[OAuth] Callback error from Google', { error });
    throw new Error(`Google OAuth error: ${error}`);
  }
  if (!code) {
    logError('[OAuth] No code in callback', { search: url.search });
    throw new Error('No authorization code in callback');
  }
  logInfo('[OAuth] Code received, exchanging for tokens', { codeLength: code.length });

  const clientSecret = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_SECRET as string | undefined;
  const hasSecret = Boolean(clientSecret?.trim());
  logInfo('[OAuth] Token exchange env check', {
    clientIdPrefix: clientId.slice(0, 30) + '...',
    hasClientSecret: hasSecret,
    redirectUri,
  });

  const tokenPayload: Record<string, string> = {
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  };
  if (clientSecret) tokenPayload.client_secret = clientSecret;

  const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(tokenPayload),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    logError('[OAuth] Token exchange failed', {
      status: tokenRes.status,
      statusText: tokenRes.statusText,
      body,
    });
    const isInvalidClient =
      tokenRes.status === 401 &&
      (body.includes('invalid_client') || body.includes('Unauthorized'));
    if (isInvalidClient) {
      throw new Error(
        'Google rejected the OAuth client (invalid_client). Use a Desktop app OAuth client, not a Web client: ' +
          'Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Desktop app. ' +
          'Add redirect URI http://localhost:8765. Download that client’s JSON, ' +
          'put it in packages/asset-editor as client_secret_*.json, then run: npm run env:from-google-json'
      );
    }
    throw new Error(`Token exchange failed: ${body}`);
  }

  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) {
    logError('[OAuth] No id_token in response', { keys: Object.keys(tokens) });
    throw new Error('No id_token in token response');
  }
  logInfo('[OAuth] Token exchange success', { idTokenLength: tokens.id_token.length });
  return tokens.id_token;
}
