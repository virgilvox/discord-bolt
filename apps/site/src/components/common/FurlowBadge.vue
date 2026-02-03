<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'accent' | 'green' | 'yellow' | 'blue' | 'purple' | 'red' | 'ghost';
  icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'accent',
});

const classes = computed(() => [
  'furlow-badge',
  `badge-${props.variant}`,
]);
</script>

<template>
  <span :class="classes">
    <i v-if="icon" :class="icon"></i>
    <slot />
  </span>
</template>

<style scoped>
.furlow-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-xs);
  font-size: 10px;
  font-family: var(--font-mono);
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 8px;
}

.furlow-badge i {
  font-size: 10px;
}

.badge-accent {
  background: var(--accent-glow);
  color: var(--accent);
  border: 1px solid var(--accent-dim);
}

.badge-green {
  background: var(--green-dim);
  color: var(--green);
  border: 1px solid rgba(139, 214, 73, 0.3);
}

.badge-yellow {
  background: var(--yellow-dim);
  color: var(--yellow);
  border: 1px solid rgba(240, 192, 64, 0.3);
}

.badge-blue {
  background: var(--blue-dim);
  color: var(--blue);
  border: 1px solid rgba(91, 168, 245, 0.3);
}

.badge-purple {
  background: var(--purple-dim);
  color: var(--purple);
  border: 1px solid rgba(154, 123, 202, 0.3);
}

.badge-red {
  background: var(--red-dim);
  color: var(--red);
  border: 1px solid rgba(224, 85, 85, 0.3);
}

.badge-ghost {
  background: transparent;
  color: var(--text-dim);
  border: 1px dashed var(--border-mid);
}
</style>
