<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  href?: string;
  to?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  iconPosition: 'left',
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const classes = computed(() => [
  'btn',
  `btn-${props.variant}`,
  props.size !== 'md' && `btn-${props.size}`,
  props.disabled && 'btn-disabled',
  props.loading && 'btn-loading',
]);

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>

<template>
  <component
    :is="to ? 'RouterLink' : href ? 'a' : 'button'"
    :to="to"
    :href="href"
    :class="classes"
    :disabled="disabled || loading"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'noopener' : undefined"
    @click="handleClick"
  >
    <span v-if="loading" class="spinner"></span>
    <template v-else>
      <i v-if="icon && iconPosition === 'left'" :class="icon"></i>
      <slot />
      <i v-if="icon && iconPosition === 'right'" :class="icon"></i>
    </template>
  </component>
</template>

<style scoped>
.btn {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  padding: var(--sp-sm) var(--sp-lg);
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-sm);
  line-height: 1;
  text-decoration: none;
}

.btn i {
  font-size: 12px;
}

.btn-primary {
  background: var(--accent);
  color: var(--bg);
}

.btn-primary:hover:not(.btn-disabled) {
  background: var(--accent-bright);
  box-shadow: var(--shadow-glow);
}

.btn-secondary {
  background: transparent;
  color: var(--accent);
  border: 2px solid var(--accent);
}

.btn-secondary:hover:not(.btn-disabled) {
  background: var(--accent-glow);
}

.btn-ghost {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-mid);
}

.btn-ghost:hover:not(.btn-disabled) {
  border-color: var(--border-bright);
  color: var(--text-bright);
}

.btn-danger {
  background: var(--red);
  color: #fff;
}

.btn-danger:hover:not(.btn-disabled) {
  background: #c94444;
}

.btn-sm {
  font-size: 11px;
  padding: var(--sp-xs) var(--sp-md);
  letter-spacing: 1.5px;
}

.btn-lg {
  font-size: 14px;
  padding: var(--sp-md) var(--sp-xl);
  letter-spacing: 2.5px;
}

.btn-disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-loading {
  position: relative;
  color: transparent;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.btn-primary .spinner {
  border-color: var(--bg);
  border-top-color: transparent;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
