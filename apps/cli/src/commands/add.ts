/**
 * Add command - add builtins to a project
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';

interface AddOptions {
  list: boolean;
}

const BUILTINS = {
  moderation: {
    name: 'Moderation',
    description: 'Warn, kick, ban, mute, and case management',
    files: ['commands/moderation.yaml'],
  },
  welcome: {
    name: 'Welcome',
    description: 'Join/leave messages, auto-role, welcome images',
    files: ['events/welcome.yaml'],
  },
  logging: {
    name: 'Logging',
    description: 'Message, member, and server event logging',
    files: ['events/logging.yaml'],
  },
  tickets: {
    name: 'Tickets',
    description: 'Support ticket system with claiming and transcripts',
    files: ['commands/tickets.yaml', 'flows/ticket-create.yaml'],
  },
  'reaction-roles': {
    name: 'Reaction Roles',
    description: 'Role assignment via reactions or buttons',
    files: ['commands/reaction-roles.yaml'],
  },
  leveling: {
    name: 'Leveling',
    description: 'XP, levels, rewards, and leaderboards',
    files: ['events/leveling.yaml', 'commands/leveling.yaml'],
  },
  music: {
    name: 'Music',
    description: 'Music player with queue, filters, and playlists',
    files: ['commands/music.yaml'],
  },
  starboard: {
    name: 'Starboard',
    description: 'Star reactions and hall of fame',
    files: ['events/starboard.yaml'],
  },
  polls: {
    name: 'Polls',
    description: 'Voting and multiple choice polls',
    files: ['commands/polls.yaml'],
  },
  giveaways: {
    name: 'Giveaways',
    description: 'Giveaways with requirements and reroll',
    files: ['commands/giveaways.yaml'],
  },
  'auto-responder': {
    name: 'Auto Responder',
    description: 'Custom triggers and responses',
    files: ['events/auto-responder.yaml'],
  },
  afk: {
    name: 'AFK',
    description: 'AFK status and mention notifications',
    files: ['commands/afk.yaml', 'events/afk.yaml'],
  },
  reminders: {
    name: 'Reminders',
    description: 'Personal reminders with DM delivery',
    files: ['commands/reminders.yaml'],
  },
  utilities: {
    name: 'Utilities',
    description: 'Serverinfo, userinfo, avatar, and more',
    files: ['commands/utilities.yaml'],
  },
};

export async function addCommand(
  builtin: string,
  options: AddOptions
): Promise<void> {
  // List available builtins
  if (options.list || builtin === 'list') {
    console.log(chalk.bold.cyan('\n  Available Builtins\n'));

    for (const [key, value] of Object.entries(BUILTINS)) {
      console.log(`  ${chalk.bold(key)}`);
      console.log(chalk.dim(`    ${value.description}`));
    }

    console.log('\n  Usage: ' + chalk.dim('furlow add <builtin>'));
    console.log('');
    return;
  }

  // Check if builtin exists
  if (!(builtin in BUILTINS)) {
    console.error(chalk.red(`\n  Error: Unknown builtin "${builtin}"`));
    console.log(chalk.dim('  Use "furlow add --list" to see available builtins\n'));
    process.exit(1);
  }

  const builtinInfo = BUILTINS[builtin as keyof typeof BUILTINS];

  console.log(chalk.bold.cyan(`\n  Adding ${builtinInfo.name} builtin\n`));

  const spinner = ora('Adding builtin configuration...').start();

  try {
    // Read the main spec file
    const specPath = resolve('furlow.yaml');
    let specContent: string;

    try {
      specContent = await readFile(specPath, 'utf-8');
    } catch {
      spinner.fail('Could not find furlow.yaml in current directory');
      process.exit(1);
    }

    // Check if builtin is already added
    if (specContent.includes(`module: ${builtin}`)) {
      spinner.warn(`${builtinInfo.name} is already added`);
      return;
    }

    // Add builtin reference to spec
    const builtinEntry = `  - module: ${builtin}`;

    if (specContent.includes('builtins:')) {
      // Add to existing builtins section
      specContent = specContent.replace(
        /builtins:\n/,
        `builtins:\n${builtinEntry}\n`
      );
    } else {
      // Create builtins section
      specContent += `\nbuiltins:\n${builtinEntry}\n`;
    }

    await writeFile(specPath, specContent);

    spinner.succeed(`Added ${builtinInfo.name} builtin`);

    console.log('\n  Files that will be active:');
    for (const file of builtinInfo.files) {
      console.log(chalk.dim(`    - ${file}`));
    }

    console.log('\n  ' + chalk.green('Builtin added successfully!'));
    console.log(chalk.dim('  Restart your bot to apply changes.\n'));

  } catch (error) {
    spinner.fail('Failed to add builtin');

    if (error instanceof Error) {
      console.error(chalk.red(`\n  ${error.message}\n`));
    }

    process.exit(1);
  }
}
