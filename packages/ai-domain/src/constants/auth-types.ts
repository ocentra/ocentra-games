export const AuthType = {
  ApiKey: 'api_key',
  OAuth2: 'oauth2',
  Bearer: 'bearer',
  None: 'none',
} as const;

export type AuthType = (typeof AuthType)[keyof typeof AuthType];
