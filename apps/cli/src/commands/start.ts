/**
 * Start command - run the FURLOW bot
 */

import { resolve } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { config as loadEnv } from 'dotenv';

interface StartOptions {
  env: string;
  validate: boolean;
}

export async function startCommand(
  path: string | undefined,
  options: StartOptions
): Promise<void> {
  const specPath = resolve(path ?? 'furlow.yaml');

  console.log(chalk.bold.cyan('\n  FURLOW Bot Runner\n'));

  // Load environment variables
  const envResult = loadEnv({ path: resolve(options.env) });
  if (envResult.error) {
    console.log(chalk.yellow(`  Warning: Could not load ${options.env}`));
  }

  // Check required environment variables
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token) {
    console.error(chalk.red('  Error: DISCORD_TOKEN is not set'));
    console.log(chalk.dim('  Set it in your .env file or environment'));
    process.exit(1);
  }

  if (!clientId) {
    console.error(chalk.red('  Error: DISCORD_CLIENT_ID is not set'));
    console.log(chalk.dim('  Set it in your .env file or environment'));
    process.exit(1);
  }

  const spinner = ora('Loading specification...').start();

  try {
    // Dynamic import of core modules
    const { loadSpec } = await import('@furlow/core/parser');
    const { validateFurlowSpec } = await import('@furlow/schema');

    // Load the spec
    const { spec, files } = await loadSpec(specPath, {
      validate: options.validate,
    });

    spinner.succeed(`Loaded ${files.length} file(s)`);

    // Validate if enabled
    if (options.validate) {
      const validationSpinner = ora('Validating specification...').start();
      const result = validateFurlowSpec(spec);
      if (!result.valid) {
        validationSpinner.fail('Validation failed');
        for (const error of result.errors) {
          console.log(chalk.red(`    ${error.path}: ${error.message}`));
        }
        process.exit(1);
      }
      validationSpinner.succeed('Specification valid');
    }

    // Create and start the bot
    const connectSpinner = ora('Connecting to Discord...').start();

    const { createClient } = await import('@furlow/discord/client');
    const client = createClient({ token, spec });

    await client.start();

    connectSpinner.succeed('Connected to Discord');

    console.log('\n' + chalk.green('  Bot is running!'));
    console.log(chalk.dim(`    Guilds: ${client.guildCount}`));
    console.log(chalk.dim(`    Press Ctrl+C to stop\n`));

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\n' + chalk.yellow('  Shutting down...'));
      await client.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    spinner.fail('Failed to start bot');

    if (error instanceof Error) {
      console.error(chalk.red(`\n  ${error.message}`));

      if ('code' in error) {
        console.log(chalk.dim(`  Error code: ${(error as any).code}`));
      }
    }

    process.exit(1);
  }
}
