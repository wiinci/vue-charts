<script setup>
import getNodesAndLinks from '@/util/getNodesAndLinks';
import { sankey, sankeyJustify, sankeyLeft } from 'd3-sankey';
import { computed } from 'vue';
import Chart from '../common/Chart.vue';
import Labels from './Labels.vue';
import Links from './Links.vue';

const props = defineProps({
  data: {
    required: true,
    type: Array,
  },
  width: {
    default: 960,
    type: Number,
  },
  height: {
    default: 480,
    type: Number,
  },
  marginLeft: {
    default: 20,
    type: Number,
  },
  marginRight: {
    default: 20,
    type: Number,
  },
  marginBottom: {
    default: 20,
    type: Number,
  },
  marginTop: {
    default: 20,
    type: Number,
  },
  nodeId: {
    default: 'id',
    type: String,
  },
  nodeAlign: {
    default: 'left',
    type: String,
  },
  sort: {
    default: false,
    type: Boolean,
  },
});

const NODE_PADDING = 1e9;
const NODE_WIDTH = 1e-9;

const align = computed(() =>
  props.nodeAlign === 'justify' ? sankeyJustify : sankeyLeft
);
const chartHeight = computed(
  () => props.height - props.marginTop - props.marginBottom
);
const chartWidth = computed(
  () => props.width - props.marginLeft - props.marginRight
);
const sort = computed(() => (props.sort ? null : undefined));

const fn = sankey()
  .nodeAlign(align.value)
  .nodeId(d => d[props.nodeId])
  .nodePadding(NODE_PADDING)
  .nodeSort(sort.value)
  .nodeWidth(NODE_WIDTH)
  .extent([
    [0, 0],
    [chartWidth.value, chartHeight.value],
  ]);

const { nodes, links } = getNodesAndLinks(fn, props.nodeId, props.data);
</script>

<template>
  <Chart
    :height="height"
    :marginLeft="marginLeft"
    :marginTop="marginTop"
    :width="width"
    v-if="links.length > 0"
  >
    <Links :data="links" :nodeId="nodeId" />
    <Labels :data="nodes" :nodeId="nodeId" :width="chartWidth" />
  </Chart>
</template>
