import type { Plugin } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupOpenInEditorMiddleware } from '../middleware/open-in-editor';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function openInEditorPlugin(): Plugin {
  const cwd = path.resolve(__dirname, '../..');
  return {
    name: 'ocentra-open-in-editor',
    configureServer(server) {
      setupOpenInEditorMiddleware(server.middlewares, { cwd });
    },
  };
}
