<script setup lang="ts">
import { ref } from 'vue';

interface NavItem {
  id: string;
  title: string;
  icon?: string;
  path?: string;
  children?: NavItem[];
}

interface Props {
  items: NavItem[];
  activeId?: string;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'select', item: NavItem): void;
}>();

const expandedSections = ref<Set<string>>(new Set());

const toggleSection = (id: string) => {
  if (expandedSections.value.has(id)) {
    expandedSections.value.delete(id);
  } else {
    expandedSections.value.add(id);
  }
};

const isExpanded = (id: string) => expandedSections.value.has(id);

const handleSelect = (item: NavItem) => {
  emit('select', item);
};
</script>

<template>
  <nav class="nav-sidebar">
    <div v-for="item in items" :key="item.id" class="nav-section">
      <button
        v-if="item.children?.length"
        :class="['nav-section-header', { expanded: isExpanded(item.id) }]"
        @click="toggleSection(item.id)"
      >
        <i v-if="item.icon" :class="['section-icon', item.icon]"></i>
        <span class="section-title">{{ item.title }}</span>
        <i class="fa-solid fa-chevron-down chevron"></i>
      </button>

      <RouterLink
        v-else-if="item.path"
        :to="item.path"
        :class="['nav-item', { active: activeId === item.id }]"
        @click="handleSelect(item)"
      >
        <i v-if="item.icon" :class="['item-icon', item.icon]"></i>
        <span>{{ item.title }}</span>
      </RouterLink>

      <div
        v-if="item.children?.length"
        :class="['nav-children', { expanded: isExpanded(item.id) }]"
      >
        <RouterLink
          v-for="child in item.children"
          :key="child.id"
          :to="child.path || '#'"
          :class="['nav-item', 'nav-child', { active: activeId === child.id }]"
          @click="handleSelect(child)"
        >
          <span>{{ child.title }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav-sidebar {
  background: var(--bg-sidebar);
  border-right: var(--border-solid);
  width: var(--sidebar-width);
  height: 100%;
  overflow-y: auto;
  padding: var(--sp-lg) 0;
}

.nav-section {
  margin-bottom: var(--sp-xs);
}

.nav-section-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  padding: var(--sp-sm) var(--sp-lg);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-dim);
  transition: all var(--transition-fast);
}

.nav-section-header:hover {
  color: var(--text-bright);
  background: var(--bg-hover);
}

.nav-section-header.expanded {
  color: var(--text-bright);
}

.section-icon {
  font-size: 12px;
  width: 16px;
  text-align: center;
  color: var(--accent-dim);
}

.section-title {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  flex: 1;
  text-align: left;
}

.chevron {
  font-size: 10px;
  transition: transform var(--transition-fast);
}

.nav-section-header.expanded .chevron {
  transform: rotate(180deg);
}

.nav-children {
  display: none;
  flex-direction: column;
}

.nav-children.expanded {
  display: flex;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  padding: var(--sp-sm) var(--sp-lg);
  color: var(--text-dim);
  text-decoration: none;
  font-size: 13px;
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

.nav-child {
  padding-left: calc(var(--sp-lg) + var(--sp-lg));
  font-size: 12px;
}

.item-icon {
  font-size: 11px;
  width: 16px;
  text-align: center;
  color: var(--accent-dim);
}
</style>
