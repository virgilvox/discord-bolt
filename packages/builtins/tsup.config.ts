import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/moderation/index.ts',
    'src/welcome/index.ts',
    'src/logging/index.ts',
    'src/tickets/index.ts',
    'src/reaction-roles/index.ts',
    'src/leveling/index.ts',
    'src/music/index.ts',
    'src/starboard/index.ts',
    'src/polls/index.ts',
    'src/giveaways/index.ts',
    'src/auto-responder/index.ts',
    'src/afk/index.ts',
    'src/reminders/index.ts',
    'src/utilities/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ['@furlow/core', '@furlow/discord', '@furlow/schema'],
});
