<script setup lang="ts">
import { ref, provide } from 'vue';

const mobileView = ref<'sidebar' | 'main' | 'right'>('main');
const mobileSidebarOpen = ref(false);
const mobileRightOpen = ref(false);

provide('mobileView', mobileView);
provide('mobileSidebarOpen', mobileSidebarOpen);
provide('mobileRightOpen', mobileRightOpen);

const setMobileView = (view: 'sidebar' | 'main' | 'right') => {
  mobileView.value = view;
  if (view === 'sidebar') {
    mobileSidebarOpen.value = true;
  } else if (view === 'right') {
    mobileRightOpen.value = true;
  }
};

const closeMobilePanel = () => {
  mobileSidebarOpen.value = false;
  mobileRightOpen.value = false;
};
</script>

<template>
  <div class="builder-layout">
    <header class="builder-header-slot">
      <slot name="header" />
    </header>

    <div class="builder-body">
      <!-- Desktop sidebar -->
      <aside class="builder-sidebar desktop-only">
        <slot name="sidebar" />
      </aside>

      <main class="builder-main">
        <slot name="main" />
      </main>

      <!-- Desktop right panel -->
      <aside class="builder-right desktop-only">
        <slot name="right" />
      </aside>
    </div>

    <!-- Mobile bottom navigation -->
    <nav class="mobile-bottom-nav mobile-only">
      <button
        :class="['mobile-nav-item', { active: mobileSidebarOpen }]"
        @click="setMobileView('sidebar')"
      >
        <i class="fas fa-list"></i>
        <span>SECTIONS</span>
      </button>
      <button
        :class="['mobile-nav-item', { active: !mobileSidebarOpen && !mobileRightOpen }]"
        @click="closeMobilePanel"
      >
        <i class="fas fa-edit"></i>
        <span>EDIT</span>
      </button>
      <button
        :class="['mobile-nav-item', { active: mobileRightOpen }]"
        @click="setMobileView('right')"
      >
        <i class="fas fa-code"></i>
        <span>YAML</span>
      </button>
    </nav>

    <!-- Mobile sidebar overlay -->
    <div
      :class="['mobile-panel-overlay', { open: mobileSidebarOpen }]"
      @click="closeMobilePanel"
    ></div>

    <!-- Mobile sidebar panel -->
    <aside :class="['mobile-panel', { open: mobileSidebarOpen }]">
      <div class="mobile-panel-header">
        <span class="mobile-panel-title">SECTIONS</span>
        <button class="mobile-panel-close" @click="mobileSidebarOpen = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="mobile-panel-body">
        <slot name="sidebar" />
      </div>
    </aside>

    <!-- Mobile right panel overlay -->
    <div
      :class="['mobile-panel-overlay', { open: mobileRightOpen }]"
      @click="closeMobilePanel"
    ></div>

    <!-- Mobile right panel -->
    <aside :class="['mobile-panel right', { open: mobileRightOpen }]">
      <div class="mobile-panel-header">
        <span class="mobile-panel-title">YAML & PREVIEW</span>
        <button class="mobile-panel-close" @click="mobileRightOpen = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="mobile-panel-body mobile-right-content">
        <slot name="right" />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.builder-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.builder-header-slot {
  flex-shrink: 0;
}

.builder-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.builder-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--bg-sidebar);
  border-right: var(--border-solid);
  overflow-y: auto;
}

.builder-main {
  flex: 1;
  overflow-y: auto;
  background: var(--bg);
}

.builder-right {
  width: 380px;
  flex-shrink: 0;
  border-left: var(--border-solid);
  overflow: hidden;
}

/* Desktop only elements */
.desktop-only {
  display: block;
}

/* Mobile only elements */
.mobile-only {
  display: none;
}

/* Mobile bottom nav */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-panel);
  border-top: var(--border-solid);
  z-index: 100;
  padding: var(--sp-xs) 0;
  padding-bottom: env(safe-area-inset-bottom, var(--sp-xs));
}

.mobile-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: var(--sp-xs) var(--sp-sm);
  color: var(--text-dim);
  font-family: var(--font-display);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);
  min-height: 52px;
}

.mobile-nav-item i {
  font-size: 18px;
}

.mobile-nav-item:hover,
.mobile-nav-item.active {
  color: var(--accent);
}

/* Mobile panels */
.mobile-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 200;
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-fast);
  display: none;
}

.mobile-panel-overlay.open {
  opacity: 1;
  visibility: visible;
}

.mobile-panel {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: 85%;
  max-width: 320px;
  background: var(--bg-sidebar);
  z-index: 201;
  transform: translateX(-100%);
  transition: transform var(--transition-fast);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: none;
  flex-direction: column;
}

.mobile-panel.right {
  left: auto;
  right: 0;
  transform: translateX(100%);
  max-width: 100%;
  width: 100%;
}

.mobile-panel.open {
  transform: translateX(0);
}

.mobile-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-md) var(--sp-lg);
  border-bottom: var(--border-solid);
  background: var(--bg-panel);
  flex-shrink: 0;
}

.mobile-panel-title {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.mobile-panel-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--border-mid);
  color: var(--text-dim);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mobile-panel-close:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.mobile-panel-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.mobile-right-content {
  height: calc(100% - 60px);
  padding: 0;
}

.mobile-right-content :deep(.right-panel) {
  height: 100%;
}

/* Tablet breakpoint */
@media (max-width: 1200px) {
  .builder-right {
    width: 320px;
  }
}

/* Mobile breakpoint */
@media (max-width: 900px) {
  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: flex !important;
  }

  .mobile-panel,
  .mobile-panel-overlay {
    display: flex;
  }

  .mobile-panel {
    flex-direction: column;
  }

  .builder-main {
    padding-bottom: 72px; /* Space for mobile nav */
  }
}

/* Small mobile */
@media (max-width: 480px) {
  .mobile-panel {
    max-width: 100%;
    width: 100%;
  }
}
</style>
