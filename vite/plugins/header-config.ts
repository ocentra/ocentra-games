import type { Plugin } from 'vite';
import { setupHeaderConfigMiddleware } from '../middleware/header-config';

export function headerConfigPlugin(): Plugin {
  return {
    name: 'ocentra:header-config',
    configureServer(server) {
      setupHeaderConfigMiddleware(server.middlewares);
    },
  };
}
