import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/http/index.ts',
    'src/websocket/index.ts',
    'src/mqtt/index.ts',
    'src/tcp/index.ts',
    'src/webhook/index.ts',
    'src/database/index.ts',
    'src/file/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ['@furlow/core', 'axios', 'ws', 'mqtt', 'chokidar'],
});
