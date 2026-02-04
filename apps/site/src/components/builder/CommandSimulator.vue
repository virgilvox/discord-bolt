<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSchemaStore } from '@/stores/schema';
import FurlowButton from '@/components/common/FurlowButton.vue';

const schemaStore = useSchemaStore();

const selectedCommand = ref<string | null>(null);
const optionValues = ref<Record<string, string>>({});
const simulationResult = ref<string | null>(null);
const isSimulating = ref(false);

interface CommandItem {
  name: string;
  description?: string;
  options?: Array<{ name: string; type: string; required?: boolean; description?: string }>;
  actions?: unknown[];
}

const commands = computed(() => (schemaStore.spec.commands || []) as CommandItem[]);

const currentCommand = computed(() =>
  commands.value.find((c: CommandItem) => c.name === selectedCommand.value)
);

const selectCommand = (name: string) => {
  selectedCommand.value = name;
  optionValues.value = {};
  simulationResult.value = null;
};

const simulateCommand = async () => {
  if (!currentCommand.value) return;

  isSimulating.value = true;
  simulationResult.value = null;

  // Simulate a delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Build mock context
  const mockUser = {
    id: '123456789',
    name: 'TestUser',
    discriminator: '0001',
    avatar: null,
    mention: '<@123456789>',
  };

  const mockGuild = {
    id: '987654321',
    name: 'Test Server',
    memberCount: 100,
  };

  const mockChannel = {
    id: '111111111',
    name: 'general',
    type: 'text',
  };

  // Generate mock response based on actions
  const actions = currentCommand.value.actions || [];
  const responses: string[] = [];

  for (const action of actions) {
    const actionType = (action as Record<string, unknown>).action as string;

    switch (actionType) {
      case 'reply':
      case 'send_message': {
        let content = (action as Record<string, unknown>).content as string || '';
        // Replace template variables
        content = content
          .replace(/\{\{\s*user\.name\s*\}\}/g, mockUser.name)
          .replace(/\{\{\s*user\.mention\s*\}\}/g, mockUser.mention)
          .replace(/\{\{\s*guild\.name\s*\}\}/g, mockGuild.name)
          .replace(/\{\{\s*channel\.name\s*\}\}/g, mockChannel.name);

        // Replace option references
        for (const [key, value] of Object.entries(optionValues.value)) {
          content = content.replace(new RegExp(`\\{\\{\\s*options\\.${key}\\s*\\}\\}`, 'g'), value);
        }

        responses.push(`[Message] ${content}`);
        break;
      }
      case 'defer':
        responses.push('[Deferred] Bot is thinking...');
        break;
      case 'assign_role':
        responses.push(`[Role] Assigned role to user`);
        break;
      case 'add_reaction':
        responses.push(`[Reaction] Added reaction`);
        break;
      default:
        responses.push(`[${actionType}] Action executed`);
    }
  }

  simulationResult.value = responses.length > 0
    ? responses.join('\n')
    : 'No visible output from this command';

  isSimulating.value = false;
};
</script>

<template>
  <div class="command-simulator">
    <div class="simulator-header">
      <span class="simulator-label">COMMAND SIMULATOR</span>
    </div>

    <div class="simulator-body">
      <!-- Command Selection -->
      <div class="command-select">
        <label class="select-label">SELECT COMMAND</label>
        <div v-if="commands.length === 0" class="no-commands">
          No commands defined yet
        </div>
        <div v-else class="command-list">
          <button
            v-for="cmd in commands"
            :key="cmd.name"
            :class="['command-btn', { active: selectedCommand === cmd.name }]"
            @click="selectCommand(cmd.name)"
          >
            /{{ cmd.name }}
          </button>
        </div>
      </div>

      <!-- Options Input -->
      <div v-if="currentCommand?.options?.length" class="options-section">
        <label class="options-label">OPTIONS</label>
        <div class="options-list">
          <div
            v-for="opt in currentCommand.options"
            :key="opt.name"
            class="option-input"
          >
            <label class="opt-label">
              {{ opt.name }}
              <span v-if="opt.required" class="required">*</span>
            </label>
            <input
              v-model="optionValues[opt.name]"
              class="input"
              :type="opt.type === 'integer' || opt.type === 'number' ? 'number' : 'text'"
              :placeholder="opt.description || opt.name"
            />
          </div>
        </div>
      </div>

      <!-- Run Button -->
      <div v-if="currentCommand" class="run-section">
        <FurlowButton
          :loading="isSimulating"
          icon="fas fa-play"
          @click="simulateCommand"
        >
          SIMULATE
        </FurlowButton>
      </div>

      <!-- Result -->
      <div v-if="simulationResult" class="result-section">
        <label class="result-label">OUTPUT</label>
        <div class="result-box">
          <pre>{{ simulationResult }}</pre>
        </div>
      </div>

      <!-- Mock Context Info -->
      <div class="context-info">
        <h4 class="context-title">MOCK CONTEXT</h4>
        <div class="context-items">
          <div class="context-item">
            <span class="ctx-label">User:</span>
            <span class="ctx-value">TestUser#0001</span>
          </div>
          <div class="context-item">
            <span class="ctx-label">Guild:</span>
            <span class="ctx-value">Test Server</span>
          </div>
          <div class="context-item">
            <span class="ctx-label">Channel:</span>
            <span class="ctx-value">#general</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.command-simulator {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.simulator-header {
  padding: var(--sp-sm) var(--sp-md);
  background: var(--bg-panel);
  border-bottom: var(--border-solid);
}

.simulator-label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 2px;
}

.simulator-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-md);
}

.command-select {
  margin-bottom: var(--sp-lg);
}

.select-label,
.options-label,
.result-label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
  display: block;
  margin-bottom: var(--sp-sm);
}

.no-commands {
  font-size: 12px;
  color: var(--text-ghost);
  padding: var(--sp-md);
  border: 1px dashed var(--border-mid);
  text-align: center;
}

.command-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-xs);
}

.command-btn {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);
  background: var(--bg);
  border: var(--border-solid);
  padding: var(--sp-xs) var(--sp-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.command-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.command-btn.active {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-faint);
}

.options-section {
  margin-bottom: var(--sp-lg);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.option-input {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.opt-label {
  font-size: 11px;
  color: var(--text-dim);
}

.required {
  color: var(--accent);
}

.run-section {
  margin-bottom: var(--sp-lg);
}

.result-section {
  margin-bottom: var(--sp-lg);
}

.result-box {
  background: var(--bg-code);
  border: var(--border-solid);
  border-left: 3px solid var(--accent);
  padding: var(--sp-md);
}

.result-box pre {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text);
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}

.context-info {
  border-top: var(--border-dashed);
  padding-top: var(--sp-md);
}

.context-title {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
  margin: 0 0 var(--sp-sm);
}

.context-items {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2xs);
}

.context-item {
  display: flex;
  gap: var(--sp-sm);
  font-size: 10px;
}

.ctx-label {
  color: var(--text-ghost);
}

.ctx-value {
  color: var(--text-dim);
  font-family: var(--font-mono);
}
</style>
