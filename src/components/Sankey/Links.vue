<script setup>
import { constants } from '@/assets/constants';
import { sankeyLinkHorizontal } from 'd3-sankey';
import { select } from 'd3-selection';
import { linkHorizontal } from 'd3-shape';
import { transition } from 'd3-transition';
import { proxyRefs, ref, watchEffect } from 'vue';

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  isHovered: {
    default: false,
    type: Boolean,
  },
  labelHoverDatum: {
    default: {},
    type: Object,
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

const source = ref([]);
const target = ref([]);

const sources = d => {
  if (d.sourceLinks.length > 0) {
    for (const link of d.sourceLinks) {
      target.value.push(link.target.id);
      sources(link.target);
    }
  }
};

const targets = d => {
  if (d.targetLinks.length > 0) {
    for (const link of d.targetLinks) {
      source.value.push(link.source.id);
      targets(link.source);
    }
  }
};

const nodeRef = ref(null);

watchEffect(() => {
  const { data, isHovered, labelHoverId, nodeId } = proxyRefs(props);
  if (typeof props.labelHoverDatum.id !== 'undefined') {
    source.value = [];
    target.value = [];
    sources(props.labelHoverDatum);
    targets(props.labelHoverDatum);
  }
  select(nodeRef.value)
    .selectAll('path')
    .data(data, d => d[nodeId])
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
      if (isHovered) {
        if (d.source.id === labelHoverId || d.target.id === labelHoverId) {
          return constants.linkColorHighlight;
        }
        for (const id of target.value) {
          if (id === d.source.id) {
            return constants.linkColorHighlight;
          }
        }
        for (const id of source.value) {
          if (id === d.target.id) {
            return constants.linkColorHighlight;
          }
        }
      }

      return constants.linkColor;
    })
    .classed('raise', d => {
      if (isHovered) {
        if (d.source.id === labelHoverId || d.target.id === labelHoverId) {
          return true;
        }
        for (const id of target.value) {
          if (id === d.source.id) {
            return true;
          }
        }
        for (const id of source.value) {
          if (id === d.target.id) {
            return true;
          }
        }
      }

      return false;
    });

  select(nodeRef.value).selectAll('path.raise').raise();
});
</script>

<template>
  <g class="links" :stroke="constants.linkColor" fill="none" ref="nodeRef" />
</template>
