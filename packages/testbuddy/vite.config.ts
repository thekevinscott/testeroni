import { defineConfig, } from 'vitest/config';
import dts from 'vite-plugin-dts';

import packageJson from "./package.json";

const dependencies = [
  ...Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }),
  'fs',
  'path',
  'net',
  'util',
  'stream',
  'tls',
  'url',
];

const noExternal = dependencies;

export default defineConfig({
  build: {
    lib: {
      entry: ['./src/index.ts', './src/bin/cli.ts'],
      fileName: 'index',
      // formats: ['es'],
    },
    sourcemap: true,
    target: 'node',
  },
  ssr: {
    noExternal,
  },
  plugins: [dts(),],
  test: {
    include: ['**/*.test.ts',],
    globals: true,
    // ts
    typecheck: {
      tsconfig: '../../tsconfig.test.json',
    },
  },
});
