/**
 * Test fixtures
 */

import type { FurlowSpec } from '@furlow/schema';

/**
 * Minimal valid spec
 */
export const minimalSpec: FurlowSpec = {
  version: '0.1',
  intents: { auto: true },
};

/**
 * Spec with a simple command
 */
export const simpleCommandSpec: FurlowSpec = {
  version: '0.1',
  intents: { auto: true },
  commands: [
    {
      name: 'ping',
      description: 'Test command',
      actions: [
        {
          action: 'reply',
          content: 'Pong!',
        },
      ],
    },
  ],
};

/**
 * Spec with an event handler
 */
export const simpleEventSpec: FurlowSpec = {
  version: '0.1',
  intents: { auto: true },
  events: [
    {
      event: 'ready',
      actions: [
        {
          action: 'log',
          level: 'info',
          message: 'Bot is ready!',
        },
      ],
    },
  ],
};

/**
 * Spec with state configuration
 */
export const stateSpec: FurlowSpec = {
  version: '0.1',
  intents: { auto: true },
  state: {
    variables: {
      counter: {
        type: 'number',
        scope: 'guild',
        default: 0,
      },
    },
    tables: {
      users: {
        columns: {
          id: { type: 'string', primary: true },
          name: { type: 'string' },
          xp: { type: 'number', default: 0 },
        },
      },
    },
    storage: {
      type: 'memory',
    },
  },
};

/**
 * Spec with a flow
 */
export const flowSpec: FurlowSpec = {
  version: '0.1',
  intents: { auto: true },
  flows: [
    {
      name: 'greet',
      parameters: [
        { name: 'name', type: 'string', required: true },
      ],
      actions: [
        {
          action: 'log',
          message: 'Hello, ${args.name}!',
        },
      ],
      returns: 'true',
    },
  ],
};

/**
 * Full featured spec for integration testing
 */
export const fullSpec: FurlowSpec = {
  version: '0.1',
  identity: {
    name: 'TestBot',
  },
  presence: {
    status: 'online',
    activity: {
      type: 'playing',
      text: 'Testing',
    },
  },
  intents: {
    explicit: ['guilds', 'guild_messages', 'message_content'],
  },
  commands: [
    {
      name: 'test',
      description: 'Test command',
      options: [
        {
          name: 'input',
          description: 'Test input',
          type: 'string',
          required: true,
        },
      ],
      actions: [
        {
          action: 'reply',
          content: 'You said: ${args.input}',
        },
      ],
    },
  ],
  events: [
    {
      event: 'ready',
      actions: [
        {
          action: 'log',
          level: 'info',
          message: 'Bot ready',
        },
      ],
    },
  ],
  flows: [
    {
      name: 'echo',
      parameters: [
        { name: 'text', type: 'string', required: true },
      ],
      actions: [
        {
          action: 'log',
          message: '${args.text}',
        },
      ],
    },
  ],
};
