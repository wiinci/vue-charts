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

const {
  data,
  height,
  marginBottom,
  marginLeft,
  marginRight,
  marginTop,
  nodeAlign,
  nodeId,
  width,
} = props;

const align = nodeAlign === 'justify' ? sankeyJustify : sankeyLeft;
const chartHeight = height - marginTop - marginBottom;
const chartWidth = computed(() => width - marginLeft - marginRight);

const fn = sankey()
  .nodeAlign(align)
  .nodeId(d => d[nodeId])
  .nodePadding(NODE_PADDING)
  .nodeSort(undefined)
  .nodeWidth(NODE_WIDTH)
  .extent([
    [0, 0],
    [chartWidth.value, chartHeight],
  ]);

const { nodes, links } = getNodesAndLinks(fn, nodeId, data);
</script>

<template>
  <Chart
    :height="height"
    :marginLeft="marginLeft"
    :marginTop="marginTop"
    :width="width"
  >
    <Links :data="links" />
    <Labels :data="nodes" :nodeId="nodeId" :width="chartWidth" />
  </Chart>
</template>
