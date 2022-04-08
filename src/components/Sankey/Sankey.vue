<script setup>
import getNodesAndLinks from '@/util/getNodesAndLinks';
import { sankey } from 'd3-sankey';
import { computed, unref } from 'vue';
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
    required: true,
    type: String,
  },
  sort: {
    default: false,
    type: Boolean,
  },
});

const NODE_PADDING = 1e9;
const NODE_WIDTH = 1e-9;
const chartHeight = computed(
  () => props.height - props.marginTop - props.marginBottom
);
const chartWidth = computed(
  () => props.width - props.marginLeft - props.marginRight
);
const { nodeId, data } = props;

const fn = sankey()
  .nodeId(d => d[nodeId])
  .nodePadding(NODE_PADDING)
  .nodeWidth(NODE_WIDTH)
  .nodeSort(undefined)
  .extent([
    [0, 0],
    [unref(chartWidth), unref(chartHeight)],
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
