<script setup lang="ts">
import Chart from '@/components/common-ts/Chart.vue'
import {useCollapsed} from '@/composables/useCollapsed'
import {useInteractionStateMachine} from '@/composables/useInteractionStateMachine'
import {useNodeDrag} from '@/composables/useNodeDrag'
import {SankeyLink, SankeyNode, useNodesAndLinks} from '@/composables/useNodesAndLinks'
import {useQuadtree} from '@/composables/useQuadtree'
import {useZoom} from '@/composables/useZoom'
import {pointer} from 'd3-selection'
import {computed, onUnmounted, provide, ref} from 'vue'
import Labels from './Labels.vue'
import Links from './Links.vue'
import Nodes from './Nodes.vue'

const props = withDefaults(
	defineProps<{
		data: SankeyLink[]
		enableZoom?: boolean
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
		enableZoom: true,
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

const chartRef = ref<InstanceType<typeof Chart> | null>(null)
const svgElementRef = computed(() => chartRef.value?.svgRef ?? null)

// Layout composable
const {chartWidth, nodes, links} = useNodesAndLinks(props)

// Collapsed node filtering composable
const {collapsedNodes, filteredNodes, filteredLinks, toggleCollapse} = useCollapsed(nodes, links)

// Node dragging & pinned position overrides
const {startDragNode, updateDragNode, endDragNode, unpinNode, applyNodePositions} = useNodeDrag()

// Positioned nodes overlaying drag overrides onto layout nodes
const positionedNodes = computed(() => applyNodePositions(filteredNodes.value, filteredLinks.value))

// Interaction finite state machine
const fsm = useInteractionStateMachine()

// Zoom composable (bound to SVG container)
const {transformString, invertPoint} = useZoom(svgElementRef, {enabled: props.enableZoom})

// Quadtree spatial index for node hit-testing with radius threshold
const {find: findQuadtreeNode} = useQuadtree(positionedNodes, {
	xAccessor: (d: SankeyNode) => (d.x ?? 0) + (d.width ?? 0) / 2,
	yAccessor: (d: SankeyNode) => (d.y ?? 0) + (d.height ?? 0) / 2,
	radiusThreshold: 60,
})

// Derive hover/selection state for child components
const labelId = computed(() => fsm.hoveredNodeId.value || fsm.selectedNodeId.value || '')
const labelDatum = computed(() => {
	if (!labelId.value) return null
	return positionedNodes.value.find((n) => (n.id ?? '') === labelId.value) || null
})

// Expose data to child components via provide/inject for backwards compatibility
provide('labelDatum', labelDatum)
provide('labelId', labelId)

const handleNodeClick = (id: string) => {
	toggleCollapse(id)
}

const handleNodeDblClick = (id: string) => {
	unpinNode(id)
}

const handleNodePointerDown = (id: string, event: PointerEvent) => {
	const targetNode = positionedNodes.value.find((n) => (n.id ?? '') === id)
	if (targetNode) {
		const [rawX, rawY] = pointer(event)
		const point = invertPoint(rawX, rawY)
		startDragNode(targetNode)
		fsm.pointerDownNode(id, point)
	}
}

/**
 * Spatial hit testing & drag updates in inverted coordinate space
 */
const handlePointerMove = (event: MouseEvent) => {
	const [rawX, rawY] = pointer(event)
	const point = invertPoint(rawX, rawY)

	fsm.pointerMove(point)

	if (fsm.isDragging.value && fsm.activeNodeId.value) {
		updateDragNode(fsm.activeNodeId.value, fsm.delta.value)
		return
	}

	const targetNode = findQuadtreeNode(point.x, point.y)
	if (targetNode && targetNode.id) {
		fsm.pointerEnterNode(targetNode.id)
	} else if (fsm.hoveredNodeId.value) {
		fsm.pointerLeaveNode(fsm.hoveredNodeId.value)
	}
}

const handleCanvasClick = (event: MouseEvent) => {
	const [rawX, rawY] = pointer(event)
	const point = invertPoint(rawX, rawY)

	if (fsm.isDragging.value) {
		endDragNode()
		fsm.pointerUp()
		return
	}

	const targetNode = findQuadtreeNode(point.x, point.y)
	if (targetNode && targetNode.id) {
		handleNodeClick(targetNode.id)
	} else {
		fsm.pointerDownBackground(point)
		fsm.pointerUp()
	}
}

const handlePointerUp = () => {
	endDragNode()
	fsm.pointerUp()
}

const handlePointerLeave = () => {
	endDragNode()
	if (fsm.hoveredNodeId.value) {
		fsm.pointerLeaveNode(fsm.hoveredNodeId.value)
	}
}

onUnmounted(() => {
	fsm.reset()
})
</script>

<template>
	<Chart
		ref="chartRef"
		:height="height"
		:marginLeft="0"
		:marginTop="0"
		:width="width"
		:zoomTransform="transformString"
	>
		<Links :data="filteredLinks" :collapsedNodes="collapsedNodes" />
		<Nodes
			:data="positionedNodes"
			:nodeId="nodeId"
			:hoveredNodeId="fsm.hoveredNodeId.value"
			:selectedNodeId="fsm.selectedNodeId.value"
			:isDragging="fsm.isDragging.value"
			@click="handleNodeClick"
			@dblclick="handleNodeDblClick"
			@hover="(id) => fsm.pointerEnterNode(id)"
			@leave="(id) => fsm.pointerLeaveNode(id)"
			@pointerdown="(id, e) => handleNodePointerDown(id, e)"
		/>
		<Labels
			:data="positionedNodes"
			:collapsedNodes="collapsedNodes"
			:node-id="nodeId"
			:node-width="nodeWidth"
			:width="chartWidth"
		/>
		<rect
			class="quadtree-hit-overlay"
			:width="width"
			:height="height"
			fill="none"
			pointer-events="all"
			@pointermove="handlePointerMove"
			@pointerup="handlePointerUp"
			@pointerleave="handlePointerLeave"
			@click="handleCanvasClick"
		/>
	</Chart>
</template>
