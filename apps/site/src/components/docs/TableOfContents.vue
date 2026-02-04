<script setup lang="ts">
import { ref, watch } from 'vue';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface Props {
  content: string;
}

const props = defineProps<Props>();

const tocItems = ref<TocItem[]>([]);

const extractHeadings = (markdown: string): TocItem[] => {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const items: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/[^\w]+/g, '-');
    items.push({ id, text, level });
  }

  return items;
};

watch(
  () => props.content,
  (newContent) => {
    if (newContent) {
      tocItems.value = extractHeadings(newContent);
    }
  },
  { immediate: true }
);

const scrollToHeading = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
</script>

<template>
  <nav v-if="tocItems.length > 0" class="toc">
    <h4 class="toc-title">ON THIS PAGE</h4>
    <ul class="toc-list">
      <li
        v-for="item in tocItems"
        :key="item.id"
        :class="['toc-item', `level-${item.level}`]"
      >
        <a
          :href="`#${item.id}`"
          class="toc-link"
          @click.prevent="scrollToHeading(item.id)"
        >
          {{ item.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.toc {
  position: sticky;
  top: var(--sp-lg);
}

.toc-title {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 2px;
  margin-bottom: var(--sp-md);
  padding-bottom: var(--sp-sm);
  border-bottom: var(--border-dashed);
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin: 0;
}

.toc-link {
  display: block;
  padding: var(--sp-xs) 0;
  color: var(--text-dim);
  text-decoration: none;
  font-size: 11px;
  line-height: 1.5;
  transition: color var(--transition-fast);
  border-left: 2px solid transparent;
  padding-left: var(--sp-sm);
}

.toc-link:hover {
  color: var(--accent);
}

.level-2 {
  padding-left: 0;
}

.level-3 .toc-link {
  padding-left: var(--sp-md);
  font-size: 10px;
}

.level-4 .toc-link {
  padding-left: var(--sp-lg);
  font-size: 10px;
  color: var(--text-ghost);
}
</style>
