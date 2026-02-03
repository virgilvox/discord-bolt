<script setup lang="ts">
import { computed } from 'vue';
import { useSchemaStore } from '@/stores/schema';

const schemaStore = useSchemaStore();

const commands = computed(() => schemaStore.spec.commands || []);
const events = computed(() => schemaStore.spec.events || []);
const flows = computed(() => schemaStore.spec.flows || []);

const identity = computed(() => schemaStore.spec.identity || {});
const presence = computed(() => schemaStore.spec.presence);

const stateVars = computed(() => {
  const vars: Array<{ name: string; scope: string }> = [];
  const state = schemaStore.spec.state;
  if (state?.variables) {
    for (const [name, config] of Object.entries(state.variables)) {
      vars.push({
        name,
        scope: (config as { scope?: string })?.scope || 'guild',
      });
    }
  }
  return vars;
});

const pipes = computed(() => {
  const pipeList: Array<{ name: string; type: string }> = [];
  const pipes = schemaStore.spec.pipes;
  if (pipes) {
    for (const [name, config] of Object.entries(pipes)) {
      pipeList.push({
        name,
        type: (config as { type?: string })?.type || 'http',
      });
    }
  }
  return pipeList;
});
</script>

<template>
  <div class="bot-preview">
    <div class="preview-header">
      <span class="preview-label">BOT PREVIEW</span>
    </div>

    <div class="preview-body">
      <!-- Bot Identity -->
      <section class="preview-section">
        <h3 class="section-title">
          <i class="fas fa-robot"></i>
          IDENTITY
        </h3>
        <div class="identity-card">
          <div class="bot-avatar">
            <i class="fas fa-robot"></i>
          </div>
          <div class="bot-info">
            <span class="bot-name">{{ identity.name || 'Unnamed Bot' }}</span>
            <span v-if="presence" class="bot-status">
              <i class="fas fa-circle"></i>
              {{ presence.activity?.name || 'No activity' }}
            </span>
          </div>
        </div>
      </section>

      <!-- Commands -->
      <section class="preview-section">
        <h3 class="section-title">
          <i class="fas fa-terminal"></i>
          COMMANDS
          <span class="count-badge">{{ commands.length }}</span>
        </h3>
        <div v-if="commands.length === 0" class="empty-section">
          No commands defined
        </div>
        <div v-else class="items-list">
          <div v-for="cmd in commands" :key="cmd.name" class="item-row">
            <span class="item-name">/{{ cmd.name }}</span>
            <span class="item-desc">{{ cmd.description }}</span>
          </div>
        </div>
      </section>

      <!-- Events -->
      <section class="preview-section">
        <h3 class="section-title">
          <i class="fas fa-bolt"></i>
          EVENT HANDLERS
          <span class="count-badge">{{ events.length }}</span>
        </h3>
        <div v-if="events.length === 0" class="empty-section">
          No event handlers defined
        </div>
        <div v-else class="items-list">
          <div v-for="(event, idx) in events" :key="idx" class="item-row">
            <span class="item-name">{{ event.on }}</span>
            <span class="item-meta">{{ event.actions?.length || 0 }} actions</span>
          </div>
        </div>
      </section>

      <!-- Flows -->
      <section class="preview-section">
        <h3 class="section-title">
          <i class="fas fa-diagram-project"></i>
          FLOWS
          <span class="count-badge">{{ flows.length }}</span>
        </h3>
        <div v-if="flows.length === 0" class="empty-section">
          No flows defined
        </div>
        <div v-else class="items-list">
          <div v-for="flow in flows" :key="flow.name" class="item-row">
            <span class="item-name">{{ flow.name }}</span>
            <span class="item-meta">{{ flow.actions?.length || 0 }} actions</span>
          </div>
        </div>
      </section>

      <!-- State Variables -->
      <section v-if="stateVars.length > 0" class="preview-section">
        <h3 class="section-title">
          <i class="fas fa-database"></i>
          STATE VARIABLES
          <span class="count-badge">{{ stateVars.length }}</span>
        </h3>
        <div class="items-list">
          <div v-for="v in stateVars" :key="v.name" class="item-row">
            <span class="item-name">{{ v.name }}</span>
            <span class="scope-badge">{{ v.scope }}</span>
          </div>
        </div>
      </section>

      <!-- Pipes/Integrations -->
      <section v-if="pipes.length > 0" class="preview-section">
        <h3 class="section-title">
          <i class="fas fa-plug"></i>
          INTEGRATIONS
          <span class="count-badge">{{ pipes.length }}</span>
        </h3>
        <div class="items-list">
          <div v-for="pipe in pipes" :key="pipe.name" class="item-row">
            <span class="item-name">{{ pipe.name }}</span>
            <span class="type-badge">{{ pipe.type }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.bot-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-header {
  padding: var(--sp-sm) var(--sp-md);
  background: var(--bg-panel);
  border-bottom: var(--border-solid);
}

.preview-label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 2px;
}

.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-md);
}

.preview-section {
  margin-bottom: var(--sp-lg);
}

.section-title {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 1.5px;
  margin: 0 0 var(--sp-sm);
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.section-title i {
  color: var(--accent-dim);
  font-size: 10px;
}

.count-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  background: var(--bg-panel);
  padding: 1px 4px;
  border: 1px dashed var(--border-mid);
  margin-left: auto;
}

.identity-card {
  display: flex;
  align-items: center;
  gap: var(--sp-md);
  background: var(--bg-panel);
  border: var(--border-solid);
  padding: var(--sp-md);
}

.bot-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-glow);
  border: 1px solid var(--accent-dim);
}

.bot-avatar i {
  font-size: 18px;
  color: var(--accent);
}

.bot-info {
  display: flex;
  flex-direction: column;
}

.bot-name {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 1px;
}

.bot-status {
  font-size: 11px;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: var(--sp-2xs);
}

.bot-status i {
  font-size: 6px;
  color: var(--green);
}

.empty-section {
  font-size: 11px;
  color: var(--text-ghost);
  padding: var(--sp-sm);
  border: 1px dashed var(--border-mid);
  text-align: center;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-xs) var(--sp-sm);
  background: var(--bg-panel);
  border: var(--border-solid);
}

.item-name {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--accent);
}

.item-desc {
  font-size: 10px;
  color: var(--text-ghost);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.item-meta {
  font-size: 9px;
  color: var(--text-ghost);
}

.scope-badge,
.type-badge {
  font-size: 8px;
  font-family: var(--font-mono);
  text-transform: uppercase;
  padding: 1px 4px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text-ghost);
}
</style>
