import type { Plugin } from 'vite';
export interface ServeFromGameDataOptions {
    logDir?: string;
}
export declare function serveFromGameData(options?: ServeFromGameDataOptions): Plugin;
export declare function serveProcessedGames(): Plugin;
