<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DocNav from '@/components/docs/DocNav.vue';
import MarkdownRenderer from '@/components/docs/MarkdownRenderer.vue';
import TableOfContents from '@/components/docs/TableOfContents.vue';
import { useDocs } from '@/composables/useDocs';

const route = useRoute();
const router = useRouter();

const { manifest, loadDoc, currentDoc, loading, error } = useDocs();

const slug = computed(() => {
  const params = route.params.pathMatch;
  if (Array.isArray(params)) {
    return params.join('/');
  }
  return params || '';
});

const currentPage = computed(() => {
  if (!manifest.value) return null;

  for (const section of manifest.value.sections) {
    for (const page of section.pages) {
      const pagePath = page.path.replace(/\.md$/, '').replace(/\/_index$/, '').replace(/\/README$/, '');
      if (pagePath === slug.value || page.id === slug.value) {
        return { ...page, sectionId: section.id };
      }
    }
  }
  return null;
});

watch(
  () => slug.value,
  async (newSlug) => {
    if (newSlug) {
      await loadDoc(newSlug);
    } else {
      // Default to installation guide
      router.replace('/docs/guides/installation');
    }
  },
  { immediate: true }
);

onMounted(async () => {
  if (!slug.value) {
    router.replace('/docs/guides/installation');
  }
});
</script>

<template>
  <div class="docs-layout">
    <aside class="docs-sidebar">
      <DocNav
        v-if="manifest"
        :manifest="manifest"
        :activeId="currentPage?.id"
      />
    </aside>

    <main class="docs-main">
      <article class="docs-content">
        <div v-if="loading" class="docs-loading">
          <div class="spinner"></div>
          <span>Loading...</span>
        </div>

        <div v-else-if="error" class="docs-error">
          <i class="fas fa-exclamation-triangle"></i>
          <h2>DOCUMENT NOT FOUND</h2>
          <p>{{ error }}</p>
          <RouterLink to="/docs/guides/installation" class="btn btn-primary">
            GO TO DOCS HOME
          </RouterLink>
        </div>

        <template v-else>
          <MarkdownRenderer :content="currentDoc" />
        </template>
      </article>

      <aside class="docs-toc">
        <TableOfContents v-if="currentDoc" :content="currentDoc" />
      </aside>
    </main>
  </div>
</template>

<style scoped>
.docs-layout {
  display: flex;
  min-height: calc(100vh - var(--nav-height));
}

.docs-sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--bg-sidebar);
  border-right: var(--border-solid);
  position: sticky;
  top: var(--nav-height);
  height: calc(100vh - var(--nav-height));
  overflow-y: auto;
}

.docs-main {
  flex: 1;
  display: flex;
  max-width: calc(100% - var(--sidebar-width));
}

.docs-content {
  flex: 1;
  padding: var(--sp-2xl);
  max-width: 800px;
}

.docs-toc {
  width: 220px;
  flex-shrink: 0;
  padding: var(--sp-2xl) var(--sp-lg);
  position: sticky;
  top: var(--nav-height);
  height: calc(100vh - var(--nav-height));
  overflow-y: auto;
  border-left: var(--border-solid);
}

.docs-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-md);
  padding: var(--sp-4xl);
  color: var(--text-dim);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-mid);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.docs-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--sp-lg);
  padding: var(--sp-4xl);
}

.docs-error i {
  font-size: 48px;
  color: var(--yellow);
}

.docs-error h2 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  color: var(--text-heading);
  letter-spacing: 3px;
}

.docs-error p {
  color: var(--text-dim);
}

@media (max-width: 1100px) {
  .docs-toc {
    display: none;
  }
}

@media (max-width: 768px) {
  .docs-sidebar {
    display: none;
  }

  .docs-main {
    max-width: 100%;
  }

  .docs-content {
    padding: var(--sp-lg);
  }
}
</style>
