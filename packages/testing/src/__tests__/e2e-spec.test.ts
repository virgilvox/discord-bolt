/**
 * End-to-End Specification Tests
 *
 * Tests the complete pipeline: YAML spec → parse → validate → execute
 * This validates that a bot specification can be loaded and run correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadSpecFromString,
  createEvaluator,
  createActionRegistry,
  createActionExecutor,
  createFlowEngine,
  SchemaValidationError,
  YamlSyntaxError,
} from '@furlow/core';
import type { Action, FurlowSpec } from '@furlow/schema';
import type { ActionHandler, ActionContext, ActionResult } from '@furlow/core';
import { createMockContext } from '../helpers/index.js';

describe('E2E: Full Bot Specification', () => {
  // ==========================================
  // Test Infrastructure
  // ==========================================

  let actionResults: { action: string; config: Action; context: ActionContext }[];
  let mockContext: ActionContext;

  // Create mock action handlers that track calls
  function createMockHandler(name: string): ActionHandler {
    return {
      name,
      execute: async (config, context) => {
        actionResults.push({ action: name, config, context });
        return { success: true, data: { action: name } };
      },
    };
  }

  beforeEach(() => {
    actionResults = [];
    mockContext = createMockContext();
  });

  // ==========================================
  // Spec Loading & Validation
  // ==========================================

  describe('Spec Loading', () => {
    it('should load minimal valid YAML spec', () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
`;
      const spec = loadSpecFromString(yaml);

      expect(spec.version).toBe('0.1');
      expect(spec.intents?.auto).toBe(true);
    });

    it('should load spec with commands, events, and flows', () => {
      const yaml = `
version: "0.1"
intents:
  explicit:
    - guilds
    - guild_messages
    - message_content

commands:
  - name: ping
    description: Ping command
    actions:
      - action: reply
        content: Pong!

events:
  - event: ready
    actions:
      - action: log
        message: Bot is ready!

flows:
  - name: greet
    parameters:
      - name: name
        type: string
        required: true
    actions:
      - action: log
        message: "Hello, \${args.name}!"
`;
      const spec = loadSpecFromString(yaml);

      expect(spec.commands).toHaveLength(1);
      expect(spec.commands![0].name).toBe('ping');
      expect(spec.events).toHaveLength(1);
      expect(spec.events![0].event).toBe('ready');
      expect(spec.flows).toHaveLength(1);
      expect(spec.flows![0].name).toBe('greet');
    });

    it('should reject invalid YAML syntax', () => {
      const yaml = `
version: "0.1"
intents
  auto: true  # Missing colon after intents
`;
      expect(() => loadSpecFromString(yaml)).toThrow(YamlSyntaxError);
    });

    it('should reject invalid schema', () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
commands:
  - name: 123  # Should be string
    description: test
`;
      expect(() => loadSpecFromString(yaml)).toThrow(SchemaValidationError);
    });

    it('should allow skipping validation', () => {
      const yaml = `
version: "0.1"
custom_field: this_is_not_in_schema
`;
      // Should not throw when validation is disabled
      const spec = loadSpecFromString(yaml, { validate: false });
      expect(spec.version).toBe('0.1');
    });
  });

  // ==========================================
  // Command Execution Pipeline
  // ==========================================

  describe('Command Execution', () => {
    it('should execute command actions from spec', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
commands:
  - name: hello
    description: Say hello
    actions:
      - action: reply
        content: "Hello, World!"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();

      // Register mock handler
      registry.register(createMockHandler('reply'));

      const executor = createActionExecutor(registry, evaluator);

      // Execute command actions
      const command = spec.commands![0];
      const results = await executor.executeSequence(command.actions!, mockContext);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(actionResults).toHaveLength(1);
      expect(actionResults[0].action).toBe('reply');
      expect(actionResults[0].config).toEqual({
        action: 'reply',
        content: 'Hello, World!',
      });
    });

    it('should execute multiple actions in sequence', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
commands:
  - name: multi
    description: Multiple actions
    actions:
      - action: defer
      - action: send_message
        channel: "123"
        content: "Processing..."
      - action: reply
        content: "Done!"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();

      registry.register(createMockHandler('defer'));
      registry.register(createMockHandler('send_message'));
      registry.register(createMockHandler('reply'));

      const executor = createActionExecutor(registry, evaluator);
      const results = await executor.executeSequence(spec.commands![0].actions!, mockContext);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(actionResults.map(r => r.action)).toEqual(['defer', 'send_message', 'reply']);
    });

    it('should handle command with options', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
commands:
  - name: greet
    description: Greet a user
    options:
      - name: user
        description: User to greet
        type: user
        required: true
      - name: message
        description: Custom message
        type: string
    actions:
      - action: reply
        content: "Hello!"
`;
      const spec = loadSpecFromString(yaml);

      expect(spec.commands![0].options).toHaveLength(2);
      expect(spec.commands![0].options![0].type).toBe('user');
      expect(spec.commands![0].options![1].required).toBeUndefined();
    });
  });

  // ==========================================
  // Event Handler Pipeline
  // ==========================================

  describe('Event Handler Execution', () => {
    it('should execute event handler actions', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
events:
  - event: message_create
    when: "!message.author.bot"
    actions:
      - action: log
        message: "New message from \${user.username}"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();

      registry.register(createMockHandler('log'));

      const executor = createActionExecutor(registry, evaluator);
      const results = await executor.executeSequence(spec.events![0].actions!, mockContext);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should skip actions when condition is false', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
commands:
  - name: test
    description: Test conditional
    actions:
      - action: log
        message: "This runs"
        when: "true"
      - action: log
        message: "This skips"
        when: "false"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();

      registry.register(createMockHandler('log'));

      const executor = createActionExecutor(registry, evaluator);
      const results = await executor.executeSequence(spec.commands![0].actions!, mockContext);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true); // Still "success" but skipped
      expect(actionResults).toHaveLength(1); // Only one actually executed
    });
  });

  // ==========================================
  // Flow Execution
  // ==========================================

  describe('Flow Execution', () => {
    it('should execute flow with parameters', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
flows:
  - name: welcome
    parameters:
      - name: username
        type: string
        required: true
      - name: channel
        type: string
        required: true
    actions:
      - action: send_message
        channel: "\${args.channel}"
        content: "Welcome, \${args.username}!"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();
      const flowEngine = createFlowEngine();

      registry.register(createMockHandler('send_message'));
      flowEngine.registerAll(spec.flows!);

      const executor = createActionExecutor(registry, evaluator);

      const result = await flowEngine.execute(
        'welcome',
        { username: 'Alice', channel: '123456789' },
        mockContext,
        executor,
        evaluator
      );

      expect(result.success).toBe(true);
      expect(actionResults).toHaveLength(1);
      expect(actionResults[0].action).toBe('send_message');
    });

    it('should handle flow with default parameters', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
flows:
  - name: greet
    parameters:
      - name: greeting
        type: string
        default: "Hello"
    actions:
      - action: log
        message: "\${args.greeting}"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();
      const flowEngine = createFlowEngine();

      registry.register(createMockHandler('log'));
      flowEngine.registerAll(spec.flows!);

      const executor = createActionExecutor(registry, evaluator);

      // Call without providing optional parameter
      const result = await flowEngine.execute('greet', {}, mockContext, executor, evaluator);

      expect(result.success).toBe(true);
    });

    it('should fail on missing required parameter', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
flows:
  - name: greet
    parameters:
      - name: name
        type: string
        required: true
    actions:
      - action: log
        message: "Hi"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();
      const flowEngine = createFlowEngine();

      registry.register(createMockHandler('log'));
      flowEngine.registerAll(spec.flows!);

      const executor = createActionExecutor(registry, evaluator);

      // Flow engine throws on missing required parameter (during parameter validation)
      await expect(
        flowEngine.execute('greet', {}, mockContext, executor, evaluator)
      ).rejects.toThrow('Missing required parameter');
    });

    it('should handle flow_if conditional', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
flows:
  - name: check_level
    parameters:
      - name: level
        type: number
        required: true
    actions:
      - action: flow_if
        if: "args.level >= 10"
        then:
          - action: log
            message: "High level!"
        else:
          - action: log
            message: "Low level"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();
      const flowEngine = createFlowEngine();

      registry.register(createMockHandler('log'));
      flowEngine.registerAll(spec.flows!);

      const executor = createActionExecutor(registry, evaluator);

      // Test high level
      await flowEngine.execute('check_level', { level: 15 }, mockContext, executor, evaluator);
      expect(actionResults.map(r => r.config)).toContainEqual(
        expect.objectContaining({ message: 'High level!' })
      );

      // Reset and test low level
      actionResults = [];
      await flowEngine.execute('check_level', { level: 5 }, mockContext, executor, evaluator);
      expect(actionResults.map(r => r.config)).toContainEqual(
        expect.objectContaining({ message: 'Low level' })
      );
    });

    it('should handle nested flow calls', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
flows:
  - name: outer
    actions:
      - action: log
        message: "Outer start"
      - action: call_flow
        flow: inner
      - action: log
        message: "Outer end"

  - name: inner
    actions:
      - action: log
        message: "Inner"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();
      const flowEngine = createFlowEngine();

      registry.register(createMockHandler('log'));
      flowEngine.registerAll(spec.flows!);

      const executor = createActionExecutor(registry, evaluator);

      await flowEngine.execute('outer', {}, mockContext, executor, evaluator);

      const messages = actionResults.map(r => (r.config as any).message);
      expect(messages).toEqual(['Outer start', 'Inner', 'Outer end']);
    });

    it('should handle repeat loops', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
flows:
  - name: countdown
    actions:
      - action: repeat
        times: 3
        as: i
        do:
          - action: log
            message: "Iteration"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();
      const flowEngine = createFlowEngine();

      registry.register(createMockHandler('log'));
      flowEngine.registerAll(spec.flows!);

      const executor = createActionExecutor(registry, evaluator);

      await flowEngine.execute('countdown', {}, mockContext, executor, evaluator);

      expect(actionResults).toHaveLength(3);
    });
  });

  // ==========================================
  // State Configuration
  // ==========================================

  describe('State Configuration', () => {
    it('should parse state variable definitions', () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
state:
  variables:
    message_count:
      type: number
      scope: guild
      default: 0
    last_user:
      type: string
      scope: channel
  tables:
    warnings:
      columns:
        id:
          type: string
          primary: true
        user_id:
          type: string
        reason:
          type: string
        count:
          type: number
          default: 0
  storage:
    type: sqlite
    path: ./data/bot.db
`;
      const spec = loadSpecFromString(yaml);

      expect(spec.state?.variables?.message_count?.type).toBe('number');
      expect(spec.state?.variables?.message_count?.scope).toBe('guild');
      expect(spec.state?.tables?.warnings?.columns?.id?.primary).toBe(true);
      expect(spec.state?.storage?.type).toBe('sqlite');
    });
  });

  // ==========================================
  // Component Definitions
  // ==========================================

  describe('Component Definitions', () => {
    it('should parse button component definitions', () => {
      const yaml = `
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
    cancel:
      label: Cancel
      style: danger
      actions:
        - action: reply
          content: "Cancelled!"
`;
      const spec = loadSpecFromString(yaml);

      expect(spec.components?.buttons?.confirm?.label).toBe('Confirm');
      expect(spec.components?.buttons?.confirm?.style).toBe('success');
      expect(spec.components?.buttons?.cancel?.style).toBe('danger');
    });

    it('should parse select menu definitions', () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
components:
  selects:
    role_picker:
      placeholder: "Select a role..."
      min_values: 1
      max_values: 3
      actions:
        - action: assign_role
          role: "\${values[0]}"
`;
      const spec = loadSpecFromString(yaml);

      expect(spec.components?.selects?.role_picker?.placeholder).toBe('Select a role...');
      expect(spec.components?.selects?.role_picker?.min_values).toBe(1);
      expect(spec.components?.selects?.role_picker?.max_values).toBe(3);
    });

    it('should parse modal definitions', () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
components:
  modals:
    feedback:
      title: "Submit Feedback"
      fields:
        - name: message
          label: "Your feedback"
          style: paragraph
          required: true
          placeholder: "Tell us what you think..."
      actions:
        - action: log
          message: "Feedback received"
`;
      const spec = loadSpecFromString(yaml);

      expect(spec.components?.modals?.feedback?.title).toBe('Submit Feedback');
      expect(spec.components?.modals?.feedback?.fields).toHaveLength(1);
      expect(spec.components?.modals?.feedback?.fields![0].style).toBe('paragraph');
    });
  });

  // ==========================================
  // Full Bot Configuration
  // ==========================================

  describe('Full Bot Configuration', () => {
    it('should load a complete bot specification', () => {
      const yaml = `
version: "0.1"

identity:
  name: TestBot
  description: A fully-featured test bot

presence:
  status: online
  activity:
    type: playing
    text: "Testing FURLOW"

intents:
  explicit:
    - guilds
    - guild_members
    - guild_messages
    - message_content

permissions:
  default:
    - send_messages
    - embed_links
    - attach_files

commands:
  - name: help
    description: Show help
    actions:
      - action: reply
        content: "Help message"

  - name: ping
    description: Check latency
    actions:
      - action: defer
      - action: reply
        content: "Pong!"

events:
  - event: ready
    actions:
      - action: log
        level: info
        message: "Bot is online!"

  - event: guild_member_add
    actions:
      - action: call_flow
        flow: welcome_member
        args:
          member_id: "\${member.id}"

flows:
  - name: welcome_member
    parameters:
      - name: member_id
        type: string
        required: true
    actions:
      - action: send_message
        channel: "@settings.welcome_channel"
        content: "Welcome <@\${args.member_id}>!"

state:
  variables:
    welcome_channel:
      type: string
      scope: guild
  storage:
    type: memory
`;
      const spec = loadSpecFromString(yaml);

      // Verify identity
      expect(spec.identity?.name).toBe('TestBot');
      expect(spec.identity?.description).toBe('A fully-featured test bot');

      // Verify presence
      expect(spec.presence?.status).toBe('online');
      expect(spec.presence?.activity?.type).toBe('playing');

      // Verify intents
      expect(spec.intents?.explicit).toContain('guild_members');
      expect(spec.intents?.explicit).toContain('message_content');

      // Verify permissions
      expect(spec.permissions?.default).toContain('send_messages');

      // Verify commands
      expect(spec.commands).toHaveLength(2);
      expect(spec.commands!.map(c => c.name)).toEqual(['help', 'ping']);

      // Verify events
      expect(spec.events).toHaveLength(2);
      expect(spec.events!.map(e => e.event)).toEqual(['ready', 'guild_member_add']);

      // Verify flows
      expect(spec.flows).toHaveLength(1);
      expect(spec.flows![0].name).toBe('welcome_member');

      // Verify state
      expect(spec.state?.variables?.welcome_channel?.type).toBe('string');
    });

    it('should execute a realistic command flow', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
commands:
  - name: ban
    description: Ban a user
    options:
      - name: user
        description: User to ban
        type: user
        required: true
      - name: reason
        description: Ban reason
        type: string
    actions:
      - action: flow_if
        if: "has_permission == true"
        then:
          - action: ban
            user: "\${args.user}"
            reason: "\${args.reason || 'No reason provided'}"
          - action: reply
            content: "User has been banned."
        else:
          - action: reply
            content: "You don't have permission to ban users."
            ephemeral: true
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();
      const flowEngine = createFlowEngine();

      registry.register(createMockHandler('ban'));
      registry.register(createMockHandler('reply'));

      const executor = createActionExecutor(registry, evaluator);

      // Create context with permission flag
      const contextWithPerm = {
        ...mockContext,
        has_permission: true,
        args: { user: '123', reason: 'Spam' },
      } as ActionContext;

      // Execute command actions with flow engine handling
      // Note: flow_if is handled by flow engine, not directly by executor
      flowEngine.register({
        name: 'ban_command',
        actions: spec.commands![0].actions!,
      });

      const result = await flowEngine.execute(
        'ban_command',
        {},
        contextWithPerm,
        executor,
        evaluator
      );

      expect(result.success).toBe(true);
      expect(actionResults.map(r => r.action)).toContain('ban');
      expect(actionResults.map(r => r.action)).toContain('reply');
    });
  });

  // ==========================================
  // Error Handling
  // ==========================================

  describe('Error Handling', () => {
    it('should handle action execution errors gracefully', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
commands:
  - name: test
    description: Test error
    actions:
      - action: failing_action
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();

      // Register a handler that throws
      registry.register({
        name: 'failing_action',
        execute: async () => {
          throw new Error('Something went wrong');
        },
      });

      const executor = createActionExecutor(registry, evaluator);
      const results = await executor.executeSequence(spec.commands![0].actions!, mockContext);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error?.message).toContain('Something went wrong');
    });

    it('should stop on error by default', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
commands:
  - name: test
    description: Test error stop
    actions:
      - action: log
        message: "First"
      - action: failing_action
      - action: log
        message: "Third (should not run)"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();

      registry.register(createMockHandler('log'));
      registry.register({
        name: 'failing_action',
        execute: async () => {
          throw new Error('Fail');
        },
      });

      const executor = createActionExecutor(registry, evaluator, { stopOnError: true });
      const results = await executor.executeSequence(spec.commands![0].actions!, mockContext);

      expect(results).toHaveLength(2); // Only first two executed
      expect(actionResults).toHaveLength(1); // Only "log" succeeded
    });

    it('should continue on error when configured', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
commands:
  - name: test
    description: Test error continue
    actions:
      - action: log
        message: "First"
      - action: failing_action
      - action: log
        message: "Third (should run)"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();

      registry.register(createMockHandler('log'));
      registry.register({
        name: 'failing_action',
        execute: async () => {
          throw new Error('Fail');
        },
      });

      const executor = createActionExecutor(registry, evaluator, { stopOnError: false });
      const results = await executor.executeSequence(spec.commands![0].actions!, mockContext);

      expect(results).toHaveLength(3);
      expect(actionResults).toHaveLength(2); // Both logs executed
    });
  });

  // ==========================================
  // Expression Evaluation in Actions
  // ==========================================

  describe('Expression Evaluation', () => {
    it('should evaluate expressions in action configs', async () => {
      const yaml = `
version: "0.1"
intents:
  auto: true
commands:
  - name: echo
    description: Echo input
    options:
      - name: text
        description: Text to echo
        type: string
        required: true
    actions:
      - action: reply
        content: "You said: \${args.text|upper}"
`;
      const spec = loadSpecFromString(yaml);
      const registry = createActionRegistry();
      const evaluator = createEvaluator();

      // Create a handler that interpolates content
      registry.register({
        name: 'reply',
        execute: async (config: any, context) => {
          const content = await evaluator.interpolate(config.content, context);
          actionResults.push({
            action: 'reply',
            config: { ...config, interpolatedContent: content },
            context,
          });
          return { success: true, data: { content } };
        },
      });

      const executor = createActionExecutor(registry, evaluator);
      const contextWithArgs = {
        ...mockContext,
        args: { text: 'hello world' },
      } as ActionContext;

      await executor.executeSequence(spec.commands![0].actions!, contextWithArgs);

      expect((actionResults[0].config as any).interpolatedContent).toBe('You said: HELLO WORLD');
    });
  });
});
