import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.integration.test.ts'],
    setupFiles: ['./test-setup.ts'],
    testTimeout: 30_000,
  },
});
