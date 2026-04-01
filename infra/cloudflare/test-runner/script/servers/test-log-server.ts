import * as http from 'http';
import { TestLogServerPath, TestLogServerHost } from '@/constants/test-log-server';
import type { TestLog } from '@ocentra/logging-domain/test-log/types';

const logStore: Array<{ testName: string; runId: string; log: TestLog }> = [];

export function getStoreSize(): number {
  return logStore.length;
}

export function countLogs(testName: string, runId: string): number {
  return logStore.filter(l => l.testName === testName && l.runId === runId).length;
}

export function getAllLogs(): Array<{ testName: string; runId: string; log: TestLog }> {
  return [...logStore];
}

export function getLogs(testName: string, runId: string): TestLog[] {
  const filtered = logStore.filter(l => l.testName === testName && l.runId === runId);
  return filtered.map(l => l.log);
}

export function clearLogs(testName?: string, runId?: string): void {
  if (testName && runId) {
    const filtered = logStore.filter(l => !(l.testName === testName && l.runId === runId));
    logStore.length = 0;
    logStore.push(...filtered);
  } else {
    logStore.length = 0;
  }
}

export function startLogServer(port: number = 8787): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url?.startsWith('/__logs__?')) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const testName = url.searchParams.get('testName');
        const runId = url.searchParams.get('runId');
        
        if (!testName || !runId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'testName and runId required' }));
          return;
        }
        
        const filtered = logStore.filter(l => l.testName === testName && l.runId === runId);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(filtered.map(l => l.log)));
        return;
      }
      
      if (req.method === 'DELETE' && req.url?.startsWith(`${TestLogServerPath}?`)) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const testName = url.searchParams.get('testName');
        const runId = url.searchParams.get('runId');
        
        if (testName && runId) {
          const filtered = logStore.filter(l => !(l.testName === testName && l.runId === runId));
          logStore.length = 0;
          logStore.push(...filtered);
        }
        res.statusCode = 200;
        res.end('ok');
        return;
      }
      
      if (req.method === 'POST' && req.url === '/__logs__') {
        let body = '';

        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const logs = JSON.parse(body) as Array<{ testName: string; runId: string; log: TestLog }>;
            logStore.push(...logs);
            res.statusCode = 200;
            res.end('ok');
          } catch {
            res.statusCode = 400;
            res.end('invalid json');
          }
        });
        return;
      }
      
      res.statusCode = 404;
      res.end('not found');
    });

    server.listen(port, TestLogServerHost, () => {
      resolve(server);
    });
  });
}

export function stopLogServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
}
