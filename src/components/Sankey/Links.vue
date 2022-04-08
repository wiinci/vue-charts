<script setup>
import { sankeyLinkHorizontal } from 'd3-sankey';
import { select } from 'd3-selection';
import { onMounted, ref } from 'vue';

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
});

const nodeRef = ref(null);

onMounted(() => {
  select(nodeRef.value)
    .selectAll('g')
    .data(props.data)
    .join('g')
    .attr('stroke', 'gray')
    .style('mix-blend-mode', 'multiply')
    .append('path')
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke-width', d => Math.max(1, d.width));
});
</script>

<template>
  <g class="links" ref="nodeRef" fill="none" />
</template>
