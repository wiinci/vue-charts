<script setup lang="ts">
import Chart from '@/components/common-ts/Chart.vue'
import Voronoi from '@/components/common-ts/Voronoi.vue'
import {useCollapsed} from '@/composables/useCollapsed'
import {useInteractionStateMachine} from '@/composables/useInteractionStateMachine'
import {SankeyLink, SankeyNode, useNodesAndLinks} from '@/composables/useNodesAndLinks'
import {computed, onUnmounted, provide} from 'vue'
import Labels from './Labels.vue'
import Links from './Links.vue'
import Nodes from './Nodes.vue'

const props = withDefaults(
	defineProps<{
		data: SankeyLink[]
		height?: number
		marginLeft?: number
		marginRight?: number
		marginBottom?: number
		marginTop?: number
		nodeAlign?: 'justify' | 'left' | 'right' | 'center'
		nodeId?: string
		nodePadding?: number
		nodeWidth?: number
		sort?: boolean
		width?: number
	}>(),
	{
		height: 480,
		marginLeft: 20,
		marginRight: 20,
		marginBottom: 20,
		marginTop: 20,
		nodeAlign: 'left',
		nodeId: 'id',
		nodePadding: 10,
		nodeWidth: 10,
		sort: false,
		width: 960,
	},
)

// Use layout composable
const {chartWidth, nodes, links} = useNodesAndLinks(props)

// Instantiate interaction finite state machine
const fsm = useInteractionStateMachine()

// Derive hover/selection state for child components
const labelId = computed(() => fsm.hoveredNodeId.value || fsm.selectedNodeId.value || '')
const labelDatum = computed(() => {
	if (!labelId.value) return null
	return filteredNodes.value.find((n) => (n.id ?? '') === labelId.value) || null
})

// Expose data to child components via provide/inject for backwards compatibility
provide('labelDatum', labelDatum)
provide('labelId', labelId)

// Accessors for node positions
const xAccessor = computed(() => (d: SankeyNode) => d.x)
const yAccessor = computed(() => (d: SankeyNode) => d.y)

// Use collapsed composable
const {collapsedNodes, filteredNodes, filteredLinks, toggleCollapse} = useCollapsed(nodes, links)

/**
 * Handle node click event - delegates to toggleCollapse and state machine
 */
const handleNodeClick = (id: string) => {
	toggleCollapse(id)
}

/**
 * Update highlight state based on hovered node from Voronoi
 */
function highlightLinks({d}: {d: SankeyNode}) {
	const nextId = d && typeof d === 'object' ? (d.id ?? '') : ''
	if (nextId) {
		fsm.pointerEnterNode(nextId)
	} else if (fsm.hoveredNodeId.value) {
		fsm.pointerLeaveNode(fsm.hoveredNodeId.value)
	}
}

onUnmounted(() => {
	fsm.reset()
})
</script>

<template>
	<Chart :height="height" :marginLeft="0" :marginTop="0" :width="width">
		<Links :data="filteredLinks" :collapsedNodes="collapsedNodes" />
		<Nodes
			:data="filteredNodes"
			:nodeId="nodeId"
			:hoveredNodeId="fsm.hoveredNodeId.value"
			:selectedNodeId="fsm.selectedNodeId.value"
			@click="handleNodeClick"
			@hover="(id) => fsm.pointerEnterNode(id)"
			@leave="(id) => fsm.pointerLeaveNode(id)"
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
			@node-click="({id}) => handleNodeClick(id)"
		/>
	</Chart>
</template>
