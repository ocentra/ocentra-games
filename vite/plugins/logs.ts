import type { Plugin } from 'vite';
import { setupLogsMiddleware } from '../middleware/logs';
import { setupProfileMiddleware } from '../middleware/profile';
import { disposeAllStorage } from '../utils/logStorageFactory';

export function logsPlugin(): Plugin {
  return {
    name: 'ocentra-logs',
    enforce: 'pre',
    configureServer(server) {
      setupLogsMiddleware(server.middlewares);
      setupProfileMiddleware(server.middlewares);
      server.httpServer?.on('close', () => {
        disposeAllStorage().catch(() => {});
      });
    },
    configurePreviewServer(server) {
      setupLogsMiddleware(server.middlewares);
      setupProfileMiddleware(server.middlewares);
      server.httpServer?.on('close', () => {
        disposeAllStorage().catch(() => {});
      });
    },
  };
}
