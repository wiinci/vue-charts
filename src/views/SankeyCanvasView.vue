<script setup lang="ts">
import SankeyCanvas from '@/components/SankeyCanvas/SankeyCanvas.vue'
import type {SankeyLink} from '@/composables/useNodesAndLinks'
import sankeyJsonData from '@/data/edges2.json'

// Same transform the home page applies: the edge list carries no values
const sankeyData = sankeyJsonData.map((item: any) => ({...item, value: 1})) as SankeyLink[]

// The home page's layout configuration — the geometry baseline's props
const nodeAlign = 'justify' as const
const nodeId = 'id'
const nodePadding = 1e9
const nodeWidth = 1e-9
const sort = false
</script>

<template>
	<SankeyCanvas
		:data="sankeyData"
		:node-align="nodeAlign"
		:node-id="nodeId"
		:node-padding="nodePadding"
		:node-width="nodeWidth"
		:sort="sort"
	/>
</template>
