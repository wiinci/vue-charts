<script setup>
import { sankeyLinkHorizontal } from 'd3-sankey';
import { select } from 'd3-selection';
import { onMounted, ref, watch } from 'vue';

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  isHovered: {
    default: false,
    type: Boolean,
  },
  labelHoverId: {
    default: '',
    type: String,
  },
  nodeId: {
    required: true,
    type: String,
  },
});

const nodeRef = ref(null);

onMounted(() => {
  select(nodeRef.value)
    .selectAll('path')
    .data(props.data, d => d[props.nodeId])
    .join('path')
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke-width', d => Math.max(1, d.width));
});

watch(
  () => props.labelHoverId,
  () => {
    select(nodeRef.value)
      .selectAll('path')
      .style('stroke-opacity', d => {
        return props.isHovered
          ? d.source.id === props.labelHoverId ||
            d.target.id === props.labelHoverId
            ? 1
            : 0.2
          : 1;
      });
  }
);
</script>

<template>
  <g :class="$style.links" fill="none" ref="nodeRef" stroke="gray" />
</template>

<style module>
.links {
  mix-blend-mode: multiply;
}
</style>
