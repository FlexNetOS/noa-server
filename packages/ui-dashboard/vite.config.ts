import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // Bridge Vite's import.meta.env to process.env so shared code can use
  // process.env.* (which works naturally in Jest/Node) while Vite replaces
  // those references at build time for the browser bundle.
  define: {
    'process.env.VITE_API_URL': 'import.meta.env.VITE_API_URL',
    'process.env.VITE_WS_URL': 'import.meta.env.VITE_WS_URL',
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8081',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
