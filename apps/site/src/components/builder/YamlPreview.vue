<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useSchemaStore } from '@/stores/schema';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { yaml } from '@codemirror/lang-yaml';
import { parse } from 'yaml';
import type { FurlowSpec } from '@furlow/schema';

const schemaStore = useSchemaStore();
const editorContainer = ref<HTMLElement | null>(null);
let editorView: EditorView | null = null;

const copied = ref(false);
const parseError = ref<string | null>(null);
let isUpdatingFromStore = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Custom theme matching design system
const furlowTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--bg-code)',
    color: 'var(--text)',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-content': {
    padding: 'var(--sp-lg)',
    caretColor: 'var(--accent)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--accent)',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--accent-glow)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-panel)',
    color: 'var(--text-ghost)',
    border: 'none',
    borderRight: '1px solid var(--border)',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 var(--sp-sm)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--bg-hover)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--bg-active)',
  },
});

// Handle editor content changes
const handleEditorChange = (content: string) => {
  if (isUpdatingFromStore) return;

  // Debounce the parse/update
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    try {
      const parsed = parse(content) as FurlowSpec;
      if (parsed && typeof parsed === 'object') {
        parseError.value = null;
        // Update the store with parsed spec
        Object.keys(parsed).forEach((key) => {
          const k = key as keyof FurlowSpec;
          schemaStore.updateSection(k, parsed[k] as never);
        });
      }
    } catch (err) {
      parseError.value = err instanceof Error ? err.message : 'Invalid YAML';
    }
  }, 500);
};

// Create update listener extension
const createUpdateListener = () => {
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      handleEditorChange(update.state.doc.toString());
    }
  });
};

const initEditor = () => {
  if (!editorContainer.value) return;

  const state = EditorState.create({
    doc: schemaStore.yamlOutput,
    extensions: [
      basicSetup,
      yaml(),
      furlowTheme,
      EditorView.lineWrapping,
      createUpdateListener(),
    ],
  });

  editorView = new EditorView({
    state,
    parent: editorContainer.value,
  });
};

const updateContent = () => {
  if (!editorView) return;

  // Get current content
  const currentContent = editorView.state.doc.toString();
  const newContent = schemaStore.yamlOutput;

  // Only update if content is actually different
  if (currentContent === newContent) return;

  isUpdatingFromStore = true;
  editorView.dispatch({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: newContent,
    },
  });
  // Reset flag after a tick to ensure listener doesn't fire
  setTimeout(() => {
    isUpdatingFromStore = false;
  }, 0);
};

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(schemaStore.yamlOutput);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

watch(() => schemaStore.yamlOutput, updateContent);

onMounted(initEditor);

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  editorView?.destroy();
});
</script>

<template>
  <div class="yaml-preview">
    <div class="preview-header">
      <span class="preview-label">YAML OUTPUT</span>
      <div class="preview-actions">
        <button class="preview-btn" @click="copyToClipboard">
          <i :class="copied ? 'fas fa-check' : 'fas fa-copy'"></i>
          {{ copied ? 'COPIED' : 'COPY' }}
        </button>
        <button class="preview-btn" @click="schemaStore.exportYaml()">
          <i class="fas fa-download"></i>
          DOWNLOAD
        </button>
      </div>
    </div>

    <div v-if="parseError" class="parse-error">
      <i class="fas fa-exclamation-triangle"></i>
      <span>{{ parseError }}</span>
    </div>

    <div ref="editorContainer" class="editor-container"></div>
  </div>
</template>

<style scoped>
.yaml-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-sm) var(--sp-md);
  background: var(--bg-panel);
  border-bottom: var(--border-solid);
}

.preview-label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 2px;
}

.preview-actions {
  display: flex;
  gap: var(--sp-xs);
}

.preview-btn {
  font-family: var(--font-display);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: var(--sp-xs) var(--sp-sm);
  display: flex;
  align-items: center;
  gap: var(--sp-xs);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--border-mid);
  color: var(--text-dim);
  transition: all var(--transition-fast);
}

.preview-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.preview-btn i {
  font-size: 10px;
}

.parse-error {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  padding: var(--sp-sm) var(--sp-md);
  background: var(--red-dim);
  border-bottom: 1px solid var(--red);
  color: var(--red);
  font-size: 11px;
  font-family: var(--font-mono);
}

.parse-error i {
  font-size: 12px;
}

.editor-container {
  flex: 1;
  overflow: auto;
}

.editor-container :deep(.cm-editor) {
  height: 100%;
}

.editor-container :deep(.cm-scroller) {
  font-family: var(--font-mono);
}
</style>
