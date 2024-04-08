import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    testTimeout: 10000,
    hookTimeout: 1000,
    include: [
      'test/tests/**/*.test.ts',
    ],
    exclude: [
      'packages/**/*.test.*',
    ],
    watchExclude: [
      '**/*.json',
      'tmp/**/*',
    ],
    globals: true,
    typecheck: {
      tsconfig: './tsconfig.vitest.json'
    },
    setupFiles: [
      path.resolve(__dirname, './test/setup/index.ts'),
    ]
  },
});
