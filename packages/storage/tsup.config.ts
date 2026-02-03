import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/sqlite/index.ts',
    'src/postgres/index.ts',
    'src/memory/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ['better-sqlite3', 'pg'],
});
