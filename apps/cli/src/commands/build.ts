/**
 * Build command - bundle for deployment
 */

import { mkdir, copyFile, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, relative, dirname } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';

interface BuildOptions {
  output: string;
}

export async function buildCommand(
  path: string | undefined,
  options: BuildOptions
): Promise<void> {
  const specPath = resolve(path ?? 'furlow.yaml');
  const specDir = dirname(specPath);
  const outputDir = resolve(options.output);

  console.log(chalk.bold.cyan('\n  FURLOW Build\n'));

  const spinner = ora('Building...').start();

  try {
    // Load and validate spec
    const { loadSpec } = await import('@furlow/core/parser');
    const { spec, files } = await loadSpec(specPath, {
      validate: true,
    });

    spinner.text = 'Creating output directory...';

    // Create output directory
    await mkdir(outputDir, { recursive: true });

    spinner.text = 'Copying specification files...';

    // Copy all YAML files
    for (const file of files) {
      const relativePath = relative(specDir, file);
      const destPath = join(outputDir, relativePath);

      await mkdir(dirname(destPath), { recursive: true });
      await copyFile(file, destPath);
    }

    spinner.text = 'Generating metadata...';

    // Generate build info
    const buildInfo = {
      version: '0.1.0',
      built: new Date().toISOString(),
      files: files.map((f) => relative(specDir, f)),
      commands: spec.commands?.length ?? 0,
      events: spec.events?.length ?? 0,
      flows: spec.flows?.length ?? 0,
    };

    await writeFile(
      join(outputDir, 'build.json'),
      JSON.stringify(buildInfo, null, 2)
    );

    // Copy assets if they exist
    const assetsDir = join(specDir, 'assets');
    try {
      const assetsStat = await stat(assetsDir);
      if (assetsStat.isDirectory()) {
        spinner.text = 'Copying assets...';
        await copyDir(assetsDir, join(outputDir, 'assets'));
      }
    } catch {
      // Assets directory doesn't exist, skip
    }

    // Copy .env.example if it exists
    try {
      await copyFile(
        join(specDir, '.env.example'),
        join(outputDir, '.env.example')
      );
    } catch {
      // No .env.example, skip
    }

    // Generate package.json for deployment
    await writeFile(
      join(outputDir, 'package.json'),
      JSON.stringify(
        {
          name: 'furlow-bot',
          version: '1.0.0',
          private: true,
          type: 'module',
          scripts: {
            start: 'furlow start furlow.yaml',
          },
          dependencies: {
            furlow: '^0.1.0',
          },
        },
        null,
        2
      )
    );

    // Generate Dockerfile
    await writeFile(
      join(outputDir, 'Dockerfile'),
      `FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

CMD ["npm", "start"]
`
    );

    spinner.succeed('Build complete');

    console.log('\n  Output:');
    console.log(chalk.dim(`    Directory: ${outputDir}`));
    console.log(chalk.dim(`    Files: ${files.length} YAML files`));
    console.log(chalk.dim(`    Commands: ${buildInfo.commands}`));
    console.log(chalk.dim(`    Events: ${buildInfo.events}`));

    console.log('\n  To deploy:');
    console.log(chalk.dim(`    cd ${options.output}`));
    console.log(chalk.dim('    npm install'));
    console.log(chalk.dim('    # Set environment variables'));
    console.log(chalk.dim('    npm start'));
    console.log('');

  } catch (error) {
    spinner.fail('Build failed');

    if (error instanceof Error) {
      console.error(chalk.red(`\n  ${error.message}\n`));
    }

    process.exit(1);
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });

  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}
