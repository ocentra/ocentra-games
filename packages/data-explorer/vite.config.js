import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
const isPreviewCli = process.argv.includes('preview') || process.env.npm_lifecycle_event === 'preview';
export default defineConfig(async ({ command }) => {
    const plugins = [react()];
    if (command === 'serve' && !isPreviewCli) {
        const { serveFromGameData, serveProcessedGames } = await import('@ocentra/card-games/server');
        plugins.push(serveFromGameData({ logDir: path.join(process.cwd(), 'Log') }), serveProcessedGames());
    }
    return {
        plugins,
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 52741,
            open: true,
            host: true,
        },
        build: {
            outDir: 'dist',
            sourcemap: true,
        },
        optimizeDeps: {
            include: ['react', 'react-dom'],
        },
    };
});
