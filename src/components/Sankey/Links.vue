<script setup>
import { constants } from '@/assets/constants';
import { sankeyLinkHorizontal } from 'd3-sankey';
import { select } from 'd3-selection';
import { linkHorizontal } from 'd3-shape';
import { transition } from 'd3-transition';
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

const linkAccessor = linkHorizontal()
  .source(d => [d.source.x0, d.source.y0])
  .target(d => [d.source.x0, d.source.y0]);

const nodeRef = ref(null);

watchEffect(() => {
  select(nodeRef.value)
    .selectAll('path')
    .data(props.data, d => d[props.nodeId])
    .join(
      enter =>
        enter
          .append('path')
          .attr('d', d => linkAccessor(d))
          .attr('stroke-width', d => Math.max(1, d.width))
          .call(enter =>
            enter
              .transition(transition().duration(constants.duration.short))
              .delay(d => constants.duration.medium * (d.source.depth + 1))
              .attr('d', sankeyLinkHorizontal())
          ),
      update => update,
      exit => exit.remove()
    )
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
