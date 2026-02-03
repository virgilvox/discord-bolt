<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSchemaStore } from '@/stores/schema';

const schemaStore = useSchemaStore();

interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

const errors = ref<ValidationError[]>([]);
const isValidating = ref(false);

const validate = async () => {
  isValidating.value = true;
  errors.value = [];

  try {
    // Basic validation rules
    const spec = schemaStore.spec;
    const newErrors: ValidationError[] = [];

    // Check for required identity
    if (!spec.identity?.name) {
      newErrors.push({
        path: 'identity.name',
        message: 'Bot name is required',
        severity: 'error',
      });
    }

    // Check commands
    if (spec.commands) {
      spec.commands.forEach((cmd, index) => {
        if (!cmd.name) {
          newErrors.push({
            path: `commands[${index}].name`,
            message: `Command at index ${index} is missing a name`,
            severity: 'error',
          });
        }
        if (!cmd.description) {
          newErrors.push({
            path: `commands[${index}].description`,
            message: `Command "${cmd.name || index}" is missing a description`,
            severity: 'warning',
          });
        }
        if (!cmd.actions?.length) {
          newErrors.push({
            path: `commands[${index}].actions`,
            message: `Command "${cmd.name || index}" has no actions`,
            severity: 'warning',
          });
        }
      });
    }

    // Check events
    if (spec.events) {
      spec.events.forEach((event, index) => {
        if (!event.on) {
          newErrors.push({
            path: `events[${index}].on`,
            message: `Event handler at index ${index} is missing event type`,
            severity: 'error',
          });
        }
        if (!event.actions?.length) {
          newErrors.push({
            path: `events[${index}].actions`,
            message: `Event handler "${event.on || index}" has no actions`,
            severity: 'warning',
          });
        }
      });
    }

    // Check flows
    if (spec.flows) {
      spec.flows.forEach((flow, index) => {
        if (!flow.name) {
          newErrors.push({
            path: `flows[${index}].name`,
            message: `Flow at index ${index} is missing a name`,
            severity: 'error',
          });
        }
        if (!flow.actions?.length) {
          newErrors.push({
            path: `flows[${index}].actions`,
            message: `Flow "${flow.name || index}" has no actions`,
            severity: 'warning',
          });
        }
      });
    }

    errors.value = newErrors;
  } finally {
    isValidating.value = false;
  }
};

const errorCount = computed(() => errors.value.filter((e) => e.severity === 'error').length);
const warningCount = computed(() => errors.value.filter((e) => e.severity === 'warning').length);
const isValid = computed(() => errorCount.value === 0);

// Validate on spec changes
watch(() => schemaStore.yamlOutput, validate, { immediate: true });
</script>

<template>
  <div class="validation-panel">
    <div class="validation-header">
      <div class="validation-status">
        <i
          :class="[
            'status-icon',
            isValid ? 'fas fa-check-circle' : 'fas fa-exclamation-circle',
            isValid ? 'valid' : 'invalid'
          ]"
        ></i>
        <span class="status-text">{{ isValid ? 'VALID' : 'ISSUES FOUND' }}</span>
      </div>

      <div class="validation-counts">
        <span v-if="errorCount > 0" class="count error">
          <i class="fas fa-times-circle"></i> {{ errorCount }}
        </span>
        <span v-if="warningCount > 0" class="count warning">
          <i class="fas fa-exclamation-triangle"></i> {{ warningCount }}
        </span>
      </div>
    </div>

    <div class="validation-body">
      <div v-if="isValidating" class="validating">
        <div class="spinner"></div>
        <span>Validating...</span>
      </div>

      <div v-else-if="errors.length === 0" class="no-errors">
        <i class="fas fa-check"></i>
        <p>Your specification is valid</p>
      </div>

      <div v-else class="errors-list">
        <div
          v-for="(error, index) in errors"
          :key="index"
          :class="['error-item', error.severity]"
        >
          <div class="error-icon">
            <i :class="error.severity === 'error' ? 'fas fa-times-circle' : 'fas fa-exclamation-triangle'"></i>
          </div>
          <div class="error-content">
            <span class="error-path">{{ error.path }}</span>
            <span class="error-message">{{ error.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.validation-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.validation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-md);
  background: var(--bg-panel);
  border-bottom: var(--border-solid);
}

.validation-status {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.status-icon {
  font-size: 14px;
}

.status-icon.valid {
  color: var(--green);
}

.status-icon.invalid {
  color: var(--red);
}

.status-text {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 1.5px;
}

.validation-counts {
  display: flex;
  gap: var(--sp-sm);
}

.count {
  font-size: 11px;
  font-family: var(--font-mono);
  display: flex;
  align-items: center;
  gap: var(--sp-2xs);
  padding: 2px 6px;
}

.count.error {
  color: var(--red);
  background: var(--red-dim);
}

.count.warning {
  color: var(--yellow);
  background: var(--yellow-dim);
}

.validation-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-md);
}

.validating {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-md);
  padding: var(--sp-2xl);
  color: var(--text-dim);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-mid);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-errors {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-md);
  padding: var(--sp-2xl);
  text-align: center;
}

.no-errors i {
  font-size: 32px;
  color: var(--green);
}

.no-errors p {
  color: var(--text-dim);
  margin: 0;
}

.errors-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.error-item {
  display: flex;
  gap: var(--sp-sm);
  padding: var(--sp-sm);
  border-left: 3px solid;
}

.error-item.error {
  background: var(--red-dim);
  border-color: var(--red);
}

.error-item.warning {
  background: var(--yellow-dim);
  border-color: var(--yellow);
}

.error-icon {
  font-size: 12px;
  padding-top: 2px;
}

.error-item.error .error-icon {
  color: var(--red);
}

.error-item.warning .error-icon {
  color: var(--yellow);
}

.error-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.error-path {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-bright);
}

.error-message {
  font-size: 12px;
  color: var(--text-dim);
}
</style>
