<script setup>
import Voronoi from '@/components/common/Voronoi.vue';
import useNodesAndLinks from '@/hooks/useNodesAndLinks';
import { computed, provide, ref } from 'vue';
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

const { chartWidth, links, nodes } = $(useNodesAndLinks(props));

const labelDatum = ref({});
const labelId = ref('');
const toggledId = ref('');
const hiddenNodes = ref([]);
const toggledState = ref(false);

const labelClick = d => {
  if (typeof d === 'object' && d.collapsible) {
    toggledId.value = d.id;
    toggledState.value = d.collapsed ? false : true;
  }
};

const labelHover = d => {
  if (typeof d === 'object') {
    labelId.value = d.id;
    labelDatum.value = d;
  } else {
    labelId.value = '';
    labelDatum.value = {};
  }
};

const hideNodes = nodes => (hiddenNodes.value = nodes);
const xAccessor = computed(() => d => d.x0);
const yAccessor = computed(() => d => d.y0);

provide('labelDatum', labelDatum);
provide('labelId', labelId);
</script>

<template>
  <Chart :height="height" :margin-left="0" :margin-top="0" :width="width">
    <Links :data="links" :node-id="nodeId" :hiddenNodes="hiddenNodes" />
    <Nodes
      :data="nodes"
      :node-id="nodeId"
      :toggled-id="toggledId"
      :x-accessor="xAccessor"
      :y-accessor="yAccessor"
    />
    <Labels
      :data="nodes"
      :node-id="nodeId"
      :node-width="nodeWidth"
      :toggled-id="toggledId"
      :toggled-state="toggledState"
      :width="chartWidth"
      @nodes:hidden="hideNodes"
    />
    <Voronoi
      :data="nodes"
      :height="height"
      :node-id="nodeId"
      :width="width"
      :x-accessor="xAccessor"
      :y-accessor="yAccessor"
      @label:hover="labelHover"
      @label:click="labelClick"
    />
  </Chart>
</template>
