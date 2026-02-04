<script setup lang="ts">
import { ref } from 'vue';

const examples = [
  {
    id: 'commands',
    label: 'COMMANDS',
    code: `commands:
  - name: greet
    description: "Greet a user"
    options:
      - name: user
        type: user
        description: "User to greet"
        required: true
    actions:
      - action: reply
        content: "Hello, {{ options.user.name }}!"
        embed:
          color: "#ff6b35"
          title: "Welcome!"
          description: "Thanks for using our bot."`,
  },
  {
    id: 'events',
    label: 'EVENTS',
    code: `events:
  - on: member_join
    actions:
      - action: send_message
        channel: "{{ guild.systemChannel }}"
        content: "Welcome {{ member.name }}!"
      - action: assign_role
        role: "Member"

  - on: message_create
    when: "message.content | startsWith('!')"
    actions:
      - action: add_reaction
        emoji: "👋"`,
  },
  {
    id: 'state',
    label: 'STATE',
    code: `state:
  variables:
    welcome_count:
      scope: guild
      default: 0

commands:
  - name: stats
    actions:
      - action: increment
        var: welcome_count
        scope: guild
      - action: reply
        content: |
          Total welcomes: {{ state.welcome_count }}`,
  },
  {
    id: 'voice',
    label: 'VOICE',
    code: `commands:
  - name: play
    options:
      - name: query
        type: string
        required: true
    actions:
      - action: voice_join
        channel: "{{ member.voice.channel }}"
      - action: voice_search
        query: "{{ options.query }}"
        as: results
      - action: queue_add
        track: "{{ results[0] }}"
      - action: reply
        content: "Now playing: {{ results[0].title }}"`,
  },
];

const activeExample = ref('commands');

const setActiveExample = (id: string) => {
  activeExample.value = id;
};

const activeCode = () => {
  return examples.find(e => e.id === activeExample.value)?.code || '';
};
</script>

<template>
  <section class="code-example">
    <div class="code-example-inner">
      <h2 class="section-title">
        <span class="section-num">02</span>
        EXAMPLES
      </h2>

      <div class="example-container">
        <div class="example-tabs">
          <button
            v-for="example in examples"
            :key="example.id"
            :class="['example-tab', { active: activeExample === example.id }]"
            @click="setActiveExample(example.id)"
          >
            {{ example.label }}
          </button>
        </div>

        <div class="example-code">
          <div class="code-header">
            <span class="code-label">YAML</span>
            <button class="copy-btn" title="Copy code">
              <i class="fas fa-copy"></i>
            </button>
          </div>
          <pre class="code-content"><code>{{ activeCode() }}</code></pre>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.code-example {
  padding: var(--sp-4xl) var(--sp-lg);
  background: var(--bg);
}

.code-example-inner {
  max-width: var(--max-width);
  margin: 0 auto;
}

.section-title {
  display: flex;
  align-items: baseline;
  gap: var(--sp-md);
  margin-bottom: var(--sp-2xl);
  padding-bottom: var(--sp-md);
  border-bottom: 2px solid var(--accent);
}

.section-num {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 2px;
}

.example-container {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.example-tabs {
  display: flex;
  border-bottom: var(--border-solid);
  background: var(--bg-panel);
}

.example-tab {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 1.5px;
  color: var(--text-dim);
  padding: var(--sp-md) var(--sp-xl);
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all var(--transition-fast);
}

.example-tab:hover {
  color: var(--text-bright);
}

.example-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.example-code {
  background: var(--bg-code);
  border: var(--border-solid);
  border-top: none;
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-sm) var(--sp-lg);
  border-bottom: var(--border-solid);
  background: var(--bg-panel);
}

.code-label {
  font-size: 10px;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
}

.copy-btn {
  background: none;
  border: 1px solid var(--border-mid);
  color: var(--text-dim);
  padding: var(--sp-xs) var(--sp-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.copy-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.copy-btn i {
  font-size: 11px;
}

.code-content {
  padding: var(--sp-xl);
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  overflow-x: auto;
  background: transparent;
  border: none;
  color: var(--text);
}

.code-content code {
  font-family: var(--font-mono);
  white-space: pre;
}

@media (max-width: 768px) {
  .code-example {
    padding: var(--sp-2xl) var(--sp-md);
  }

  .example-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
  }

  .example-tabs::-webkit-scrollbar {
    display: none;
  }

  .example-tab {
    flex-shrink: 0;
    min-height: 44px;
    padding: var(--sp-md) var(--sp-lg);
  }

  .code-content {
    padding: var(--sp-md);
    font-size: 12px;
    line-height: 1.6;
  }
}

@media (max-width: 600px) {
  .example-tabs {
    flex-wrap: wrap;
  }

  .example-tab {
    flex: 1;
    min-width: 50%;
    text-align: center;
  }

  .section-num {
    font-size: 28px;
  }
}

@media (max-width: 400px) {
  .code-content {
    font-size: 11px;
    padding: var(--sp-sm);
  }
}
</style>
