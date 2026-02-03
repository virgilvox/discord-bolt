<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const mobileMenuOpen = ref(false);

const navItems = [
  { label: 'DOCS', path: '/docs' },
  { label: 'BUILDER', path: '/builder' },
];

const isActive = (path: string) => {
  return route.path.startsWith(path);
};

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <RouterLink to="/" class="logo-link">
        <img
          src="@/assets/images/furlow-logo-wordmark-dark.svg"
          alt="FURLOW"
          class="logo"
        />
      </RouterLink>

      <nav class="nav-desktop">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="['nav-link', { active: isActive(item.path) }]"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="header-actions">
        <a
          href="https://github.com/virgilvox/discord-furlow"
          target="_blank"
          rel="noopener"
          class="icon-link"
          title="GitHub"
        >
          <i class="fab fa-github"></i>
        </a>
        <a
          href="https://www.npmjs.com/org/furlow"
          target="_blank"
          rel="noopener"
          class="icon-link"
          title="npm"
        >
          <i class="fab fa-npm"></i>
        </a>
      </div>

      <button
        class="mobile-menu-btn"
        @click="toggleMobileMenu"
        :aria-expanded="mobileMenuOpen"
        aria-label="Toggle menu"
      >
        <i :class="mobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'"></i>
      </button>
    </div>

    <nav :class="['nav-mobile', { open: mobileMenuOpen }]">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :class="['mobile-nav-link', { active: isActive(item.path) }]"
        @click="mobileMenuOpen = false"
      >
        {{ item.label }}
      </RouterLink>
      <div class="mobile-divider"></div>
      <a
        href="https://github.com/virgilvox/discord-furlow"
        target="_blank"
        rel="noopener"
        class="mobile-nav-link"
      >
        <i class="fab fa-github"></i> GITHUB
      </a>
    </nav>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg-sidebar);
  border-bottom: var(--border-solid);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--nav-height);
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--sp-lg);
}

.logo-link {
  display: flex;
  align-items: center;
}

.logo {
  height: 32px;
  width: auto;
}

.nav-desktop {
  display: flex;
  gap: var(--sp-xl);
}

.nav-link {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 2px;
  color: var(--text-dim);
  text-decoration: none;
  padding: var(--sp-sm) 0;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--text-bright);
}

.nav-link.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.header-actions {
  display: flex;
  gap: var(--sp-md);
}

.icon-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--text-dim);
  border: 1px solid var(--border-mid);
  transition: all var(--transition-fast);
}

.icon-link:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-faint);
}

.icon-link i {
  font-size: 14px;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: 1px solid var(--border-mid);
  color: var(--text);
  width: 36px;
  height: 36px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mobile-menu-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.nav-mobile {
  display: none;
  flex-direction: column;
  padding: var(--sp-md) var(--sp-lg);
  border-top: var(--border-dashed);
  background: var(--bg-panel);
}

.nav-mobile.open {
  display: flex;
}

.mobile-nav-link {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 2px;
  color: var(--text-dim);
  text-decoration: none;
  padding: var(--sp-md) 0;
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.mobile-nav-link:hover,
.mobile-nav-link.active {
  color: var(--accent);
}

.mobile-divider {
  border-top: var(--border-dashed);
  margin: var(--sp-sm) 0;
}

@media (max-width: 768px) {
  .nav-desktop,
  .header-actions {
    display: none;
  }

  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
