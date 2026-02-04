
export interface ActionSchema {
  name: string;
  category: string;
  description: string;
  fields: FieldSchema[];
}

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'expression' | 'select' | 'array' | 'object';
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: Array<{ label: string; value: string }>;
}

// Action schemas for the 84 actions organized by category
export const actionSchemas: Record<string, ActionSchema> = {
  send_message: {
    name: 'send_message',
    category: 'message',
    description: 'Send a message to a channel',
    fields: [
      { name: 'channel', type: 'expression', label: 'Channel', description: 'Channel ID or expression' },
      { name: 'content', type: 'expression', label: 'Content', description: 'Message content' },
      { name: 'reply', type: 'boolean', label: 'Reply', description: 'Reply to the trigger message' },
      { name: 'ephemeral', type: 'boolean', label: 'Ephemeral', description: 'Only visible to the user' },
    ],
  },
  reply: {
    name: 'reply',
    category: 'message',
    description: 'Reply to the current interaction',
    fields: [
      { name: 'content', type: 'expression', label: 'Content', description: 'Reply content' },
      { name: 'ephemeral', type: 'boolean', label: 'Ephemeral', description: 'Only visible to the user' },
    ],
  },
  defer: {
    name: 'defer',
    category: 'message',
    description: 'Defer the interaction response',
    fields: [
      { name: 'ephemeral', type: 'boolean', label: 'Ephemeral', description: 'Only visible to the user' },
    ],
  },
  assign_role: {
    name: 'assign_role',
    category: 'member',
    description: 'Assign a role to a member',
    fields: [
      { name: 'user', type: 'expression', label: 'User', description: 'User to assign role to' },
      { name: 'role', type: 'expression', label: 'Role', required: true, description: 'Role to assign' },
      { name: 'reason', type: 'expression', label: 'Reason', description: 'Audit log reason' },
    ],
  },
  remove_role: {
    name: 'remove_role',
    category: 'member',
    description: 'Remove a role from a member',
    fields: [
      { name: 'user', type: 'expression', label: 'User', description: 'User to remove role from' },
      { name: 'role', type: 'expression', label: 'Role', required: true, description: 'Role to remove' },
      { name: 'reason', type: 'expression', label: 'Reason', description: 'Audit log reason' },
    ],
  },
  set: {
    name: 'set',
    category: 'state',
    description: 'Set a state variable',
    fields: [
      { name: 'var', type: 'string', label: 'Variable', required: true, description: 'Variable name' },
      { name: 'value', type: 'expression', label: 'Value', required: true, description: 'Value to set' },
      {
        name: 'scope',
        type: 'select',
        label: 'Scope',
        options: [
          { label: 'Global', value: 'global' },
          { label: 'Guild', value: 'guild' },
          { label: 'Channel', value: 'channel' },
          { label: 'User', value: 'user' },
          { label: 'Member', value: 'member' },
        ],
      },
    ],
  },
  flow_if: {
    name: 'flow_if',
    category: 'flow',
    description: 'Conditional execution',
    fields: [
      { name: 'condition', type: 'expression', label: 'Condition', required: true },
      { name: 'then', type: 'array', label: 'Then Actions', description: 'Actions if true' },
      { name: 'else', type: 'array', label: 'Else Actions', description: 'Actions if false' },
    ],
  },
  call_flow: {
    name: 'call_flow',
    category: 'flow',
    description: 'Call another flow',
    fields: [
      { name: 'flow', type: 'string', label: 'Flow Name', required: true },
      { name: 'as', type: 'string', label: 'Store As', description: 'Variable to store result' },
    ],
  },
  voice_join: {
    name: 'voice_join',
    category: 'voice',
    description: 'Join a voice channel',
    fields: [
      { name: 'channel', type: 'expression', label: 'Channel', required: true },
      { name: 'self_deaf', type: 'boolean', label: 'Self Deaf' },
      { name: 'self_mute', type: 'boolean', label: 'Self Mute' },
    ],
  },
  voice_play: {
    name: 'voice_play',
    category: 'voice',
    description: 'Play audio in voice channel',
    fields: [
      { name: 'source', type: 'expression', label: 'Source', required: true },
      { name: 'volume', type: 'number', label: 'Volume', description: '0-100' },
    ],
  },
};

export function useSchema() {
  const getActionSchema = (actionName: string): ActionSchema | undefined => {
    return actionSchemas[actionName];
  };

  const getActionsByCategory = (category: string): ActionSchema[] => {
    return Object.values(actionSchemas).filter((a) => a.category === category);
  };

  const getAllCategories = (): string[] => {
    const categories = new Set<string>();
    Object.values(actionSchemas).forEach((a) => categories.add(a.category));
    return Array.from(categories);
  };

  return {
    actionSchemas,
    getActionSchema,
    getActionsByCategory,
    getAllCategories,
  };
}
