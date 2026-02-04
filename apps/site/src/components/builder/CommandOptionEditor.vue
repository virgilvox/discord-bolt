<script setup lang="ts">
import { ref, computed } from 'vue';
import FurlowButton from '@/components/common/FurlowButton.vue';

interface CommandOption {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  choices?: { name: string; value: string | number }[];
  autocomplete?: boolean;
}

interface Props {
  options: CommandOption[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', options: CommandOption[]): void;
}>();

const expandedOption = ref<number | null>(null);
const showAddOption = ref(false);

const optionTypes = [
  { value: 'string', label: 'STRING', description: 'Text input' },
  { value: 'integer', label: 'INTEGER', description: 'Whole number' },
  { value: 'number', label: 'NUMBER', description: 'Decimal number' },
  { value: 'boolean', label: 'BOOLEAN', description: 'True/False' },
  { value: 'user', label: 'USER', description: 'Discord user' },
  { value: 'channel', label: 'CHANNEL', description: 'Discord channel' },
  { value: 'role', label: 'ROLE', description: 'Discord role' },
  { value: 'mentionable', label: 'MENTIONABLE', description: 'User or role' },
  { value: 'attachment', label: 'ATTACHMENT', description: 'File upload' },
];

const currentOptions = computed(() => props.options || []);

const addOption = () => {
  const newOption: CommandOption = {
    name: `option_${currentOptions.value.length + 1}`,
    type: 'string',
    description: 'Option description',
    required: false,
  };
  emit('update', [...currentOptions.value, newOption]);
  expandedOption.value = currentOptions.value.length;
  showAddOption.value = false;
};

const updateOption = (index: number, field: keyof CommandOption, value: unknown) => {
  const updated = [...currentOptions.value];
  updated[index] = { ...updated[index], [field]: value };
  emit('update', updated);
};

const removeOption = (index: number) => {
  const updated = [...currentOptions.value];
  updated.splice(index, 1);
  emit('update', updated);
  if (expandedOption.value === index) {
    expandedOption.value = null;
  }
};

const addChoice = (optionIndex: number) => {
  const updated = [...currentOptions.value];
  const option = updated[optionIndex];
  const choices = option.choices || [];
  choices.push({ name: `Choice ${choices.length + 1}`, value: `value_${choices.length + 1}` });
  updated[optionIndex] = { ...option, choices };
  emit('update', updated);
};

const updateChoice = (optionIndex: number, choiceIndex: number, field: 'name' | 'value', value: string) => {
  const updated = [...currentOptions.value];
  const option = updated[optionIndex];
  const choices = [...(option.choices || [])];
  choices[choiceIndex] = { ...choices[choiceIndex], [field]: value };
  updated[optionIndex] = { ...option, choices };
  emit('update', updated);
};

const removeChoice = (optionIndex: number, choiceIndex: number) => {
  const updated = [...currentOptions.value];
  const option = updated[optionIndex];
  const choices = [...(option.choices || [])];
  choices.splice(choiceIndex, 1);
  updated[optionIndex] = { ...option, choices: choices.length > 0 ? choices : undefined };
  emit('update', updated);
};

const moveOption = (index: number, direction: 'up' | 'down') => {
  const updated = [...currentOptions.value];
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= updated.length) return;
  [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
  emit('update', updated);
  expandedOption.value = newIndex;
};

const getTypeLabel = (type: string) => {
  return optionTypes.find(t => t.value === type)?.label || type.toUpperCase();
};

const supportsChoices = (type: string) => {
  return ['string', 'integer', 'number'].includes(type);
};
</script>

<template>
  <div class="option-editor">
    <div class="option-header">
      <span class="option-label">OPTIONS</span>
      <FurlowButton size="sm" icon="fas fa-plus" @click="showAddOption = true">
        ADD OPTION
      </FurlowButton>
    </div>

    <div v-if="currentOptions.length === 0" class="empty-options">
      <p>No command options defined</p>
      <span class="empty-hint">Options let users provide input to your command</span>
    </div>

    <div v-else class="options-list">
      <div
        v-for="(option, index) in currentOptions"
        :key="index"
        :class="['option-card', { expanded: expandedOption === index }]"
      >
        <div class="option-card-header" @click="expandedOption = expandedOption === index ? null : index">
          <div class="option-info">
            <span class="option-name">{{ option.name }}</span>
            <span class="option-type">{{ getTypeLabel(option.type) }}</span>
            <span v-if="option.required" class="option-required">REQUIRED</span>
          </div>
          <div class="option-actions">
            <button
              class="option-action"
              title="Move up"
              :disabled="index === 0"
              @click.stop="moveOption(index, 'up')"
            >
              <i class="fas fa-chevron-up"></i>
            </button>
            <button
              class="option-action"
              title="Move down"
              :disabled="index === currentOptions.length - 1"
              @click.stop="moveOption(index, 'down')"
            >
              <i class="fas fa-chevron-down"></i>
            </button>
            <button class="option-action danger" title="Remove" @click.stop="removeOption(index)">
              <i class="fas fa-times"></i>
            </button>
            <i :class="['expand-icon', 'fas', expandedOption === index ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
          </div>
        </div>

        <div v-if="expandedOption === index" class="option-card-body">
          <div class="option-field">
            <label class="field-label">Name</label>
            <input
              type="text"
              class="input"
              :value="option.name"
              placeholder="option_name"
              @input="updateOption(index, 'name', ($event.target as HTMLInputElement).value)"
            />
            <span class="field-hint">Lowercase, no spaces (use underscores)</span>
          </div>

          <div class="option-field">
            <label class="field-label">Type</label>
            <select
              class="select"
              :value="option.type"
              @change="updateOption(index, 'type', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="type in optionTypes" :key="type.value" :value="type.value">
                {{ type.label }} - {{ type.description }}
              </option>
            </select>
          </div>

          <div class="option-field">
            <label class="field-label">Description</label>
            <input
              type="text"
              class="input"
              :value="option.description"
              placeholder="What this option does"
              @input="updateOption(index, 'description', ($event.target as HTMLInputElement).value)"
            />
          </div>

          <div class="option-row">
            <label class="checkbox">
              <input
                type="checkbox"
                :checked="option.required"
                @change="updateOption(index, 'required', ($event.target as HTMLInputElement).checked)"
              />
              <span>Required</span>
            </label>

            <label v-if="supportsChoices(option.type)" class="checkbox">
              <input
                type="checkbox"
                :checked="option.autocomplete"
                @change="updateOption(index, 'autocomplete', ($event.target as HTMLInputElement).checked)"
              />
              <span>Autocomplete</span>
            </label>
          </div>

          <!-- Choices (for string/integer/number types) -->
          <div v-if="supportsChoices(option.type) && !option.autocomplete" class="choices-section">
            <div class="choices-header">
              <span class="choices-label">CHOICES</span>
              <button class="add-choice-btn" @click="addChoice(index)">
                <i class="fas fa-plus"></i> Add Choice
              </button>
            </div>

            <div v-if="option.choices && option.choices.length > 0" class="choices-list">
              <div v-for="(choice, cIndex) in option.choices" :key="cIndex" class="choice-row">
                <input
                  type="text"
                  class="input choice-name"
                  :value="choice.name"
                  placeholder="Display name"
                  @input="updateChoice(index, cIndex, 'name', ($event.target as HTMLInputElement).value)"
                />
                <input
                  type="text"
                  class="input choice-value"
                  :value="choice.value"
                  placeholder="Value"
                  @input="updateChoice(index, cIndex, 'value', ($event.target as HTMLInputElement).value)"
                />
                <button class="choice-remove" @click="removeChoice(index, cIndex)">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>

            <p v-else class="choices-hint">
              Add choices to limit user input to specific values
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Option Modal -->
    <div v-if="showAddOption" class="modal-overlay" @click.self="showAddOption = false">
      <div class="add-option-modal">
        <div class="modal-header">
          <h3 class="modal-title">ADD OPTION</h3>
          <button class="modal-close" @click="showAddOption = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-description">Select the type of option to add:</p>
          <div class="type-grid">
            <button
              v-for="type in optionTypes"
              :key="type.value"
              class="type-option"
              @click="addOption"
            >
              <span class="type-name">{{ type.label }}</span>
              <span class="type-desc">{{ type.description }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.option-editor {
  margin-top: var(--sp-lg);
  padding-top: var(--sp-lg);
  border-top: var(--border-dashed);
}

.option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-md);
}

.option-label {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 2px;
}

.empty-options {
  padding: var(--sp-lg);
  text-align: center;
  border: 1px dashed var(--border-mid);
}

.empty-options p {
  color: var(--text-dim);
  font-size: 12px;
  margin: 0 0 var(--sp-xs) 0;
}

.empty-hint {
  font-size: 11px;
  color: var(--text-ghost);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.option-card {
  background: var(--bg);
  border: var(--border-solid);
  transition: all var(--transition-fast);
}

.option-card.expanded {
  border-color: var(--accent-dim);
}

.option-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-sm) var(--sp-md);
  cursor: pointer;
}

.option-card-header:hover {
  background: var(--bg-hover);
}

.option-info {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.option-name {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-bright);
}

.option-type {
  font-family: var(--font-display);
  font-size: 9px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-faint);
  padding: 2px 6px;
  letter-spacing: 1px;
}

.option-required {
  font-family: var(--font-display);
  font-size: 9px;
  font-weight: 600;
  color: var(--red);
  background: var(--red-dim);
  padding: 2px 6px;
  letter-spacing: 1px;
}

.option-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-xs);
}

.option-action {
  background: none;
  border: none;
  color: var(--text-ghost);
  cursor: pointer;
  padding: var(--sp-xs);
  transition: color var(--transition-fast);
}

.option-action:hover:not(:disabled) {
  color: var(--text-bright);
}

.option-action:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.option-action.danger:hover {
  color: var(--red);
}

.expand-icon {
  color: var(--text-ghost);
  font-size: 10px;
  margin-left: var(--sp-sm);
}

.option-card-body {
  padding: var(--sp-md);
  border-top: var(--border-dashed);
  background: var(--bg-raised);
}

.option-field {
  margin-bottom: var(--sp-md);
}

.field-label {
  display: block;
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: var(--sp-xs);
}

.field-hint {
  font-size: 10px;
  color: var(--text-ghost);
  margin-top: var(--sp-2xs);
}

.input {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-bright);
  background: var(--bg);
  border: var(--border-solid);
  padding: var(--sp-sm) var(--sp-md);
  width: 100%;
}

.input:focus {
  outline: none;
  border-color: var(--accent);
}

.select {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-bright);
  background: var(--bg);
  border: var(--border-solid);
  border-radius: 0;
  padding: var(--sp-sm) var(--sp-md);
  width: 100%;
  appearance: none;
  cursor: pointer;
}

.select:focus {
  outline: none;
  border-color: var(--accent);
}

.option-row {
  display: flex;
  gap: var(--sp-lg);
  margin-bottom: var(--sp-md);
}

.checkbox {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  cursor: pointer;
  font-size: 12px;
  color: var(--text);
}

.checkbox input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

/* Choices */
.choices-section {
  margin-top: var(--sp-md);
  padding-top: var(--sp-md);
  border-top: var(--border-dashed);
}

.choices-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-sm);
}

.choices-label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
}

.add-choice-btn {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 600;
  color: var(--accent);
  background: none;
  border: 1px solid var(--accent-dim);
  padding: var(--sp-xs) var(--sp-sm);
  cursor: pointer;
  letter-spacing: 1px;
  transition: all var(--transition-fast);
}

.add-choice-btn:hover {
  background: var(--accent-faint);
}

.choices-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xs);
}

.choice-row {
  display: flex;
  gap: var(--sp-xs);
  align-items: center;
}

.choice-name {
  flex: 1;
}

.choice-value {
  flex: 1;
}

.choice-remove {
  background: none;
  border: none;
  color: var(--text-ghost);
  cursor: pointer;
  padding: var(--sp-xs);
}

.choice-remove:hover {
  color: var(--red);
}

.choices-hint {
  font-size: 11px;
  color: var(--text-ghost);
  margin: 0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.add-option-modal {
  background: var(--bg-panel);
  border: var(--border-solid);
  width: 90%;
  max-width: 400px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-md) var(--sp-lg);
  border-bottom: var(--border-solid);
}

.modal-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-heading);
  letter-spacing: 2px;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 16px;
}

.modal-body {
  padding: var(--sp-lg);
}

.modal-description {
  font-size: 12px;
  color: var(--text-dim);
  margin: 0 0 var(--sp-md) 0;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-sm);
}

.type-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--sp-md);
  background: var(--bg);
  border: var(--border-solid);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.type-option:hover {
  border-color: var(--accent);
  background: var(--accent-faint);
}

.type-name {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 1px;
}

.type-desc {
  font-size: 9px;
  color: var(--text-ghost);
  margin-top: var(--sp-2xs);
}

/* Mobile */
@media (max-width: 480px) {
  .type-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .option-row {
    flex-direction: column;
    gap: var(--sp-sm);
  }

  .choice-row {
    flex-wrap: wrap;
  }

  .choice-name,
  .choice-value {
    flex: none;
    width: calc(50% - var(--sp-xs));
  }
}
</style>
