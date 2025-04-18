<script setup>
	import Chart from '@/components/common-ts/Chart.vue'
	import Voronoi from '@/components/common-ts/Voronoi.vue'
	import useCollapsed from '@/hooks/useCollapsed'
	import useNodesAndLinks from '@/hooks/useNodesAndLinks'
	import {computed, provide, ref} from 'vue'
	import Labels from './Labels.vue'
	import Links from './Links.vue'
	import Nodes from './Nodes.vue'

	const props = defineProps({
		data: {required: true, type: Array},
		height: {default: 480, type: Number},
		marginLeft: {default: 20, type: Number},
		marginRight: {default: 20, type: Number},
		marginBottom: {default: 20, type: Number},
		marginTop: {default: 20, type: Number},
		nodeAlign: {default: 'left', type: String},
		nodeId: {default: 'id', type: String},
		nodePadding: {default: 10, type: Number},
		nodeWidth: {default: 10, type: Number},
		sort: {default: false, type: Boolean},
		width: {default: 960, type: Number},
	})

	const {chartWidth, links, nodes} = useNodesAndLinks(props)

	const labelDatum = ref({})
	const labelId = ref('')
	const xAccessor = computed(() => d => d.x0)
	const yAccessor = computed(() => d => d.y0)
	provide('labelDatum', labelDatum)
	provide('labelId', labelId)

	// Use composable for collapse logic and filtered data
	const {collapsedNodes, filteredLinks, filteredNodes, toggleCollapse} =
		useCollapsed(
			computed(() => nodes),
			computed(() => links)
		)

	const handleNodeClick = ({id}) => toggleCollapse(id)

	function highlightLinks({d}) {
		labelId.value = typeof d === 'object' ? d.id : ''
		labelDatum.value = typeof d === 'object' ? d : {}
	}
</script>

<template>
	<Chart
		:height="height"
		:marginLeft="0"
		:marginTop="0"
		:width="width"
	>
		<Links
			:data="filteredLinks"
			:collapsedNodes="collapsedNodes"
		/>
		<Nodes
			:data="filteredNodes"
			:nodeId="nodeId"
			:xAccessor="xAccessor"
			:yAccessor="yAccessor"
			:collapsedNodes="collapsedNodes"
			@click="toggleCollapse"
		/>
		<Labels
			:data="filteredNodes"
			:collapsedNodes="collapsedNodes"
			:node-id="nodeId"
			:node-width="nodeWidth"
			:width="chartWidth"
		/>
		<Voronoi
			:classKey="'sankey'"
			:data="filteredNodes"
			:height="height"
			:width="width"
			:xAccessor="xAccessor"
			:yAccessor="yAccessor"
			@move-to="highlightLinks"
			@node-click="handleNodeClick"
		/>
	</Chart>
</template>
