<script setup>
import { Delaunay as delaunay } from 'd3-delaunay';
import { pointer, select } from 'd3-selection';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  height: {
    required: true,
    type: Number,
  },
  nodeId: {
    required: true,
    type: String,
  },
  width: {
    required: true,
    type: Number,
  },
});

const emit = defineEmits(['label:hover']);
const nodeRef = ref(null);

const xAccessor = d => d.x0;
const yAccessor = d => d.y0;
const voronoi = delaunay.from(props.data, xAccessor, yAccessor);

onMounted(() => {
  select(nodeRef.value)
    .attr('transform', 'translate(0,0)')
    .selectAll('rect')
    .data([props.data])
    .join('rect')
    .attr('height', props.height)
    .attr('width', props.width)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('pointerleave', () => {
      emit('label:hover', '');
    })
    .on('pointermove', (e, d) => {
      const index = voronoi.find(...pointer(e));
      emit('label:hover', d[index][props.nodeId]);
    });
});

onBeforeUnmount(() => {
  select(nodeRef.value).selectAll('rect').remove();
});
</script>

<template>
  <g class="voronoi" ref="nodeRef" />
</template>