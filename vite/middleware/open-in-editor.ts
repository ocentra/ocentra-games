import type { ServerResponse } from 'node:http';
import type { Connect } from 'vite';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';

function setCors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getQueryParams(req: Connect.IncomingMessage): URLSearchParams {
  const url = req.url ?? '';
  const q = url.includes('?') ? url.slice(url.indexOf('?')) : '';
  return new URLSearchParams(q);
}

function isPathUnderRoot(filePath: string, root: string): boolean {
  const resolved = path.resolve(root, filePath);
  const rootResolved = path.resolve(root);
  const relative = path.relative(rootResolved, resolved);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function setupOpenInEditorMiddleware(
  middlewares: Connect.Server,
  options?: { cwd?: string; editor?: string }
): void {
  const cwd = options?.cwd ?? process.cwd();
  const editorCmd = options?.editor ?? process.env.OPEN_IN_EDITOR ?? 'cursor';

  middlewares.use(LocalApiEndpoint.OpenInEditor, (req, res, next) => {
    setCors(res);
    if (req.method === HttpMethod.Options) {
      res.writeHead(200);
      res.end();
      return;
    }
    if (req.method !== HttpMethod.Get) return next();

    const params = getQueryParams(req);
    const relPath = params.get('path');
    const lineStr = params.get('line');

    if (!relPath || relPath.trim() === '') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'path query param required' }));
      return;
    }

    const safePath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
    if (!isPathUnderRoot(safePath, cwd)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'path must be under project root' }));
      return;
    }

    const fullPath = path.resolve(cwd, safePath);
    if (!fs.existsSync(fullPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'file not found' }));
      return;
    }

    const line = lineStr ? parseInt(lineStr, 10) : undefined;
    const gotoArg = Number.isInteger(line) ? `${fullPath}:${line}` : fullPath;

    const child = spawn(editorCmd, ['--goto', gotoArg], {
      cwd,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();

    res.writeHead(204);
    res.end();
  });
}
