<script setup>
import Sankey from '@/components/Sankey/Sankey.vue';
import data from '@/data/edges2.json';
import { ref } from 'vue';

const sort = ref(false);
const nodeAlign = ref('left');
const nodeId = ref('id');
const nodePadding = ref(1e9);
const nodeWidth = ref(1e-9);
</script>

<template>
  <Sankey
    :data="data"
    :node-align="nodeAlign"
    :node-id="nodeId"
    :node-padding="nodePadding"
    :node-width="nodeWidth"
    :sort="sort"
  />
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
