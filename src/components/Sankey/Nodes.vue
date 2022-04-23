<script setup>
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
  xAccessor: {
    required: true,
    type: Function,
  },
  yAccessor: {
    required: true,
    type: Function,
  },
});

const nodeRef = ref(null);

onMounted(() => {
  select(nodeRef.value)
    .selectAll('rect')
    .data(props.data, d => d[props.nodeId])
    .join('rect')
    .attr('fill', 'none')
    .attr('height', d => d.y1 - d.y0)
    .attr('width', d => d.x1 - d.x0)
    .attr('x', props.xAccessor)
    .attr('y', props.yAccessor);
});
</script>

<template>
  <g class="nodes" ref="nodeRef" />
</template>
