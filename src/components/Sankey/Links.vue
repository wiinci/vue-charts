<script setup>
import { sankeyLinkHorizontal } from 'd3-sankey';
import { select } from 'd3-selection';
import { onMounted, ref } from 'vue';

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  nodeId: {
    required: true,
    type: String,
  },
});

const nodeRef = ref(null);

onMounted(() => {
  select(nodeRef.value)
    .selectAll('g')
    .data(props.data, d => d[props.nodeId])
    .join('g')
    .append('path')
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke-width', d => Math.max(1, d.width));
});
</script>

<template>
  <g :class="$style.links" fill="none" ref="nodeRef" stroke="gray" />
</template>

<style module>
.links {
  mix-blend-mode: multiply;
  stroke-opacity: 0.8;
}
</style>
