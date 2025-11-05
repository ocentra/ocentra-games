import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './Assets'),
    },
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
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
    host: true,
    port: 3000,
  },
})
