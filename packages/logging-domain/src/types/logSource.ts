export type LogSource = string;

export const LogSourcePrefix = {
  Browser: 'Browser:',
  Vite: 'Vite:',
  Analytics: 'Analytics:',
  Cloudflare: 'Cloudflare:',
  Solana: 'Solana:',
  AssetEditor: 'AssetEditor:',
} as const;

export type LogSourcePrefix = typeof LogSourcePrefix[keyof typeof LogSourcePrefix];
