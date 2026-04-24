import type { Connect } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';

const PROFILES_DIR = 'packages/core-ui/src/Header/profiles';

function getProfilesDir(): string {
  const root = process.cwd();
  const dir = path.join(root, PROFILES_DIR);
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

export function setupHeaderConfigMiddleware(middlewares: Connect.Server): void {
  middlewares.use('/local/api/header-config', async (req, res, next) => {
    if (req.method === HttpMethod.Options) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === HttpMethod.Get) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      try {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const name = url.searchParams.get('name');
        const profilesDir = getProfilesDir();

        if (name) {
          const filePath = path.join(profilesDir, `${name}.json`);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(content);
          } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Profile not found' }));
          }
        } else {
          const files = fs.readdirSync(profilesDir)
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace('.json', ''));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(files));
        }
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(e) }));
      }
      return;
    }

    if (req.method === HttpMethod.Post) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      try {
        const body = await readBody(req);
        const { name, content } = JSON.parse(body);
        if (!name || !content) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing name or content' }));
          return;
        }

        const profilesDir = getProfilesDir();
        const filePath = path.join(profilesDir, `${name}.json`);
        fs.writeFileSync(filePath, content, 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: filePath }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(e) }));
      }
      return;
    }
    next();
  });
}
