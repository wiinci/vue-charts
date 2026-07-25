<script setup lang="ts">
import Chart from '@/components/common-ts/Chart.vue'
import {useCollapsed} from '@/composables/useCollapsed'
import {useInteractionStateMachine} from '@/composables/useInteractionStateMachine'
import {SankeyLink, SankeyNode, useNodesAndLinks} from '@/composables/useNodesAndLinks'
import {useQuadtree} from '@/composables/useQuadtree'
import {pointer} from 'd3-selection'
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

// Layout composable
const {chartWidth, nodes, links} = useNodesAndLinks(props)

// Collapsed node filtering composable
const {collapsedNodes, filteredNodes, filteredLinks, toggleCollapse} = useCollapsed(nodes, links)

// Interaction finite state machine
const fsm = useInteractionStateMachine()

// Quadtree spatial index for node hit-testing with radius threshold
const {find: findQuadtreeNode} = useQuadtree(filteredNodes, {
	xAccessor: (d: SankeyNode) => (d.x ?? 0) + (d.width ?? 0) / 2,
	yAccessor: (d: SankeyNode) => (d.y ?? 0) + (d.height ?? 0) / 2,
	radiusThreshold: 60,
})

// Derive hover/selection state for child components
const labelId = computed(() => fsm.hoveredNodeId.value || fsm.selectedNodeId.value || '')
const labelDatum = computed(() => {
	if (!labelId.value) return null
	return filteredNodes.value.find((n) => (n.id ?? '') === labelId.value) || null
})

// Expose data to child components via provide/inject for backwards compatibility
provide('labelDatum', labelDatum)
provide('labelId', labelId)

/**
 * Handle node click event - delegates to toggleCollapse
 */
const handleNodeClick = (id: string) => {
	toggleCollapse(id)
}

/**
 * Quadtree pointermove handler: tests cursor against spatial index
 */
const handlePointerMove = (event: MouseEvent) => {
	const [x, y] = pointer(event)
	const targetNode = findQuadtreeNode(x, y)
	if (targetNode && targetNode.id) {
		fsm.pointerEnterNode(targetNode.id)
	} else if (fsm.hoveredNodeId.value) {
		fsm.pointerLeaveNode(fsm.hoveredNodeId.value)
	}
}

/**
 * Quadtree click handler: handles node clicks vs empty space background clicks
 */
const handleCanvasClick = (event: MouseEvent) => {
	const [x, y] = pointer(event)
	const targetNode = findQuadtreeNode(x, y)
	if (targetNode && targetNode.id) {
		handleNodeClick(targetNode.id)
	} else {
		// Empty space click clears selection
		fsm.pointerDownBackground({x, y})
		fsm.pointerUp()
	}
}

const handlePointerLeave = () => {
	if (fsm.hoveredNodeId.value) {
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
		<!-- Quadtree Spatial Hit Overlay (Replaces Voronoi Delaunay tessellation) -->
		<rect
			class="quadtree-hit-overlay"
			:width="width"
			:height="height"
			fill="none"
			pointer-events="all"
			@pointermove="handlePointerMove"
			@pointerleave="handlePointerLeave"
			@click="handleCanvasClick"
		/>
	</Chart>
</template>
