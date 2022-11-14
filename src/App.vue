<script setup>
import Sankey from '@/components/Sankey/Sankey.vue';
import { ref } from 'vue';

const nodeAlign = ref('left');
const nodeId = ref('id');
const nodePadding = ref(1e9);
const nodeWidth = ref(1e-9);
const sort = ref(false);
</script>

<script>
const data = (await import('@/data/edges2.json')).default;

export default {
  setup() {
    return { data };
  },
};
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
