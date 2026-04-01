const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SCOPES = 'openid https://www.googleapis.com/auth/generative-language.embedding';

export interface OAuthProviderConfig {
  providerId: string;
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
}

export type OAuthProviderId = 'google_gemini';

const ALLOWED_OAUTH_PROVIDERS: OAuthProviderId[] = ['google_gemini'];

export function isAllowedOAuthProvider(provider: string): provider is OAuthProviderId {
  return ALLOWED_OAUTH_PROVIDERS.includes(provider as OAuthProviderId);
}

export function getGoogleOAuthConfig(env: {
  OAUTH_GOOGLE_CLIENT_ID?: string;
  OAUTH_GOOGLE_CLIENT_SECRET?: string;
}): OAuthProviderConfig | null {
  const clientId = env.OAUTH_GOOGLE_CLIENT_ID;
  const clientSecret = env.OAUTH_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || typeof clientId !== 'string' || typeof clientSecret !== 'string') {
    return null;
  }
  return {
    providerId: 'google_gemini',
    clientId,
    clientSecret,
    authorizeUrl: GOOGLE_AUTHORIZE_URL,
    tokenUrl: GOOGLE_TOKEN_URL,
    scopes: GOOGLE_SCOPES,
  };
}

export function getOAuthConfigForProvider(
  env: { OAUTH_GOOGLE_CLIENT_ID?: string; OAUTH_GOOGLE_CLIENT_SECRET?: string },
  providerId: string
): OAuthProviderConfig | null {
  if (providerId === 'google_gemini') {
    return getGoogleOAuthConfig(env);
  }
  return null;
}
