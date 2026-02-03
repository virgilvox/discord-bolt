<script setup lang="ts">
interface Section {
  id: string;
  title: string;
  icon: string;
}

interface Props {
  sections: Section[];
  activeId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'select', sectionId: string): void;
}>();

const handleSelect = (sectionId: string) => {
  emit('select', sectionId);
};
</script>

<template>
  <nav class="section-nav">
    <div class="nav-header">
      <span class="nav-label">SECTIONS</span>
    </div>

    <div class="nav-items">
      <button
        v-for="section in sections"
        :key="section.id"
        :class="['nav-item', { active: activeId === section.id }]"
        @click="handleSelect(section.id)"
      >
        <i :class="['item-icon', section.icon]"></i>
        <span class="item-title">{{ section.title }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.section-nav {
  padding: var(--sp-md) 0;
}

.nav-header {
  padding: var(--sp-sm) var(--sp-md);
  margin-bottom: var(--sp-sm);
}

.nav-label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 2px;
}

.nav-items {
  display: flex;
  flex-direction: column;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  padding: var(--sp-sm) var(--sp-md);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-dim);
  text-align: left;
  transition: all var(--transition-fast);
}

.nav-item:hover {
  color: var(--text-bright);
  background: var(--bg-hover);
}

.nav-item.active {
  color: var(--accent);
  background: var(--accent-faint);
  border-left: 2px solid var(--accent);
}

.item-icon {
  font-size: 11px;
  width: 16px;
  text-align: center;
}

.nav-item.active .item-icon {
  color: var(--accent);
}

.item-title {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 1px;
  text-transform: uppercase;
}
</style>
