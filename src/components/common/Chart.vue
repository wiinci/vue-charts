<script setup>
import { computed } from 'vue';

const props = defineProps({
  height: {
    type: Number,
    required: true,
  },
  marginLeft: {
    type: Number,
    required: true,
  },
  marginTop: {
    type: Number,
    required: true,
  },
  width: {
    type: Number,
    required: true,
  },
});

const viewBox = computed(() => `0 0 ${props.width} ${props.height}`);
const transform = computed(
  () => `translate(${props.marginLeft}, ${props.marginTop})`
);
</script>

<template>
  <div :class="$style.chart">
    <svg
      :viewBox="viewBox"
      height="100%"
      preserveAspectRatio="xMinYMin"
      shapeRendering="crispEdges"
      width="100%"
    >
      <g class="canvas" :transform="transform">
        <slot />
      </g>
    </svg>
  </div>
</template>

<style module>
.chart {
  border: 1px solid;
  display: flex;
  margin: 0 auto;
  max-width: 960px;
}
</style>
