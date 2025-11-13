import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  return {
    plugins: [
      react({
        // Enable Fast Refresh in development
        fastRefresh: true,
        // Optimize JSX runtime
        jsxRuntime: 'automatic',
        // Remove prop-types in production
        babel: isProd
          ? {
              plugins: [['babel-plugin-react-remove-properties', { properties: ['data-testid'] }]],
            }
          : undefined,
      }),

      // PWA Configuration
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'NOA UI Dashboard',
          short_name: 'NOA',
          description: 'Next-generation AI infrastructure monitoring and management',
          theme_color: '#6366f1',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          // Cache strategy
          globPatterns: ['**/*.{js,css,html,png,svg,woff2,webp}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60, // 5 minutes
                },
                networkTimeoutSeconds: 10,
              },
            },
            {
              urlPattern: /^https:\/\/cdn\./,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cdn-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
              },
            },
          ],
          // Skip waiting and claim clients immediately
          skipWaiting: true,
          clientsClaim: true,
          // Clean old caches
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: false, // Disable in dev for faster HMR
        },
      }),

      // Compression plugin for gzip and brotli
      compression({
        include: /\.(js|mjs|json|css|html)$/,
        threshold: 1024, // Only compress files > 1KB
        algorithm: 'gzip',
        deleteOriginFile: false,
      }),
      compression({
        include: /\.(js|mjs|json|css|html)$/,
        threshold: 1024,
        algorithm: 'brotliCompress',
        deleteOriginFile: false,
      }),

      // Bundle analyzer
      isProd &&
        visualizer({
          filename: './docs/bundle-stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
          template: 'treemap', // 'sunburst', 'treemap', 'network'
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@api': path.resolve(__dirname, './src/api'),
        '@stores': path.resolve(__dirname, './src/stores'),
        '@types': path.resolve(__dirname, './src/types'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@config': path.resolve(__dirname, './src/config'),
      },
    },

    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      // Inline small assets (<4KB) as base64
      assetsInlineLimit: 4096,
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Source maps for production debugging (disable for smaller bundles)
      sourcemap: env.VITE_SOURCEMAP === 'true',
      // Minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          pure_funcs: isProd ? ['console.log', 'console.info', 'console.debug'] : [],
          passes: 2,
        },
        format: {
          comments: false,
        },
      },
      // Rollup options for advanced code splitting
      rollupOptions: {
        output: {
          // Manual chunks for optimal splitting
          manualChunks: (id) => {
            // React vendor chunk
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }
            // Router chunk
            if (id.includes('node_modules/react-router')) {
              return 'router-vendor';
            }
            // Chart libraries
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
              return 'chart-vendor';
            }
            // UI component libraries
            if (
              id.includes('node_modules/bits-ui') ||
              id.includes('node_modules/@radix-ui') ||
              id.includes('node_modules/framer-motion')
            ) {
              return 'ui-vendor';
            }
            // Forms and validation
            if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/zod')) {
              return 'form-vendor';
            }
            // Utilities
            if (
              id.includes('node_modules/axios') ||
              id.includes('node_modules/date-fns') ||
              id.includes('node_modules/zustand')
            ) {
              return 'utils-vendor';
            }
            // Large data processing libraries
            if (id.includes('node_modules/xlsx') || id.includes('node_modules/papaparse')) {
              return 'data-vendor';
            }
          },
          // Asset naming with content hash
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.');
            const extType = info?.[info.length - 1];
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/\.(woff|woff2|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            if (extType === 'css') {
              return 'assets/css/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
        // External dependencies (if building as library)
        external: [],
      },
      // Report compressed size
      reportCompressedSize: true,
      // Chunk size warnings
      chunkSizeWarningLimit: 500, // 500KB warning threshold
    },

    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'zustand',
        'axios',
        'framer-motion',
        'bits-ui',
      ],
      exclude: ['@noa/shared-utils'],
    },

    // Server configuration
    server: {
      port: 5173,
      host: true,
      strictPort: false,
      open: env.VITE_OPEN_BROWSER === 'true',
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // Preview server configuration
    preview: {
      port: 4173,
      host: true,
      strictPort: false,
      open: false,
    },

    // Performance optimizations
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
      legalComments: 'none',
      treeShaking: true,
    },

    // CSS optimization
    css: {
      devSourcemap: !isProd,
      modules: {
        localsConvention: 'camelCaseOnly',
      },
      postcss: {
        plugins: [],
      },
    },

    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __DEV__: !isProd,
    },
  };
});
