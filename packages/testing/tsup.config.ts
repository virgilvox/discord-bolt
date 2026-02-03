import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/mocks/index.ts',
    'src/fixtures/index.ts',
    'src/helpers/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ['@furlow/core', '@furlow/discord', '@furlow/schema'],
});
