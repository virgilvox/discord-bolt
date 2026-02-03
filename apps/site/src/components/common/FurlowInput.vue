<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string | number;
  type?: 'text' | 'number' | 'email' | 'password' | 'url';
  label?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();

const inputId = computed(() => `input-${Math.random().toString(36).slice(2, 9)}`);

const inputClasses = computed(() => [
  'input',
  props.error && 'input-error',
]);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = props.type === 'number' ? Number(target.value) : target.value;
  emit('update:modelValue', value);
};
</script>

<template>
  <div class="input-group">
    <label v-if="label" :for="inputId" class="input-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :class="inputClasses"
      @input="handleInput"
    />
    <span v-if="error" class="input-error-msg">{{ error }}</span>
    <span v-else-if="hint" class="input-hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
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

.required-mark {
  color: var(--accent);
}

.input {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--text-bright);
  background: var(--bg);
  border: var(--border-solid);
  padding: var(--sp-sm) var(--sp-md);
  width: 100%;
  transition: all var(--transition-fast);
}

.input:hover:not(:disabled) {
  border-color: var(--border-mid);
}

.input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--bg-raised);
}

.input::placeholder {
  color: var(--text-ghost);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-error {
  border-color: var(--red);
}

.input-error:focus {
  border-color: var(--red);
}

.input-error-msg {
  font-size: 11px;
  color: var(--red);
}

.input-hint {
  font-size: 11px;
  color: var(--text-ghost);
}
</style>
