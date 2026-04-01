export interface OAuthConfig {
  clientId: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  redirectUri: string;
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  scope?: string;
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  challengeMethod: 'S256';
}

export interface OAuthState {
  state: string;
  nonce?: string;
  providerId: string;
}
