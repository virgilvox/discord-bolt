<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  accent?: boolean;
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  accent: false,
  hoverable: true,
  padding: 'md',
});

const classes = computed(() => [
  'furlow-card',
  props.accent && 'card-accent',
  props.hoverable && 'card-hoverable',
  `padding-${props.padding}`,
]);
</script>

<template>
  <div :class="classes">
    <div v-if="$slots.header" class="card-header">
      <slot name="header" />
    </div>
    <div class="card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.furlow-card {
  background: var(--bg-raised);
  border: var(--border-solid);
  transition: border-color var(--transition-fast);
}

.card-hoverable:hover {
  border-color: var(--border-mid);
}

.card-accent {
  border-left: 3px solid var(--accent);
}

.padding-sm {
  padding: var(--sp-md);
}

.padding-md {
  padding: var(--sp-xl);
}

.padding-lg {
  padding: var(--sp-2xl);
}

.padding-sm .card-header,
.padding-sm .card-footer {
  margin: calc(-1 * var(--sp-md));
  margin-bottom: var(--sp-md);
  padding: var(--sp-sm) var(--sp-md);
}

.padding-md .card-header,
.padding-md .card-footer {
  margin: calc(-1 * var(--sp-xl));
  margin-bottom: var(--sp-lg);
  padding: var(--sp-md) var(--sp-xl);
}

.padding-lg .card-header,
.padding-lg .card-footer {
  margin: calc(-1 * var(--sp-2xl));
  margin-bottom: var(--sp-xl);
  padding: var(--sp-lg) var(--sp-2xl);
}

.card-header {
  border-bottom: var(--border-solid);
}

.padding-sm .card-footer,
.padding-md .card-footer,
.padding-lg .card-footer {
  margin-bottom: 0;
  margin-top: var(--sp-lg);
  border-top: var(--border-dashed);
  border-bottom: none;
}
</style>
