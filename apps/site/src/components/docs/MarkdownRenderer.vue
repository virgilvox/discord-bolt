<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { marked } from 'marked';
import { codeToHtml } from 'shiki';

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

const highlightCode = async (code: string, lang: string): Promise<string> => {
  try {
    const supportedLangs = ['yaml', 'javascript', 'typescript', 'json', 'bash', 'sh', 'shell', 'markdown', 'md'];
    const language = supportedLangs.includes(lang) ? lang : 'text';

    const html = await codeToHtml(code, {
      lang: language === 'sh' || language === 'shell' ? 'bash' : language === 'md' ? 'markdown' : language,
      theme: 'github-dark-default',
    });
    return html;
  } catch {
    return `<pre><code>${code}</code></pre>`;
  }
};

const renderMarkdown = async (content: string) => {
  // First pass: extract code blocks
  const codeBlocks: Array<{ placeholder: string; code: string; lang: string }> = [];
  let index = 0;

  const withPlaceholders = content.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const placeholder = `__CODE_BLOCK_${index}__`;
      codeBlocks.push({ placeholder, code: code.trim(), lang: lang || 'text' });
      index++;
      return placeholder;
    }
  );

  // Render markdown
  let html = await marked.parse(withPlaceholders);

  // Replace placeholders with highlighted code
  for (const block of codeBlocks) {
    const highlighted = await highlightCode(block.code, block.lang);
    html = html.replace(`<p>${block.placeholder}</p>`, highlighted);
    html = html.replace(block.placeholder, highlighted);
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
