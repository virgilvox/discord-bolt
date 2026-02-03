import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    '@furlow/core',
    '@furlow/discord',
    '@furlow/schema',
    '@furlow/storage',
    '@furlow/pipes',
    '@furlow/builtins',
  ],
});
