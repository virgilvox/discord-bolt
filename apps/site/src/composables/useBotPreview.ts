import { computed } from 'vue';
import type { FurlowSpec } from '@furlow/schema';

export interface CommandPreview {
  name: string;
  description: string;
  options: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  actionCount: number;
}

export interface EventPreview {
  event: string;
  condition?: string;
  actionCount: number;
}

export interface FlowPreview {
  name: string;
  actionCount: number;
}

export interface StatePreview {
  name: string;
  scope: string;
  default?: unknown;
}

export interface BotPreviewData {
  identity: {
    name: string;
    status?: string;
    activity?: string;
  };
  commands: CommandPreview[];
  events: EventPreview[];
  flows: FlowPreview[];
  stateVariables: StatePreview[];
  integrations: Array<{ name: string; type: string }>;
}

export function useBotPreview(spec: FurlowSpec) {
  const previewData = computed<BotPreviewData>(() => {
    // Identity
    const identity = {
      name: spec.identity?.name || 'Unnamed Bot',
      status: spec.presence?.status,
      activity: spec.presence?.activity?.text,
    };

    // Commands
    const commands: CommandPreview[] = (spec.commands || []).map((cmd) => ({
      name: cmd.name,
      description: cmd.description || '',
      options: (cmd.options || []).map((opt) => ({
        name: opt.name,
        type: opt.type,
        required: opt.required || false,
      })),
      actionCount: cmd.actions?.length || 0,
    }));

    // Events
    const events: EventPreview[] = (spec.events || []).map((evt) => ({
      event: evt.event,
      condition: evt.when as string | undefined,
      actionCount: evt.actions?.length || 0,
    }));

    // Flows
    const flows: FlowPreview[] = (spec.flows || []).map((flow) => ({
      name: flow.name,
      actionCount: flow.actions?.length || 0,
    }));

    // State variables
    const stateVariables: StatePreview[] = [];
    if (spec.state?.variables) {
      for (const [name, config] of Object.entries(spec.state.variables)) {
        const cfg = config as { scope?: string; default?: unknown };
        stateVariables.push({
          name,
          scope: cfg.scope || 'guild',
          default: cfg.default,
        });
      }
    }

    // Integrations (pipes)
    const integrations: Array<{ name: string; type: string }> = [];
    if (spec.pipes) {
      for (const [name, config] of Object.entries(spec.pipes)) {
        integrations.push({
          name,
          type: (config as { type?: string }).type || 'http',
        });
      }
    }

    return {
      identity,
      commands,
      events,
      flows,
      stateVariables,
      integrations,
    };
  });

  const simulateCommand = (
    commandName: string,
    options: Record<string, unknown>
  ): string[] => {
    const command = spec.commands?.find((c) => c.name === commandName);
    if (!command) return ['Command not found'];

    const outputs: string[] = [];
    const actions = command.actions || [];

    // Mock context
    const context = {
      user: { id: '123', name: 'TestUser', mention: '<@123>' },
      member: { nickname: 'Tester', roles: [] },
      guild: { id: '456', name: 'Test Server', memberCount: 100 },
      channel: { id: '789', name: 'general' },
      options,
    };

    for (const action of actions) {
      const actionObj = action as unknown as Record<string, unknown>;
      const actionType = actionObj.action as string;

      switch (actionType) {
        case 'reply':
        case 'send_message': {
          let content = (actionObj.content as string) || '';
          // Simple template replacement
          content = content
            .replace(/\{\{.*?user\.name.*?\}\}/g, context.user.name)
            .replace(/\{\{.*?user\.mention.*?\}\}/g, context.user.mention)
            .replace(/\{\{.*?guild\.name.*?\}\}/g, context.guild.name);

          for (const [key, value] of Object.entries(options)) {
            content = content.replace(
              new RegExp(`\\{\\{.*?options\\.${key}.*?\\}\\}`, 'g'),
              String(value)
            );
          }

          outputs.push(`[Message] ${content}`);
          break;
        }
        case 'defer':
          outputs.push('[Deferred] Bot is thinking...');
          break;
        default:
          outputs.push(`[${actionType}] Action executed`);
      }
    }

    return outputs.length > 0 ? outputs : ['Command executed (no visible output)'];
  };

  return {
    previewData,
    simulateCommand,
  };
}
