export const LogOrigin = {
  Browser: 'browser',
  Vite: 'vite',
  Analytics: 'analytics',
  Cloudflare: 'cloudflare',
  Solana: 'solana',
  All: 'all',
} as const;

export type LogOrigin = typeof LogOrigin[keyof typeof LogOrigin];
