<script setup lang="ts">
import { ref, computed, provide } from 'vue';
import BuilderLayout from '@/components/builder/BuilderLayout.vue';
import SectionNav from '@/components/builder/SectionNav.vue';
import SchemaForm from '@/components/builder/SchemaForm.vue';
import ActionBuilder from '@/components/builder/ActionBuilder.vue';
import YamlPreview from '@/components/builder/YamlPreview.vue';
import ValidationPanel from '@/components/builder/ValidationPanel.vue';
import BotPreview from '@/components/builder/BotPreview.vue';
import ProjectManager from '@/components/builder/ProjectManager.vue';
import { useSchemaStore } from '@/stores/schema';

const schemaStore = useSchemaStore();

const activeSection = ref('identity');
const showProjectManager = ref(false);
const rightPanelTab = ref<'yaml' | 'preview' | 'validation'>('yaml');

const sections = [
  { id: 'identity', title: 'Identity', icon: 'fas fa-robot' },
  { id: 'presence', title: 'Presence', icon: 'fas fa-circle-dot' },
  { id: 'permissions', title: 'Permissions', icon: 'fas fa-shield' },
  { id: 'state', title: 'State', icon: 'fas fa-database' },
  { id: 'commands', title: 'Commands', icon: 'fas fa-terminal' },
  { id: 'context_menus', title: 'Context Menus', icon: 'fas fa-bars' },
  { id: 'events', title: 'Events', icon: 'fas fa-bolt' },
  { id: 'flows', title: 'Flows', icon: 'fas fa-diagram-project' },
  { id: 'components', title: 'Components', icon: 'fas fa-puzzle-piece' },
  { id: 'embeds', title: 'Embeds', icon: 'fas fa-window-maximize' },
  { id: 'theme', title: 'Theme', icon: 'fas fa-palette' },
  { id: 'voice', title: 'Voice', icon: 'fas fa-microphone' },
  { id: 'pipes', title: 'Pipes', icon: 'fas fa-plug' },
  { id: 'automod', title: 'Automod', icon: 'fas fa-gavel' },
  { id: 'scheduler', title: 'Scheduler', icon: 'fas fa-clock' },
  { id: 'locale', title: 'Locale', icon: 'fas fa-globe' },
  { id: 'canvas', title: 'Canvas', icon: 'fas fa-image' },
  { id: 'analytics', title: 'Analytics', icon: 'fas fa-chart-line' },
  { id: 'dashboard', title: 'Dashboard', icon: 'fas fa-gauge-high' },
  { id: 'errors', title: 'Errors', icon: 'fas fa-triangle-exclamation' },
];

const setActiveSection = (sectionId: string) => {
  activeSection.value = sectionId;
};

const handleNewProject = () => {
  schemaStore.newProject();
  showProjectManager.value = false;
};

const handleLoadProject = (projectId: string) => {
  schemaStore.loadProject(projectId);
  showProjectManager.value = false;
};

provide('schemaStore', schemaStore);
</script>

<template>
  <div class="builder-page">
    <BuilderLayout>
      <template #header>
        <div class="builder-header">
          <div class="header-left">
            <h1 class="builder-title">SCHEMA BUILDER</h1>
            <span class="project-name">{{ schemaStore.currentProject?.name || 'Untitled' }}</span>
          </div>
          <div class="header-actions">
            <button class="header-btn" @click="showProjectManager = true">
              <i class="fas fa-folder-open"></i>
              PROJECTS
            </button>
            <button class="header-btn" @click="schemaStore.saveProject()">
              <i class="fas fa-save"></i>
              SAVE
            </button>
            <button class="header-btn btn-primary" @click="schemaStore.exportYaml()">
              <i class="fas fa-download"></i>
              EXPORT
            </button>
          </div>
        </div>
      </template>

      <template #sidebar>
        <SectionNav
          :sections="sections"
          :activeId="activeSection"
          @select="setActiveSection"
        />
      </template>

      <template #main>
        <div class="main-content">
          <div class="form-panel">
            <div class="form-header">
              <h2 class="form-title">
                <i :class="sections.find(s => s.id === activeSection)?.icon"></i>
                {{ sections.find(s => s.id === activeSection)?.title }}
              </h2>
            </div>

            <div class="form-body">
              <SchemaForm
                v-if="!['commands', 'events', 'flows'].includes(activeSection)"
                :section="activeSection"
              />
              <ActionBuilder
                v-else
                :section="activeSection"
              />
            </div>
          </div>
        </div>
      </template>

      <template #right>
        <div class="right-panel">
          <div class="panel-tabs">
            <button
              :class="['panel-tab', { active: rightPanelTab === 'yaml' }]"
              @click="rightPanelTab = 'yaml'"
            >
              <i class="fas fa-code"></i> YAML
            </button>
            <button
              :class="['panel-tab', { active: rightPanelTab === 'preview' }]"
              @click="rightPanelTab = 'preview'"
            >
              <i class="fas fa-eye"></i> PREVIEW
            </button>
            <button
              :class="['panel-tab', { active: rightPanelTab === 'validation' }]"
              @click="rightPanelTab = 'validation'"
            >
              <i class="fas fa-check-circle"></i> VALIDATE
            </button>
          </div>

          <div class="panel-content">
            <YamlPreview v-if="rightPanelTab === 'yaml'" />
            <BotPreview v-else-if="rightPanelTab === 'preview'" />
            <ValidationPanel v-else />
          </div>
        </div>
      </template>
    </BuilderLayout>

    <ProjectManager
      v-if="showProjectManager"
      @close="showProjectManager = false"
      @new="handleNewProject"
      @load="handleLoadProject"
    />
  </div>
</template>

<style scoped>
.builder-page {
  height: calc(100vh - var(--nav-height));
  overflow: hidden;
}

.builder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-md) var(--sp-lg);
  background: var(--bg-panel);
  border-bottom: var(--border-solid);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--sp-lg);
}

.builder-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-heading);
  letter-spacing: 2px;
  margin: 0;
}

.project-name {
  font-size: 12px;
  color: var(--text-dim);
  padding: var(--sp-xs) var(--sp-sm);
  border: 1px dashed var(--border-mid);
}

.header-actions {
  display: flex;
  gap: var(--sp-sm);
}

.header-btn {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: var(--sp-sm) var(--sp-md);
  display: flex;
  align-items: center;
  gap: var(--sp-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: transparent;
  border: 1px solid var(--border-mid);
  color: var(--text-dim);
}

.header-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.header-btn.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
}

.header-btn.btn-primary:hover {
  background: var(--accent-bright);
}

.header-btn i {
  font-size: 11px;
}

.main-content {
  height: 100%;
  overflow-y: auto;
}

.form-panel {
  padding: var(--sp-lg);
}

.form-header {
  margin-bottom: var(--sp-lg);
  padding-bottom: var(--sp-md);
  border-bottom: 2px solid var(--accent);
}

.form-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--text-heading);
  letter-spacing: 2px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.form-title i {
  color: var(--accent);
  font-size: 16px;
}

.form-body {
  max-width: 600px;
}

.right-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-sidebar);
}

.panel-tabs {
  display: flex;
  border-bottom: var(--border-solid);
  background: var(--bg-panel);
}

.panel-tab {
  flex: 1;
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: var(--sp-sm) var(--sp-md);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-xs);
  cursor: pointer;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-dim);
  transition: all var(--transition-fast);
}

.panel-tab:hover {
  color: var(--text-bright);
}

.panel-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.panel-tab i {
  font-size: 10px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}
</style>
