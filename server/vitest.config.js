import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 180000,
    fileParallelism: false,
    env: { NODE_ENV: 'test', RATE_LIMIT_DISABLED: 'true', DEMO_MODE: 'true' },
  },
});
