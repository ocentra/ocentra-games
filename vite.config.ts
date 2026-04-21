import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'
import { readFileSync } from 'fs'

const rootPkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as { version?: string }
const appVersion = rootPkg.version ?? '0.1.0'
import { visualizer } from 'rollup-plugin-visualizer'

const ocentraExportSubpaths = JSON.parse(
  readFileSync(path.resolve(__dirname, 'exports-flattened.json'), 'utf-8')
) as string[]
const aiDomainExportSubpaths = ocentraExportSubpaths.filter(
  (specifier) => specifier === '@ocentra/ai-domain' || specifier.startsWith('@ocentra/ai-domain/')
)
import { generateRegistryMapsPlugin } from './vite/plugins/generate-inspector-map'
import { logsPlugin } from './vite/plugins/logs'
import { openInEditorPlugin } from './vite/plugins/open-in-editor'
import type { PluginOption } from 'vite'

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.keys(env).forEach(key => {
    if (key.startsWith('VITE_')) {
      const existing = process.env[key]
      const fileVal = env[key]
      process.env[key] = (existing && String(existing).trim()) ? existing : (fileVal || existing || '')
    }
  })

  if (mode === 'development') {
    const localBase = 'http://127.0.0.1:8787'
    process.env.VITE_CLAIM_STORAGE_URL = process.env.VITE_CLAIM_STORAGE_URL || process.env.VITE_ASSETS_WORKER_URL || localBase
    process.env.VITE_ASSETS_PUBLIC_URL = process.env.VITE_ASSETS_PUBLIC_URL || `${(process.env.VITE_CLAIM_STORAGE_URL || localBase).replace(/\/$/, '')}/api/v1/assets`
  }

  const serverHost = process.env.VITE_HOST || 'localhost'
  const serverPort = parseInt(process.env.PORT || process.env.VITE_PORT || '3000')
  const hmrClientPort = parseInt(process.env.VITE_HMR_CLIENT_PORT || process.env.PORT || process.env.VITE_PORT || '3000')

  const plugins: PluginOption[] = [
    {
      ...generateRegistryMapsPlugin(),
      enforce: 'pre' as const,
    },
    tsconfigPaths(),
    react({
      babel: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          ['@babel/plugin-transform-class-properties', { loose: true }],
          ['@babel/plugin-transform-class-static-block'],
          ['babel-plugin-react-compiler'],
        ],
      },
    }),
    logsPlugin(),
    openInEditorPlugin(),
  ]

  return {
  define: {
    global: 'globalThis',
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  plugins,
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    dedupe: ['react', 'react-dom', 'react-router-dom'],
    alias: {
        buffer: 'buffer',
'onnxruntime-web': path.resolve(__dirname, './node_modules/onnxruntime-web/dist/ort.wasm.min.js'),
'@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@providers': path.resolve(__dirname, './src/providers'),
      '@store': path.resolve(__dirname, './src/store'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@gameMode': path.resolve(__dirname, './src/gameMode'),
      '@ui/gameMode': path.resolve(__dirname, './src/ui/gameMode'),
      '@ui/layout': path.resolve(__dirname, './src/ui/layout'),
      '@types': path.resolve(__dirname, './src/types'),
      '@config': path.resolve(__dirname, './src/config'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  optimizeDeps: {
    force: true,
    exclude: [
      ...aiDomainExportSubpaths,
      '@ocentra/endpoint-domain/constants/cloudflare',
      '@ocentra/card-games',
      '@ocentra/card-games/schema/zod/game-schema',
      '@ocentra/api-domain/httpClient',
      '@ocentra/api-domain/createApiClient',
      '@huggingface/transformers',
      'onnxruntime-web',
    ],
    include: [
      ...ocentraExportSubpaths.filter(
        (specifier) => 
          (specifier === '@ocentra/ai-domain' || !specifier.startsWith('@ocentra/ai-domain/')) &&
          !specifier.startsWith('@ocentra/card-games')
      ),
      'three',
      'framer-motion',
      'zustand',
      'three-stdlib',
      '@huggingface/transformers',
      '@tanstack/react-query',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
        'buffer',
    ],
    esbuildOptions: {
      sourcemap: false,
    },
  },
  build: {
    target: 'esnext',
    ...(mode === 'production' && {
      esbuild: { drop: ['console', 'debugger'] },
    }),
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'test-harness': path.resolve(__dirname, 'test-harness.html'),
      },
      plugins: process.env.VITE_ANALYZE === '1'
        ? [visualizer({ filename: 'dist/stats.html', open: true, gzipSize: true, brotliSize: true })]
        : [],
      output: {
        manualChunks: (id: string) => {
          if (id.includes('three')) return 'three'
          if (id.includes('@react-three')) return 'react-three'
          if (id.includes('react') || id.includes('react-dom')) return 'vendor'
          return undefined
        },
      },
    },
  },
  server: {
    host: serverHost,
    port: serverPort,
    strictPort: true,
    fs: {
      allow: [
        '..'
      ]
    },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.generated.ts',
        '**/.meta',
        '**/node_modules/.vite/**',
        '**/*.meta'
      ]
    },
    hmr: {
      overlay: true,
      clientPort: hmrClientPort,
      protocol: 'ws'
    },
    proxy: {
      '/api/v1': {
        target: `http://localhost:${process.env.WORKER_PORT || '8787'}`,
        changeOrigin: true,
      },
      '/api/games': {
        target: `http://localhost:${process.env.WORKER_PORT || '8787'}`,
        changeOrigin: true,
      },
      '/local/api': {
        target: `http://localhost:${process.env.WORKER_PORT || '8787'}`,
        changeOrigin: true,
        rewrite: (urlPath: string) => urlPath.replace(/^\/local\/api/, '/api/v1'),
      },
    }
  },
  publicDir: 'public',
  }
})
