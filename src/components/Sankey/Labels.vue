<script setup lang="ts">
import { constants } from "@/assets/constants";
import { SankeyNode } from "@/composables/useNodesAndLinks";
import { select } from "d3-selection";
import { transition } from "d3-transition";
import { computed, ref, watchEffect } from "vue";

interface LabelProps {
  data: SankeyNode[];
  nodeId: string;
  nodeWidth: number;
  width: number;
  collapsedNodes: Set<string>;
}

const props = defineProps<LabelProps>();

const nodeRef = ref<SVGGElement | null>(null);

// Memoize calculations for better performance
const getTextAnchor = computed(() => (d: SankeyNode) => (d.x0 < props.width / 2 ? "start" : "end"));

const getXPosition = computed(() => (d: SankeyNode) => {
  if (props.nodeWidth < 1) return d.x0;
  return d.x0 < props.width / 2 ? d.x0 + props.nodeWidth : d.x1 - props.nodeWidth;
});

const getYPosition = computed(() => (d: SankeyNode) => (d.y1 + d.y0) / 2);

// Use visible data directly; filtering done in parent
const filteredData = computed((): SankeyNode[] => props.data);

watchEffect(() => {
  if (!nodeRef.value) return;

  // Create a fresh transition for each effect run
  const tfast = transition().duration(constants.duration.fast);

  select(nodeRef.value)
    .selectAll("text")
    .data(filteredData.value, (d: any) => d[props.nodeId])
    .join(
      (enter) =>
        enter
          .append("text")
          .text((d: SankeyNode) => d[props.nodeId])
          .attr("dominant-baseline", "middle")
          .attr("paint-order", "stroke")
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("stroke-width", "6")
          .attr("stroke", "white")
          .attr("text-anchor", getTextAnchor.value)
          .attr("x", getXPosition.value)
          .attr("y", getYPosition.value)
          .attr("opacity", 1e-9)
          .call((enter: any) =>
            enter
              .transition(tfast)
              .delay((d: SankeyNode) => constants.duration.fast * ((d.depth || 0) + 1))
              .attr("opacity", 1),
          ),
      (update) =>
        update
          .attr("text-anchor", getTextAnchor.value)
          .attr("x", getXPosition.value)
          .attr("y", getYPosition.value)
          .text((d: SankeyNode) => d[props.nodeId]),
      (exit) => exit.transition(tfast).attr("opacity", 0).remove(),
    );
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
