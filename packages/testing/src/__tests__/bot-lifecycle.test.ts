/**
 * Bot Lifecycle Integration Tests
 *
 * Tests the complete bot lifecycle with a mocked Discord client:
 * 1. Load YAML spec
 * 2. Create bot with mocked Discord
 * 3. Start bot
 * 4. Simulate Discord events (messages, interactions)
 * 5. Execute actions
 * 6. Verify responses
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import {
  loadSpecFromString,
  createEvaluator,
  createActionRegistry,
  createActionExecutor,
  createFlowEngine,
} from '@furlow/core';
import type { Action, FurlowSpec } from '@furlow/schema';
import type { ActionHandler, ActionContext } from '@furlow/core';

// ==========================================
// Mock Discord.js Implementation
// ==========================================

class MockUser {
  id: string;
  username: string;
  discriminator: string;
  bot: boolean;
  tag: string;

  constructor(data: Partial<MockUser> = {}) {
    this.id = data.id ?? '123456789012345678';
    this.username = data.username ?? 'TestUser';
    this.discriminator = data.discriminator ?? '0001';
    this.bot = data.bot ?? false;
    this.tag = `${this.username}#${this.discriminator}`;
  }

  toString() {
    return `<@${this.id}>`;
  }
}

class MockMember {
  user: MockUser;
  nickname: string | null;
  roles: MockRoleManager;
  permissions: MockPermissions;
  joinedAt: Date;

  constructor(user: MockUser, data: Partial<MockMember> = {}) {
    this.user = user;
    this.nickname = data.nickname ?? null;
    this.roles = new MockRoleManager();
    this.permissions = new MockPermissions();
    this.joinedAt = data.joinedAt ?? new Date();
  }

  get displayName() {
    return this.nickname ?? this.user.username;
  }

  get id() {
    return this.user.id;
  }
}

class MockRoleManager {
  cache = new Map<string, MockRole>();

  add(roleId: string) {
    return Promise.resolve(this);
  }

  remove(roleId: string) {
    return Promise.resolve(this);
  }
}

class MockRole {
  id: string;
  name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}

class MockPermissions {
  private perms = new Set<string>();

  has(permission: string) {
    return this.perms.has(permission);
  }

  add(permission: string) {
    this.perms.add(permission);
  }
}

class MockChannel {
  id: string;
  name: string;
  type: number;
  guildId: string;
  messages: MockMessage[] = [];

  constructor(data: Partial<MockChannel> = {}) {
    this.id = data.id ?? '111222333444555666';
    this.name = data.name ?? 'general';
    this.type = data.type ?? 0; // GUILD_TEXT
    this.guildId = data.guildId ?? '987654321098765432';
  }

  async send(content: string | { content?: string; embeds?: unknown[] }) {
    const messageContent = typeof content === 'string' ? content : content.content ?? '';
    const message = new MockMessage({
      content: messageContent,
      channelId: this.id,
      guildId: this.guildId,
    });
    this.messages.push(message);
    return message;
  }

  toString() {
    return `<#${this.id}>`;
  }
}

class MockMessage {
  id: string;
  content: string;
  author: MockUser;
  member: MockMember | null;
  channelId: string;
  guildId: string | null;
  createdAt: Date;
  replied = false;
  replyContent: string | null = null;

  constructor(data: Partial<MockMessage & { authorBot?: boolean }> = {}) {
    this.id = data.id ?? String(Date.now());
    this.content = data.content ?? '';
    this.author = new MockUser({ bot: data.authorBot ?? false });
    this.member = new MockMember(this.author);
    this.channelId = data.channelId ?? '111222333444555666';
    this.guildId = data.guildId ?? '987654321098765432';
    this.createdAt = data.createdAt ?? new Date();
  }

  async reply(content: string | { content?: string }) {
    this.replied = true;
    this.replyContent = typeof content === 'string' ? content : content.content ?? '';
    return new MockMessage({
      content: this.replyContent,
      channelId: this.channelId,
      guildId: this.guildId ?? undefined,
    });
  }
}

class MockGuild {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  channels = new Map<string, MockChannel>();
  members = new Map<string, MockMember>();

  constructor(data: Partial<MockGuild> = {}) {
    this.id = data.id ?? '987654321098765432';
    this.name = data.name ?? 'Test Server';
    this.ownerId = data.ownerId ?? '123456789012345678';
    this.memberCount = data.memberCount ?? 100;
  }
}

interface MockInteractionReply {
  content?: string;
  embeds?: unknown[];
  ephemeral?: boolean;
  components?: unknown[];
}

class MockCommandInteraction {
  id: string;
  commandName: string;
  options: Map<string, unknown>;
  user: MockUser;
  member: MockMember;
  channelId: string;
  guildId: string;
  replied = false;
  deferred = false;
  replyData: MockInteractionReply | null = null;

  constructor(commandName: string, options: Record<string, unknown> = {}) {
    this.id = String(Date.now());
    this.commandName = commandName;
    this.options = new Map(Object.entries(options));
    this.user = new MockUser();
    this.member = new MockMember(this.user);
    this.channelId = '111222333444555666';
    this.guildId = '987654321098765432';
  }

  isChatInputCommand() {
    return true;
  }
  isButton() {
    return false;
  }
  isStringSelectMenu() {
    return false;
  }
  isModalSubmit() {
    return false;
  }
  isUserContextMenuCommand() {
    return false;
  }
  isMessageContextMenuCommand() {
    return false;
  }
  isRepliable() {
    return true;
  }

  async reply(data: string | MockInteractionReply) {
    this.replied = true;
    this.replyData = typeof data === 'string' ? { content: data } : data;
    return this;
  }

  async deferReply(options?: { ephemeral?: boolean }) {
    this.deferred = true;
    return this;
  }

  async followUp(data: string | MockInteractionReply) {
    return this.reply(data);
  }

  getOption(name: string) {
    return this.options.get(name);
  }
}

class MockButtonInteraction {
  id: string;
  customId: string;
  user: MockUser;
  member: MockMember;
  channelId: string;
  guildId: string;
  replied = false;
  deferred = false;
  replyData: MockInteractionReply | null = null;
  message: MockMessage;

  constructor(customId: string) {
    this.id = String(Date.now());
    this.customId = customId;
    this.user = new MockUser();
    this.member = new MockMember(this.user);
    this.channelId = '111222333444555666';
    this.guildId = '987654321098765432';
    this.message = new MockMessage();
  }

  isChatInputCommand() {
    return false;
  }
  isButton() {
    return true;
  }
  isStringSelectMenu() {
    return false;
  }
  isModalSubmit() {
    return false;
  }
  isUserContextMenuCommand() {
    return false;
  }
  isMessageContextMenuCommand() {
    return false;
  }
  isRepliable() {
    return true;
  }

  async reply(data: string | MockInteractionReply) {
    this.replied = true;
    this.replyData = typeof data === 'string' ? { content: data } : data;
    return this;
  }

  async deferReply(options?: { ephemeral?: boolean }) {
    this.deferred = true;
    return this;
  }

  async update(data: MockInteractionReply) {
    this.replyData = data;
    return this;
  }
}

class MockDiscordClient extends EventEmitter {
  user: MockUser | null = null;
  guilds = {
    cache: new Map<string, MockGuild>(),
  };
  channels = {
    cache: new Map<string, MockChannel>(),
    fetch: async (id: string) => this.channels.cache.get(id),
  };
  private _isReady = false;

  async login(token: string) {
    this.user = new MockUser({ bot: true, username: 'TestBot' });

    // Add default guild and channel
    const guild = new MockGuild();
    const channel = new MockChannel({ guildId: guild.id });
    guild.channels.set(channel.id, channel);
    this.guilds.cache.set(guild.id, guild);
    this.channels.cache.set(channel.id, channel);

    this._isReady = true;
    this.emit('ready', this);
    return token;
  }

  isReady() {
    return this._isReady;
  }

  async destroy() {
    this._isReady = false;
    this.removeAllListeners();
  }

  // Simulate receiving a message
  simulateMessage(content: string, options: { authorBot?: boolean } = {}) {
    const message = new MockMessage({ content, authorBot: options.authorBot });
    this.emit('messageCreate', message);
    return message;
  }

  // Simulate a command interaction
  simulateCommand(name: string, options: Record<string, unknown> = {}) {
    const interaction = new MockCommandInteraction(name, options);
    this.emit('interactionCreate', interaction);
    return interaction;
  }

  // Simulate a button click
  simulateButton(customId: string) {
    const interaction = new MockButtonInteraction(customId);
    this.emit('interactionCreate', interaction);
    return interaction;
  }
}

// ==========================================
// Test Bot Runtime
// ==========================================

interface BotRuntime {
  client: MockDiscordClient;
  spec: FurlowSpec;
  registry: ReturnType<typeof createActionRegistry>;
  evaluator: ReturnType<typeof createEvaluator>;
  executor: ReturnType<typeof createActionExecutor>;
  flowEngine: ReturnType<typeof createFlowEngine>;
  executedActions: Array<{ action: string; config: Action; result: unknown }>;
  replies: string[];
  start(): Promise<void>;
  stop(): Promise<void>;
}

function createTestBot(yamlSpec: string): BotRuntime {
  const spec = loadSpecFromString(yamlSpec);
  const client = new MockDiscordClient();
  const registry = createActionRegistry();
  const evaluator = createEvaluator();
  const flowEngine = createFlowEngine();

  const executedActions: BotRuntime['executedActions'] = [];
  const replies: string[] = [];

  // Register mock action handlers
  const createHandler = (name: string): ActionHandler => ({
    name,
    execute: async (config, context) => {
      executedActions.push({ action: name, config, result: null });
      return { success: true, data: { action: name } };
    },
  });

  // Register reply handler that tracks replies
  registry.register({
    name: 'reply',
    execute: async (config: any, context) => {
      const content = await evaluator.interpolate(config.content ?? '', context);
      replies.push(content);
      executedActions.push({ action: 'reply', config, result: content });
      return { success: true, data: { content } };
    },
  });

  // Register send_message handler
  registry.register({
    name: 'send_message',
    execute: async (config: any, context) => {
      const content = await evaluator.interpolate(config.content ?? '', context);
      replies.push(content);
      executedActions.push({ action: 'send_message', config, result: content });
      return { success: true, data: { content } };
    },
  });

  // Register common actions
  ['log', 'defer', 'assign_role', 'remove_role', 'ban', 'kick', 'timeout'].forEach((name) => {
    registry.register(createHandler(name));
  });

  // Register flow control actions are handled by flow engine
  const executor = createActionExecutor(registry, evaluator);

  // Register flows from spec
  if (spec.flows) {
    flowEngine.registerAll(spec.flows);
  }

  const runtime: BotRuntime = {
    client,
    spec,
    registry,
    evaluator,
    executor,
    flowEngine,
    executedActions,
    replies,

    async start() {
      await client.login('test-token');

      // Set up event handlers from spec
      if (spec.events) {
        for (const handler of spec.events) {
          const eventName = mapEventName(handler.event);
          client.on(eventName as any, async (eventData: unknown) => {
            const context = createContextFromEvent(eventData, spec, evaluator, flowEngine);

            // Check condition
            if (handler.when) {
              const shouldRun = await evaluator.evaluate<boolean>(
                typeof handler.when === 'string' ? handler.when : handler.when.expr ?? 'true',
                context
              );
              if (!shouldRun) return;
            }

            // Execute actions
            await executor.executeSequence(handler.actions, context);
          });
        }
      }

      // Set up command handlers
      client.on('interactionCreate', async (interaction: unknown) => {
        if (interaction instanceof MockCommandInteraction) {
          const command = spec.commands?.find((c) => c.name === interaction.commandName);
          if (command && command.actions) {
            const context = createContextFromInteraction(interaction, spec, evaluator, flowEngine);
            await executor.executeSequence(command.actions, context);
          }
        }

        if (interaction instanceof MockButtonInteraction) {
          // Find button handler in components
          const buttonHandler = spec.components?.buttons?.[interaction.customId];
          if (buttonHandler?.actions) {
            const context = createContextFromInteraction(interaction, spec, evaluator, flowEngine);
            await executor.executeSequence(buttonHandler.actions, context);
          }
        }
      });

      // Emit ready event from spec
      const readyHandler = spec.events?.find((e) => e.event === 'ready');
      if (readyHandler) {
        const context = createContextFromEvent(client, spec, evaluator, flowEngine);
        await executor.executeSequence(readyHandler.actions, context);
      }
    },

    async stop() {
      await client.destroy();
    },
  };

  return runtime;
}

function mapEventName(event: string): string {
  const map: Record<string, string> = {
    ready: 'ready',
    message_create: 'messageCreate',
    message: 'messageCreate',
    guild_member_add: 'guildMemberAdd',
    guild_member_remove: 'guildMemberRemove',
    member_join: 'guildMemberAdd',
    member_leave: 'guildMemberRemove',
    interaction_create: 'interactionCreate',
  };
  return map[event] ?? event;
}

function createContextFromEvent(
  eventData: unknown,
  spec: FurlowSpec,
  evaluator: ReturnType<typeof createEvaluator>,
  flowEngine: ReturnType<typeof createFlowEngine>
): ActionContext {
  // Extract data from event
  let user = { id: '123', username: 'User', mention: '<@123>' };
  let member = { id: '123', display_name: 'User', roles: [], permissions: [] };
  let guild = { id: '987', name: 'Test Server', member_count: 100 };
  let channel = { id: '111', name: 'general', mention: '<#111>' };
  let message: { id: string; content: string; author: unknown } | undefined;

  if (eventData instanceof MockMessage) {
    user = {
      id: eventData.author.id,
      username: eventData.author.username,
      mention: `<@${eventData.author.id}>`,
    };
    message = {
      id: eventData.id,
      content: eventData.content,
      author: eventData.author,
    };
  }

  return {
    now: new Date(),
    random: Math.random(),
    user,
    member,
    guild,
    channel,
    message,
    args: {},
    guildId: guild.id,
    channelId: channel.id,
    userId: user.id,
    client: {},
    stateManager: {},
    evaluator,
    flowExecutor: flowEngine,
  } as ActionContext;
}

function createContextFromInteraction(
  interaction: MockCommandInteraction | MockButtonInteraction,
  spec: FurlowSpec,
  evaluator: ReturnType<typeof createEvaluator>,
  flowEngine: ReturnType<typeof createFlowEngine>
): ActionContext {
  const args: Record<string, unknown> = {};

  if (interaction instanceof MockCommandInteraction) {
    for (const [key, value] of interaction.options) {
      args[key] = value;
    }
  }

  return {
    now: new Date(),
    random: Math.random(),
    user: {
      id: interaction.user.id,
      username: interaction.user.username,
      mention: `<@${interaction.user.id}>`,
    },
    member: {
      id: interaction.member.id,
      display_name: interaction.member.displayName,
      roles: [],
      permissions: [],
    },
    guild: { id: interaction.guildId, name: 'Test Server', member_count: 100 },
    channel: { id: interaction.channelId, name: 'general', mention: `<#${interaction.channelId}>` },
    args,
    interaction,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    userId: interaction.user.id,
    client: {},
    stateManager: {},
    evaluator,
    flowExecutor: flowEngine,
  } as ActionContext;
}

// ==========================================
// Tests
// ==========================================

describe('Bot Lifecycle', () => {
  describe('Bot Startup', () => {
    it('should start bot and execute ready event', async () => {
      const bot = createTestBot(`
version: "0.1"
intents:
  auto: true
events:
  - event: ready
    actions:
      - action: log
        message: "Bot is online!"
`);

      await bot.start();

      expect(bot.client.isReady()).toBe(true);
      expect(bot.executedActions.map((a) => a.action)).toContain('log');

      await bot.stop();
    });

    it('should load spec with commands and events', async () => {
      const bot = createTestBot(`
version: "0.1"
intents:
  auto: true
commands:
  - name: ping
    description: Check latency
    actions:
      - action: reply
        content: "Pong!"
events:
  - event: ready
    actions:
      - action: log
        message: "Ready!"
`);

      await bot.start();

      expect(bot.spec.commands).toHaveLength(1);
      expect(bot.spec.events).toHaveLength(1);

      await bot.stop();
    });
  });

  describe('Command Handling', () => {
    it('should handle slash command and reply', async () => {
      const bot = createTestBot(`
version: "0.1"
intents:
  auto: true
commands:
  - name: ping
    description: Ping command
    actions:
      - action: reply
        content: "Pong!"
`);

      await bot.start();

      // Simulate command
      bot.client.simulateCommand('ping');

      // Wait for async execution
      await new Promise((r) => setTimeout(r, 10));

      expect(bot.replies).toContain('Pong!');

      await bot.stop();
    });

    it('should handle command with options', async () => {
      const bot = createTestBot(`
version: "0.1"
intents:
  auto: true
commands:
  - name: echo
    description: Echo message
    options:
      - name: text
        description: Text to echo
        type: string
        required: true
    actions:
      - action: reply
        content: "You said: \${args.text}"
`);

      await bot.start();

      bot.client.simulateCommand('echo', { text: 'Hello World' });
      await new Promise((r) => setTimeout(r, 10));

      expect(bot.replies).toContain('You said: Hello World');

      await bot.stop();
    });

    it('should handle multiple commands', async () => {
      const bot = createTestBot(`
version: "0.1"
intents:
  auto: true
commands:
  - name: ping
    description: Ping
    actions:
      - action: reply
        content: "Pong!"
  - name: hello
    description: Greet
    actions:
      - action: reply
        content: "Hello there!"
`);

      await bot.start();

      bot.client.simulateCommand('ping');
      await new Promise((r) => setTimeout(r, 10));

      bot.client.simulateCommand('hello');
      await new Promise((r) => setTimeout(r, 10));

      expect(bot.replies).toContain('Pong!');
      expect(bot.replies).toContain('Hello there!');

      await bot.stop();
    });
  });

  describe('Event Handling', () => {
    it('should handle message_create event', async () => {
      const bot = createTestBot(`
version: "0.1"
intents:
  auto: true
events:
  - event: message_create
    when: "!message.author.bot"
    actions:
      - action: log
        message: "Message received"
`);

      await bot.start();

      // Simulate a user message (not bot)
      bot.client.simulateMessage('Hello bot!', { authorBot: false });
      await new Promise((r) => setTimeout(r, 10));

      // The log action should have been executed
      const logActions = bot.executedActions.filter((a) => a.action === 'log');
      expect(logActions.length).toBeGreaterThan(0);

      await bot.stop();
    });

    it('should skip event when condition is false', async () => {
      const bot = createTestBot(`
version: "0.1"
intents:
  auto: true
events:
  - event: message_create
    when: "message.author.bot"
    actions:
      - action: reply
        content: "I only respond to bots"
`);

      await bot.start();
      const initialReplies = bot.replies.length;

      // Simulate a user message (not bot) - should be skipped
      bot.client.simulateMessage('Hello!', { authorBot: false });
      await new Promise((r) => setTimeout(r, 10));

      // No new replies should have been added
      expect(bot.replies.length).toBe(initialReplies);

      await bot.stop();
    });
  });

  describe('Component Handling', () => {
    it('should handle button click', async () => {
      const bot = createTestBot(`
version: "0.1"
intents:
  auto: true
components:
  buttons:
    confirm:
      label: Confirm
      style: success
      actions:
        - action: reply
          content: "Confirmed!"
`);

      await bot.start();

      bot.client.simulateButton('confirm');
      await new Promise((r) => setTimeout(r, 10));

      expect(bot.replies).toContain('Confirmed!');

      await bot.stop();
    });
  });

  describe('Expression Interpolation', () => {
    it('should interpolate user data in replies', async () => {
      const bot = createTestBot(`
version: "0.1"
intents:
  auto: true
commands:
  - name: whoami
    description: Show user info
    actions:
      - action: reply
        content: "You are \${user.username} (\${user.id})"
`);

      await bot.start();

      bot.client.simulateCommand('whoami');
      await new Promise((r) => setTimeout(r, 10));

      expect(bot.replies.some((r) => r.includes('TestUser'))).toBe(true);

      await bot.stop();
    });

    it('should interpolate command arguments', async () => {
      const bot = createTestBot(`
version: "0.1"
intents:
  auto: true
commands:
  - name: greet
    description: Greet someone
    options:
      - name: name
        description: Name
        type: string
        required: true
    actions:
      - action: reply
        content: "Hello, \${args.name}!"
`);

      await bot.start();

      bot.client.simulateCommand('greet', { name: 'Alice' });
      await new Promise((r) => setTimeout(r, 10));

      expect(bot.replies).toContain('Hello, Alice!');

      await bot.stop();
    });
  });

  describe('Multiple Actions', () => {
    it('should execute multiple actions in sequence', async () => {
      const bot = createTestBot(`
version: "0.1"
intents:
  auto: true
commands:
  - name: multi
    description: Multiple actions
    actions:
      - action: defer
      - action: log
        message: "Processing..."
      - action: reply
        content: "Done!"
`);

      await bot.start();

      bot.client.simulateCommand('multi');
      await new Promise((r) => setTimeout(r, 10));

      const actionNames = bot.executedActions.map((a) => a.action);
      expect(actionNames).toContain('defer');
      expect(actionNames).toContain('log');
      expect(actionNames).toContain('reply');
      expect(bot.replies).toContain('Done!');

      await bot.stop();
    });
  });

  describe('Full Bot Simulation', () => {
    it('should simulate complete bot lifecycle', async () => {
      const bot = createTestBot(`
version: "0.1"

identity:
  name: TestBot

presence:
  status: online
  activity:
    type: playing
    text: "with FURLOW"

intents:
  explicit:
    - guilds
    - guild_messages
    - message_content

commands:
  - name: ping
    description: Check if bot is alive
    actions:
      - action: reply
        content: "Pong! Latency: fast"

  - name: echo
    description: Echo your message
    options:
      - name: message
        description: Message to echo
        type: string
        required: true
    actions:
      - action: reply
        content: "\${args.message}"

  - name: userinfo
    description: Get user info
    actions:
      - action: reply
        content: "User: \${user.username}\\nID: \${user.id}"

events:
  - event: ready
    actions:
      - action: log
        message: "Bot started successfully!"

components:
  buttons:
    help_button:
      label: Help
      style: primary
      actions:
        - action: reply
          content: "Use /ping, /echo, or /userinfo"
`);

      // Start the bot
      await bot.start();
      expect(bot.client.isReady()).toBe(true);

      // Verify ready event was handled
      expect(bot.executedActions.some((a) => a.action === 'log')).toBe(true);

      // Test ping command
      bot.client.simulateCommand('ping');
      await new Promise((r) => setTimeout(r, 10));
      expect(bot.replies).toContain('Pong! Latency: fast');

      // Test echo command
      bot.client.simulateCommand('echo', { message: 'Hello FURLOW!' });
      await new Promise((r) => setTimeout(r, 10));
      expect(bot.replies).toContain('Hello FURLOW!');

      // Test userinfo command
      bot.client.simulateCommand('userinfo');
      await new Promise((r) => setTimeout(r, 10));
      expect(bot.replies.some((r) => r.includes('TestUser'))).toBe(true);

      // Test button click
      bot.client.simulateButton('help_button');
      await new Promise((r) => setTimeout(r, 10));
      expect(bot.replies.some((r) => r.includes('/ping'))).toBe(true);

      // Stop the bot
      await bot.stop();
      expect(bot.client.isReady()).toBe(false);
    });
  });
});
