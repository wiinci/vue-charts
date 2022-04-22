<script setup>
import { constants } from '@/assets/constants';
import { sankeyLinkHorizontal } from 'd3-sankey';
import { select } from 'd3-selection';
import { ref, watchEffect } from 'vue';

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

watchEffect(() => {
  select(nodeRef.value)
    .selectAll('path')
    .data(props.data, d => d[props.nodeId])
    .join('path')
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke-width', d => Math.max(1, d.width))
    .attr('stroke', d => {
      return props.isHovered
        ? d.source.id === props.labelHoverId ||
          d.target.id === props.labelHoverId
          ? constants.linkColorHighlight
          : constants.linkColor
        : constants.linkColor;
    })
    .classed('raise', d => {
      return props.isHovered
        ? d.source.id === props.labelHoverId ||
          d.target.id === props.labelHoverId
          ? true
          : false
        : false;
    });

  select(nodeRef.value).selectAll('path.raise').raise();
});
</script>

<template>
  <g class="links" :stroke="constants.linkColor" fill="none" ref="nodeRef" />
</template>
