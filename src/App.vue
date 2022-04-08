<script setup>
import Sankey from '@/components/Sankey/Sankey.vue';
import data from '@/data/edges2.json';
</script>

<template>
  <Sankey :data="data" node-id="id" />
</template>

<style>
:root {
  --font-family-system: BlinkMacSystemFont, -apple-system, 'Segoe UI', Roboto,
    Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  --font-family-monospace: 'SF Mono', 'Roboto Mono', Menlo, monospace;
}
#app {
  font-family: var(--font-family-system);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
