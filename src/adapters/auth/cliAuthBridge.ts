import type { AuthBridge } from '@ocentra/auth-domain/AuthBridge';

export class CliAuthBridge implements AuthBridge {
  async getAuthToken(): Promise<string | null> {
    const envToken = (typeof process !== 'undefined' && process.env?.OCENTRA_AUTH_TOKEN) || null;
    if (envToken) return envToken;

    try {
      const fs = await import(/* @vite-ignore */ 'fs/promises') as { readFile: (p: string, enc: string) => Promise<string> };
      const os = await import(/* @vite-ignore */ 'os') as { homedir: () => string };
      const path = await import(/* @vite-ignore */ 'path') as { join: (...parts: string[]) => string };
      const configPath = path.join(os.homedir(), '.ocentra', 'auth.json');
      const raw = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(raw) as { token?: string };
      return parsed.token ?? null;
    } catch {
      return null;
    }
  }
}
