<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap } from '@codemirror/commands';
import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

interface Props {
  modelValue: string;
  placeholderText?: string;
  multiline?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholderText: 'Enter expression...',
  multiline: false,
});

const emit = defineEmits<Emits>();

const editorRef = ref<HTMLDivElement | null>(null);
let editorView: EditorView | null = null;

// Context variables available in expressions
const contextVariables = [
  // User context
  { label: 'user.id', type: 'variable', info: 'User ID' },
  { label: 'user.name', type: 'variable', info: 'Username' },
  { label: 'user.mention', type: 'variable', info: 'User mention string' },
  { label: 'user.avatar', type: 'variable', info: 'Avatar URL' },
  { label: 'user.discriminator', type: 'variable', info: 'User discriminator' },
  { label: 'user.bot', type: 'variable', info: 'Is bot user' },

  // Member context
  { label: 'member.nickname', type: 'variable', info: 'Server nickname' },
  { label: 'member.roles', type: 'variable', info: 'Array of role IDs' },
  { label: 'member.joinedAt', type: 'variable', info: 'Join timestamp' },
  { label: 'member.premiumSince', type: 'variable', info: 'Boost timestamp' },

  // Guild context
  { label: 'guild.id', type: 'variable', info: 'Server ID' },
  { label: 'guild.name', type: 'variable', info: 'Server name' },
  { label: 'guild.memberCount', type: 'variable', info: 'Member count' },
  { label: 'guild.icon', type: 'variable', info: 'Server icon URL' },
  { label: 'guild.ownerId', type: 'variable', info: 'Owner user ID' },

  // Channel context
  { label: 'channel.id', type: 'variable', info: 'Channel ID' },
  { label: 'channel.name', type: 'variable', info: 'Channel name' },
  { label: 'channel.type', type: 'variable', info: 'Channel type' },
  { label: 'channel.topic', type: 'variable', info: 'Channel topic' },
  { label: 'channel.nsfw', type: 'variable', info: 'Is NSFW channel' },

  // Message context
  { label: 'message.id', type: 'variable', info: 'Message ID' },
  { label: 'message.content', type: 'variable', info: 'Message content' },
  { label: 'message.author', type: 'variable', info: 'Message author' },

  // Options (from slash commands)
  { label: 'options', type: 'variable', info: 'Command options object' },

  // State
  { label: 'state', type: 'variable', info: 'Bot state object' },
  { label: 'global', type: 'variable', info: 'Global state' },
];

// Common Jexl functions
const jexlFunctions = [
  { label: 'length()', type: 'function', info: 'Get string/array length' },
  { label: 'upper()', type: 'function', info: 'Convert to uppercase' },
  { label: 'lower()', type: 'function', info: 'Convert to lowercase' },
  { label: 'trim()', type: 'function', info: 'Trim whitespace' },
  { label: 'split()', type: 'function', info: 'Split string by delimiter' },
  { label: 'join()', type: 'function', info: 'Join array with delimiter' },
  { label: 'includes()', type: 'function', info: 'Check if contains value' },
  { label: 'startsWith()', type: 'function', info: 'Check string prefix' },
  { label: 'endsWith()', type: 'function', info: 'Check string suffix' },
  { label: 'replace()', type: 'function', info: 'Replace substring' },
  { label: 'slice()', type: 'function', info: 'Extract portion' },
  { label: 'round()', type: 'function', info: 'Round number' },
  { label: 'floor()', type: 'function', info: 'Round down' },
  { label: 'ceil()', type: 'function', info: 'Round up' },
  { label: 'abs()', type: 'function', info: 'Absolute value' },
  { label: 'min()', type: 'function', info: 'Minimum value' },
  { label: 'max()', type: 'function', info: 'Maximum value' },
  { label: 'random()', type: 'function', info: 'Random number 0-1' },
  { label: 'now()', type: 'function', info: 'Current timestamp' },
  { label: 'format()', type: 'function', info: 'Format value' },
];

// Autocomplete function
function expressionCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w.]+/);
  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }

  const options = [...contextVariables, ...jexlFunctions].map((item) => ({
    label: item.label,
    type: item.type,
    info: item.info,
    boost: item.type === 'variable' ? 1 : 0,
  }));

  return {
    from: word.from,
    options,
    validFor: /^[\w.]*$/,
  };
}

// Custom highlight style matching design system
const furlowHighlight = HighlightStyle.define([
  { tag: tags.string, color: '#8bd649' },
  { tag: tags.number, color: '#f0c040' },
  { tag: tags.bool, color: '#ff6b35' },
  { tag: tags.null, color: '#e05555' },
  { tag: tags.operator, color: '#5ba8f5' },
  { tag: tags.variableName, color: '#4ec9b0' },
  { tag: tags.propertyName, color: '#9a7bca' },
  { tag: tags.function(tags.variableName), color: '#ff6b35' },
  { tag: tags.keyword, color: '#ff6b35' },
  { tag: tags.comment, color: '#666666' },
]);

// Dark theme for CodeMirror
const furlowTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--bg-code)',
    color: 'var(--text)',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-content': {
    padding: 'var(--sp-sm)',
    caretColor: 'var(--accent)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--accent)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'var(--accent-faint) !important',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border-mid)',
    boxShadow: 'var(--shadow-lg)',
  },
  '.cm-tooltip-autocomplete ul li': {
    padding: 'var(--sp-xs) var(--sp-sm)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'var(--accent-faint)',
    color: 'var(--accent)',
  },
  '.cm-completionLabel': {
    color: 'var(--text-bright)',
  },
  '.cm-completionMatchedText': {
    color: 'var(--accent)',
    textDecoration: 'none',
  },
  '.cm-completionDetail': {
    color: 'var(--text-dim)',
    marginLeft: 'var(--sp-md)',
    fontStyle: 'italic',
  },
  '.cm-placeholder': {
    color: 'var(--text-ghost)',
  },
}, { dark: true });

const createEditor = () => {
  if (!editorRef.value) return;

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      emit('update:modelValue', update.state.doc.toString());
    }
  });

  const extensions = [
    keymap.of(defaultKeymap),
    furlowTheme,
    syntaxHighlighting(furlowHighlight),
    autocompletion({
      override: [expressionCompletions],
      activateOnTyping: true,
    }),
    placeholder(props.placeholderText),
    updateListener,
  ];

  // Single line mode
  if (!props.multiline) {
    extensions.push(
      EditorState.transactionFilter.of((tr) => {
        return tr.newDoc.lines > 1 ? [] : tr;
      })
    );
  }

  editorView = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions,
    }),
    parent: editorRef.value,
  });
};

const destroyEditor = () => {
  if (editorView) {
    editorView.destroy();
    editorView = null;
  }
};

// Sync external changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (editorView && editorView.state.doc.toString() !== newValue) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: newValue,
        },
      });
    }
  }
);

onMounted(createEditor);
onUnmounted(destroyEditor);
</script>

<template>
  <div class="expression-editor" :class="{ multiline }">
    <div class="editor-wrapper">
      <span class="expr-marker">$</span>
      <div ref="editorRef" class="editor-container"></div>
    </div>
    <div class="editor-hint">
      <i class="fas fa-info-circle"></i>
      <span>Type to see suggestions. Use dot notation for nested values.</span>
    </div>
  </div>
</template>

<style scoped>
.expression-editor {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xs);
}

.editor-wrapper {
  display: flex;
  align-items: flex-start;
  background: var(--bg-code);
  border: 1px solid var(--border-dim);
  transition: border-color var(--transition-fast);
}

.editor-wrapper:focus-within {
  border-color: var(--accent);
}

.expr-marker {
  padding: var(--sp-sm);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  user-select: none;
  background: var(--bg-panel);
  border-right: 1px solid var(--border-dim);
}

.editor-container {
  flex: 1;
  overflow: hidden;
}

.expression-editor.multiline .editor-container {
  min-height: 100px;
}

.editor-hint {
  display: flex;
  align-items: center;
  gap: var(--sp-xs);
  font-size: 11px;
  color: var(--text-ghost);
}

.editor-hint i {
  font-size: 10px;
}

/* CodeMirror overrides for proper sizing */
.editor-container :deep(.cm-editor) {
  height: 100%;
}

.editor-container :deep(.cm-scroller) {
  overflow: auto;
}

.expression-editor:not(.multiline) .editor-container :deep(.cm-editor) {
  max-height: 32px;
}

.expression-editor:not(.multiline) .editor-container :deep(.cm-content) {
  padding: var(--sp-xs) var(--sp-sm);
}
</style>
