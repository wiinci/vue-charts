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
  nodeWidth: {
    required: true,
    type: Number,
  },
  width: {
    required: true,
    type: Number,
  },
});

const nodeRef = ref(null);

onMounted(() => {
  select(nodeRef.value)
    .selectAll('text')
    .data(props.data, d => d[props.nodeId])
    .join('text')
    .attr('x', d =>
      props.nodeWidth < 1
        ? d.x0
        : d.x0 < props.width / 2
        ? d.x0 + props.nodeWidth
        : d.x1 - props.nodeWidth
    )
    .attr('y', d => (d.y1 + d.y0) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', d => (d.x0 < props.width / 2 ? 'start' : 'end'))
    .attr('paint-order', 'stroke')
    .attr('stroke', 'white')
    .attr('stroke-width', '6')
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .text(d => d[props.nodeId]);
});
</script>

<template>
  <g :class="$style.labels" ref="nodeRef" />
</template>

<style module>
.labels {
  font-size: 12px;
  font-family: var(--font-family-monospace);
}
</style>
