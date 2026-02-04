<script setup lang="ts">
import { ref, watch } from 'vue';
import { marked } from 'marked';
import type { Highlighter } from 'shiki';

interface Props {
  content: string;
}

const props = defineProps<Props>();

const renderedHtml = ref('');

const customRenderer = new marked.Renderer();

// Custom heading renderer with anchor IDs
customRenderer.heading = function (text, level) {
  const id = text.toLowerCase().replace(/[^\w]+/g, '-');
  return `<h${level} id="${id}">${text}</h${level}>`;
};

marked.setOptions({
  renderer: customRenderer,
  gfm: true,
  breaks: false,
});

// Lazy-load highlighter with only the languages we need
let highlighterPromise: Promise<Highlighter> | null = null;

const getHighlighter = async (): Promise<Highlighter> => {
  if (!highlighterPromise) {
    // Dynamic import to enable code splitting
    highlighterPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({
        themes: ['github-dark-default'],
        langs: ['yaml', 'javascript', 'typescript', 'json', 'bash', 'markdown', 'text'],
      })
    );
  }
  return highlighterPromise;
};

const highlightCode = async (code: string, lang: string): Promise<string> => {
  try {
    const supportedLangs = ['yaml', 'javascript', 'typescript', 'json', 'bash', 'sh', 'shell', 'markdown', 'md', 'text'];
    let language = supportedLangs.includes(lang) ? lang : 'text';

    // Normalize aliases
    if (language === 'sh' || language === 'shell') language = 'bash';
    if (language === 'md') language = 'markdown';

    const highlighter = await getHighlighter();
    return highlighter.codeToHtml(code, {
      lang: language,
      theme: 'github-dark-default',
    });
  } catch {
    // Fallback to plain code if highlighting fails
    const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre class="shiki"><code>${escaped}</code></pre>`;
  }
};

const renderMarkdown = async (content: string) => {
  // First pass: extract code blocks and highlight them
  // Use a unique marker that won't be interpreted as markdown
  const codeBlocks: Array<{ placeholder: string; highlighted: string }> = [];
  let index = 0;

  // Extract code blocks before markdown processing
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const matches: Array<{ fullMatch: string; lang: string; code: string; index: number }> = [];

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    matches.push({
      fullMatch: match[0],
      lang: match[1] || 'text',
      code: match[2].trim(),
      index: index++,
    });
  }

  // Pre-highlight all code blocks in parallel
  const highlightedBlocks = await Promise.all(
    matches.map(async (m) => ({
      ...m,
      highlighted: await highlightCode(m.code, m.lang),
    }))
  );

  // Replace code blocks with unique HTML comment placeholders
  // HTML comments won't be transformed by markdown
  let processedContent = content;
  for (const block of highlightedBlocks) {
    const placeholder = `<!--CODEBLOCK${block.index}-->`;
    processedContent = processedContent.replace(block.fullMatch, placeholder);
    codeBlocks.push({ placeholder, highlighted: block.highlighted });
  }

  // Render markdown
  let html = await marked.parse(processedContent);

  // Replace placeholders with highlighted code
  for (const block of codeBlocks) {
    // Handle both wrapped in <p> and standalone
    html = html.replace(`<p>${block.placeholder}</p>`, block.highlighted);
    html = html.replace(block.placeholder, block.highlighted);
  }

  return html;
};

watch(
  () => props.content,
  async (newContent) => {
    if (newContent) {
      renderedHtml.value = await renderMarkdown(newContent);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="markdown-content" v-html="renderedHtml"></div>
</template>
