import { invoke } from '@tauri-apps/api/core';
import { once } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-shell';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/adapters/firebase/config';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

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

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function signInWithGoogleTauri(): Promise<import('firebase/auth').UserCredential> {
  const clientId = (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      'VITE_GOOGLE_OAUTH_CLIENT_ID is not set. ' +
      'Create a Desktop OAuth client in Google Cloud Console (Desktop app type) ' +
      'and set it in your .env file.'
    );
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const port = await invoke<number>('start_oauth_server');
  const redirectUri = `http://127.0.0.1:${port}`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'select_account');

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

  const url = new URL(callbackUrl);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) throw new Error(`Google OAuth error: ${error}`);
  if (!code) throw new Error('No authorization code in callback');

  const clientSecret = (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_OAUTH_CLIENT_SECRET;
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
    throw new Error(`Token exchange failed (${tokenRes.status}): ${body}`);
  }

  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error('No id_token in token response');

  const credential = GoogleAuthProvider.credential(tokens.id_token);
  return signInWithCredential(auth!, credential);
}
