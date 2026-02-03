import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  outDir: 'dist/server',
  external: [
    '@furlow/core',
    '@furlow/discord',
    '@furlow/schema',
    '@furlow/storage',
    'express',
    'express-session',
    'passport',
    'passport-discord',
    'prom-client',
    'ws',
  ],
});
