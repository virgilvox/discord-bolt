<script setup lang="ts">
</script>

<template>
  <div class="builder-layout">
    <header class="builder-header-slot">
      <slot name="header" />
    </header>

    <div class="builder-body">
      <aside class="builder-sidebar">
        <slot name="sidebar" />
      </aside>

      <main class="builder-main">
        <slot name="main" />
      </main>

      <aside class="builder-right">
        <slot name="right" />
      </aside>
    </div>
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

@media (max-width: 1200px) {
  .builder-right {
    width: 320px;
  }
}

@media (max-width: 900px) {
  .builder-sidebar {
    display: none;
  }

  .builder-right {
    display: none;
  }
}
</style>
