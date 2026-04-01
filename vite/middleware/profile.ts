import type { Connect } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';

const TEMP_DIR = '.temp';
const PROFILE_FILENAME = 'performance-profile.json';

function getTempDir(): string {
  const root = process.cwd();
  const dir = path.join(root, TEMP_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function setupProfileMiddleware(middlewares: Connect.Server): void {
  middlewares.use(LocalApiEndpoint.Profile, async (req, res, next) => {
    if (req.method === HttpMethod.Options) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.writeHead(200);
      res.end();
      return;
    }
    if (req.method === HttpMethod.Post) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      try {
        const body = await readBody(req);
        const report = JSON.parse(body) as Record<string, unknown>;
        const tempDir = getTempDir();
        const filePath = path.join(tempDir, PROFILE_FILENAME);
        fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: filePath }));
      } catch {
        res.writeHead(400);
        res.end();
      }
      return;
    }
    next();
  });
}
