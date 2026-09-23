import { defineConfig } from 'vite-plus';
import react from '@vitejs/plugin-react';

const devOrigin = process.env.VITE_DEV_ORIGIN;
const devOriginUrl = devOrigin ? new URL(devOrigin) : null;

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5182,
    strictPort: false,
    allowedHosts: true,
    ...(devOriginUrl ? { origin: devOrigin } : {}),
    ...(devOriginUrl?.protocol === 'https:'
      ? {
          ws: {
            protocol: 'wss',
            host: devOriginUrl.hostname,
            clientPort: devOriginUrl.port ? Number(devOriginUrl.port) : 443,
          },
        }
      : {}),
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5108',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const host = req.headers.host;
            if (typeof host === 'string' && host) {
              proxyReq.setHeader('X-Forwarded-Host', host);
            }
          });
        },
      },
    },
  },
  fmt: {
    singleQuote: true,
  },
  lint: {
    ignorePatterns: ['dist/**', 'e2e/**', 'playwright.config.ts', 'vite.config.ts'],
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});
