<script setup>
import Voronoi from '@/components/common/Voronoi.vue';
import useNodesAndLinks from '@/hooks/useNodesAndLinks';
import { computed, ref } from 'vue';
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

const labelId = ref('');
const labelHover = id => {
  labelId.value = id;
};
const isHovered = computed(() => labelId.value !== '');
</script>

<template>
  <Chart
    :height="height"
    :margin-left="marginLeft"
    :margin-top="marginTop"
    :width="width"
  >
    <Links
      :data="links"
      :is-hovered="isHovered"
      :label-hover-id="labelId"
      :node-id="nodeId"
    />
    <Nodes :data="nodes" :node-id="nodeId" />
    <Labels
      :data="nodes"
      :node-id="nodeId"
      :node-width="nodeWidth"
      :width="chartWidth"
    />
    <Voronoi
      :data="nodes"
      :height="height"
      :node-id="nodeId"
      :width="width"
      @label:hover="labelHover"
    />
  </Chart>
</template>
