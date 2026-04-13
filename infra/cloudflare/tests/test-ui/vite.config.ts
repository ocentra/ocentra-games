import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './',
  server: {
    port: 3999,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      '@tests': path.resolve(__dirname, '../../tests')
    }
  }
});
