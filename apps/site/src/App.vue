<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from './components/common/AppHeader.vue';
import AppFooter from './components/common/AppFooter.vue';
import SplashScreen from './components/common/SplashScreen.vue';
</script>

<template>
  <SplashScreen />
  <div class="app-layout">
    <!-- Skip link for keyboard navigation -->
    <a href="#main-content" class="skip-link">Skip to main content</a>

    <AppHeader />
    <main id="main-content" class="app-main" tabindex="-1">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<style>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
}

.app-main:focus {
  outline: none;
}

/* Skip link for accessibility */
.skip-link {
  position: absolute;
  top: -100px;
  left: var(--sp-md);
  z-index: 10000;
  background: var(--accent);
  color: var(--bg);
  padding: var(--sp-sm) var(--sp-md);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-decoration: none;
  transition: top 0.2s ease-out;
}

.skip-link:focus {
  top: var(--sp-md);
  outline: 2px solid var(--accent-bright);
  outline-offset: 2px;
}
</style>
