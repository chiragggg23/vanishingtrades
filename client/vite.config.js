import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // process.env wins over .env files so `VITE_USE_MOCK=false npm run build` works everywhere.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const useMock = String(env.VITE_USE_MOCK ?? 'true').toLowerCase() !== 'false';
  const isTest = Boolean(process.env.VITEST);
  return {
    plugins: [react()],
    // A literal, so the bundler removes the mock branch (and its import) from real builds.
    // Tests leave it undefined and set globalThis.__VT_MOCK__ instead (see src/test/setup.js).
    define: isTest ? {} : { __VT_MOCK__: JSON.stringify(useMock) },
    server: { port: 5173, fs: { allow: ['..'] } },
    preview: { port: 4173 },
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-'))
              return 'charts';
            if (id.includes('node_modules/framer-motion')) return 'motion';
            if (
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/scheduler') ||
              id.includes('node_modules/react-router')
            )
              return 'react';
            return undefined;
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      css: true,
      testTimeout: 15000,
    },
  };
});
