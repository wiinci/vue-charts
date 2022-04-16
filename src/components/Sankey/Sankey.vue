<script setup>
import useNodesAndLinks from '@/hooks/useNodesAndLinks';
import Chart from '../common/Chart.vue';
import Labels from './Labels.vue';
import Links from './Links.vue';
import Nodes from './Nodes.vue';

const props = defineProps({
  data: {
    required: true,
    type: Array,
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
  nodeAlign: {
    default: 'left',
    type: String,
  },
  nodeId: {
    default: 'id',
    type: String,
  },
  nodePadding: {
    default: 10,
    type: Number,
  },
  nodeWidth: {
    default: 10,
    type: Number,
  },
  sort: {
    default: false,
    type: Boolean,
  },
  width: {
    default: 960,
    type: Number,
  },
});

const { chartWidth, links, nodes } = useNodesAndLinks(props);
</script>

<template>
  <Chart
    :height="height"
    :marginLeft="marginLeft"
    :marginTop="marginTop"
    :width="width"
  >
    <Links :data="links" :nodeId="nodeId" />
    <Nodes :data="nodes" :nodeId="nodeId" />
    <Labels
      :data="nodes"
      :nodeId="nodeId"
      :nodeWidth="nodeWidth"
      :width="chartWidth"
    />
  </Chart>
</template>
