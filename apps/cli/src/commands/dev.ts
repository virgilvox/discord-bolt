/**
 * Dev command - run with hot reload
 */

import { resolve, dirname } from 'node:path';
import { watch } from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import { config as loadEnv } from 'dotenv';

interface DevOptions {
  env: string;
  validate: boolean;
}

export async function devCommand(
  path: string | undefined,
  options: DevOptions
): Promise<void> {
  const specPath = resolve(path ?? 'furlow.yaml');
  const specDir = dirname(specPath);

  console.log(chalk.bold.cyan('\n  FURLOW Development Mode\n'));

  // Load environment variables
  loadEnv({ path: resolve(options.env) });

  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    console.error(chalk.red('  Error: DISCORD_TOKEN and DISCORD_CLIENT_ID are required'));
    process.exit(1);
  }

  let client: any = null;
  let isRestarting = false;
  let restartTimer: NodeJS.Timeout | null = null;

  const start = async () => {
    const spinner = ora('Loading specification...').start();

    try {
      const { loadSpec } = await import('@furlow/core/parser');
      const { spec } = await loadSpec(specPath, {
        validate: options.validate,
      });

      spinner.succeed('Specification loaded');

      // Stop existing client
      if (client) {
        await client.stop();
      }

      const connectSpinner = ora('Connecting to Discord...').start();

      const { createClient } = await import('@furlow/discord/client');
      client = createClient({ token, spec });

      await client.start();

      connectSpinner.succeed('Connected to Discord');
      console.log(chalk.dim('    Watching for changes...\n'));

    } catch (error) {
      spinner.fail('Failed to start');
      if (error instanceof Error) {
        console.error(chalk.red(`    ${error.message}`));
      }
    }

    isRestarting = false;
  };

  const scheduleRestart = () => {
    if (isRestarting) return;
    isRestarting = true;

    if (restartTimer) {
      clearTimeout(restartTimer);
    }

    // Debounce restarts
    restartTimer = setTimeout(() => {
      console.log(chalk.yellow('\n  File change detected, reloading...'));
      start();
    }, 500);
  };

  // Initial start
  await start();

  // Watch for file changes
  const watcher = watch(
    specDir,
    { recursive: true },
    (eventType, filename) => {
      if (filename?.endsWith('.yaml') || filename?.endsWith('.yml')) {
        scheduleRestart();
      }
    }
  );

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\n' + chalk.yellow('  Shutting down...'));
    watcher.close();
    if (client) {
      await client.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
