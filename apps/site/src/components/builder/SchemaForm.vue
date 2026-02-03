<script setup lang="ts">
import { computed } from 'vue';
import { useSchemaStore } from '@/stores/schema';
import FurlowInput from '@/components/common/FurlowInput.vue';

interface Props {
  section: string;
}

const props = defineProps<Props>();
const schemaStore = useSchemaStore();

// Section-specific form definitions
const sectionForms: Record<string, Array<{
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'boolean';
  placeholder?: string;
  hint?: string;
  options?: Array<{ label: string; value: string }>;
}>> = {
  identity: [
    { key: 'name', label: 'Bot Name', type: 'text', placeholder: 'MyBot', hint: 'Display name for your bot' },
    { key: 'avatar', label: 'Avatar URL', type: 'text', placeholder: 'https://...', hint: 'URL to bot avatar image' },
    { key: 'banner', label: 'Banner URL', type: 'text', placeholder: 'https://...', hint: 'URL to bot banner image' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'A helpful Discord bot...', hint: 'Bot description' },
  ],
  presence: [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Online', value: 'online' },
        { label: 'Idle', value: 'idle' },
        { label: 'Do Not Disturb', value: 'dnd' },
        { label: 'Invisible', value: 'invisible' },
      ],
    },
    {
      key: 'activity.type',
      label: 'Activity Type',
      type: 'select',
      options: [
        { label: 'Playing', value: 'playing' },
        { label: 'Streaming', value: 'streaming' },
        { label: 'Listening', value: 'listening' },
        { label: 'Watching', value: 'watching' },
        { label: 'Competing', value: 'competing' },
      ],
    },
    { key: 'activity.name', label: 'Activity Name', type: 'text', placeholder: 'with YAML', hint: 'Activity text' },
    { key: 'activity.url', label: 'Stream URL', type: 'text', placeholder: 'https://twitch.tv/...', hint: 'For streaming activities' },
  ],
  theme: [
    { key: 'primary_color', label: 'Primary Color', type: 'text', placeholder: '#ff6b35', hint: 'Hex color for embeds' },
    { key: 'success_color', label: 'Success Color', type: 'text', placeholder: '#8bd649' },
    { key: 'error_color', label: 'Error Color', type: 'text', placeholder: '#e05555' },
    { key: 'warning_color', label: 'Warning Color', type: 'text', placeholder: '#f0c040' },
  ],
  analytics: [
    { key: 'enabled', label: 'Enable Analytics', type: 'boolean' },
    { key: 'prometheus.enabled', label: 'Enable Prometheus', type: 'boolean' },
    { key: 'prometheus.port', label: 'Prometheus Port', type: 'number', placeholder: '9090' },
    { key: 'prometheus.path', label: 'Metrics Path', type: 'text', placeholder: '/metrics' },
  ],
  dashboard: [
    { key: 'enabled', label: 'Enable Dashboard', type: 'boolean' },
    { key: 'port', label: 'Port', type: 'number', placeholder: '3000' },
    { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost' },
    { key: 'branding.name', label: 'Dashboard Name', type: 'text', placeholder: 'Bot Dashboard' },
  ],
};

const currentForm = computed(() => sectionForms[props.section] || []);

const getValue = (key: string): string | number | boolean => {
  const parts = key.split('.');
  let value: unknown = schemaStore.spec[props.section as keyof typeof schemaStore.spec];

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return '';
    }
  }

  return value as string | number | boolean;
};

const setValue = (key: string, newValue: string | number | boolean) => {
  const parts = key.split('.');
  const sectionKey = props.section as keyof typeof schemaStore.spec;

  // Deep clone current section value or create empty object
  let sectionValue: Record<string, unknown> =
    typeof schemaStore.spec[sectionKey] === 'object' && schemaStore.spec[sectionKey]
      ? JSON.parse(JSON.stringify(schemaStore.spec[sectionKey]))
      : {};

  // Navigate and set the value
  let current = sectionValue;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = newValue === '' ? undefined : newValue;

  // Update the store
  schemaStore.updateSection(sectionKey, sectionValue as never);
};
</script>

<template>
  <div class="schema-form">
    <div v-if="currentForm.length === 0" class="empty-form">
      <i class="fas fa-code"></i>
      <p>This section uses a custom editor. Configure it in the form below or edit the YAML directly.</p>
    </div>

    <div v-else class="form-fields">
      <div v-for="field in currentForm" :key="field.key" class="form-field">
        <template v-if="field.type === 'text' || field.type === 'number'">
          <FurlowInput
            :model-value="getValue(field.key) as string | number"
            :type="field.type"
            :label="field.label"
            :placeholder="field.placeholder"
            :hint="field.hint"
            @update:model-value="setValue(field.key, $event)"
          />
        </template>

        <template v-else-if="field.type === 'textarea'">
          <div class="input-group">
            <label class="input-label">{{ field.label }}</label>
            <textarea
              class="input textarea"
              :value="getValue(field.key) as string"
              :placeholder="field.placeholder"
              rows="3"
              @input="setValue(field.key, ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
            <span v-if="field.hint" class="input-hint">{{ field.hint }}</span>
          </div>
        </template>

        <template v-else-if="field.type === 'select'">
          <div class="input-group">
            <label class="input-label">{{ field.label }}</label>
            <select
              class="select"
              :value="getValue(field.key) as string"
              @change="setValue(field.key, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">-- Select --</option>
              <option
                v-for="opt in field.options"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
            <span v-if="field.hint" class="input-hint">{{ field.hint }}</span>
          </div>
        </template>

        <template v-else-if="field.type === 'boolean'">
          <label class="checkbox">
            <input
              type="checkbox"
              :checked="getValue(field.key) as boolean"
              @change="setValue(field.key, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ field.label }}</span>
          </label>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schema-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-lg);
}

.empty-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-md);
  padding: var(--sp-2xl);
  border: 1px dashed var(--border-mid);
  text-align: center;
}

.empty-form i {
  font-size: 32px;
  color: var(--text-ghost);
}

.empty-form p {
  color: var(--text-dim);
  font-size: 13px;
  max-width: 300px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: var(--sp-lg);
}

.form-field {
  display: flex;
  flex-direction: column;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xs);
}

.input-label {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.input-hint {
  font-size: 11px;
  color: var(--text-ghost);
}

.textarea {
  resize: vertical;
  min-height: 80px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  cursor: pointer;
}

.checkbox input {
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--bg);
  border: var(--border-solid);
  cursor: pointer;
  position: relative;
  transition: all var(--transition-fast);
}

.checkbox input:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.checkbox input:checked::after {
  content: '\f00c';
  font-family: 'Font Awesome 6 Free';
  font-weight: 900;
  font-size: 10px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--bg);
}

.checkbox span {
  font-size: 13px;
  color: var(--text);
}
</style>
