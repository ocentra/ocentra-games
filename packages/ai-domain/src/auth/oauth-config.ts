import type { OAuthConfig } from '@/auth/oauth-types';

export const OAUTH_PROVIDERS: Record<string, Omit<OAuthConfig, 'clientId' | 'redirectUri'>> = {
  gemini: {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/generative-language'],
  },
};
