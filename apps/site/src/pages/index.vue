<script setup lang="ts">
import HeroSection from '@/components/landing/HeroSection.vue';
import FeatureGrid from '@/components/landing/FeatureGrid.vue';
import CodeExample from '@/components/landing/CodeExample.vue';
import StatsDisplay from '@/components/landing/StatsDisplay.vue';
import QuickLinks from '@/components/landing/QuickLinks.vue';
</script>

<template>
  <div class="landing-page">
    <HeroSection />
    <FeatureGrid />
    <CodeExample />
    <StatsDisplay />
    <QuickLinks />
  </div>
</template>

<style scoped>
.landing-page {
  background: var(--bg);
}
</style>
