/**
 * Validate command - check YAML syntax and schema
 */

import { resolve } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';

interface ValidateOptions {
  strict: boolean;
}

export async function validateCommand(
  path: string,
  options: ValidateOptions
): Promise<void> {
  const specPath = resolve(path);

  console.log(chalk.bold.cyan('\n  FURLOW Validator\n'));

  const spinner = ora('Loading and validating...').start();

  try {
    const { loadSpec } = await import('@furlow/core/parser');
    const { validateFurlowSpec, formatValidationErrors } = await import('@furlow/schema');

    // Load the spec (with validation)
    const { spec, files } = await loadSpec(specPath, {
      validate: true,
    });

    spinner.succeed(`Loaded ${files.length} file(s)`);

    // Additional validation
    const result = validateFurlowSpec(spec);

    if (!result.valid) {
      console.log('\n' + chalk.red('  Validation errors:\n'));
      for (const error of result.errors) {
        console.log(chalk.red(`    ${error.path}`));
        console.log(chalk.dim(`      ${error.message}`));
      }
      console.log('');
      process.exit(1);
    }

    // Strict mode checks
    if (options.strict) {
      const warnings: string[] = [];

      // Check for missing descriptions
      if (spec.commands) {
        for (const cmd of spec.commands) {
          if (!cmd.description || cmd.description.length < 10) {
            warnings.push(`Command "${cmd.name}" has a short or missing description`);
          }
        }
      }

      // Check for empty actions
      if (spec.events) {
        for (const event of spec.events) {
          if (!event.actions || event.actions.length === 0) {
            warnings.push(`Event handler for "${event.event}" has no actions`);
          }
        }
      }

      if (warnings.length > 0) {
        console.log('\n' + chalk.yellow('  Warnings:\n'));
        for (const warning of warnings) {
          console.log(chalk.yellow(`    - ${warning}`));
        }
        console.log('');
      }
    }

    // Print summary
    console.log('\n' + chalk.green('  Specification is valid!\n'));
    console.log('  Summary:');
    console.log(chalk.dim(`    Commands: ${spec.commands?.length ?? 0}`));
    console.log(chalk.dim(`    Events: ${spec.events?.length ?? 0}`));
    console.log(chalk.dim(`    Flows: ${spec.flows?.length ?? 0}`));
    console.log(chalk.dim(`    Pipes: ${Object.keys(spec.pipes ?? {}).length}`));
    console.log('');

  } catch (error) {
    spinner.fail('Validation failed');

    if (error instanceof Error) {
      console.error('\n' + chalk.red(`  ${error.message}`));

      // Show file location if available
      if ('file' in error && 'line' in error) {
        const e = error as { file?: string; line?: number; column?: number };
        console.log(chalk.dim(`    at ${e.file}:${e.line}:${e.column ?? 0}`));
      }
    }

    console.log('');
    process.exit(1);
  }
}
